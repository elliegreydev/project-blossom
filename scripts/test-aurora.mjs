import assert from "node:assert/strict";
import { selectAuroraSuggestion } from "../src/lib/aurora.ts";

const NOW = new Date("2026-07-13T12:00:00.000Z");

function context(overrides = {}) {
  return {
    now: NOW,
    profile: {
      auroraMode: "gentle",
      enabledModules: ["medication", "appointments", "journal", "goals", "journey"],
      createdAt: "2026-06-01T12:00:00.000Z",
      onboardingCompletedAt: "2026-06-01T12:00:00.000Z",
    },
    milestones: [],
    journeyEvents: [],
    medications: [],
    medicationLogs: [],
    appointments: [],
    journalEntries: [],
    checkIns: [],
    goals: [],
    nudgeStates: [],
    ...overrides,
  };
}

assert.equal(
  selectAuroraSuggestion(context({ profile: { ...context().profile, auroraMode: "disabled" } })),
  null,
  "disabled mode should never surface a suggestion"
);

assert.equal(
  selectAuroraSuggestion(context({ profile: { ...context().profile, auroraMode: "quiet" } })),
  null,
  "quiet mode should not place suggestions on Home"
);

const appointment = selectAuroraSuggestion(
  context({
    appointments: [
      {
        id: "appointment-1",
        title: "Clinic",
        appointmentAt: "2026-07-14T09:00:00.000Z",
        location: null,
        preparationNote: null,
        outcomeNote: null,
        rescheduledFrom: null,
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    ],
  })
);
assert.equal(appointment?.kind, "appointment", "upcoming appointments should take priority");
assert.equal(appointment?.message.includes("Clinic"), false, "appointment copy should stay discreet");

const gentleRecentCheckIn = selectAuroraSuggestion(
  context({
    milestones: [{ id: "started" }],
    checkIns: [{ createdAt: "2026-07-03T12:00:00.000Z" }],
  })
);
assert.equal(gentleRecentCheckIn, null, "gentle mode should not nudge again inside 14 days");

const supportiveCheckIn = selectAuroraSuggestion(
  context({
    profile: { ...context().profile, auroraMode: "supportive" },
    milestones: [{ id: "started" }],
    checkIns: [{ createdAt: "2026-07-03T12:00:00.000Z" }],
  })
);
assert.equal(supportiveCheckIn?.kind, "wellbeing", "supportive mode should check in more often");

const cooledDownJourney = selectAuroraSuggestion(
  context({
    nudgeStates: [
      { nudgeKey: "first_milestone", lastShownAt: "2026-07-10T12:00:00.000Z", dismissedCount: 1 },
    ],
  })
);
assert.equal(cooledDownJourney?.kind, "wellbeing", "a dismissed Journey nudge should yield to another rule");

const supportiveMedication = selectAuroraSuggestion(
  context({
    profile: { ...context().profile, auroraMode: "supportive" },
    milestones: [{ id: "started" }],
    journalEntries: [{ createdAt: "2026-07-13T08:00:00.000Z" }],
    medications: [
      {
        id: "medication-1",
        name: "Private medication",
        route: "tablet",
        unit: null,
        frequency: { times: ["11:00"], days: null },
        active: true,
        createdAt: "2026-07-01T12:00:00.000Z",
        updatedAt: "2026-07-01T12:00:00.000Z",
      },
    ],
  })
);
assert.equal(supportiveMedication?.kind, "medication", "supportive mode should notice an open log");
assert.equal(
  supportiveMedication?.message.includes("Private medication"),
  false,
  "medication copy should never expose the medication name"
);

console.log("Aurora rule tests passed");
