import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { MAX_NOTIFICATIONS, RENAG_INTERVAL_MS, dueAppointmentReminders, dueCheckInReminders, dueMedicationReminders, isQuietHours } from "@/lib/reminders";
import { emptyAppointmentBuilderData, type Appointment, type Medication, type MedicationLog, type NotifiedReminder } from "@/lib/db";

// Triggered every few minutes by the VPS crontab (see docs/PROD_RELEASE.md-
// style ops notes) with `Authorization: Bearer <CRON_SECRET>`. Only reaches
// signed-in accounts with an active push subscription - local-only users get
// their reminders from src/components/LocalReminderService instead, which
// this route knows nothing about.
export const dynamic = "force-dynamic";

function isDeadEndpointError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    (error.statusCode === 404 || error.statusCode === 410)
  );
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "push is not configured" }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subscriptions, error: subsError } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth");
  if (subsError) return NextResponse.json({ error: subsError.message }, { status: 500 });
  if (!subscriptions || subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, usersChecked: 0 });
  }

  const userIds = [...new Set(subscriptions.map((row) => row.user_id as string))];
  const [{ data: profiles }, { data: medications }, { data: medicationLogs }, { data: appointments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, timezone, reminder_privacy, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, check_in_morning_reminder_enabled, check_in_morning_reminder_time, check_in_evening_reminder_enabled, check_in_evening_reminder_time"
        )
        .in("id", userIds),
      supabase.from("medications").select("id, user_id, name, route, unit, frequency, active").in("user_id", userIds),
      supabase.from("medication_logs").select("id, user_id, medication_id, scheduled_time, status").in("user_id", userIds),
      supabase.from("appointments").select("id, user_id, title, appointment_at, reminder_settings").in("user_id", userIds),
    ]);

  const now = new Date();
  let sent = 0;
  const deadEndpoints = new Set<string>();
  const renagIntervalSeconds = Math.round(RENAG_INTERVAL_MS / 1000);

  for (const userId of userIds) {
    const profile = (profiles ?? []).find((p) => p.id === userId);
    const timeZone = profile?.timezone || "UTC";
    const detailed = profile?.reminder_privacy === "detailed";
    // Time-window eligibility only - no notified state passed in here.
    // Whether a candidate is actually still eligible to send (re-nag gate,
    // notification cap, snooze) is decided atomically per-reminder below via
    // claim_reminder_notification, not from a snapshot read up front - see
    // supabase/atomic_reminder_claim.sql for why.
    const notified: NotifiedReminder[] = [];

    const meds: Medication[] = (medications ?? [])
      .filter((m) => m.user_id === userId)
      .map((m) => ({
        id: m.id,
        name: m.name,
        route: m.route,
        unit: m.unit,
        frequency: m.frequency,
        activeSupplyId: null,
        active: m.active,
        createdAt: "",
        updatedAt: "",
      }));
    const logs: MedicationLog[] = (medicationLogs ?? [])
      .filter((l) => l.user_id === userId)
      .map((l) => ({
        id: l.id,
        medicationId: l.medication_id,
        scheduledTime: l.scheduled_time,
        status: l.status,
        loggedAt: "",
        note: null,
        updatedAt: "",
      }));
    const appts: Appointment[] = (appointments ?? [])
      .filter((a) => a.user_id === userId)
      .map((a) => {
        const settings = a.reminder_settings as { minutesBefore?: number } | null;
        return {
          id: a.id,
          title: a.title,
          appointmentAt: a.appointment_at,
          location: null,
          preparationNote: null,
          outcomeNote: null,
          rescheduledFrom: null,
          builderData: emptyAppointmentBuilderData(),
          reminderMinutesBefore: typeof settings?.minutesBefore === "number" ? settings.minutesBefore : null,
          createdAt: "",
          updatedAt: "",
        };
      });

    const pending = [
      ...dueMedicationReminders(meds, logs, notified, now, timeZone),
      ...dueAppointmentReminders(appts, notified, now),
      ...dueCheckInReminders(
        {
          morningEnabled: Boolean(profile?.check_in_morning_reminder_enabled),
          morningTime: profile?.check_in_morning_reminder_time || "09:00",
          eveningEnabled: Boolean(profile?.check_in_evening_reminder_enabled),
          eveningTime: profile?.check_in_evening_reminder_time || "21:00",
        },
        notified,
        now,
        timeZone
      ),
    ];
    if (pending.length === 0) continue;

    // Held back, not dropped: nothing is marked notified, so the next cron
    // run re-evaluates and sends once the window ends (same "still relevant"
    // grace period as any other delayed reminder).
    if (isQuietHours(now, Boolean(profile?.quiet_hours_enabled), profile?.quiet_hours_start ?? null, profile?.quiet_hours_end ?? null, timeZone)) {
      continue;
    }

    const userSubs = subscriptions.filter((s) => s.user_id === userId);
    for (const reminder of pending) {
      // Atomically claim this exact reminder before sending anything - if
      // another (possibly overlapping) run already claimed it, this returns
      // false and we skip it entirely, instead of trusting a snapshot read
      // from the top of this run that could already be stale.
      const { data: claimed, error: claimError } = await supabase.rpc("claim_reminder_notification", {
        p_user_id: userId,
        p_reminder_key: reminder.key,
        p_max_notifications: MAX_NOTIFICATIONS,
        p_renag_interval_seconds: renagIntervalSeconds,
      });
      if (claimError || !claimed) continue;

      const isMedication = reminder.key.startsWith("medication:");
      const payload = JSON.stringify({
        title: detailed ? reminder.detailedTitle : reminder.discreetTitle,
        body: detailed ? reminder.detailedBody : reminder.discreetBody,
        tag: reminder.key,
        url: "/",
        // Action buttons only make sense for a loggable medication dose -
        // an appointment reminder just opens the app like before.
        actions: isMedication
          ? [
              { action: "taken", title: "Mark as taken" },
              { action: "snooze", title: "Snooze 15 min" },
            ]
          : undefined,
      });
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload
          );
          sent++;
        } catch (error) {
          if (isDeadEndpointError(error)) deadEndpoints.add(sub.endpoint);
        }
      }
    }
  }

  if (deadEndpoints.size > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", [...deadEndpoints]);
  }

  return NextResponse.json({ sent, usersChecked: userIds.length });
}
