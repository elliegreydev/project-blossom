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

type BlossomDb = Dexie & {
  profiles: EntityTable<Profile, "id">;
};

function createDb(): BlossomDb {
  const instance = new Dexie("blossom") as BlossomDb;
  instance.version(1).stores({
    profiles: "id",
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
