import {
  db,
  updateProfile,
  addMedication,
  createMedicationSupply,
  logDose,
  addAppointment,
  addMilestone,
  addJourneyEvent,
  addGoal,
  addJournalEntry,
  addCheckIn,
  addReferral,
  addReferralUpdate,
  addBloodTestEntry,
  addBodyEntry,
  addWeightEntry,
  addVoiceSession,
  addPresentationEntry,
  addBudgetEntry,
  addSupportMapEntry,
  addPrivateLink,
  updateSelfDirected,
  type ModuleKey,
} from "@/lib/db";

/**
 * Fill the DEV build with realistic demo data, so opening dev.projectblossom.net
 * lands on a full, lived-in app instead of empty screens.
 *
 * The dev build has no sign-in and no sync by design, so seeding on a server and
 * pulling it down is not an option here. This seeds the local database directly,
 * once, on a fresh device.
 *
 * Three guards keep it dev-only and non-destructive:
 *   - it runs ONLY where NEXT_PUBLIC_HQ_DEV_ENTRY is "1", which is the dev
 *     deployment alone; on production this returns immediately,
 *   - it runs ONLY when the database is empty, so it never overwrites data
 *     somebody actually entered,
 *   - it sets a flag afterwards, so clearing everything to test the empty state
 *     is respected rather than re-seeded on the next open.
 */

const SEED_FLAG = "blossom-dev-seeded-v1";

export function isDevBuild(): boolean {
  return process.env.NEXT_PUBLIC_HQ_DEV_ENTRY === "1";
}

/**
 * Put the app back to the state a stranger meets, so onboarding can be walked
 * again on demand. Dev only, and it refuses outright anywhere else.
 *
 * Two choices worth explaining. It reopens onboarding by clearing the two
 * fields the app checks, rather than by wiping the database, so a run-through
 * does not cost the seeded demo data every time. And it clears the seed flag,
 * because the interesting version of this walk is the one where Home is empty:
 * with the flag gone, deleting the data separately gets you a genuine first
 * run rather than a re-seeded one.
 */
export async function restartOnboardingForDev(): Promise<void> {
  if (!isDevBuild()) return;
  try {
    localStorage.removeItem(SEED_FLAG);
  } catch {
    // No storage is not a reason to refuse the rest.
  }
  await updateProfile({ onboardingCompletedAt: null, onboardingStep: 0 } as never);
}

// React StrictMode fires the boot effect twice in dev, so this can be called
// twice near-simultaneously. Without a guard both calls pass the empty-database
// check before either finishes, and the second run collides on the rows the
// first is still writing. Holding the in-flight promise means the actual work
// happens exactly once per page load, however many times we are called.
let seedPromise: Promise<void> | null = null;

const ALL_MODULES: ModuleKey[] = [
  "medication", "appointments", "journal", "goals", "journey", "bloodTests",
  "voicePractice", "presentation", "bodyProgress", "budget", "intimacy",
  "waitingList", "selfDirected",
];

// Days ago -> ISO. Local date-key for date-only fields.
function daysAgoIso(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function seedDevDataIfNeeded(): Promise<void> {
  if (!isDevBuild()) return Promise.resolve();
  if (!seedPromise) seedPromise = runSeed();
  return seedPromise;
}

async function runSeed(): Promise<void> {
  try {
    if (localStorage.getItem(SEED_FLAG)) return;
  } catch {
    return; // no storage, nothing we can safely do
  }

  // Only ever seed an empty app.
  const [meds, miles] = await Promise.all([db.medications.count(), db.milestones.count()]);
  if (meds > 0 || miles > 0) {
    try { localStorage.setItem(SEED_FLAG, "1"); } catch {}
    return;
  }

  try {
    // Profile: named, all modules on, onboarding skipped so it lands on Home.
    await updateProfile({
      displayName: "Ellie",
      pronouns: "she/her",
      hrtStatus: "on",
      enabledModules: ALL_MODULES,
      onboardingCompletedAt: new Date().toISOString(),
    } as never);

    // Medications with a real schedule, a supply, and a few logged doses.
    const estradiol = await addMedication({
      name: "Estradiol gel",
      route: "gel",
      unit: "pump",
      frequency: { times: ["09:00", "21:00"], days: [0, 1, 2, 3, 4, 5, 6] },
    } as never);
    await addMedication({
      name: "Finasteride",
      route: "tablet",
      unit: "mg",
      frequency: { times: ["09:00"], days: [0, 1, 2, 3, 4, 5, 6] },
    } as never);
    await createMedicationSupply({
      medicationId: estradiol.id,
      label: "Estradiol gel",
      quantity: 42,
      supplyUnit: "pump",
      amountPerDose: 2,
      lowSupplyDays: 7,
    } as never);
    for (let d = 1; d <= 5; d += 1) {
      await logDose({
        medicationId: estradiol.id,
        scheduledTime: `${dateKey(daysAgoIso(d))}T09:00:00.000Z`,
        status: "taken",
        note: null,
        injectionSite: null,
      } as never);
    }

    // Appointments.
    await addAppointment({ title: "Blood test", appointmentAt: `${dateKey(daysAgoIso(-3))}T10:30:00.000Z`, location: "Nottingham City Hospital", preparationNote: "Bring the request form." } as never);
    await addAppointment({ title: "Endocrinology review", appointmentAt: `${dateKey(daysAgoIso(-12))}T10:15:00.000Z`, location: "Nottingham City Hospital", preparationNote: "Questions: bloods, dose review." } as never);
    await addAppointment({ title: "GP appointment", appointmentAt: `${dateKey(daysAgoIso(20))}T09:00:00.000Z`, location: "The Surgery", preparationNote: null } as never);

    // Journey timeline.
    await addMilestone({ title: "Decided to start HRT", templateKey: null, category: "medical", eventDate: "2024-05-12", datePrecision: "exact", note: "A big, scary and exciting first step." } as never);
    await addMilestone({ title: "Came out to my best friend", templateKey: null, category: "social", eventDate: "2024-07-27", datePrecision: "exact", note: "It felt so good to be seen and supported." } as never);
    await addMilestone({ title: "First day presenting publicly", templateKey: null, category: "identity", eventDate: "2025-01-05", datePrecision: "exact", note: "A nervous day, but really proud of myself." } as never);
    await addMilestone({ title: "Name change deed poll sent", templateKey: null, category: "legal", eventDate: "2025-03-27", datePrecision: "exact", note: "Forms sent off and fingers crossed." } as never);
    await addMilestone({ title: "First blood test, 6 months in", templateKey: null, category: "medical", eventDate: "2025-05-16", datePrecision: "exact", note: "Looking forward to seeing the changes." } as never);
    await addJourneyEvent({ type: "note", title: "Voice practice starting to click", category: "identity", eventDate: "2025-06-30", datePrecision: "exact", note: "People on the phone are reading me right more often." } as never);

    // Goals.
    await addGoal({ title: "Get on the GIC waiting list", category: "medical", target: null } as never);
    await addGoal({ title: "Voice practice 3x a week", category: "identity", target: "3 times a week" } as never);
    await addGoal({ title: "Update passport", category: "legal", target: null } as never);

    // Journal.
    await addJournalEntry("First proper week on gel. Feeling hopeful, a bit anxious about bloods.");
    await addJournalEntry("Had coffee with Liv today. Laughed properly for the first time in ages.");
    await addJournalEntry("Rough day with dysphoria but the walk helped. Small wins.");

    // Check-ins across the week (mood 1-5).
    const checkins = [
      { mood: 4, note: "Good day." },
      { mood: 3, note: "Okay." },
      { mood: 5, note: "Really good, walk and Liv." },
      { mood: 2, note: "Tough, dysphoria." },
      { mood: 4, note: "Steady." },
      { mood: 3, note: "Fine." },
      { mood: 5, note: "Proud of myself." },
    ];
    for (const c of checkins) {
      await addCheckIn({ mood: c.mood, energy: c.mood, confidence: c.mood, stress: 6 - c.mood, comfort: c.mood, note: c.note, period: "day" } as never);
    }

    // Waiting list.
    const referral = await addReferral({ serviceName: "Nottingham Centre for Transgender Health", kind: "gender-clinic", referredOn: "2023-03-14", referredBy: "Dr Okafor", referenceNumber: "GIC-4471", status: "waiting", chaseEveryDays: 91, clinicIndexId: null } as never);
    await addReferralUpdate({ referralId: referral.id, happenedOn: dateKey(daysAgoIso(30)), kind: "chased", contactMethod: "phone", spokeTo: "Reception", body: "They said they are working through March 2021 referrals." } as never);

    // Blood tests.
    await addBloodTestEntry({ testName: "Oestradiol", date: "2025-05-16", value: "340", unit: "pmol/L", labSource: null, referenceRangeRaw: null, note: "First test, 6 months in." } as never);
    await addBloodTestEntry({ testName: "Testosterone", date: "2025-05-16", value: "0.8", unit: "nmol/L", labSource: null, referenceRangeRaw: null, note: null } as never);

    // Body + weight.
    await addBodyEntry({ date: dateKey(daysAgoIso(30)), measurements: [{ label: "Hips", value: "98" }, { label: "Waist", value: "80" }], photo: null, note: "Baseline." } as never);
    for (let d = 0; d <= 5; d += 1) {
      await addWeightEntry({ date: dateKey(daysAgoIso(d * 7)), weightGrams: 70000 - d * 150, note: null } as never);
    }

    // Voice + presentation.
    await addVoiceSession({ goalId: null, sessionDuration: 600, comfortRating: 3, note: "Warm-ups and reading aloud.", recording: null, pitchLowHz: 165, pitchHighHz: 220 } as never);
    await addVoiceSession({ goalId: null, sessionDuration: 720, comfortRating: 4, note: "Felt more natural today.", recording: null, pitchLowHz: 175, pitchHighHz: 230 } as never);
    await addPresentationEntry({ date: dateKey(daysAgoIso(5)), category: "outfit", note: "Wore the pink cardigan, felt like me.", photo: null, confidenceRating: 4, wantToTry: true } as never);

    // Budget.
    await addBudgetEntry({ category: "HRT", description: "Estradiol gel", amount: 2500, date: dateKey(daysAgoIso(20)) } as never);
    await addBudgetEntry({ category: "Voice", description: "Voice therapy session", amount: 4000, date: dateKey(daysAgoIso(12)) } as never);
    await addBudgetEntry({ category: "Clothing", description: "New wardrobe bits", amount: 6500, date: dateKey(daysAgoIso(6)) } as never);

    // Support map + saved links.
    await addSupportMapEntry({ name: "Liv", type: "person", labels: ["best friend", "safe"], contact: null, area: null, note: "Always there.", reviewOn: null, isFavourite: true } as never);
    await addSupportMapEntry({ name: "Nottingham LGBT+ Network", type: "group", labels: ["peer support"], contact: null, area: "Nottingham", note: "Monthly meetup.", reviewOn: null, isFavourite: false } as never);
    await addPrivateLink({ label: "TransActual: medical transition", url: "https://transactual.org.uk/medical-transition/", note: "Good plain guides." } as never);
    await addPrivateLink({ label: "Deed poll guide", url: "https://www.gov.uk/change-name-deed-poll", note: null } as never);

    // Self-directed care set up.
    await updateSelfDirected({ label: "Self-directed care", prescriberStatus: "monitored", hrtStartedOn: "2024-05-20", bloodCheckIntervalDays: 182, setupCompletedAt: new Date().toISOString() } as never);
  } finally {
    // Set the flag even if something above threw, so a partial seed does not
    // loop forever. A half-seeded dev app is a nuisance, not a disaster.
    try { localStorage.setItem(SEED_FLAG, "1"); } catch {}
  }
}
