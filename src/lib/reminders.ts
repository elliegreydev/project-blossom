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

// Mirrors db.ts's dueDosesToday. Duplicated (rather than imported) so this
// module has no runtime dependency on db.ts - only type-only imports, which
// keeps it independently testable via scripts/test-reminders.mjs.
function scheduledSlotsToday(med: Medication, now: Date): string[] {
  if (!med.frequency || med.frequency.times.length === 0) return [];
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
  now: Date
): PendingReminder[] {
  const loggedSlots = new Set(
    medicationLogs.map((log) => log.scheduledTime).filter((slot): slot is string => Boolean(slot))
  );
  const nowTime = now.getTime();

  return medications
    .filter((med) => med.active)
    .flatMap((med) => scheduledSlotsToday(med, now).map((slot) => ({ med, slot })))
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
