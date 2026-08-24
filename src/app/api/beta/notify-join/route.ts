import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToStaff, staffUserIdsAtRank } from "@/lib/serverPush";

export const dynamic = "force-dynamic";

// Triggered client-side right after redeem_beta_code() succeeds (see
// beta/join/page.tsx). Re-checks is_beta_tester() itself server-side rather
// than trusting the client's word that redemption worked.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: isBetaTester } = await supabase.rpc("is_beta_tester");
  if (isBetaTester !== true) return NextResponse.json({ error: "not a beta tester" }, { status: 403 });

  const staffIds = await staffUserIdsAtRank(0);
  const result = await sendPushToStaff(staffIds, {
    title: "New beta tester",
    // Not the email. This lands on a staff lock screen, and who joined the
    // beta of a trans health app is not something to display there. Staff can
    // see who it was inside the app.
    body: "Someone just joined the beta.",
    tag: "beta-join",
    url: "https://project-blossom-staff.vercel.app/beta",
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
