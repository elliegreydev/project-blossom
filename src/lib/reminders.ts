import type { Appointment, Medication, MedicationLog, NotifiedReminder, Profile, SafetyCheckIn } from "./db";

export interface PendingReminder {
  key: string;
  discreetTitle: string;
  discreetBody: string;
  detailedTitle: string;
  detailedBody: string;
}

// A missed reminder stays worth mentioning for a while, not just in the
// first few minutes - but not forever, so a dose from this morning doesn't
// still nag at bedtime.
const STILL_RELEVANT_MS = 6 * 60 * 60 * 1000;
// Minimum gap between two notifications for the same slot. Exported so the
// reminder cron can pass the same value into claim_reminder_notification()
// (see supabase/atomic_reminder_claim.sql) - one source of truth for both
// the client-side (Tier 1) and server-side (Tier 3) re-nag gate.
export const RENAG_INTERVAL_MS = 45 * 60 * 1000;
// Initial notification plus this many follow-ups, then it gives up.
export const MAX_NOTIFICATIONS = 3;

// Local wall-clock hour/minute/weekday/date "as observed in timeZone",
// without ever constructing a Date pinned to that zone (a well-known JS Date
// footgun). Weekday index matches Date#getDay() (0 = Sunday).
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function zonedNow(now: Date, timeZone: string): { minuteOfDay: number; weekday: number; dateKey: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Intl can format midnight as "24" with hour12: false.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return {
    minuteOfDay: hour * 60 + minute,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? now.getDay(),
    dateKey: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Mirrors db.ts's daysBetweenDateKeys/isDueByInterval. Duplicated rather than
// imported so this module has no runtime dependency on db.ts - only
// type-only imports, which keeps it independently testable via plain node
// (scripts/test-reminders.mjs).
function isDueByInterval(anchorDate: string, intervalDays: number, todayDateKey: string): boolean {
  if (intervalDays <= 0) return false;
  const [fy, fm, fd] = anchorDate.split("-").map(Number);
  const [ty, tm, td] = todayDateKey.split("-").map(Number);
  const diff = Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86400000);
  return diff >= 0 && diff % intervalDays === 0;
}

// Mirrors db.ts's dueDosesToday, generalized with an optional timeZone so it
// can run server-side (the cron doesn't share the user's local system clock)
// as well as client-side (LocalReminderService, where the runtime already is
// the user's own local time and timeZone can be omitted).
function scheduledSlotsToday(med: Medication, now: Date, timeZone?: string): string[] {
  if (!med.frequency || med.frequency.times.length === 0) return [];

  if (timeZone) {
    const { minuteOfDay: nowMinuteOfDay, weekday, dateKey } = zonedNow(now, timeZone);
    if (med.frequency.intervalDays) {
      if (!med.frequency.anchorDate || !isDueByInterval(med.frequency.anchorDate, med.frequency.intervalDays, dateKey)) return [];
    } else if (med.frequency.days && !med.frequency.days.includes(weekday)) {
      return [];
    }
    // Floor to the whole minute before offsetting - otherwise now's leftover
    // seconds/ms (which drift run to run) leak into the slot's identity,
    // producing a new key on every cron tick and defeating dedup entirely.
    const flooredNowMs = now.getTime() - (now.getTime() % 60_000);
    return med.frequency.times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const diffMinutes = h * 60 + m - nowMinuteOfDay;
      return new Date(flooredNowMs + diffMinutes * 60 * 1000).toISOString();
    });
  }

  if (med.frequency.intervalDays) {
    if (!med.frequency.anchorDate || !isDueByInterval(med.frequency.anchorDate, med.frequency.intervalDays, localDateKey(now))) return [];
  } else {
    const weekday = now.getDay();
    if (med.frequency.days && !med.frequency.days.includes(weekday)) return [];
  }
  return med.frequency.times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  });
}

// Whether a reminder key is still eligible to fire: never notified, or its
// last notification was long enough ago (and it hasn't hit the cap), or a
// snooze period has just elapsed.
function shouldFire(state: NotifiedReminder | undefined, nowTime: number): boolean {
  if (!state) return true;
  if (state.snoozedUntil) {
    const snoozedUntilTime = new Date(state.snoozedUntil).getTime();
    if (nowTime < snoozedUntilTime) return false;
    return state.count < MAX_NOTIFICATIONS;
  }
  if (state.count >= MAX_NOTIFICATIONS) return false;
  return nowTime - new Date(state.firedAt).getTime() >= RENAG_INTERVAL_MS;
}

function parseHHMM(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

// Whether `now` falls inside the [start, end) quiet hours window. Handles a
// window that crosses midnight (e.g. 22:00-07:00) as well as one that
// doesn't (e.g. 13:00-14:00 for a nap). Reminders are never suppressed
// outright - see the callers in LocalReminderService and the reminder
// cron, which hold a due reminder back rather than dropping it, so it still
// arrives once the window ends.
export function isQuietHours(now: Date, enabled: boolean, start: string | null, end: string | null, timeZone?: string): boolean {
  if (!enabled || !start || !end) return false;
  const nowMinute = timeZone ? zonedNow(now, timeZone).minuteOfDay : now.getHours() * 60 + now.getMinutes();
  const startMinute = parseHHMM(start);
  const endMinute = parseHHMM(end);
  if (startMinute === endMinute) return false;
  if (startMinute < endMinute) return nowMinute >= startMinute && nowMinute < endMinute;
  return nowMinute >= startMinute || nowMinute < endMinute;
}

export function dueMedicationReminders(
  medications: Medication[],
  medicationLogs: MedicationLog[],
  notified: NotifiedReminder[],
  now: Date,
  timeZone?: string
): PendingReminder[] {
  const loggedSlots = new Set(
    medicationLogs.map((log) => log.scheduledTime).filter((slot): slot is string => Boolean(slot))
  );
  const notifiedByKey = new Map(notified.map((n) => [n.key, n]));
  const nowTime = now.getTime();

  return medications
    .filter((med) => med.active)
    .flatMap((med) => scheduledSlotsToday(med, now, timeZone).map((slot) => ({ med, slot })))
    .filter(({ med, slot }) => {
      const age = nowTime - new Date(slot).getTime();
      const key = `medication:${med.id}|${slot}`;
      return age >= 0 && age <= STILL_RELEVANT_MS && !loggedSlots.has(slot) && shouldFire(notifiedByKey.get(key), nowTime);
    })
    .map(({ med, slot }) => ({
      key: `medication:${med.id}|${slot}`,
      discreetTitle: "A quiet reminder",
      discreetBody: "You have something scheduled around now.",
      detailedTitle: "Medication reminder",
      detailedBody: `Time for ${med.name}.`,
    }));
}

export function dueAppointmentReminders(
  appointments: Appointment[],
  notified: NotifiedReminder[],
  now: Date
): PendingReminder[] {
  const notifiedByKey = new Map(notified.map((n) => [n.key, n]));
  const nowTime = now.getTime();

  return appointments
    .filter((appt) => appt.reminderMinutesBefore != null && new Date(appt.appointmentAt).getTime() > nowTime)
    .filter((appt) => {
      const reminderAt = new Date(appt.appointmentAt).getTime() - appt.reminderMinutesBefore! * 60 * 1000;
      const age = nowTime - reminderAt;
      const key = `appointment:${appt.id}`;
      return age >= 0 && age <= STILL_RELEVANT_MS && shouldFire(notifiedByKey.get(key), nowTime);
    })
    .map((appt) => ({
      key: `appointment:${appt.id}`,
      discreetTitle: "Coming up",
      discreetBody: "You have something scheduled soon.",
      detailedTitle: "Appointment reminder",
      detailedBody: `${appt.title} coming up.`,
    }));
}

// Copy here is deliberate: it suggests, never claims to alert anyone on the
// user's behalf - Blossom never contacts a trusted contact itself.
export function dueSafetyCheckInReminders(
  checkIns: SafetyCheckIn[],
  notified: NotifiedReminder[],
  now: Date
): PendingReminder[] {
  const notifiedByKey = new Map(notified.map((n) => [n.key, n]));
  const nowTime = now.getTime();

  return checkIns
    .filter((c) => c.status === "pending")
    .filter((c) => {
      const age = nowTime - new Date(c.dueAt).getTime();
      const key = `safety-checkin:${c.id}`;
      return age >= 0 && age <= STILL_RELEVANT_MS && shouldFire(notifiedByKey.get(key), nowTime);
    })
    .map((c) => ({
      key: `safety-checkin:${c.id}`,
      discreetTitle: "A gentle check-in",
      discreetBody: "You have something to check on when you get a moment.",
      detailedTitle: "Safety check-in",
      detailedBody: "You missed your check-in - want to reach out to your trusted contact?",
    }));
}

// Weight reminders are intentionally local-only and deliberately light-touch:
// one optional weekly prompt, no re-nagging, and disabled entirely in Gentle
// Mode. They do not imply that a person should weigh themselves.
export function dueWeightReminders(
  profile: Profile,
  notified: NotifiedReminder[],
  now: Date
): PendingReminder[] {
  if (!profile.weightTrackingEnabled || !profile.weightReminderEnabled || profile.gentleMode) return [];

  const [hours, minutes] = profile.weightReminderTime.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || now.getDay() !== profile.weightReminderDay) return [];

  const dueAt = new Date(now);
  dueAt.setHours(hours, minutes, 0, 0);
  const age = now.getTime() - dueAt.getTime();
  const dateKey = localDateKey(now);
  const key = `weight:${dateKey}|${profile.weightReminderTime}`;
  if (age < 0 || age > STILL_RELEVANT_MS || notified.some((entry) => entry.key === key)) return [];

  return [{
    key,
    discreetTitle: "A gentle reminder",
    discreetBody: "There is something optional to check in with, if it feels useful.",
    detailedTitle: "Optional weight check-in",
    detailedBody: "If it feels useful today, you can log a weight in Blossom.",
  }];
}

export interface CheckInReminderSettings {
  morningEnabled: boolean;
  morningTime: string;
  eveningEnabled: boolean;
  eveningTime: string;
}

// Two independent optional daily slots, timezone-aware so it works both in
// LocalReminderService (timeZone omitted, runtime already is the user's own
// local time) and the server cron (timeZone required, since the cron itself
// runs in UTC). Re-nags a couple of times like medication/appointments,
// rather than the single-shot weight reminder above.
export function dueCheckInReminders(
  settings: CheckInReminderSettings,
  notified: NotifiedReminder[],
  now: Date,
  timeZone?: string
): PendingReminder[] {
  const notifiedByKey = new Map(notified.map((n) => [n.key, n]));
  const { minuteOfDay: nowMinuteOfDay, dateKey } = timeZone
    ? zonedNow(now, timeZone)
    : { minuteOfDay: now.getHours() * 60 + now.getMinutes(), dateKey: localDateKey(now) };
  const nowTime = now.getTime();

  const slots: { enabled: boolean; time: string; period: "morning" | "evening"; title: string; body: string }[] = [
    {
      enabled: settings.morningEnabled,
      time: settings.morningTime,
      period: "morning",
      title: "Morning check-in",
      body: "A quiet moment to note how you're doing this morning.",
    },
    {
      enabled: settings.eveningEnabled,
      time: settings.eveningTime,
      period: "evening",
      title: "Evening check-in",
      body: "A quiet moment to note how today went before bed.",
    },
  ];

  const result: PendingReminder[] = [];
  for (const slot of slots) {
    if (!slot.enabled) continue;
    const slotMinute = parseHHMM(slot.time);
    const age = (nowMinuteOfDay - slotMinute) * 60 * 1000;
    if (age < 0 || age > STILL_RELEVANT_MS) continue;
    const key = `checkin-${slot.period}:${dateKey}`;
    if (!shouldFire(notifiedByKey.get(key), nowTime)) continue;
    result.push({
      key,
      discreetTitle: "A gentle reminder",
      discreetBody: "There is something optional to check in with, if it feels useful.",
      detailedTitle: slot.title,
      detailedBody: slot.body,
    });
  }
  return result;
}
