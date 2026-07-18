import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Triggered by a tap on a push notification's action button (see
// public/sw.js's notificationclick handler) - only reachable for signed-in,
// synced accounts, same as the rest of real push. Authenticates the caller
// via their normal session cookie, then uses the service-role client for
// the actual writes (mirroring the reminder cron) so this doesn't need to
// loosen push_notified_reminders' locked-down RLS.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const key = typeof body?.key === "string" ? body.key : null;
  const action = body?.action;
  if (!key || (action !== "taken" && action !== "snooze")) {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  if (action === "taken") {
    // key format: "medication:<medicationId>|<isoScheduledTime>"
    const rest = key.startsWith("medication:") ? key.slice("medication:".length) : null;
    const [medicationId, scheduledTime] = rest ? rest.split("|") : [null, null];
    if (!medicationId || !scheduledTime) {
      return NextResponse.json({ error: "not a medication reminder" }, { status: 400 });
    }

    // RLS on medications/medication_logs is owner-only, so use the caller's
    // own session client here rather than service-role - it'll fail closed
    // if this medication isn't actually theirs.
    const { data: medication } = await supabase
      .from("medications")
      .select("id")
      .eq("id", medicationId)
      .maybeSingle();
    if (!medication) return NextResponse.json({ error: "not found" }, { status: 404 });

    const nowIso = new Date().toISOString();
    await supabase.from("medication_logs").insert({
      medication_id: medicationId,
      user_id: user.id,
      scheduled_time: scheduledTime,
      status: "taken",
      logged_at: nowIso,
      note: null,
    });
    // The log itself is what stops future re-nags for this slot (the cron
    // and LocalReminderService both check medication_logs already) - no
    // need to also touch push_notified_reminders here.
    return NextResponse.json({ ok: true });
  }

  // Snooze: push the next re-nag out 15 minutes without counting as a
  // fresh notification.
  const { data: existing } = await service
    .from("push_notified_reminders")
    .select("notify_count, sent_at")
    .eq("user_id", user.id)
    .eq("reminder_key", key)
    .maybeSingle();

  await service.from("push_notified_reminders").upsert(
    {
      user_id: user.id,
      reminder_key: key,
      sent_at: existing?.sent_at ?? new Date().toISOString(),
      notify_count: existing?.notify_count ?? 0,
      snoozed_until: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    },
    { onConflict: "user_id,reminder_key" }
  );

  return NextResponse.json({ ok: true });
}
