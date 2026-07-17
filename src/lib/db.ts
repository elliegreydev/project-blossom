import Dexie, { type EntityTable } from "dexie";
// Type-only import - erased at compile time, so this doesn't create a real
// runtime circular dependency even though regionResources.ts imports the
// `db` value from this file.
import type { ResourceCategory } from "./regionResources";

export type AuroraMode = "quiet" | "gentle" | "supportive" | "disabled";
export type HrtStatus = "on" | "considering" | "not_tracking" | null;
export type ReminderPrivacy = "discreet" | "detailed";
export type AccessibilityProfile = "custom" | "lowVision" | "readingComfort" | "lowCognitiveLoad" | "migraineFriendly" | "largeTouchTargets";
export type HomeBlockKey = "focus" | "today" | "upcoming" | "supplies" | "pinned" | "journey" | "aurora" | "nudges";
export type HomeDensity = "compact" | "standard" | "spacious";
export type HomeTodayContent = "both" | "medication" | "appointments" | "none";
export type HomeShortcutKey = "medication" | "calendar" | "journal" | "goals" | "journey";

export interface HomeLayoutConfig {
  visibleBlocks: HomeBlockKey[];
  order: HomeBlockKey[];
  density: HomeDensity;
  todayContent: HomeTodayContent;
  pinnedTools: HomeShortcutKey[];
  blockWidths: Record<HomeBlockKey, "wide" | "half">;
}

export const HOME_BLOCK_KEYS: HomeBlockKey[] = ["focus", "today", "upcoming", "supplies", "pinned", "journey", "aurora", "nudges"];

export function defaultHomeLayout(): HomeLayoutConfig {
  return {
    visibleBlocks: ["focus", "today", "upcoming", "supplies", "pinned", "journey", "aurora", "nudges"],
    order: ["focus", "today", "upcoming", "pinned", "supplies", "journey", "aurora", "nudges"],
    density: "standard",
    todayContent: "both",
    pinnedTools: [],
    blockWidths: {
      focus: "wide",
      today: "half",
      upcoming: "half",
      supplies: "half",
      pinned: "half",
      journey: "wide",
      aurora: "wide",
      nudges: "wide",
    },
  };
}

export type ModuleKey =
  | "medication"
  | "appointments"
  | "journal"
  | "goals"
  | "journey"
  | "bloodTests"
  | "voicePractice"
  | "presentation"
  | "bodyProgress";

export interface Profile {
  id: string;
  displayName: string | null;
  pronouns: string | null;
  region: string | null;
  // State/province/nation within region, e.g. "Texas" or "Scotland". Only
  // meaningful for countries with real sub-national variation - see
  // SUBREGIONS in regionResources.ts. Null for countries without one (e.g.
  // Ireland) or if the user hasn't picked one yet.
  subregion: string | null;
  dateFormat: string | null;
  hrtStatus: HrtStatus;
  enabledModules: ModuleKey[];
  auroraMode: AuroraMode;
  reminderPrivacy: ReminderPrivacy;
  // A deliberately quieter presentation for people who find tracking or
  // progress information stressful. It never changes the underlying records.
  gentleMode: boolean;
  // An even smaller Home view for low-capacity days. This is deliberately
  // device-local: it is a temporary presentation choice, not account data.
  lowEnergyMode: boolean;
  // Home is a per-device space. These choices never enter sync or change what
  // another device looks like.
  homePhoneLayout: HomeLayoutConfig;
  homeDesktopLayout: HomeLayoutConfig;
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
  highContrast: boolean;
  largeTouchTargets: boolean;
  readingComfort: boolean;
  reduceVisualNoise: boolean;
  accessibilityProfile: AccessibilityProfile;
  // Local reminders (see src/lib/reminders.ts). Device-local only, mirrors the
  // user's own opt-in rather than the raw Notification.permission value so the
  // UI can tell "never asked" apart from "asked and turned back off".
  notificationsEnabled: boolean;
  // IANA zone (e.g. "Europe/London"), auto-detected on each device load (see
  // (main)/layout.tsx). Pushed to the server so the reminder cron can compute
  // "due now" correctly, but deliberately NOT restored on a sync pull - each
  // device should keep reflecting its own current zone, not whichever device
  // last synced.
  timezone: string | null;
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

export type MedicationSupplyAdjustmentKind = "initial" | "dose" | "restock" | "correction" | "discarded";

// Supply tracking is optional and deliberately separate from a medication's
// dose/unit. "amountPerDose" is only the amount to remove from a person-owned
// stock counter after they mark a dose as taken. Blossom never derives it or
// makes any treatment recommendation from it.
export interface MedicationSupply {
  id: string;
  medicationId: string;
  quantity: number;
  supplyUnit: string;
  amountPerDose: number;
  lowSupplyDays: number | null;
  renewalDate: string | null;
  expiryDate: string | null;
  pharmacy: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationSupplyAdjustment {
  id: string;
  supplyId: string;
  medicationId: string;
  kind: MedicationSupplyAdjustmentKind;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// Independent supplies cover the practical bits around a medication, such as
// needles, syringes, alcohol wipes, or a sharps container. They are never
// inferred from a dose and do not affect treatment records.
export type CareSupplyAdjustmentKind = "initial" | "restock" | "correction" | "discarded";

export interface CareSupply {
  id: string;
  name: string;
  category: "injection" | "care" | "other";
  quantity: number;
  supplyUnit: string;
  lowQuantity: number | null;
  renewalDate: string | null;
  deliveryDate: string | null;
  expiryDate: string | null;
  provider: string | null;
  batchNumber: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CareSupplyAdjustment {
  id: string;
  supplyId: string;
  kind: CareSupplyAdjustmentKind;
  quantityChange: number;
  quantityAfter: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// Appointments ----------------------------------------------------------------

export interface AppointmentBuilderItem {
  id: string;
  text: string;
  done: boolean;
}

export interface AppointmentBuilderData {
  questions: AppointmentBuilderItem[];
  bringList: AppointmentBuilderItem[];
  documentsReceived: AppointmentBuilderItem[];
  followUps: AppointmentBuilderItem[];
  travelNote: string | null;
  accessibilityNeeds: string | null;
  communicationPreferences: string | null;
  privateNotes: string | null;
  medicationChangesNote: string | null;
  completedAt: string | null;
}

export function emptyAppointmentBuilderData(): AppointmentBuilderData {
  return {
    questions: [],
    bringList: [],
    documentsReceived: [],
    followUps: [],
    travelNote: null,
    accessibilityNeeds: null,
    communicationPreferences: null,
    privateNotes: null,
    medicationChangesNote: null,
    completedAt: null,
  };
}

export interface Appointment {
  id: string;
  title: string;
  appointmentAt: string; // ISO datetime
  location: string | null;
  preparationNote: string | null;
  outcomeNote: string | null;
  rescheduledFrom: string | null;
  // An optional private workspace for preparing and reflecting on an
  // appointment. Keeping it alongside the appointment means it stays
  // local-first and can use the existing, user-only sync path.
  builderData: AppointmentBuilderData;
  // Minutes before appointmentAt to fire a local reminder. Null means no
  // reminder is configured. Undefined on rows created before this field
  // existed - callers treat that the same as null.
  reminderMinutesBefore: number | null;
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

// Gender euphoria journal -------------------------------------------------------
// These are intentionally separate from the everyday journal. Like journal
// writing and local photos elsewhere in Blossom, they never enter the sync
// queue or a staff-accessible database table.

export type EuphoriaMomentKind =
  | "affirming-interaction"
  | "style"
  | "voice"
  | "confidence"
  | "compliment"
  | "celebration"
  | "future-self"
  | "other";

export interface EuphoriaEntry {
  id: string;
  kind: EuphoriaMomentKind;
  title: string | null;
  bodyText: string | null;
  photo: Blob | null;
  // A local calendar date chosen by the person writing it. Null means this is
  // a normal entry rather than a time capsule.
  reopenAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Social transition planner ------------------------------------------------------
// These records are deliberately device-only. They may contain sensitive
// personal and safety notes, so they never participate in account sync.

export type SocialPersonStatus = "considering" | "preparing" | "told" | "not-right-now";
export type SocialPlanKind = "conversation" | "work" | "education" | "online" | "other";
export type SocialPlanStatus = "considering" | "preparing" | "done" | "paused" | "not-for-me";
export type SocialTaskStatus = "not-started" | "done" | "paused";
export type SocialTaskCategory = "name" | "documents" | "healthcare" | "money" | "work-education" | "online" | "other";

export interface SocialTransitionPerson {
  id: string;
  label: string;
  status: SocialPersonStatus;
  script: string | null;
  safetyNote: string | null;
  privateNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialTransitionPlan {
  id: string;
  title: string;
  kind: SocialPlanKind;
  status: SocialPlanStatus;
  privateNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SocialTransitionTask {
  id: string;
  title: string;
  category: SocialTaskCategory;
  status: SocialTaskStatus;
  privateNote: string | null;
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

// Blood tests (v1.5) -----------------------------------------------------------
// Descriptive only, per the locked spec: no reference ranges computed, no
// flags, no interpretation. referenceRangeRaw is free text the user copies
// from their own lab report, shown back exactly as entered, never parsed.
// Not yet wired into account sync (see src/lib/sync.ts) - local-only for now,
// same as journal entries and private links.

export interface BloodTestEntry {
  id: string;
  testName: string;
  date: string;
  value: string;
  unit: string | null;
  labSource: string | null;
  referenceRangeRaw: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

// Voice practice (v1.5) ---------------------------------------------------------
// Practice goals + session logs only. No score, no "pass" threshold, no
// automatic judgement, and no comparison to any reference voice - per the
// locked spec. Not yet wired into account sync, local-only for now.

export type VoicePracticeCategory =
  | "pitch"
  | "resonance"
  | "breathing"
  | "articulation"
  | "projection"
  | "confidence";

export interface VoiceGoal {
  id: string;
  title: string;
  category: VoicePracticeCategory;
  targetFrequency: string | null;
  targetDuration: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSession {
  id: string;
  goalId: string;
  sessionDuration: string | null;
  comfortRating: number | null;
  note: string | null;
  createdAt: string;
}

// Presentation tracking (v1.5) ---------------------------------------------------
// Outfit/hair/makeup/grooming notes and experiments. All fields optional. The
// photo is a raw Blob stored directly in IndexedDB - private, local-only,
// NEVER synced and never included in the JSON data export (see
// exportAllData, which strips it to a hasPhoto flag instead of trying to
// serialize binary data). Same treatment as body-progress photos will get.

export type PresentationCategory =
  | "outfit"
  | "hair"
  | "makeup"
  | "clothing"
  | "grooming"
  | "experiment";

export interface PresentationEntry {
  id: string;
  date: string;
  category: PresentationCategory;
  note: string | null;
  photo: Blob | null;
  confidenceRating: number | null;
  wantToTry: boolean;
  createdAt: string;
  updatedAt: string;
}

// Body & progress tracking (v1.5) -------------------------------------------------
// Measurements are free-text {label, value} pairs, not a rigid schema - same
// approach as blood tests, so nothing implies a "correct" set of things a
// body should be measured by. Photo follows the same local-only Blob pattern
// as presentation tracking: private, never synced, never in the JSON export
// (see exportAllData). No streaks, no charts, no comparison view in this
// pass - per the locked spec's guardrails against turning this into
// anything that judges rather than just notices change.

export interface BodyMeasurement {
  label: string;
  value: string;
}

export interface BodyEntry {
  id: string;
  date: string;
  measurements: BodyMeasurement[];
  photo: Blob | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
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

// Local reminders (see src/lib/reminders.ts) -----------------------------------
// Tracks which reminder slots have already fired a local Notification, so a
// re-render or app reopen doesn't fire the same reminder twice. Purely
// operational state - never synced, not part of the data export.

export interface NotifiedReminder {
  key: string;
  firedAt: string;
}

// Sync (optional account sync; see src/lib/sync.ts) ----------------------------

export type SyncEntity =
  | "profile"
  | "milestone"
  | "journey_event"
  | "medication"
  | "medication_log"
  | "medication_supply"
  | "medication_supply_adjustment"
  | "care_supply"
  | "care_supply_adjustment"
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

export interface CachedRegionResource {
  id: string;
  country: string;
  subregion: string | null;
  cityName: string | null;
  orgName: string;
  category: ResourceCategory;
  contactInfo: string;
  availability: string | null;
  lastReviewedAt: string;
  sourceUrl: string;
  note: string | null;
}

// Keyed by `${country}|${subregion}` since a legal context note is always
// subregion-specific (never a whole-country note in this dataset).
export interface CachedLegalContextNote {
  id: string;
  country: string;
  subregion: string;
  note: string;
  sourceUrl: string;
  lastReviewedAt: string;
}

type BlossomDb = Dexie & {
  profiles: EntityTable<Profile, "id">;
  milestones: EntityTable<Milestone, "id">;
  journeyEvents: EntityTable<JourneyEvent, "id">;
  auroraNudges: EntityTable<AuroraNudgeState, "nudgeKey">;
  medications: EntityTable<Medication, "id">;
  medicationLogs: EntityTable<MedicationLog, "id">;
  medicationSupplies: EntityTable<MedicationSupply, "id">;
  medicationSupplyAdjustments: EntityTable<MedicationSupplyAdjustment, "id">;
  careSupplies: EntityTable<CareSupply, "id">;
  careSupplyAdjustments: EntityTable<CareSupplyAdjustment, "id">;
  appointments: EntityTable<Appointment, "id">;
  journalEntries: EntityTable<JournalEntry, "id">;
  euphoriaEntries: EntityTable<EuphoriaEntry, "id">;
  socialTransitionPeople: EntityTable<SocialTransitionPerson, "id">;
  socialTransitionPlans: EntityTable<SocialTransitionPlan, "id">;
  socialTransitionTasks: EntityTable<SocialTransitionTask, "id">;
  checkIns: EntityTable<CheckIn, "id">;
  goals: EntityTable<Goal, "id">;
  privateLinks: EntityTable<PrivateLink, "id">;
  bloodTestEntries: EntityTable<BloodTestEntry, "id">;
  voiceGoals: EntityTable<VoiceGoal, "id">;
  voiceSessions: EntityTable<VoiceSession, "id">;
  presentationEntries: EntityTable<PresentationEntry, "id">;
  bodyEntries: EntityTable<BodyEntry, "id">;
  notifiedReminders: EntityTable<NotifiedReminder, "key">;
  cachedRegionResources: EntityTable<CachedRegionResource, "id">;
  cachedLegalContextNotes: EntityTable<CachedLegalContextNote, "id">;
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
  instance.version(6).stores({
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
    bloodTestEntries: "id, testName, date",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(7).stores({
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
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(8).stores({
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
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(9).stores({
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
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(10).stores({
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
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(11).stores({
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
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    // Cached copies of the staff-editable Supabase resource tables, so
    // support resources keep working offline / for local-only users with no
    // account. Refreshed from the network on app load (see
    // src/lib/regionResources.ts's syncRegionResourcesCache) and seeded from
    // a bundled fallback if a device has never been online.
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(12).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(13).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(14).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  }).upgrade(async (tx) => {
    await tx.table("appointments").toCollection().modify((appointment: Partial<Appointment>) => {
      appointment.builderData ??= emptyAppointmentBuilderData();
    });
  });
  instance.version(15).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    euphoriaEntries: "id, createdAt, reopenAt, kind",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  instance.version(16).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    euphoriaEntries: "id, createdAt, reopenAt, kind",
    socialTransitionPeople: "id, status, updatedAt",
    socialTransitionPlans: "id, kind, status, updatedAt",
    socialTransitionTasks: "id, category, status, updatedAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  });
  // Custom Home layouts are being pulled back for rework - resets any
  // per-device customisation to the plain default on next load, rather than
  // leaving stale layout choices sitting around for a feature that's no
  // longer reachable in Settings.
  instance.version(17).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    euphoriaEntries: "id, createdAt, reopenAt, kind",
    socialTransitionPeople: "id, status, updatedAt",
    socialTransitionPlans: "id, kind, status, updatedAt",
    socialTransitionTasks: "id, category, status, updatedAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  }).upgrade(async (tx) => {
    await tx.table("profiles").toCollection().modify((profile: Profile) => {
      profile.homePhoneLayout = defaultHomeLayout();
      profile.homeDesktopLayout = defaultHomeLayout();
    });
  });
  // Low-Energy Mode is being pulled back for rework alongside Custom Home -
  // resets the preference on next load rather than leaving it silently on
  // for a feature that's no longer reachable in Settings.
  instance.version(18).stores({
    profiles: "id",
    milestones: "id, eventDate, category",
    journeyEvents: "id, eventDate, category",
    auroraNudges: "nudgeKey",
    medications: "id",
    medicationLogs: "id, medicationId, loggedAt",
    medicationSupplies: "id, medicationId, updatedAt",
    medicationSupplyAdjustments: "id, supplyId, medicationId, createdAt",
    careSupplies: "id, category, updatedAt",
    careSupplyAdjustments: "id, supplyId, createdAt",
    appointments: "id, appointmentAt",
    journalEntries: "id, createdAt",
    euphoriaEntries: "id, createdAt, reopenAt, kind",
    socialTransitionPeople: "id, status, updatedAt",
    socialTransitionPlans: "id, kind, status, updatedAt",
    socialTransitionTasks: "id, category, status, updatedAt",
    checkIns: "id, createdAt",
    goals: "id, status",
    privateLinks: "id",
    bloodTestEntries: "id, testName, date",
    voiceGoals: "id, category",
    voiceSessions: "id, goalId, createdAt",
    presentationEntries: "id, category, date",
    bodyEntries: "id, date",
    notifiedReminders: "key, firedAt",
    cachedRegionResources: "id, country, subregion",
    cachedLegalContextNotes: "id, country, subregion",
    syncOutbox: "id, entity, changedAt",
    syncMeta: "key",
  }).upgrade(async (tx) => {
    await tx.table("profiles").toCollection().modify((profile: Profile) => {
      profile.lowEnergyMode = false;
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
  subregion: null,
  dateFormat: null,
  hrtStatus: null,
  enabledModules: ["medication", "appointments", "journal", "goals", "journey"],
  auroraMode: "gentle",
  reminderPrivacy: "discreet",
  gentleMode: false,
  lowEnergyMode: false,
  homePhoneLayout: defaultHomeLayout(),
  homeDesktopLayout: defaultHomeLayout(),
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
  highContrast: false,
  largeTouchTargets: false,
  readingComfort: false,
  reduceVisualNoise: false,
  accessibilityProfile: "custom",
  notificationsEnabled: false,
  timezone: null,
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
  if (existing.highContrast === undefined) backfill.highContrast = false;
  if (existing.largeTouchTargets === undefined) backfill.largeTouchTargets = false;
  if (existing.readingComfort === undefined) backfill.readingComfort = false;
  if (existing.reduceVisualNoise === undefined) backfill.reduceVisualNoise = false;
  if (existing.accessibilityProfile === undefined) backfill.accessibilityProfile = "custom";
  if (existing.notificationsEnabled === undefined) backfill.notificationsEnabled = false;
  if (existing.timezone === undefined) backfill.timezone = null;
  if (existing.gentleMode === undefined) backfill.gentleMode = false;
  if (existing.lowEnergyMode === undefined) backfill.lowEnergyMode = false;
  if (existing.homePhoneLayout === undefined) backfill.homePhoneLayout = defaultHomeLayout();
  if (existing.homeDesktopLayout === undefined) backfill.homeDesktopLayout = defaultHomeLayout();
  if (existing.subregion === undefined) backfill.subregion = null;
  // Onboarding used to hardcode "UK" (region was locked, not user-chosen).
  // The real country picker uses full names to match SUBREGIONS/COUNTRIES.
  if (existing.region === "UK") backfill.region = "United Kingdom";
  if (existing.updatedAt === undefined) backfill.updatedAt = existing.createdAt;
  if (Object.keys(backfill).length > 0) {
    await db.profiles.update(LOCAL_PROFILE_ID, backfill);
    return { ...existing, ...backfill };
  }
  return existing;
}

// Refreshes Profile.timezone from the browser if it's drifted (new device,
// or the user travelled) - called on every app load, see (main)/layout.tsx.
export async function syncDeviceTimezone(): Promise<void> {
  if (typeof Intl === "undefined") return;
  const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const profile = await db.profiles.get(LOCAL_PROFILE_ID);
  if (!detected || profile?.timezone === detected) return;
  await updateProfile({ timezone: detected });
}

export async function updateProfile(patch: Partial<Profile>): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.profiles, db.syncOutbox, async () => {
    await db.profiles.update(LOCAL_PROFILE_ID, { ...patch, updatedAt: changedAt });
    await recordSyncChange("profile", LOCAL_PROFILE_ID, "upsert", changedAt);
  });
}

// Personal presentation choices belong to the device they were made on. Keep
// them out of the sync queue so a calmer phone layout never surprises someone
// on their desktop (or vice versa).
export async function updateDeviceProfile(
  patch: Partial<Pick<Profile, "lowEnergyMode" | "homePhoneLayout" | "homeDesktopLayout">>
): Promise<void> {
  await db.profiles.update(LOCAL_PROFILE_ID, patch);
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

export function estimatedMedicationSupplyDays(medication: Medication, supply: MedicationSupply): number | null {
  if (!medication.frequency || supply.amountPerDose <= 0 || supply.quantity < 0) return null;
  const dosesPerWeek = medication.frequency.times.length * (medication.frequency.days?.length ?? 7);
  if (dosesPerWeek <= 0) return null;
  const averageUsePerDay = (dosesPerWeek / 7) * supply.amountPerDose;
  return averageUsePerDay > 0 ? Math.max(0, Math.floor(supply.quantity / averageUsePerDay)) : null;
}

export function medicationSupplyIsLow(medication: Medication, supply: MedicationSupply): boolean {
  const estimatedDays = estimatedMedicationSupplyDays(medication, supply);
  return estimatedDays !== null && supply.lowSupplyDays !== null && estimatedDays <= supply.lowSupplyDays;
}

export async function createMedicationSupply(
  input: Pick<MedicationSupply, "medicationId" | "quantity" | "supplyUnit" | "amountPerDose" | "lowSupplyDays" | "renewalDate" | "expiryDate" | "pharmacy" | "note">
): Promise<MedicationSupply> {
  const now = new Date().toISOString();
  const supply: MedicationSupply = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    ...input,
    quantity: Math.max(0, input.quantity),
  };
  const adjustment: MedicationSupplyAdjustment = {
    id: newId(),
    supplyId: supply.id,
    medicationId: supply.medicationId,
    kind: "initial",
    quantityChange: supply.quantity,
    quantityAfter: supply.quantity,
    note: "Supply tracking started",
    createdAt: now,
    updatedAt: now,
  };
  await db.transaction("rw", db.medicationSupplies, db.medicationSupplyAdjustments, db.syncOutbox, async () => {
    await db.medicationSupplies.add(supply);
    await db.medicationSupplyAdjustments.add(adjustment);
    await recordSyncChange("medication_supply", supply.id, "upsert", now);
    await recordSyncChange("medication_supply_adjustment", adjustment.id, "upsert", now);
  });
  return supply;
}

export async function updateMedicationSupply(
  id: string,
  patch: Partial<Omit<MedicationSupply, "id" | "medicationId" | "quantity" | "createdAt" | "updatedAt">>
): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.medicationSupplies, db.syncOutbox, async () => {
    await db.medicationSupplies.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("medication_supply", id, "upsert", changedAt);
  });
}

export async function setMedicationSupplyQuantity(
  supply: MedicationSupply,
  quantity: number,
  kind: Extract<MedicationSupplyAdjustmentKind, "restock" | "correction" | "discarded">,
  note: string | null = null
): Promise<void> {
  const changedAt = new Date().toISOString();
  const quantityAfter = Math.max(0, quantity);
  const adjustment: MedicationSupplyAdjustment = {
    id: newId(),
    supplyId: supply.id,
    medicationId: supply.medicationId,
    kind,
    quantityChange: quantityAfter - supply.quantity,
    quantityAfter,
    note,
    createdAt: changedAt,
    updatedAt: changedAt,
  };
  await db.transaction("rw", db.medicationSupplies, db.medicationSupplyAdjustments, db.syncOutbox, async () => {
    await db.medicationSupplies.update(supply.id, { quantity: quantityAfter, updatedAt: changedAt });
    await db.medicationSupplyAdjustments.add(adjustment);
    await recordSyncChange("medication_supply", supply.id, "upsert", changedAt);
    await recordSyncChange("medication_supply_adjustment", adjustment.id, "upsert", changedAt);
  });
}

// Advance-warning window for renewal/delivery/expiry dates, matching the
// spirit of medication supply's lowSupplyDays heads-up rather than only
// flagging a care supply once its date has already arrived.
const CARE_SUPPLY_WARNING_DAYS = 7;

export function careSupplyNeedsAttention(supply: CareSupply, today = new Date()): boolean {
  if (supply.lowQuantity !== null && supply.quantity <= supply.lowQuantity) return true;
  const warningKey = new Date(today);
  warningKey.setDate(warningKey.getDate() + CARE_SUPPLY_WARNING_DAYS);
  const warningDateKey = warningKey.toISOString().slice(0, 10);
  return [supply.renewalDate, supply.deliveryDate, supply.expiryDate].some((date) => date !== null && date <= warningDateKey);
}

export async function createCareSupply(
  input: Omit<CareSupply, "id" | "createdAt" | "updatedAt">
): Promise<CareSupply> {
  const now = new Date().toISOString();
  const supply: CareSupply = { id: newId(), createdAt: now, updatedAt: now, ...input, quantity: Math.max(0, input.quantity) };
  const adjustment: CareSupplyAdjustment = {
    id: newId(), supplyId: supply.id, kind: "initial", quantityChange: supply.quantity,
    quantityAfter: supply.quantity, note: "Supply tracking started", createdAt: now, updatedAt: now,
  };
  await db.transaction("rw", db.careSupplies, db.careSupplyAdjustments, db.syncOutbox, async () => {
    await db.careSupplies.add(supply);
    await db.careSupplyAdjustments.add(adjustment);
    await recordSyncChange("care_supply", supply.id, "upsert", now);
    await recordSyncChange("care_supply_adjustment", adjustment.id, "upsert", now);
  });
  return supply;
}

export async function updateCareSupply(
  id: string,
  patch: Partial<Omit<CareSupply, "id" | "quantity" | "createdAt" | "updatedAt">>
): Promise<void> {
  const changedAt = new Date().toISOString();
  await db.transaction("rw", db.careSupplies, db.syncOutbox, async () => {
    await db.careSupplies.update(id, { ...patch, updatedAt: changedAt });
    await recordSyncChange("care_supply", id, "upsert", changedAt);
  });
}

export async function setCareSupplyQuantity(
  supply: CareSupply,
  quantity: number,
  kind: Exclude<CareSupplyAdjustmentKind, "initial">,
  note: string | null = null
): Promise<void> {
  const changedAt = new Date().toISOString();
  const quantityAfter = Math.max(0, quantity);
  const adjustment: CareSupplyAdjustment = {
    id: newId(), supplyId: supply.id, kind, quantityChange: quantityAfter - supply.quantity,
    quantityAfter, note, createdAt: changedAt, updatedAt: changedAt,
  };
  await db.transaction("rw", db.careSupplies, db.careSupplyAdjustments, db.syncOutbox, async () => {
    await db.careSupplies.update(supply.id, { quantity: quantityAfter, updatedAt: changedAt });
    await db.careSupplyAdjustments.add(adjustment);
    await recordSyncChange("care_supply", supply.id, "upsert", changedAt);
    await recordSyncChange("care_supply_adjustment", adjustment.id, "upsert", changedAt);
  });
}

export async function logDose(
  input: Pick<MedicationLog, "medicationId" | "scheduledTime" | "status" | "note">
): Promise<void> {
  const changedAt = new Date().toISOString();
  const log: MedicationLog = { id: newId(), loggedAt: changedAt, updatedAt: changedAt, ...input };
  await db.transaction("rw", db.medicationLogs, db.medicationSupplies, db.medicationSupplyAdjustments, db.syncOutbox, async () => {
    await db.medicationLogs.add(log);
    await recordSyncChange("medication_log", log.id, "upsert", changedAt);

    if (input.status !== "taken") return;
    const alreadyTaken = input.scheduledTime
      ? await db.medicationLogs
          .where("medicationId")
          .equals(input.medicationId)
          .and((entry) => entry.id !== log.id && entry.scheduledTime === input.scheduledTime && entry.status === "taken")
          .first()
      : null;
    const supply = await db.medicationSupplies.where("medicationId").equals(input.medicationId).first();
    if (!supply || alreadyTaken) return;

    const quantityAfter = Math.max(0, supply.quantity - supply.amountPerDose);
    const adjustment: MedicationSupplyAdjustment = {
      id: newId(),
      supplyId: supply.id,
      medicationId: supply.medicationId,
      kind: "dose",
      quantityChange: quantityAfter - supply.quantity,
      quantityAfter,
      note: null,
      createdAt: changedAt,
      updatedAt: changedAt,
    };
    await db.medicationSupplies.update(supply.id, { quantity: quantityAfter, updatedAt: changedAt });
    await db.medicationSupplyAdjustments.add(adjustment);
    await recordSyncChange("medication_supply", supply.id, "upsert", changedAt);
    await recordSyncChange("medication_supply_adjustment", adjustment.id, "upsert", changedAt);
  });
}

// Appointments ----------------------------------------------------------------

export async function addAppointment(
  input: Pick<Appointment, "title" | "appointmentAt" | "location" | "preparationNote"> &
    Partial<Pick<Appointment, "reminderMinutesBefore" | "rescheduledFrom">>
): Promise<Appointment> {
  const now = new Date().toISOString();
  const appointment: Appointment = {
    id: newId(),
    outcomeNote: null,
    rescheduledFrom: null,
    builderData: emptyAppointmentBuilderData(),
    reminderMinutesBefore: null,
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

export async function addEuphoriaEntry(
  input: Pick<EuphoriaEntry, "kind" | "title" | "bodyText" | "photo" | "reopenAt">
): Promise<EuphoriaEntry> {
  const now = new Date().toISOString();
  const entry: EuphoriaEntry = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.euphoriaEntries.add(entry);
  return entry;
}

export async function deleteEuphoriaEntry(id: string): Promise<void> {
  await db.euphoriaEntries.delete(id);
}

// Social transition planner ------------------------------------------------------

export async function addSocialTransitionPerson(
  input: Pick<SocialTransitionPerson, "label" | "status" | "script" | "safetyNote" | "privateNote">
): Promise<SocialTransitionPerson> {
  const now = new Date().toISOString();
  const person: SocialTransitionPerson = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.socialTransitionPeople.add(person);
  return person;
}

export async function updateSocialTransitionPerson(id: string, patch: Partial<SocialTransitionPerson>): Promise<void> {
  await db.socialTransitionPeople.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteSocialTransitionPerson(id: string): Promise<void> {
  await db.socialTransitionPeople.delete(id);
}

export async function addSocialTransitionPlan(
  input: Pick<SocialTransitionPlan, "title" | "kind" | "status" | "privateNote">
): Promise<SocialTransitionPlan> {
  const now = new Date().toISOString();
  const plan: SocialTransitionPlan = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.socialTransitionPlans.add(plan);
  return plan;
}

export async function updateSocialTransitionPlan(id: string, patch: Partial<SocialTransitionPlan>): Promise<void> {
  await db.socialTransitionPlans.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteSocialTransitionPlan(id: string): Promise<void> {
  await db.socialTransitionPlans.delete(id);
}

export async function addSocialTransitionTask(
  input: Pick<SocialTransitionTask, "title" | "category" | "status" | "privateNote">
): Promise<SocialTransitionTask> {
  const now = new Date().toISOString();
  const task: SocialTransitionTask = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.socialTransitionTasks.add(task);
  return task;
}

export async function updateSocialTransitionTask(id: string, patch: Partial<SocialTransitionTask>): Promise<void> {
  await db.socialTransitionTasks.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteSocialTransitionTask(id: string): Promise<void> {
  await db.socialTransitionTasks.delete(id);
}

export async function addSocialTransitionStarterTasks(): Promise<void> {
  const existing = await db.socialTransitionTasks.toArray();
  const starters: Array<Pick<SocialTransitionTask, "title" | "category" | "status" | "privateNote">> = [
    { title: "Consider a name change", category: "name", status: "not-started", privateNote: null },
    { title: "Review identity documents", category: "documents", status: "not-started", privateNote: null },
    { title: "Review healthcare records", category: "healthcare", status: "not-started", privateNote: null },
    { title: "Review banking or money records", category: "money", status: "not-started", privateNote: null },
    { title: "Review work or education records", category: "work-education", status: "not-started", privateNote: null },
    { title: "Review email and online spaces", category: "online", status: "not-started", privateNote: null },
  ];
  const missing = starters.filter((starter) => !existing.some((task) => task.title === starter.title));
  if (missing.length === 0) return;
  const now = new Date().toISOString();
  await db.socialTransitionTasks.bulkAdd(missing.map((task) => ({ id: newId(), createdAt: now, updatedAt: now, ...task })));
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

// Local reminders --------------------------------------------------------------

export async function notifiedReminderKeys(): Promise<Set<string>> {
  const rows = await db.notifiedReminders.toArray();
  return new Set(rows.map((row) => row.key));
}

export async function markReminderNotified(key: string): Promise<void> {
  await db.notifiedReminders.put({ key, firedAt: new Date().toISOString() });
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

// Blood tests -----------------------------------------------------------------

export async function addBloodTestEntry(
  input: Pick<BloodTestEntry, "testName" | "date" | "value" | "unit" | "labSource" | "referenceRangeRaw" | "note">
): Promise<BloodTestEntry> {
  const now = new Date().toISOString();
  const entry: BloodTestEntry = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.bloodTestEntries.add(entry);
  return entry;
}

export async function updateBloodTestEntry(id: string, patch: Partial<BloodTestEntry>): Promise<void> {
  await db.bloodTestEntries.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deleteBloodTestEntry(id: string): Promise<void> {
  await db.bloodTestEntries.delete(id);
}

// Voice practice ----------------------------------------------------------------

export async function addVoiceGoal(
  input: Pick<VoiceGoal, "title" | "category" | "targetFrequency" | "targetDuration">
): Promise<VoiceGoal> {
  const now = new Date().toISOString();
  const goal: VoiceGoal = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.voiceGoals.add(goal);
  return goal;
}

export async function deleteVoiceGoal(id: string): Promise<void> {
  await db.transaction("rw", db.voiceGoals, db.voiceSessions, async () => {
    await db.voiceGoals.delete(id);
    const sessions = await db.voiceSessions.where("goalId").equals(id).toArray();
    await db.voiceSessions.bulkDelete(sessions.map((s) => s.id));
  });
}

export async function addVoiceSession(
  input: Pick<VoiceSession, "goalId" | "sessionDuration" | "comfortRating" | "note">
): Promise<VoiceSession> {
  const session: VoiceSession = { id: newId(), createdAt: new Date().toISOString(), ...input };
  await db.voiceSessions.add(session);
  return session;
}

// Presentation tracking ---------------------------------------------------------

export async function addPresentationEntry(
  input: Pick<PresentationEntry, "date" | "category" | "note" | "photo" | "confidenceRating" | "wantToTry">
): Promise<PresentationEntry> {
  const now = new Date().toISOString();
  const entry: PresentationEntry = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.presentationEntries.add(entry);
  return entry;
}

export async function updatePresentationEntry(id: string, patch: Partial<PresentationEntry>): Promise<void> {
  await db.presentationEntries.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function deletePresentationEntry(id: string): Promise<void> {
  await db.presentationEntries.delete(id);
}

// Body & progress tracking -------------------------------------------------------

export async function addBodyEntry(
  input: Pick<BodyEntry, "date" | "measurements" | "photo" | "note">
): Promise<BodyEntry> {
  const now = new Date().toISOString();
  const entry: BodyEntry = { id: newId(), createdAt: now, updatedAt: now, ...input };
  await db.bodyEntries.add(entry);
  return entry;
}

export async function deleteBodyEntry(id: string): Promise<void> {
  await db.bodyEntries.delete(id);
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
    medicationSupplies,
    medicationSupplyAdjustments,
    careSupplies,
    careSupplyAdjustments,
    appointments,
    journalEntries,
    euphoriaEntriesRaw,
    socialTransitionPeople,
    socialTransitionPlans,
    socialTransitionTasks,
    checkIns,
    goals,
    privateLinks,
    bloodTestEntries,
    voiceGoals,
    voiceSessions,
    presentationEntriesRaw,
    bodyEntriesRaw,
  ] = await Promise.all([
    db.profiles.get(LOCAL_PROFILE_ID),
    db.milestones.toArray(),
    db.journeyEvents.toArray(),
    db.medications.toArray(),
    db.medicationLogs.toArray(),
    db.medicationSupplies.toArray(),
    db.medicationSupplyAdjustments.toArray(),
    db.careSupplies.toArray(),
    db.careSupplyAdjustments.toArray(),
    db.appointments.toArray(),
    db.journalEntries.toArray(),
    db.euphoriaEntries.toArray(),
    db.socialTransitionPeople.toArray(),
    db.socialTransitionPlans.toArray(),
    db.socialTransitionTasks.toArray(),
    db.checkIns.toArray(),
    db.goals.toArray(),
    db.privateLinks.toArray(),
    db.bloodTestEntries.toArray(),
    db.voiceGoals.toArray(),
    db.voiceSessions.toArray(),
    db.presentationEntries.toArray(),
    db.bodyEntries.toArray(),
  ]);
  // appLockPinHash is deliberately excluded - it's a security credential,
  // not personal data the user needs back in an export.
  const safeProfile: Partial<Profile> = { ...profile };
  delete safeProfile.appLockPinHash;
  // Photos are raw Blobs and can't survive JSON.stringify (they'd silently
  // serialize to "{}"). Strip them and note whether one existed instead of
  // producing a misleading empty object.
  const presentationEntries = presentationEntriesRaw.map((entry) => {
    const { photo, ...rest } = entry;
    return { ...rest, hasPhoto: photo !== null };
  });
  const bodyEntries = bodyEntriesRaw.map((entry) => {
    const { photo, ...rest } = entry;
    return { ...rest, hasPhoto: photo !== null };
  });
  const euphoriaEntries = euphoriaEntriesRaw.map((entry) => {
    const { photo, ...rest } = entry;
    return { ...rest, hasPhoto: photo !== null };
  });
  return {
    exportedAt: new Date().toISOString(),
    profile: safeProfile,
    milestones,
    journeyEvents,
    medications,
    medicationLogs,
    medicationSupplies,
    medicationSupplyAdjustments,
    careSupplies,
    careSupplyAdjustments,
    appointments,
    journalEntries,
    euphoriaEntries,
    socialTransitionPeople,
    socialTransitionPlans,
    socialTransitionTasks,
    checkIns,
    goals,
    privateLinks,
    bloodTestEntries,
    voiceGoals,
    voiceSessions,
    presentationEntries,
    bodyEntries,
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
      db.medicationSupplies,
      db.medicationSupplyAdjustments,
      db.careSupplies,
      db.careSupplyAdjustments,
      db.appointments,
      db.journalEntries,
      db.euphoriaEntries,
      db.socialTransitionPeople,
      db.socialTransitionPlans,
      db.socialTransitionTasks,
      db.checkIns,
      db.goals,
      db.privateLinks,
      db.bloodTestEntries,
      db.voiceGoals,
      db.voiceSessions,
      db.presentationEntries,
      db.bodyEntries,
      db.notifiedReminders,
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
        db.medicationSupplies.clear(),
        db.medicationSupplyAdjustments.clear(),
        db.careSupplies.clear(),
        db.careSupplyAdjustments.clear(),
        db.appointments.clear(),
        db.journalEntries.clear(),
        db.euphoriaEntries.clear(),
        db.socialTransitionPeople.clear(),
        db.socialTransitionPlans.clear(),
        db.socialTransitionTasks.clear(),
        db.checkIns.clear(),
        db.goals.clear(),
        db.privateLinks.clear(),
        db.bloodTestEntries.clear(),
        db.voiceGoals.clear(),
        db.voiceSessions.clear(),
        db.presentationEntries.clear(),
        db.bodyEntries.clear(),
        db.notifiedReminders.clear(),
        db.syncOutbox.clear(),
        db.syncMeta.clear(),
      ]);
    }
  );
}
