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

type BlossomDb = Dexie & {
  profiles: EntityTable<Profile, "id">;
  milestones: EntityTable<Milestone, "id">;
  journeyEvents: EntityTable<JourneyEvent, "id">;
  auroraNudges: EntityTable<AuroraNudgeState, "nudgeKey">;
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
};

export async function getOrCreateProfile(): Promise<Profile> {
  const existing = await db.profiles.get(LOCAL_PROFILE_ID);
  if (existing) return existing;
  await db.profiles.add(DEFAULT_PROFILE);
  return DEFAULT_PROFILE;
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  await db.profiles.update(LOCAL_PROFILE_ID, patch);
}

function newId(): string {
  return crypto.randomUUID();
}

export async function addMilestone(
  input: Pick<Milestone, "title" | "templateKey" | "category" | "eventDate" | "datePrecision" | "note">
): Promise<Milestone> {
  const now = new Date().toISOString();
  const milestone: Milestone = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.milestones.add(milestone);
  return milestone;
}

export async function updateMilestone(id: string, patch: Partial<Milestone>): Promise<void> {
  await db.milestones.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteMilestone(id: string): Promise<void> {
  await db.milestones.delete(id);
}

export async function addJourneyEvent(
  input: Pick<JourneyEvent, "type" | "title" | "category" | "eventDate" | "datePrecision" | "note">
): Promise<JourneyEvent> {
  const now = new Date().toISOString();
  const event: JourneyEvent = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.journeyEvents.add(event);
  return event;
}

export async function dismissAuroraNudge(nudgeKey: string): Promise<void> {
  const existing = await db.auroraNudges.get(nudgeKey);
  await db.auroraNudges.put({
    nudgeKey,
    lastShownAt: new Date().toISOString(),
    dismissedCount: (existing?.dismissedCount ?? 0) + 1,
  });
}
