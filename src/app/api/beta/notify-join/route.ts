import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUsers, staffUserIdsAtRank } from "@/lib/serverPush";

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
  const result = await sendPushToUsers(staffIds, {
    title: "New beta tester",
    body: `${user.email ?? "Someone"} just joined the beta.`,
    tag: "beta-join",
    url: "/admin/beta",
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
