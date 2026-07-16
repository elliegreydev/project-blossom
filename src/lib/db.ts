import Dexie, { type EntityTable } from "dexie";

export type AuroraMode = "quiet" | "gentle" | "supportive" | "disabled";
export type HrtStatus = "on" | "considering" | "not_tracking" | null;
export type ReminderPrivacy = "discreet" | "detailed";

export type ModuleKey =
  | "medication"
  | "appointments"
  | "journal"
  | "goals"
  | "journey";

export interface Profile {
  id: string;
  displayName: string | null;
  pronouns: string | null;
  region: string | null;
  dateFormat: string | null;
  hrtStatus: HrtStatus;
  enabledModules: ModuleKey[];
  auroraMode: AuroraMode;
  reminderPrivacy: ReminderPrivacy;
  sensitiveModulesLocked: boolean;
  syncEnabled: boolean;
  ageConfirmedAt: string | null;
  onboardingCompletedAt: string | null;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
  // Privacy & security. Device-local only - never synced, so a PIN or
  // accessibility preference set on one device never applies to another.
  appLockEnabled: boolean;
  appLockPinHash: string | null;
  // Accessibility
  reduceMotion: boolean;
  textSize: "normal" | "large" | "larger";
}

export type DatePrecision = "exact" | "approximate" | "none";
export type JourneyCategory =
  | "identity"
  | "medical"
  | "legal"
  | "social"
  | "voice_presentation";

export interface Milestone {
  id: string;
  title: string;
  templateKey: string | null;
  category: JourneyCategory | null;
  eventDate: string | null; // ISO date, or free text when precision is "approximate"
  datePrecision: DatePrecision;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyEvent {
  id: string;
  type: string;
  title: string;
  category: JourneyCategory | null;
  eventDate: string | null;
  datePrecision: DatePrecision;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuroraNudgeState {
  nudgeKey: string;
  lastShownAt: string;
  dismissedCount: number;
}

// Medication ------------------------------------------------------------------

export type MedicationRoute =
  | "tablet"
  | "injection"
  | "patch"
  | "gel"
  | "spray"
  | "implant"
  | "cream"
  | "blocker"
  | "other";

// days: null means every day; otherwise 0-6 (Sun-Sat). times: "HH:MM" strings.
export interface MedicationFrequency {
  times: string[];
  days: number[] | null;
}

export interface Medication {
  id: string;
  name: string;
  route: MedicationRoute | null;
  unit: string | null;
  frequency: MedicationFrequency | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = "taken" | "skipped" | "delayed" | "not_logged";

export interface MedicationLog {
  id: string;
  medicationId: string;
  scheduledTime: string | null; // ISO of the intended dose slot, if scheduled
  status: DoseStatus;
  loggedAt: string;
  note: string | null;
  updatedAt: string;
}

// Appointments ----------------------------------------------------------------

export interface Appointment {
  id: string;
  title: string;
  appointmentAt: string; // ISO datetime
  location: string | null;
  preparationNote: string | null;
  outcomeNote: string | null;
  rescheduledFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

// Wellbeing -------------------------------------------------------------------
// Journal entries are never synced (see src/lib/sync.ts's SyncEntity list) -
// they stay local-only until Blossom has real end-to-end encryption.

export interface JournalEntry {
  id: string;
  bodyText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  id: string;
  mood: number | null;
  energy: number | null;
  confidence: number | null;
  stress: number | null;
  comfort: number | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// Goals -----------------------------------------------------------------------

export type GoalStatus = "active" | "completed" | "archived";

export interface Goal {
  id: string;
  title: string;
  category: JourneyCategory | null;
  target: string | null;
  status: GoalStatus;
  convertedToMilestoneId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// Private links (the user's own saved resources, separate from the curated
// region resources list) ------------------------------------------------------

export interface PrivateLink {
  id: string;
  label: string;
  url: string;
  note: string | null;
  createdAt: string;
}

// Sync (optional account sync; see src/lib/sync.ts) ----------------------------

export type SyncEntity =
  | "profile"
  | "milestone"
  | "journey_event"
  | "medication"
  | "medication_log"
  | "appointment"
  | "check_in"
  | "goal"
  | "aurora_nudge";

export interface SyncOutboxItem {
  id: string;
  entity: SyncEntity;
  recordId: string;
  operation: "upsert" | "delete";
  changedAt: string;
  attempts: number;
  lastError: string | null;
}

export interface SyncState {
  key: "sync";
  ownerId: string | null;
  deviceId: string;
  lastPulledAt: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  syncing: boolean;
}

type BlossomDb = Dexie & {
  profiles: EntityTable<Profile, "id">;
  milestones: EntityTable<Milestone, "id">;
  journeyEvents: EntityTable<JourneyEvent, "id">;
  auroraNudges: EntityTable<AuroraNudgeState, "nudgeKey">;
  medications: EntityTable<Medication, "id">;
  medicationLogs: EntityTable<MedicationLog, "id">;
  appointments: EntityTable<Appointment, "id">;
  journalEntries: EntityTable<JournalEntry, "id">;
  checkIns: EntityTable<CheckIn, "id">;
  goals: EntityTable<Goal, "id">;
  privateLinks: EntityTable<PrivateLink, "id">;
  syncOutbox: EntityTable<SyncOutboxItem, "id">;
  syncMeta: EntityTable<SyncState, "key">;
};

function createDb(): BlossomDb {
  const instance = new Dexie("blossom") as BlossomDb;
  instance.version(1).stores({
    profiles: "id",
  });
  instance.version(2).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
  });
  instance.version(3).stores({
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
  instance.version(4).stores({
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
    privateLinks: "id",
  });
  // A previously-declared version's .stores() must never change once it has
  // shipped, so sync support is added as its own version rather than mutating
  // version(4) in place.
  instance.version(5).stores({
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
    privateLinks: "id",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  }).upgrade(async (tx) => {
    await tx.table("profiles").toCollection().modify((profile: Profile) => {
      profile.updatedAt ??= profile.createdAt;
    });
    await tx.table("medicationLogs").toCollection().modify((log: MedicationLog) => {
      log.updatedAt ??= log.loggedAt;
    });
    await tx.table("checkIns").toCollection().modify((checkIn: CheckIn) => {
      checkIn.updatedAt ??= checkIn.createdAt;
    });
  });
  return instance;
}

// Next.js dev/HMR re-runs this module without unloading the previous
// Dexie instance, which opens a second IndexedDB connection and blocks
// the version upgrade forever. Stash the instance on globalThis so HMR
// reuses it instead of creating a competing connection.
const globalForDb = globalThis as unknown as { __blossomDb?: BlossomDb };

export const db = globalForDb.__blossomDb ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__blossomDb = db;
}

export const LOCAL_PROFILE_ID = "local";

export const DEFAULT_PROFILE: Profile = {
  id: LOCAL_PROFILE_ID,
  displayName: null,
  pronouns: null,
  region: null,
  dateFormat: null,
  hrtStatus: null,
  enabledModules: ["medication", "appointments", "journal", "goals", "journey"],
  auroraMode: "gentle",
  reminderPrivacy: "discreet",
  sensitiveModulesLocked: false,
  syncEnabled: false,
  ageConfirmedAt: null,
  onboardingCompletedAt: null,
  onboardingStep: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  appLockEnabled: false,
  appLockPinHash: null,
  reduceMotion: false,
  textSize: "normal",
};

export async function getOrCreateProfile(): Promise<Profile> {
  const existing = await db.profiles.get(LOCAL_PROFILE_ID);
  if (!existing) {
    await db.profiles.add(DEFAULT_PROFILE);
    return DEFAULT_PROFILE;
  }
  // Backfill fields added in later schema versions for profiles created
  // before they existed, so the UI never has to guard against undefined.
  const backfill: Partial<Profile> = {};
  if (existing.appLockEnabled === undefined) backfill.appLockEnabled = false;
  if (existing.appLockPinHash === undefined) backfill.appLockPinHash = null;
  if (existing.reduceMotion === undefined) backfill.reduceMotion = false;
  if (existing.textSize === undefined) backfill.textSize = "normal";
  if (existing.updatedAt === undefined) backfill.updatedAt = existing.createdAt;
  if (Object.keys(backfill).length > 0) {
    await db.profiles.update(LOCAL_PROFILE_ID, backfill);
    return { ...existing, ...backfill };
  }
  return existing;
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.profiles, db.syncOutbox, async () => {
    await db.profiles.update(LOCAL_PROFILE_ID, { ...patch, updatedAt: changedAt });
    await recordSyncChange("profile", LOCAL_PROFILE_ID, "upsert", changedAt);
  });
}

function newId(): string {
  return crypto.randomUUID();
}

export async function recordSyncChange(
  entity: SyncEntity,
  recordId: string,
  operation: SyncOutboxItem["operation"],
  changedAt = new Date().toISOString()
): Promise<void> {
  await db.syncOutbox.put({
    id: `${entity}:${recordId}`,
    entity,
    recordId,
    operation,
    changedAt,
    attempts: 0,
    lastError: null,
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("blossom:sync-needed"));
  }
}

export async function getOrCreateSyncState(): Promise<SyncState> {
  const existing = await db.syncMeta.get("sync");
  if (existing) return existing;
  const state: SyncState = {
    key: "sync",
    ownerId: null,
    deviceId: newId(),
    lastPulledAt: null,
    lastSyncedAt: null,
    lastError: null,
    syncing: false,
  };
  await db.syncMeta.add(state);
  return state;
}

export async function addMilestone(
  input: Pick<Milestone, "title" | "templateKey" | "category" | "eventDate" | "datePrecision" | "note">
): Promise<Milestone> {
  const now = new Date().toISOString();
  const milestone: Milestone = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.transaction("rw", db.milestones, db.syncOutbox, async () => {
    await db.milestones.add(milestone);
    await recordSyncChange("milestone", milestone.id, "upsert", now);
  });
  return milestone;
}

export async function updateMilestone(id: string, patch: Partial<Milestone>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.milestones, db.syncOutbox, async () => {
    await db.milestones.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("milestone", id, "upsert", changedAt);
  });
}

export async function deleteMilestone(id: string): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.milestones, db.syncOutbox, async () => {
    await db.milestones.delete(id);
    await recordSyncChange("milestone", id, "delete", changedAt);
  });
}

export async function addJourneyEvent(
  input: Pick<JourneyEvent, "type" | "title" | "category" | "eventDate" | "datePrecision" | "note">
): Promise<JourneyEvent> {
  const now = new Date().toISOString();
  const event: JourneyEvent = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.transaction("rw", db.journeyEvents, db.syncOutbox, async () => {
    await db.journeyEvents.add(event);
    await recordSyncChange("journey_event", event.id, "upsert", now);
  });
  return event;
}

export async function dismissAuroraNudge(nudgeKey: string): Promise<void> {
  const existing = await db.auroraNudges.get(nudgeKey);
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.auroraNudges, db.syncOutbox, async () => {
    await db.auroraNudges.put({
      nudgeKey,
      lastShownAt: changedAt,
      dismissedCount: (existing?.dismissedCount ?? 0) + 1,
    });
    await recordSyncChange("aurora_nudge", nudgeKey, "upsert", changedAt);
  });
}

// Medication ------------------------------------------------------------------

export async function addMedication(
  input: Pick<Medication, "name" | "route" | "unit" | "frequency">
): Promise<Medication> {
  const now = new Date().toISOString();
  const medication: Medication = {
    id: newId(),
    active: true,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  await db.transaction("rw", db.medications, db.syncOutbox, async () => {
    await db.medications.add(medication);
    await recordSyncChange("medication", medication.id, "upsert", now);
  });
  return medication;
}

export async function updateMedication(id: string, patch: Partial<Medication>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.medications, db.syncOutbox, async () => {
    await db.medications.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("medication", id, "upsert", changedAt);
  });
}

export async function logDose(
  input: Pick<MedicationLog, "medicationId" | "scheduledTime" | "status" | "note">
): Promise<void> {
  const changedAt = new Date().toISOString();
  const log: MedicationLog = { id: newId(), loggedAt: changedAt, updatedAt: changedAt, ...input };
  await db.transaction("rw", db.medicationLogs, db.syncOutbox, async () => {
    await db.medicationLogs.add(log);
    await recordSyncChange("medication_log", log.id, "upsert", changedAt);
  });
}

// Appointments ----------------------------------------------------------------

export async function addAppointment(
  input: Pick<Appointment, "title" | "appointmentAt" | "location" | "preparationNote">
): Promise<Appointment> {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: newId(),
    outcomeNote: null,
    rescheduledFrom: null,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  await db.transaction("rw", db.appointments, db.syncOutbox, async () => {
    await db.appointments.add(appointment);
    await recordSyncChange("appointment", appointment.id, "upsert", now);
  });
  return appointment;
}

export async function updateAppointment(id: string, patch: Partial<Appointment>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.appointments, db.syncOutbox, async () => {
    await db.appointments.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("appointment", id, "upsert", changedAt);
  });
}

// Wellbeing -------------------------------------------------------------------

export async function addJournalEntry(bodyText: string): Promise<void> {
  const now = new Date().toISOString();
  await db.journalEntries.add({ id: newId(), bodyText, createdAt: now, updatedAt: now });
}

export async function addCheckIn(
  input: Pick<CheckIn, "mood" | "energy" | "confidence" | "stress" | "comfort" | "note">
): Promise<void> {
  const changedAt = new Date().toISOString();
  const checkIn: CheckIn = { id: newId(), createdAt: changedAt, updatedAt: changedAt, ...input };
  await db.transaction("rw", db.checkIns, db.syncOutbox, async () => {
    await db.checkIns.add(checkIn);
    await recordSyncChange("check_in", checkIn.id, "upsert", changedAt);
  });
}

// Goals -----------------------------------------------------------------------

export async function addGoal(
  input: Pick<Goal, "title" | "category" | "target">
): Promise<Goal> {
  const now = new Date().toISOString();
  const goal: Goal = {
    id: newId(),
    status: "active",
    convertedToMilestoneId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    ...input,
  };
  await db.transaction("rw", db.goals, db.syncOutbox, async () => {
    await db.goals.add(goal);
    await recordSyncChange("goal", goal.id, "upsert", now);
  });
  return goal;
}

export async function updateGoal(id: string, patch: Partial<Goal>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.goals, db.syncOutbox, async () => {
    await db.goals.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("goal", id, "upsert", changedAt);
  });
}

// Complete a goal and, if asked, enshrine it as a milestone (something that
// happened). Returns the new milestone id when one is created.
export async function completeGoal(id: string, asMilestone: boolean): Promise<void> {
  const goal = await db.goals.get(id);
  if (!goal) return;
  let milestoneId: string | null = null;
  if (asMilestone) {
    const milestone = await addMilestone({
      title: goal.title,
      templateKey: null,
      category: goal.category,
      eventDate: new Date().toISOString().slice(0, 10),
      datePrecision: "exact",
      note: null,
    });
    milestoneId = milestone.id;
  }
  await updateGoal(id, {
    status: "completed",
    completedAt: new Date().toISOString(),
    convertedToMilestoneId: milestoneId,
  });
}

// Given a medication's schedule, list the dose slots expected today as ISO
// datetimes. Empty when the med has no schedule or isn't scheduled for today.
export function dueDosesToday(med: Medication, now: Date): string[] {
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

// Private links -----------------------------------------------------------------
// Deliberately not synced - these are per-device saved resources, not part
// of the SyncEntity list.

export async function addPrivateLink(
  input: Pick<PrivateLink, "label" | "url" | "note">
): Promise<void> {
  await db.privateLinks.add({ id: newId(), createdAt: new Date().toISOString(), ...input });
}

export async function deletePrivateLink(id: string): Promise<void> {
  await db.privateLinks.delete(id);
}

// App lock (PIN) ------------------------------------------------------------------
// The PIN is never stored in plain text, only a SHA-256 hash. This protects
// against casual/local snooping (e.g. someone opening IndexedDB devtools) but
// is not cryptographic-grade security - it can't be, since verification has
// to happen fully offline with no server. Good enough for "someone picks up
// my phone", not meant to withstand a determined attacker with device access.
async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(pin);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setAppLockPin(pin: string): Promise<void> {
  const hash = await hashPin(pin);
  await updateProfile({ appLockEnabled: true, appLockPinHash: hash });
}

export async function disableAppLock(): Promise<void> {
  await updateProfile({ appLockEnabled: false, appLockPinHash: null });
}

export async function verifyAppLockPin(pin: string): Promise<boolean> {
  const profile = await db.profiles.get(LOCAL_PROFILE_ID);
  if (!profile?.appLockPinHash) return true;
  const hash = await hashPin(pin);
  return hash === profile.appLockPinHash;
}

// Data export / deletion -----------------------------------------------------------

export async function exportAllData(): Promise<Record<string, unknown>> {
  const [
    profile,
    milestones,
    journeyEvents,
    medications,
    medicationLogs,
    appointments,
    journalEntries,
    checkIns,
    goals,
    privateLinks,
  ] = await Promise.all([
    db.profiles.get(LOCAL_PROFILE_ID),
    db.milestones.toArray(),
    db.journeyEvents.toArray(),
    db.medications.toArray(),
    db.medicationLogs.toArray(),
    db.appointments.toArray(),
    db.journalEntries.toArray(),
    db.checkIns.toArray(),
    db.goals.toArray(),
    db.privateLinks.toArray(),
  ]);
  // appLockPinHash is deliberately excluded - it's a security credential,
  // not personal data the user needs back in an export.
  const safeProfile: Partial<Profile> = { ...profile };
  delete safeProfile.appLockPinHash;
  return {
    exportedAt: new Date().toISOString(),
    profile: safeProfile,
    milestones,
    journeyEvents,
    medications,
    medicationLogs,
    appointments,
    journalEntries,
    checkIns,
    goals,
    privateLinks,
  };
}

export async function deleteAllData(): Promise<void> {
  await db.transaction(
    "rw",
    [
      db.profiles,
      db.milestones,
      db.journeyEvents,
      db.auroraNudges,
      db.medications,
      db.medicationLogs,
      db.appointments,
      db.journalEntries,
      db.checkIns,
      db.goals,
      db.privateLinks,
      db.syncOutbox,
      db.syncMeta,
    ],
    async () => {
      await Promise.all([
        db.profiles.clear(),
        db.milestones.clear(),
        db.journeyEvents.clear(),
        db.auroraNudges.clear(),
        db.medications.clear(),
        db.medicationLogs.clear(),
        db.appointments.clear(),
        db.journalEntries.clear(),
        db.checkIns.clear(),
        db.goals.clear(),
        db.privateLinks.clear(),
        db.syncOutbox.clear(),
        db.syncMeta.clear(),
      ]);
    }
  );
}
