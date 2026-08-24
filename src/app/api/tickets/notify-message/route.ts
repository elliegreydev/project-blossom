import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sendPushToStaff, staffUserIdsAtRank } from "@/lib/serverPush";

export const dynamic = "force-dynamic";

// Triggered right after the ticket owner posts a reply. Notifies whoever
// claimed the ticket, or every eligible-rank staff member if it's still
// unclaimed. Re-fetches the message via the service-role client and only
// notifies for a message the caller actually just sent.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messageId = typeof body?.messageId === "string" ? body.messageId : null;
  if (!messageId) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const service = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: message } = await service
    .from("support_ticket_messages")
    .select("id,ticket_id,sender_id,body,is_system")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.sender_id !== user.id || message.is_system) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: ticket } = await service
    .from("support_tickets")
    .select("id,user_id,claimed_by,min_rank")
    .eq("id", message.ticket_id)
    .maybeSingle();
  if (!ticket || ticket.user_id !== user.id) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const recipients = ticket.claimed_by ? [ticket.claimed_by] : await staffUserIdsAtRank(ticket.min_rank);
  const result = await sendPushToStaff(recipients, {
    title: "New reply on a support ticket",
    // Never the message itself. This lands on a lock screen, and a Blossom
    // support ticket can hold medication details, distress, or somebody's
    // identity. Both sibling routes already send a fixed string; this one
    // was sending the lot. The url below still opens the thread.
    body: "A member has replied to their ticket.",
    tag: `ticket-${ticket.id}`,
    url: `https://project-blossom-staff.vercel.app/support/${ticket.id}`,
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
