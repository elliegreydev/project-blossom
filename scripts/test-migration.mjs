import assert from "node:assert/strict";
import Dexie from "dexie";

/**
 * Does data survive the schema upgrades?
 *
 * Blossom's local database has been through 30 schema versions, eleven of which
 * run an upgrade callback that rewrites existing rows. Somebody who has used the
 * app since the early days has passed through every one. If any of those
 * migrations dropped or mangled a field, their transition history was quietly
 * damaged and nothing would have told them.
 *
 * This seeds a database at an old version with the real Dexie engine, then lets
 * the current app open it, which makes Dexie run every intervening upgrade over
 * the seeded data, exactly as it does on a real device after an update. Then it
 * checks the old data is still there and still itself.
 *
 * It runs BEFORE importing the app's db module, because that module opens the
 * database as a side effect; the seed has to be in place first.
 */

const DB_NAME = "blossom";

// The seed database declares the app's real early schema, versions 1 to 3
// verbatim, so Dexie sees a consistent history and then upgrades 4..30 over it.
// medications, journalEntries and checkIns first appear at version 3, so an
// honest "old user" seed puts data there, not at version 1 where those tables
// did not yet exist.
const OLD_VERSION = 3;
const seededMedId = "mig-med-0001";

async function seedOldDatabase() {
  const old = new Dexie(DB_NAME);
  old.version(1).stores({ profiles: "id" });
  old.version(2).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
  });
  old.version(3).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    checkIns: "id, createdAt",
    goals: "id, status",
  });
  await old.open();
  const now = "2024-01-01T00:00:00.000Z";
  await old.table("profiles").put({ id: "local", createdAt: now });
  await old.table("medications").put({
    id: seededMedId,
    name: "Old Estradiol",
    createdAt: now,
  });
  await old.table("journalEntries").put({
    id: "mig-journal-0001",
    bodyText: "Written years ago.",
    createdAt: now,
  });
  // A check-in with no updatedAt, exactly as an early row would be before the
  // field existed. A later upgrade backfills updatedAt ??= createdAt, so this
  // row proves the transforming migrations run over pre-existing data.
  await old.table("checkIns").put({
    id: "mig-checkin-0001",
    createdAt: now,
  });
  await old.close();
}

await seedOldDatabase();

// Now let the current app open the same database. Reading anything triggers the
// open, which runs every upgrade from version 1 to 30 over the seeded rows.
const app = await import("@/lib/db.ts");

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.log(`  FAIL ${name}`);
    console.log(`         ${err.message.split("\n")[0]}`);
  }
}

await check("the database opens cleanly at the current version", async () => {
  await app.db.open();
  assert.equal(app.db.verno, 30, "opened at version 30");
});

await check("a medication seeded at version 3 survives to version 30", async () => {
  const med = await app.db.medications.get(seededMedId);
  assert.ok(med, "the old medication still exists after all upgrades");
  assert.equal(med.name, "Old Estradiol", "its name was not mangled");
  assert.equal(med.createdAt, "2024-01-01T00:00:00.000Z", "its original date is intact");
});

await check("a journal entry seeded at version 3 survives", async () => {
  const entry = await app.db.journalEntries.get("mig-journal-0001");
  assert.ok(entry, "the old journal entry still exists");
  assert.equal(entry.bodyText, "Written years ago.", "its text was not lost");
});

await check("a transforming upgrade ran over the old rows, not just new ones", async () => {
  // The v-early upgrade sets updatedAt ??= createdAt on check-ins that predate
  // the field. If it ran over existing data, the seeded row now carries it.
  const checkIn = await app.db.checkIns.get("mig-checkin-0001");
  assert.ok(checkIn, "the old check-in survived");
  assert.equal(
    checkIn.updatedAt,
    "2024-01-01T00:00:00.000Z",
    "updatedAt was backfilled from createdAt on the pre-existing row"
  );
});

await check("the profile survives and gains its later fields", async () => {
  const profile = await app.db.profiles.get("local");
  assert.ok(profile, "the profile from version 1 still exists");
  // A later version backfills the Home layout onto every existing profile.
  assert.ok(
    profile.homePhoneLayout !== undefined,
    "a field added by a later migration was backfilled onto the old profile"
  );
});

console.log(
  failures === 0
    ? "  all migration checks passed: 30 versions, no data lost"
    : `  ${failures} migration check(s) failed`
);
process.exit(failures === 0 ? 0 : 1);
