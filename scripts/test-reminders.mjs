import assert from "node:assert/strict";
import { dueMedicationReminders, dueAppointmentReminders } from "../src/lib/reminders.ts";

const NOW = new Date("2026-07-16T12:00:00.000Z");

// Medication frequencies are local wall-clock "HH:MM" strings (see
// scheduledSlotsToday), so build them relative to NOW's own local
// hour/minute rather than hardcoding UTC-derived values - otherwise this
// test's pass/fail would depend on the machine's timezone.
function localHHMM(offsetMinutes) {
  const d = new Date(NOW.getTime() + offsetMinutes * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const med = {
  id: "med-1",
  name: "Estradiol",
  route: "gel",
  unit: null,
  frequency: { times: [localHHMM(-2)], days: null },
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const dueNow = dueMedicationReminders([med], [], new Set(), NOW);
assert.equal(dueNow.length, 1, "a dose slot 2 minutes ago, unlogged, should be due");
assert.equal(dueNow[0].detailedBody.includes("Estradiol"), true);
assert.equal(dueNow[0].discreetBody.includes("Estradiol"), false, "discreet copy must never name the medication");

const alreadyNotified = dueMedicationReminders([med], [], new Set([dueNow[0].key]), NOW);
assert.equal(alreadyNotified.length, 0, "should not re-fire once notified");

const scheduledSlot = dueNow[0].key.split("medication:")[1];
const logged = dueMedicationReminders(
  [med],
  [
    {
      id: "log-1",
      medicationId: "med-1",
      scheduledTime: scheduledSlot,
      status: "taken",
      loggedAt: NOW.toISOString(),
      note: null,
      updatedAt: NOW.toISOString(),
    },
  ],
  new Set(),
  NOW
);
assert.equal(logged.length, 0, "should not fire once the dose is logged");

const tooOld = dueMedicationReminders(
  [{ ...med, frequency: { times: [localHHMM(-10)], days: null } }],
  [],
  new Set(),
  NOW
);
assert.equal(tooOld.length, 0, "a slot outside the 5-minute grace window should not fire");

const futureSlot = dueMedicationReminders(
  [{ ...med, frequency: { times: [localHHMM(5)], days: null } }],
  [],
  new Set(),
  NOW
);
assert.equal(futureSlot.length, 0, "a slot that hasn't arrived yet should not fire");

const appt = {
  id: "appt-1",
  title: "Clinic",
  appointmentAt: "2026-07-16T13:00:00.000Z",
  location: null,
  preparationNote: null,
  outcomeNote: null,
  rescheduledFrom: null,
  reminderMinutesBefore: 62,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};
const dueAppt = dueAppointmentReminders([appt], new Set(), NOW);
assert.equal(dueAppt.length, 1, "reminder 62 min before appointmentAt should be due 2 minutes before NOW");
assert.equal(dueAppt[0].discreetBody.includes("Clinic"), false, "discreet appointment copy must stay discreet");
assert.equal(dueAppt[0].detailedBody.includes("Clinic"), true);

const noReminderSet = dueAppointmentReminders([{ ...appt, reminderMinutesBefore: null }], new Set(), NOW);
assert.equal(noReminderSet.length, 0, "no reminder configured should never fire");

const past = dueAppointmentReminders([{ ...appt, appointmentAt: "2026-07-16T11:00:00.000Z" }], new Set(), NOW);
assert.equal(past.length, 0, "an appointment already in the past should not fire");

console.log("reminders.ts tests passed");
