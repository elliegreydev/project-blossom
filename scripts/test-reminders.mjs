import assert from "node:assert/strict";
import { dueMedicationReminders, dueAppointmentReminders, isQuietHours } from "../src/lib/reminders.ts";

const NOW = new Date("2026-07-16T12:00:00.000Z");

// Medication frequencies are local wall-clock "HH:MM" strings (see
// scheduledSlotsToday), so build them relative to NOW's own local
// hour/minute rather than hardcoding UTC-derived values - otherwise this
// test's pass/fail would depend on the machine's timezone.
function localHHMM(offsetMinutes) {
  const d = new Date(NOW.getTime() + offsetMinutes * 60 * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function localDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const med = {
  id: "med-1",
  name: "Estradiol",
  route: "gel",
  unit: null,
  frequency: { times: [localHHMM(-2)], days: null, intervalDays: null, anchorDate: null },
  active: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const dueNow = dueMedicationReminders([med], [], [], NOW);
assert.equal(dueNow.length, 1, "a dose slot 2 minutes ago, unlogged, should be due");
assert.equal(dueNow[0].key.startsWith("medication:med-1|"), true, "key should carry the medication id, so a notification action knows which med to log");
assert.equal(dueNow[0].detailedBody.includes("Estradiol"), true);
assert.equal(dueNow[0].discreetBody.includes("Estradiol"), false, "discreet copy must never name the medication");

const alreadyNotified = dueMedicationReminders(
  [med],
  [],
  [{ key: dueNow[0].key, firedAt: NOW.toISOString(), count: 1, snoozedUntil: null }],
  NOW
);
assert.equal(alreadyNotified.length, 0, "should not re-fire immediately after the first notification");

const renagDue = dueMedicationReminders(
  [med],
  [],
  [{ key: dueNow[0].key, firedAt: new Date(NOW.getTime() - 46 * 60 * 1000).toISOString(), count: 1, snoozedUntil: null }],
  NOW
);
assert.equal(renagDue.length, 1, "should re-fire 46 minutes after the first notification if still unlogged");

const cappedOut = dueMedicationReminders(
  [med],
  [],
  [{ key: dueNow[0].key, firedAt: new Date(NOW.getTime() - 46 * 60 * 1000).toISOString(), count: 3, snoozedUntil: null }],
  NOW
);
assert.equal(cappedOut.length, 0, "should stop re-nagging once it hits the notification cap");

const snoozed = dueMedicationReminders(
  [med],
  [],
  [{ key: dueNow[0].key, firedAt: NOW.toISOString(), count: 1, snoozedUntil: new Date(NOW.getTime() + 10 * 60 * 1000).toISOString() }],
  NOW
);
assert.equal(snoozed.length, 0, "should stay quiet while snoozed");

const snoozeElapsed = dueMedicationReminders(
  [med],
  [],
  [{ key: dueNow[0].key, firedAt: NOW.toISOString(), count: 1, snoozedUntil: new Date(NOW.getTime() - 1000).toISOString() }],
  NOW
);
assert.equal(snoozeElapsed.length, 1, "should fire again once a snooze period has elapsed");

const scheduledSlot = dueNow[0].key.split("|")[1];
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
  [],
  NOW
);
assert.equal(logged.length, 0, "should not fire once the dose is logged");

const stillWithinSixHours = dueMedicationReminders(
  [{ ...med, frequency: { times: [localHHMM(-5 * 60)], days: null, intervalDays: null, anchorDate: null } }],
  [],
  [],
  NOW
);
assert.equal(stillWithinSixHours.length, 1, "a slot from 5 hours ago should still be worth a reminder");

const tooOldNow = dueMedicationReminders(
  [{ ...med, frequency: { times: [localHHMM(-7 * 60)], days: null, intervalDays: null, anchorDate: null } }],
  [],
  [],
  NOW
);
assert.equal(tooOldNow.length, 0, "a slot from 7 hours ago is past the still-relevant window and should not fire");

const futureSlot = dueMedicationReminders(
  [{ ...med, frequency: { times: [localHHMM(5)], days: null, intervalDays: null, anchorDate: null } }],
  [],
  [],
  NOW
);
assert.equal(futureSlot.length, 0, "a slot that hasn't arrived yet should not fire");

// Every-N-days cadence.
const todayKey = localDateKey(NOW);
const intervalMed = {
  ...med,
  frequency: { times: [localHHMM(-2)], days: null, intervalDays: 5, anchorDate: todayKey },
};
const dueOnAnchorDay = dueMedicationReminders([intervalMed], [], [], NOW);
assert.equal(dueOnAnchorDay.length, 1, "an every-5-days dose should be due on its anchor date");

const fourDaysAfterAnchor = {
  ...intervalMed,
  frequency: { ...intervalMed.frequency, anchorDate: new Date(NOW.getTime() - 4 * 86400000).toISOString().slice(0, 10) },
};
const notDueMidCycle = dueMedicationReminders([fourDaysAfterAnchor], [], [], NOW);
assert.equal(notDueMidCycle.length, 0, "an every-5-days dose should not be due 4 days into the cycle");

const fiveDaysAfterAnchor = {
  ...intervalMed,
  frequency: { ...intervalMed.frequency, anchorDate: new Date(NOW.getTime() - 5 * 86400000).toISOString().slice(0, 10) },
};
const dueFiveDaysLater = dueMedicationReminders([fiveDaysAfterAnchor], [], [], NOW);
assert.equal(dueFiveDaysLater.length, 1, "an every-5-days dose should be due again exactly 5 days after the anchor");

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
const dueAppt = dueAppointmentReminders([appt], [], NOW);
assert.equal(dueAppt.length, 1, "reminder 62 min before appointmentAt should be due 2 minutes before NOW");
assert.equal(dueAppt[0].discreetBody.includes("Clinic"), false, "discreet appointment copy must stay discreet");
assert.equal(dueAppt[0].detailedBody.includes("Clinic"), true);

const noReminderSet = dueAppointmentReminders([{ ...appt, reminderMinutesBefore: null }], [], NOW);
assert.equal(noReminderSet.length, 0, "no reminder configured should never fire");

const past = dueAppointmentReminders([{ ...appt, appointmentAt: "2026-07-16T11:00:00.000Z" }], [], NOW);
assert.equal(past.length, 0, "an appointment already in the past should not fire");

// Server-side (the reminder cron) doesn't run in the user's own timezone, so
// dueMedicationReminders takes an explicit IANA zone and must honor it
// regardless of the machine's own system timezone. NOW is noon UTC, which is
// 08:00 in America/New_York (EDT, UTC-4) in July.
const nyMed = { ...med, frequency: { times: ["07:58"], days: null, intervalDays: null, anchorDate: null } };
const dueInNy = dueMedicationReminders([nyMed], [], [], NOW, "America/New_York");
assert.equal(dueInNy.length, 1, "07:58 local should be 2 minutes ago in America/New_York at this NOW");

const notDueInNy = dueMedicationReminders(
  [{ ...med, frequency: { times: ["11:58"], days: null, intervalDays: null, anchorDate: null } }],
  [],
  [],
  NOW,
  "America/New_York"
);
assert.equal(
  notDueInNy.length,
  0,
  "11:58 is hours away in America/New_York's local time at this NOW - the zone param must actually be used, not ignored"
);

// Regression: the cron calls dueMedicationReminders every few minutes with a
// fresh `now` that carries its own random seconds/ms. The timezone branch of
// scheduledSlotsToday used to bake that leftover sub-minute noise into the
// slot's identity (`now.getTime() + diffMinutes * 60000`), so the same
// overdue dose got a brand-new key - and therefore re-sent, bypassing all
// dedup - on every single cron tick instead of respecting the re-nag gate.
const driftMed = { ...med, frequency: { times: ["07:58"], days: null, intervalDays: null, anchorDate: null } };
const run1 = dueMedicationReminders([driftMed], [], [], new Date("2026-07-16T12:00:02.405Z"), "America/New_York");
const run2 = dueMedicationReminders([driftMed], [], [], new Date("2026-07-16T12:05:02.917Z"), "America/New_York");
assert.equal(run1.length, 1);
assert.equal(run2.length, 1);
assert.equal(run1[0].key, run2[0].key, "the same overdue dose slot must produce an identical key across cron ticks with different sub-minute jitter, or dedup silently breaks");

// Quiet hours - overnight window (22:00-07:00), local device time (no zone).
function atLocalTime(hh, mm) {
  const d = new Date(NOW);
  d.setHours(hh, mm, 0, 0);
  return d;
}

assert.equal(isQuietHours(atLocalTime(23, 0), true, "22:00", "07:00"), true, "23:00 is inside an overnight 22:00-07:00 window");
assert.equal(isQuietHours(atLocalTime(3, 0), true, "22:00", "07:00"), true, "03:00 is inside an overnight 22:00-07:00 window");
assert.equal(isQuietHours(atLocalTime(12, 0), true, "22:00", "07:00"), false, "midday is outside an overnight 22:00-07:00 window");
assert.equal(isQuietHours(atLocalTime(7, 0), true, "22:00", "07:00"), false, "the end boundary itself is not inside the window");
assert.equal(isQuietHours(atLocalTime(22, 0), true, "22:00", "07:00"), true, "the start boundary itself is inside the window");

// Same-day window (e.g. a 13:00-14:00 nap block), no midnight crossing.
assert.equal(isQuietHours(atLocalTime(13, 30), true, "13:00", "14:00"), true, "13:30 is inside a same-day 13:00-14:00 window");
assert.equal(isQuietHours(atLocalTime(15, 0), true, "13:00", "14:00"), false, "15:00 is outside a same-day 13:00-14:00 window");

// Disabled or unset never suppresses, regardless of time.
assert.equal(isQuietHours(atLocalTime(23, 0), false, "22:00", "07:00"), false, "disabled quiet hours never suppress");
assert.equal(isQuietHours(atLocalTime(23, 0), true, null, "07:00"), false, "no start time set never suppresses");

// timeZone param (server/cron path) - NOW is noon UTC, 08:00 in
// America/New_York in July, which is outside a 22:00-07:00 window.
assert.equal(isQuietHours(NOW, true, "22:00", "07:00", "America/New_York"), false, "08:00 America/New_York is outside 22:00-07:00");
assert.equal(isQuietHours(NOW, true, "07:00", "09:00", "America/New_York"), true, "08:00 America/New_York is inside 07:00-09:00");

console.log("reminders.ts tests passed");
