import type { Appointment, Medication, MedicationLog } from "./db";

export interface PendingReminder {
  key: string;
  discreetTitle: string;
  discreetBody: string;
  detailedTitle: string;
  detailedBody: string;
}

// Reminders only fire while the app is open (see LocalReminderService), so a
// slot is only "due" in a short window after its moment passes - not caught
// up on retroactively if the app was closed through it.
const GRACE_WINDOW_MS = 5 * 60 * 1000;

// Local wall-clock hour/minute/weekday "as observed in timeZone", without ever
// constructing a Date pinned to that zone (a well-known JS Date footgun).
// Weekday index matches Date#getDay() (0 = Sunday).
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function zonedNow(now: Date, timeZone: string): { minuteOfDay: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // Intl can format midnight as "24" with hour12: false.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { minuteOfDay: hour * 60 + minute, weekday: WEEKDAY_INDEX[get("weekday")] ?? now.getDay() };
}

// Mirrors db.ts's dueDosesToday, generalized with an optional timeZone so it
// can run server-side (the cron doesn't share the user's local system clock)
// as well as client-side (LocalReminderService, where the runtime already is
// the user's own local time and timeZone can be omitted). Duplicated rather
// than imported from db.ts so this module has no runtime dependency on it -
// only type-only imports, which keeps it independently testable via plain
// node (scripts/test-reminders.mjs).
function scheduledSlotsToday(med: Medication, now: Date, timeZone?: string): string[] {
  if (!med.frequency || med.frequency.times.length === 0) return [];

  if (timeZone) {
    const { minuteOfDay: nowMinuteOfDay, weekday } = zonedNow(now, timeZone);
    if (med.frequency.days && !med.frequency.days.includes(weekday)) return [];
    return med.frequency.times.map((t) => {
      const [h, m] = t.split(":").map(Number);
      const diffMinutes = h * 60 + m - nowMinuteOfDay;
      return new Date(now.getTime() + diffMinutes * 60 * 1000).toISOString();
    });
  }

  const weekday = now.getDay();
  if (med.frequency.days && !med.frequency.days.includes(weekday)) return [];
  return med.frequency.times.map((t) => {
    const [h, m] = t.split(":").map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  });
}

export function dueMedicationReminders(
  medications: Medication[],
  medicationLogs: MedicationLog[],
  notifiedKeys: Set<string>,
  now: Date,
  timeZone?: string
): PendingReminder[] {
  const loggedSlots = new Set(
    medicationLogs.map((log) => log.scheduledTime).filter((slot): slot is string => Boolean(slot))
  );
  const nowTime = now.getTime();

  return medications
    .filter((med) => med.active)
    .flatMap((med) => scheduledSlotsToday(med, now, timeZone).map((slot) => ({ med, slot })))
    .filter(({ slot }) => {
      const age = nowTime - new Date(slot).getTime();
      const key = `medication:${slot}`;
      return age >= 0 && age <= GRACE_WINDOW_MS && !loggedSlots.has(slot) && !notifiedKeys.has(key);
    })
    .map(({ med, slot }) => ({
      key: `medication:${slot}`,
      discreetTitle: "A quiet reminder",
      discreetBody: "You have something scheduled around now.",
      detailedTitle: "Medication reminder",
      detailedBody: `Time for ${med.name}.`,
    }));
}

export function dueAppointmentReminders(
  appointments: Appointment[],
  notifiedKeys: Set<string>,
  now: Date
): PendingReminder[] {
  const nowTime = now.getTime();

  return appointments
    .filter((appt) => appt.reminderMinutesBefore != null && new Date(appt.appointmentAt).getTime() > nowTime)
    .filter((appt) => {
      const reminderAt = new Date(appt.appointmentAt).getTime() - appt.reminderMinutesBefore! * 60 * 1000;
      const age = nowTime - reminderAt;
      const key = `appointment:${appt.id}`;
      return age >= 0 && age <= GRACE_WINDOW_MS && !notifiedKeys.has(key);
    })
    .map((appt) => ({
      key: `appointment:${appt.id}`,
      discreetTitle: "Coming up",
      discreetBody: "You have something scheduled soon.",
      detailedTitle: "Appointment reminder",
      detailedBody: `${appt.title} coming up.`,
    }));
}
