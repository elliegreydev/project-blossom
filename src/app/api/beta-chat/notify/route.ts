import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { activeBetaTesterUserIds, sendPushToUsers, staffUserIdsAtRank } from "@/lib/serverPush";

export const dynamic = "force-dynamic";

// Triggered client-side right after a beta chat message is inserted (see
// (main)/beta-chat/page.tsx). Deliberately re-fetches the message itself via
// the service-role client rather than trusting client-supplied text/sender,
// and only notifies for a message the caller actually just sent - so this
// can't be used to blast an arbitrary push to the whole beta cohort.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const messageId = typeof body?.messageId === "string" ? body.messageId : null;
  if (!messageId) return NextResponse.json({ error: "invalid request" }, { status: 400 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: message } = await service
    .from("beta_chat_messages")
    .select("id,user_id,sender_name")
    .eq("id", messageId)
    .maybeSingle();
  if (!message || message.user_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const [betaTesterIds, staffIds] = await Promise.all([activeBetaTesterUserIds(), staffUserIdsAtRank(0)]);
  const recipients = [...new Set([...betaTesterIds, ...staffIds])].filter((id) => id !== user.id);

  // Discreet by default, same instinct as every other push in this app -
  // the lock screen shows who wrote, never the message content itself.
  const result = await sendPushToUsers(recipients, {
    title: "Beta chat",
    body: `New message from ${message.sender_name}`,
    tag: "beta-chat",
    url: "/beta-chat",
  });

  return NextResponse.json({ ok: true, sent: result.sent });
}
