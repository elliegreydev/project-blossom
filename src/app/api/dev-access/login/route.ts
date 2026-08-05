import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEV_GATE_COOKIE, gateEnabled, issueToken } from "@/lib/devGate";

export const dynamic = "force-dynamic";

// Two ways in:
//   1. The master password (DEV_SITE_PASSWORD) - bootstrap and emergency
//      access, since someone has to be able to get in before the access list
//      has anyone on it. Always admin.
//   2. A row in dev_access, verified against its bcrypt hash in Postgres.
//
// Password checking happens in the database (extensions.crypt) rather than
// here, so hashes never travel to the app.
export async function POST(request: Request) {
  if (!gateEnabled()) {
    return NextResponse.json({ error: "gate is not enabled" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) {
    return NextResponse.json({ error: "Enter a password." }, { status: 400 });
  }

  let session: { email: string; isAdmin: boolean } | null = null;

  if (password === process.env.DEV_SITE_PASSWORD) {
    session = { email: email || "owner", isAdmin: true };
  } else if (email) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase.rpc("dev_access_verify", {
      p_email: email,
      p_password: password,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (row) session = { email: row.email, isAdmin: Boolean(row.is_admin) };
  }

  if (!session) {
    // Deliberately vague - don't reveal whether the email is on the list.
    return NextResponse.json({ error: "That didn't work." }, { status: 401 });
  }

  const token = await issueToken(session);
  const response = NextResponse.json({ ok: true, isAdmin: session.isAdmin });
  response.cookies.set(DEV_GATE_COOKIE, token!, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return response;
}
