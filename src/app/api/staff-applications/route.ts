import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendPushToUsers, staffUserIdsAtRank } from "@/lib/serverPush";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ADMINISTRATOR_RANK = 80;

// Public, unauthenticated endpoint - the /join form posts here instead of
// inserting directly from the client, so a submission can also trigger a
// staff push in the same request. The insert itself still goes through the
// anon client and staff_applications' own RLS (public insert-only), so a
// bug here can't do more than the database already allows.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  // Honeypot: real visitors never see or fill this field. A filled one means
  // a bot - report success without writing anything, so it doesn't retry.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const areaOfInterest = typeof body.areaOfInterest === "string" ? body.areaOfInterest.trim() : "";

  if (!name || name.length > 200 || !EMAIL_RE.test(email) || !message || message.length > 4000) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const anon = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { error } = await anon.from("staff_applications").insert({
    name,
    email,
    message,
    area_of_interest: areaOfInterest || null,
  });
  if (error) return NextResponse.json({ error: "could not submit" }, { status: 500 });

  const recipients = await staffUserIdsAtRank(ADMINISTRATOR_RANK);
  await sendPushToUsers(recipients, {
    title: "New team application",
    body: `${name} applied to join the team.`,
    tag: "staff-application",
    url: "/admin/applications",
  });

  return NextResponse.json({ ok: true });
}
