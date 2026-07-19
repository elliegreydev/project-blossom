import type { Appointment, Medication, MedicationLog, NotifiedReminder, SafetyCheckIn } from "./db";

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
// Minimum gap between two notifications for the same slot.
const RENAG_INTERVAL_MS = 45 * 60 * 1000;
// Initial notification plus this many follow-ups, then it gives up.
const MAX_NOTIFICATIONS = 3;

// Local wall-clock hour/minute/weekday/date "as observed in timeZone",
// without ever constructing a Date pinned to that zone (a well-known JS Date
// footgun). Weekday index matches Date#getDay() (0 = Sunday).
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function zonedNow(now: Date, timeZone: string): { minuteOfDay: number; weekday: number; dateKey: string } {
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
    return med.frequency.times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const diffMinutes = h * 60 + m - nowMinuteOfDay;
      return new Date(now.getTime() + diffMinutes * 60 * 1000).toISOString();
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
