import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Receiving half of the Grey Studios HQ dev access ticket. HQ signs a short
// lived ticket, this route verifies it, burns the nonce, mints a real session
// for the person server side and drops them on the dev app already signed in.
//
// This route only exists where HQ_DEV_ACCESS_SECRET is set, and only the dev
// deployment carries that variable. On production the very first check below
// returns a plain 404, so the endpoint is genuinely absent there rather than
// merely guarded. That absence is the security boundary, not a comment.
//
// Nothing here is ever logged: not the ticket, not the secret, not the
// session. Errors are returned as short human sentences instead.

const APP_SLUG = "project-blossom";

// Top non owner tier in staff_roles.sql. Rank 80, which clears every
// is_staff() / my_staff_rank() gate in the app and resolves to every page in
// my_accessible_pages(). Owner is deliberately never granted this way.
const ARRIVAL_ROLE = "administrator";

type TicketPayload = {
  e: string;
  a: string;
  x: number;
  n: string;
};

function fail(status: number, message: string) {
  return new NextResponse(message, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

function signaturesMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function parsePayload(payload: string): TicketPayload | null {
  try {
    const raw: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!raw || typeof raw !== "object") return null;
    const { e, a, x, n } = raw as Record<string, unknown>;
    if (typeof e !== "string" || !e.includes("@")) return null;
    if (typeof a !== "string" || !a) return null;
    if (typeof x !== "number" || !Number.isFinite(x)) return null;
    if (typeof n !== "string" || !/^[0-9a-f]{32}$/.test(n)) return null;
    return { e, a, x, n };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  // 1. No secret means no route. Production stops here.
  const secret = process.env.HQ_DEV_ACCESS_SECRET;
  if (!secret) return fail(404, "Not found");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return fail(503, "This dev app is not connected to its database.");
  }

  const ticket = request.nextUrl.searchParams.get("t");
  if (!ticket) return fail(403, "That link is not valid, open it again from HQ.");

  // 2. Verify the signature before trusting a single byte of the payload.
  const separator = ticket.lastIndexOf(".");
  if (separator <= 0 || separator === ticket.length - 1) {
    return fail(403, "That link is not valid, open it again from HQ.");
  }
  const payloadPart = ticket.slice(0, separator);
  const signaturePart = ticket.slice(separator + 1);
  const expected = createHmac("sha256", secret).update(payloadPart).digest("base64url");
  if (!signaturesMatch(expected, signaturePart)) {
    return fail(403, "That link is not valid, open it again from HQ.");
  }

  const payload = parsePayload(payloadPart);
  if (!payload) return fail(403, "That link is not valid, open it again from HQ.");

  // 3. A ticket minted for another app must not open this one.
  if (payload.a !== APP_SLUG) {
    return fail(403, "That link is not valid, open it again from HQ.");
  }

  // 4. Ninety second window, enforced here rather than trusted from HQ.
  if (payload.x * 1000 <= Date.now()) {
    return fail(403, "This link has expired, open it again from HQ");
  }

  const email = payload.e.trim().toLowerCase();
  const service = createServiceClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 5. Burn the nonce. The primary key does the work: a duplicate is a
  // replay, so the second use of a ticket never reaches the session step.
  const { error: nonceError } = await service
    .from("hq_access_tickets")
    .insert({ nonce: payload.n, email });
  if (nonceError) {
    if (nonceError.code === "23505") {
      return fail(403, "This link has already been used, open a fresh one from HQ.");
    }
    return fail(500, "Blossom could not check that link just now, try again from HQ.");
  }

  // Opportunistic tidy up, and never a reason to fail the sign in.
  void service
    .from("hq_access_tickets")
    .delete()
    .lt("used_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .then(() => undefined);

  // 6. Mint a real session server side. No email is sent at any point: the
  // admin API generates the link, we take its hashed token and verify that
  // ourselves, which hands back a session we can write into cookies.
  const { error: createError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (createError && !/already|registered|exists/i.test(createError.message)) {
    return fail(500, "Blossom could not open an account for that address.");
  }

  const { data: linkData, error: linkError } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    return fail(500, "Blossom could not sign you in just now, try again from HQ.");
  }

  const pendingCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const authClient = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map(({ name, value }) => ({ name, value }));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          pendingCookies.push({ name, value, options: (options ?? {}) as Record<string, unknown> });
        });
      },
    },
  });

  const { error: verifyError } = await authClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: hashedToken,
  });
  if (verifyError) {
    return fail(500, "Blossom could not sign you in just now, try again from HQ.");
  }

  // 7. Full access on arrival. An existing Owner or Administrator is left
  // exactly as they are, so arriving through HQ can never demote anyone.
  const { data: existing, error: lookupError } = await service
    .from("staff_emails")
    .select("role")
    .eq("email", email)
    .maybeSingle();
  if (lookupError) {
    return fail(500, "Blossom signed you in but could not grant staff access.");
  }
  if (!existing) {
    const { error: insertError } = await service
      .from("staff_emails")
      .insert({ email, role: ARRIVAL_ROLE });
    if (insertError) {
      return fail(500, "Blossom signed you in but could not grant staff access.");
    }
  } else if (existing.role !== "owner" && existing.role !== ARRIVAL_ROLE) {
    const { error: updateError } = await service
      .from("staff_emails")
      .update({ role: ARRIVAL_ROLE })
      .eq("email", email);
    if (updateError) {
      return fail(500, "Blossom signed you in but could not grant staff access.");
    }
  }

  // 8. Signed in, on the home page.
  const response = NextResponse.redirect(new URL("/", request.nextUrl.origin), { status: 303 });
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set({ name, value, ...options });
  });
  return response;
}
