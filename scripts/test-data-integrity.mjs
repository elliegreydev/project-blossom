import assert from "node:assert/strict";

/**
 * Does the data actually survive?
 *
 * The security work made sure nobody else can reach a user's data. This makes
 * sure the app itself does not lose or mangle it, which for a local-first health
 * app is the bigger day-to-day risk. It runs the real Dexie code against an
 * in-memory IndexedDB (fake-indexeddb), so it exercises the same functions the
 * app calls, not a reimplementation.
 *
 * Three things it proves:
 *   1. the core flows a person actually uses round-trip correctly,
 *   2. data written survives closing and reopening the database,
 *   3. an export can be wiped and re-imported with nothing lost.
 *
 * The delete-everything button was broken for weeks because no test ever ran
 * these paths. Now one does.
 */

const db = await import("@/lib/db.ts");

let failures = 0;
async function section(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`         ${err.message.split("\n")[0]}`);
  }
}

// 1. CORE FLOWS ------------------------------------------------------------
await section("a profile exists after first open", async () => {
  const profile = await db.getOrCreateProfile();
  assert.equal(profile.id, "local");
});

await section("add a medication and log a dose", async () => {
  const med = await db.addMedication({
    name: "Estradiol gel",
    route: "gel",
    unit: "pump",
    frequency: "daily",
  });
  assert.ok(med.id, "medication got an id");
  const stored = await db.db.medications.get(med.id);
  assert.equal(stored.name, "Estradiol gel");

  await db.logDose({
    medicationId: med.id,
    scheduledTime: "2026-08-24T09:00:00.000Z",
    status: "taken",
    note: null,
  });
  const logs = await db.db.medicationLogs.where("medicationId").equals(med.id).toArray();
  assert.equal(logs.length, 1, "exactly one dose logged");
  assert.equal(logs[0].status, "taken");
});

await section("add a referral and chase it", async () => {
  const ref = await db.addReferral({
    serviceName: "Gender Identity Clinic",
    kind: "gender-clinic",
    referredOn: "2023-03-14",
    referredBy: "Dr Okafor",
    referenceNumber: "GIC-4471",
    status: "waiting",
    chaseEveryDays: 91,
    clinicIndexId: null,
  });
  await db.addReferralUpdate({
    referralId: ref.id,
    happenedOn: "2026-08-24",
    kind: "chased",
    body: "Rang reception, working through March 2021.",
  });
  const updates = await db.db.referralUpdates.where("referralId").equals(ref.id).toArray();
  assert.equal(updates.length, 1);
});

await section("journal entry add, edit, delete", async () => {
  await db.addJournalEntry("First entry.");
  let entries = await db.db.journalEntries.toArray();
  assert.equal(entries.length, 1);
  const id = entries[0].id;

  await db.updateJournalEntry(id, "Edited entry.");
  const edited = await db.db.journalEntries.get(id);
  assert.equal(edited.bodyText, "Edited entry.", "edit persisted");

  await db.deleteJournalEntry(id);
  entries = await db.db.journalEntries.filter((e) => !e.deletedAt).toArray();
  assert.equal(entries.length, 0, "entry gone after delete");
});

// 2. EXPORT -> WIPE -> IMPORT ROUND-TRIP -----------------------------------
// This also exercises deleteAllData, the button that was silently broken.
await section("export, wipe, and re-import loses nothing", async () => {
  const before = await db.exportAllData();

  const countMeaningful = (payload) =>
    Object.entries(payload).reduce((total, [key, value]) => {
      if (key === "exportedAt" || key === "version" || key === "profile") return total;
      return total + (Array.isArray(value) ? value.length : 0);
    }, 0);

  const rowsBefore = countMeaningful(before);
  assert.ok(rowsBefore > 0, "there is data to round-trip");

  await db.deleteAllData();
  const afterWipe = await db.exportAllData();
  assert.equal(countMeaningful(afterWipe), 0, "wipe actually cleared the data");

  // The exact section identifiers from DataExportSection, minus "profile"
  // (which mergeBlossomImport excludes). Getting one wrong silently drops that
  // section, which is exactly the kind of quiet loss this test exists to catch.
  const ALL_SECTIONS = [
    "journey", "medications", "appointments", "waitingList", "selfDirected",
    "journal", "goals", "health", "voiceAndPresentation", "euphoriaAndSocial",
    "budget", "savedLinks", "supportMap", "intimacy",
  ];
  await db.mergeBlossomImport(before, ALL_SECTIONS);

  const after = await db.exportAllData();
  assert.equal(
    countMeaningful(after),
    rowsBefore,
    `row count after round-trip (${countMeaningful(after)}) must equal before (${rowsBefore})`
  );

  // Spot-check that specific records came back intact, not just the count.
  const meds = await db.db.medications.toArray();
  assert.ok(meds.some((m) => m.name === "Estradiol gel"), "the medication survived the round-trip");
  const refs = await db.db.referrals.toArray();
  assert.ok(refs.some((r) => r.referenceNumber === "GIC-4471"), "the referral survived the round-trip");
});

// 3. PERSISTENCE ACROSS A REOPEN -------------------------------------------
await section("data survives closing and reopening the database", async () => {
  const idsBefore = (await db.db.medications.toArray()).map((m) => m.id).sort();
  await db.db.close();
  await db.db.open();
  const idsAfter = (await db.db.medications.toArray()).map((m) => m.id).sort();
  assert.deepEqual(idsAfter, idsBefore, "medications identical after reopen");
});

console.log(
  failures === 0
    ? "  all data-integrity checks passed"
    : `  ${failures} data-integrity check(s) failed`
);
process.exit(failures === 0 ? 0 : 1);
