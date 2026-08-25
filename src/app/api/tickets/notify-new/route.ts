import { NextResponse } from "next/server";
import { allow, tooManyRequests, HOUR } from "@/lib/rateLimit";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendPushToStaff, staffUserIdsAtRank } from "@/lib/serverPush";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Something's not working right",
  feature_question: "A question about a feature",
  account_fix: "Something needs fixing on their account",
  safety_privacy: "Worried about safety or privacy",
  report_concern: "Report something concerning",
  other: "Other",
};

// Triggered right after a new ticket is inserted. Re-fetches it via the
// service-role client and only notifies for a ticket the caller actually
// just opened, so this can't be used to spam an arbitrary push.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // A session is required, but a signed-in caller could replay this to
  // fan out repeated pushes. Cap it per user.
  if (!allow(`notify-new:${user.id}`, 20, HOUR)) return tooManyRequests(3600);

  const body = await request.json().catch(() => null);
  const ticketId = typeof body?.ticketId === "string" ? body.ticketId : null;
  if (!ticketId) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: ticket } = await service
    .from("support_tickets")
    .select("id,user_id,category,min_rank")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket || ticket.user_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const recipients = await staffUserIdsAtRank(ticket.min_rank);
  const result = await sendPushToStaff(recipients, {
    title: "New support ticket",
    body: CATEGORY_LABELS[ticket.category] ?? "A member opened a ticket.",
    tag: `ticket-new-${ticket.id}`,
    url: `https://project-blossom-staff.vercel.app/support/${ticket.id}`,
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
