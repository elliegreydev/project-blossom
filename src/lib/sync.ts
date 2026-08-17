import type { SupabaseClient } from "@supabase/supabase-js";
import {
  db,
  getOrCreateProfile,
  getOrCreateSyncState,
  LOCAL_PROFILE_ID,
  enqueueSnapshot,
  type Appointment,
  emptyAppointmentBuilderData,
  type Referral,
  type ReferralUpdate,
  type SelfDirectedSettings,
  SELF_DIRECTED_ID,
  type AuroraMode,
  type CheckIn,
  type CheckInPeriod,
  type DatePrecision,
  type DoseStatus,
  type GoalStatus,
  type HrtStatus,
  type InjectionSite,
  type JourneyCategory,
  type MedicationFrequency,
  type MedicationRoute,
  type MedicationSupplyAdjustmentKind,
  type CareSupplyAdjustmentKind,
  type ModuleKey,
  type ReminderPrivacy,
  type SyncEntity,
  type SyncOutboxItem,
  type JournalEntry,
  type PrivateLink,
  type BloodTestEntry,
  type VoiceGoal,
  type VoiceSession,
  type VoicePracticeCategory,
  type PresentationEntry,
  type PresentationCategory,
  type BodyEntry,
  type BodyMeasurement,
  type IntimacyEntry,
  type IntimacyDatePrecision,
  type IntimacyFeeling,
  type WeightEntry,
  type CalorieEntry,
  type BudgetEntry,
  type BudgetCategory,
  type BudgetGoal,
  type SupportMapEntry,
  type SupportMapEntryType,
  type SupportMapLabel,
  type SafetyCheckIn,
  type SafetyCheckInStatus,
} from "@/lib/db";
import { isAppearance, isThemeId } from "@/lib/themes";
import { createClient } from "@/lib/supabase/client";
import { shouldApplyRemoteChange } from "@/lib/sync-policy";
import { isEntityExcluded, entitiesForCategories } from "@/lib/syncCategories";
import type { ContactMethod, ReferralKind, ReferralStatus, ReferralUpdateKind } from "@/lib/referrals";
import type { PrescriberStatus } from "@/lib/selfDirected";

type RemoteRow = Record<string, unknown>;

const SYNC_ORDER: SyncEntity[] = [
  "profile",
  "milestone",
  "journey_event",
  "medication",
  "medication_supply",
  "medication_log",
  "medication_supply_adjustment",
  "care_supply",
  "care_supply_adjustment",
  "appointment",
  "referral",
  "referral_update",
  "self_directed",
  "check_in",
  "goal",
  "aurora_nudge",
  "journal_entry",
  "private_link",
  "blood_test_entry",
  "voice_goal",
  "voice_session",
  "presentation_entry",
  "body_entry",
  "intimacy_entry",
  "weight_entry",
  "calorie_entry",
  "budget_entry",
  "budget_goal",
  "support_map_entry",
  "safety_check_in",
];

const TABLES: Record<SyncEntity, string> = {
  profile: "profiles",
  milestone: "milestones",
  journey_event: "journey_events",
  medication: "medications",
  medication_supply: "medication_supplies",
  medication_log: "medication_logs",
  medication_supply_adjustment: "medication_supply_adjustments",
  care_supply: "care_supplies",
  care_supply_adjustment: "care_supply_adjustments",
  appointment: "appointments",
  referral: "referrals",
  referral_update: "referral_updates",
  self_directed: "self_directed_settings",
  check_in: "check_ins",
  goal: "goals",
  aurora_nudge: "aurora_interaction_log",
  journal_entry: "journal_entries",
  private_link: "private_links",
  blood_test_entry: "blood_test_entries",
  voice_goal: "voice_practice_goals",
  voice_session: "voice_practice_sessions",
  presentation_entry: "presentation_entries",
  body_entry: "body_entries",
  intimacy_entry: "intimacy_entries",
  weight_entry: "weight_entries",
  calorie_entry: "calorie_entries",
  budget_entry: "budget_entries",
  budget_goal: "budget_goals",
  support_map_entry: "support_map_entries",
  safety_check_in: "safety_check_ins",
};

export class LocalDataOwnershipError extends Error {
  constructor() {
    super("This device's Blossom data is already connected to a different account.");
    this.name = "LocalDataOwnershipError";
  }
}

// How many times a single change is retried before it's parked. It stays in
// the outbox (nothing is discarded) but stops blocking everything queued
// behind it.
const MAX_PUSH_ATTEMPTS = 5;

export class SyncItemsStuckError extends Error {
  readonly count: number;
  constructor(count: number) {
    super(
      count === 1
        ? "One change couldn't be saved to your account. Everything else is synced."
        : `${count} changes couldn't be saved to your account. Everything else is synced.`
    );
    this.name = "SyncItemsStuckError";
    this.count = count;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function nullableNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function measurementsArray(value: unknown): BodyMeasurement[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ label: stringValue(item.label), value: stringValue(item.value) }))
    .filter((item) => item.label);
}

function appointmentBuilderData(value: unknown): Appointment["builderData"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyAppointmentBuilderData();
  const record = value as Record<string, unknown>;
  const items = (key: string) => Array.isArray(record[key])
    ? record[key]
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => ({
        id: stringValue(item.id),
        text: stringValue(item.text),
        done: item.done === true,
      }))
      .filter((item) => item.id && item.text)
    : [];
  return {
    questions: items("questions"),
    bringList: items("bringList"),
    documentsReceived: items("documentsReceived"),
    followUps: items("followUps"),
    travelNote: nullableString(record.travelNote),
    accessibilityNeeds: nullableString(record.accessibilityNeeds),
    communicationPreferences: nullableString(record.communicationPreferences),
    privateNotes: nullableString(record.privateNotes),
    medicationChangesNote: nullableString(record.medicationChangesNote),
    completedAt: nullableString(record.completedAt),
  };
}

function normalizedClientTime(localTime: string, clockOffsetMs: number): string {
  return new Date(new Date(localTime).getTime() + clockOffsetMs).toISOString();
}

async function serverClock(client: SupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("blossom_sync_clock");
  if (error) throw error;
  if (typeof data !== "string") throw new Error("Blossom could not read the sync clock.");
  return data;
}

async function localPayload(
  entity: SyncEntity,
  recordId: string,
  userId: string,
  changedAt: string
): Promise<RemoteRow | null> {
  const shared = { user_id: userId, client_updated_at: changedAt, deleted_at: null };

  switch (entity) {
    case "profile": {
      const profile = await db.profiles.get(LOCAL_PROFILE_ID);
      if (!profile) return null;
      return {
        id: userId,
        display_name: profile.displayName,
        pronouns: profile.pronouns,
        region: profile.region,
        subregion: profile.subregion,
        date_format: profile.dateFormat,
        hrt_status: profile.hrtStatus,
        enabled_modules: profile.enabledModules,
        aurora_mode: profile.auroraMode,
        sync_excluded_categories: profile.syncExcludedCategories,
        sync_excluded_categories_at: profile.syncExcludedCategoriesAt,
        reminder_privacy: profile.reminderPrivacy,
        theme: profile.theme,
        appearance: profile.appearance,
        gentle_mode: profile.gentleMode,
        sensitive_modules_locked: profile.sensitiveModulesLocked,
        // Only the *intent* to lock. appLockPinHash is never uploaded - each
        // device sets its own PIN, so a new device knows to ask for one
        // rather than opening straight into someone's journal.
        app_lock_enabled: profile.appLockEnabled,
        age_confirmed_at: profile.ageConfirmedAt,
        onboarding_completed_at: profile.onboardingCompletedAt,
        quiet_hours_enabled: profile.quietHoursEnabled,
        quiet_hours_start: profile.quietHoursStart,
        quiet_hours_end: profile.quietHoursEnd,
        // Synced (unlike weight/food tracking, which stays device-local) since
        // the server-side reminder cron needs these to fire push notifications
        // for a closed app - see dueCheckInReminders in reminders.ts.
        check_in_morning_reminder_enabled: profile.checkInMorningReminderEnabled,
        check_in_morning_reminder_time: profile.checkInMorningReminderTime,
        check_in_evening_reminder_enabled: profile.checkInEveningReminderEnabled,
        check_in_evening_reminder_time: profile.checkInEveningReminderTime,
        // Pushed but deliberately never restored on pull (see Profile.timezone
        // in db.ts) - each device should keep reflecting its own current zone.
        timezone: profile.timezone,
        created_at: profile.createdAt,
        client_updated_at: changedAt,
      };
    }
    case "milestone": {
      const item = await db.milestones.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            title: item.title,
            template_key: item.templateKey,
            category: item.category,
            event_date: item.datePrecision === "approximate" ? null : item.eventDate,
            approximate_date: item.datePrecision === "approximate" ? item.eventDate : null,
            date_precision: item.datePrecision,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "journey_event": {
      const item = await db.journeyEvents.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            type: item.type,
            title: item.title,
            category: item.category,
            event_date: item.datePrecision === "approximate" ? null : item.eventDate,
            approximate_date: item.datePrecision === "approximate" ? item.eventDate : null,
            date_precision: item.datePrecision,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "medication": {
      const item = await db.medications.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            name: item.name,
            route: item.route,
            unit: item.unit,
            frequency: item.frequency,
            active_supply_id: item.activeSupplyId,
            active: item.active,
            created_at: item.createdAt,
          }
        : null;
    }
    case "medication_supply": {
      const item = await db.medicationSupplies.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            medication_id: item.medicationId,
            label: item.label,
            quantity: item.quantity,
            supply_unit: item.supplyUnit,
            amount_per_dose: item.amountPerDose,
            low_supply_days: item.lowSupplyDays,
            renewal_date: item.renewalDate,
            expiry_date: item.expiryDate,
            pharmacy: item.pharmacy,
            note: item.note,
            snoozed_until: item.snoozedUntil,
            created_at: item.createdAt,
          }
        : null;
    }
    case "medication_log": {
      const item = await db.medicationLogs.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            medication_id: item.medicationId,
            scheduled_time: item.scheduledTime,
            status: item.status,
            logged_at: item.loggedAt,
            note: item.note,
            injection_site: item.injectionSite ?? null,
          }
        : null;
    }
    case "medication_supply_adjustment": {
      const item = await db.medicationSupplyAdjustments.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            supply_id: item.supplyId,
            medication_id: item.medicationId,
            kind: item.kind,
            quantity_change: item.quantityChange,
            quantity_after: item.quantityAfter,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "care_supply": {
      const item = await db.careSupplies.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            supply_unit: item.supplyUnit,
            low_quantity: item.lowQuantity,
            renewal_date: item.renewalDate,
            delivery_date: item.deliveryDate,
            expiry_date: item.expiryDate,
            provider: item.provider,
            batch_number: item.batchNumber,
            note: item.note,
            snoozed_until: item.snoozedUntil,
            created_at: item.createdAt,
          }
        : null;
    }
    case "care_supply_adjustment": {
      const item = await db.careSupplyAdjustments.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            supply_id: item.supplyId,
            kind: item.kind,
            quantity_change: item.quantityChange,
            quantity_after: item.quantityAfter,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "appointment": {
      const item = await db.appointments.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            title: item.title,
            appointment_at: item.appointmentAt,
            location: item.location,
            preparation_note: item.preparationNote,
            outcome_note: item.outcomeNote,
            rescheduled_from: item.rescheduledFrom,
            builder_data: item.builderData ?? emptyAppointmentBuilderData(),
            reminder_settings:
              item.reminderMinutesBefore != null ? { minutesBefore: item.reminderMinutesBefore } : null,
            created_at: item.createdAt,
          }
        : null;
    }
    case "referral": {
      const item = await db.referrals.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            service_name: item.serviceName,
            kind: item.kind,
            referred_on: item.referredOn,
            referred_by: item.referredBy,
            reference_number: item.referenceNumber,
            status: item.status,
            chase_every_days: item.chaseEveryDays,
            last_chased_on: item.lastChasedOn,
            clinic_index_id: item.clinicIndexId,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "referral_update": {
      const item = await db.referralUpdates.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            referral_id: item.referralId,
            happened_on: item.happenedOn,
            kind: item.kind,
            contact_method: item.contactMethod,
            spoke_to: item.spokeTo,
            body: item.body,
            created_at: item.createdAt,
          }
        : null;
    }
    case "self_directed": {
      const item = await db.selfDirected.get(recordId);
      return item
        ? {
            ...shared,
            id: userId,
            label: item.label,
            prescriber_status: item.prescriberStatus,
            hrt_started_on: item.hrtStartedOn,
            blood_check_interval_days: item.bloodCheckIntervalDays,
            setup_completed_at: item.setupCompletedAt,
            created_at: item.createdAt,
          }
        : null;
    }
    case "check_in": {
      const item = await db.checkIns.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            mood: item.mood,
            energy: item.energy,
            confidence: item.confidence,
            stress: item.stress,
            comfort: item.comfort,
            note: item.note,
            period: item.period,
            created_at: item.createdAt,
          }
        : null;
    }
    case "goal": {
      const item = await db.goals.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            title: item.title,
            category: item.category,
            target: item.target,
            status: item.status,
            converted_to_milestone_id: item.convertedToMilestoneId,
            created_at: item.createdAt,
            completed_at: item.completedAt,
          }
        : null;
    }
    case "aurora_nudge": {
      const item = await db.auroraNudges.get(recordId);
      return item
        ? {
            ...shared,
            nudge_key: item.nudgeKey,
            last_shown_at: item.lastShownAt,
            dismissed_count: item.dismissedCount,
          }
        : null;
    }
    case "journal_entry": {
      const item = await db.journalEntries.get(recordId);
      return item ? { ...shared, id: item.id, body_text: item.bodyText, created_at: item.createdAt } : null;
    }
    case "private_link": {
      const item = await db.privateLinks.get(recordId);
      return item
        ? { ...shared, id: item.id, label: item.label, url: item.url, note: item.note, created_at: item.createdAt }
        : null;
    }
    case "blood_test_entry": {
      const item = await db.bloodTestEntries.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            test_name: item.testName,
            date: item.date,
            value: item.value,
            unit: item.unit,
            lab_source: item.labSource,
            reference_range_raw: item.referenceRangeRaw,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "voice_goal": {
      const item = await db.voiceGoals.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            title: item.title,
            category: item.category,
            target_frequency: item.targetFrequency,
            target_duration: item.targetDuration,
            created_at: item.createdAt,
          }
        : null;
    }
    case "voice_session": {
      const item = await db.voiceSessions.get(recordId);
      // recording is a raw Blob - deliberately never pushed, see VoiceSession's comment.
      return item
        ? {
            ...shared,
            id: item.id,
            goal_id: item.goalId,
            session_duration: item.sessionDuration,
            comfort_rating: item.comfortRating,
            note: item.note,
            pitch_low_hz: item.pitchLowHz,
            pitch_high_hz: item.pitchHighHz,
            created_at: item.createdAt,
          }
        : null;
    }
    case "presentation_entry": {
      const item = await db.presentationEntries.get(recordId);
      // photo is a raw Blob - deliberately never pushed, see PresentationEntry's comment.
      return item
        ? {
            ...shared,
            id: item.id,
            date: item.date,
            category: item.category,
            note: item.note,
            confidence_rating: item.confidenceRating,
            want_to_try: item.wantToTry,
            created_at: item.createdAt,
          }
        : null;
    }
    case "body_entry": {
      const item = await db.bodyEntries.get(recordId);
      // photo is a raw Blob - deliberately never pushed, see BodyEntry's comment.
      return item
        ? {
            ...shared,
            id: item.id,
            date: item.date,
            measurements: item.measurements,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "intimacy_entry": {
      const item = await db.intimacyEntries.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            date: item.date,
            time: item.time,
            date_precision: item.datePrecision,
            label: item.label,
            tags: item.tags,
            protection_note: item.protectionNote,
            feeling: item.feeling,
            aftercare_note: item.aftercareNote,
            private_note: item.privateNote,
            created_at: item.createdAt,
          }
        : null;
    }
    case "weight_entry": {
      const item = await db.weightEntries.get(recordId);
      return item
        ? { ...shared, id: item.id, date: item.date, weight_grams: item.weightGrams, note: item.note, created_at: item.createdAt }
        : null;
    }
    case "calorie_entry": {
      const item = await db.calorieEntries.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            date: item.date,
            label: item.label,
            calories: item.calories,
            meal: item.meal,
            note: item.note,
            created_at: item.createdAt,
          }
        : null;
    }
    case "budget_entry": {
      const item = await db.budgetEntries.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            category: item.category,
            description: item.description,
            amount: item.amount,
            date: item.date,
            created_at: item.createdAt,
          }
        : null;
    }
    case "budget_goal": {
      const item = await db.budgetGoals.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            label: item.label,
            target_amount: item.targetAmount,
            saved_amount: item.savedAmount,
            created_at: item.createdAt,
          }
        : null;
    }
    case "support_map_entry": {
      const item = await db.supportMapEntries.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            name: item.name,
            type: item.type,
            labels: item.labels,
            contact: item.contact,
            area: item.area,
            note: item.note,
            review_on: item.reviewOn,
            is_favourite: item.isFavourite,
            created_at: item.createdAt,
          }
        : null;
    }
    case "safety_check_in": {
      const item = await db.safetyCheckIns.get(recordId);
      return item
        ? {
            ...shared,
            id: item.id,
            started_at: item.startedAt,
            due_at: item.dueAt,
            status: item.status,
            snoozed_once: item.snoozedOnce,
          }
        : null;
    }
  }
}

async function pushChange(
  client: SupabaseClient,
  userId: string,
  item: SyncOutboxItem,
  clockOffsetMs: number
): Promise<void> {
  const changedAt = normalizedClientTime(item.changedAt, clockOffsetMs);
  const table = TABLES[item.entity];

  if (item.operation === "delete") {
    if (item.entity === "profile") return;
    let query = client
      .from(table)
      .update({ deleted_at: changedAt, client_updated_at: changedAt })
      .eq("user_id", userId);
    query = item.entity === "aurora_nudge"
      ? query.eq("nudge_key", item.recordId)
      : query.eq("id", item.recordId);
    const { error } = await query;
    if (error) throw error;
    return;
  }

  const payload = await localPayload(item.entity, item.recordId, userId, changedAt);
  if (!payload) return;
  const onConflict = item.entity === "aurora_nudge" ? "user_id,nudge_key" : "id";
  const { error } = await client.from(table).upsert(payload, { onConflict });
  if (error) throw error;
}

async function deleteLocal(entity: SyncEntity, row: RemoteRow): Promise<void> {
  const id = stringValue(row.id);
  switch (entity) {
    case "profile":
      return;
    case "milestone":
      await db.milestones.delete(id);
      return;
    case "journey_event":
      await db.journeyEvents.delete(id);
      return;
    case "medication":
      await db.medications.delete(id);
      return;
    case "medication_supply":
      await db.medicationSupplies.delete(id);
      return;
    case "medication_log":
      await db.medicationLogs.delete(id);
      return;
    case "medication_supply_adjustment":
      await db.medicationSupplyAdjustments.delete(id);
      return;
    case "care_supply":
      await db.careSupplies.delete(id);
      return;
    case "care_supply_adjustment":
      await db.careSupplyAdjustments.delete(id);
      return;
    case "appointment":
      await db.appointments.delete(id);
      return;
    case "referral":
      await db.referrals.delete(id);
      return;
    case "referral_update":
      await db.referralUpdates.delete(id);
      return;
    case "self_directed":
      await db.selfDirected.delete(SELF_DIRECTED_ID);
      return;
    case "check_in":
      await db.checkIns.delete(id);
      return;
    case "goal":
      await db.goals.delete(id);
      return;
    case "aurora_nudge":
      await db.auroraNudges.delete(stringValue(row.nudge_key));
      return;
    case "journal_entry":
      await db.journalEntries.delete(id);
      return;
    case "private_link":
      await db.privateLinks.delete(id);
      return;
    case "blood_test_entry":
      await db.bloodTestEntries.delete(id);
      return;
    case "voice_goal":
      await db.voiceGoals.delete(id);
      return;
    case "voice_session":
      await db.voiceSessions.delete(id);
      return;
    case "presentation_entry":
      await db.presentationEntries.delete(id);
      return;
    case "body_entry":
      await db.bodyEntries.delete(id);
      return;
    case "intimacy_entry":
      await db.intimacyEntries.delete(id);
      return;
    case "weight_entry":
      await db.weightEntries.delete(id);
      return;
    case "calorie_entry":
      await db.calorieEntries.delete(id);
      return;
    case "budget_entry":
      await db.budgetEntries.delete(id);
      return;
    case "budget_goal":
      await db.budgetGoals.delete(id);
      return;
    case "support_map_entry":
      await db.supportMapEntries.delete(id);
      return;
    case "safety_check_in":
      await db.safetyCheckIns.delete(id);
  }
}

/**
 * Which side's "what syncs" choice is the newer decision.
 *
 * Null on either side loses to a real timestamp, so a device that has never
 * touched the setting cannot overwrite one that has. Both null means neither
 * has ever chosen, and keeping the local empty list is the same answer either
 * way. Ties keep local, because a tie means nothing has actually changed.
 */
export function pickExclusions(
  local: { syncExcludedCategories: string[]; syncExcludedCategoriesAt: string | null },
  row: RemoteRow,
): { syncExcludedCategories: string[]; syncExcludedCategoriesAt: string | null } {
  const remoteAt = nullableString(row.sync_excluded_categories_at);
  const localAt = local.syncExcludedCategoriesAt;

  const remoteWins = remoteAt !== null && (localAt === null || remoteAt > localAt);
  if (!remoteWins) {
    return {
      syncExcludedCategories: local.syncExcludedCategories,
      syncExcludedCategoriesAt: localAt,
    };
  }
  return {
    syncExcludedCategories: stringArray(row.sync_excluded_categories),
    syncExcludedCategoriesAt: remoteAt,
  };
}

async function applyRemote(entity: SyncEntity, row: RemoteRow): Promise<void> {
  if (row.deleted_at) {
    await deleteLocal(entity, row);
    return;
  }

  const createdAt = stringValue(row.created_at);
  const changedAt = stringValue(row.client_updated_at) || stringValue(row.updated_at) || createdAt;
  const id = stringValue(row.id);

  switch (entity) {
    case "profile": {
      const local = await getOrCreateProfile();
      await db.profiles.put({
        ...local,
        displayName: nullableString(row.display_name),
        pronouns: nullableString(row.pronouns),
        region: nullableString(row.region),
        subregion: nullableString(row.subregion),
        dateFormat: nullableString(row.date_format),
        hrtStatus: nullableString(row.hrt_status) as HrtStatus,
        enabledModules: stringArray(row.enabled_modules) as ModuleKey[],
        auroraMode: stringValue(row.aurora_mode) as AuroraMode,
        reminderPrivacy: stringValue(row.reminder_privacy) as ReminderPrivacy,
        // Restored, unlike timezone. A device that didn't know the journal is
        // excluded would upload it, so this has to be the same on all of them.
        //
        // Merged on its own timestamp rather than with the rest of the row.
        // Everything else here is whole-row last-write-wins, which for this
        // field meant a device that had been offline could revert somebody's
        // privacy choice just by saving a theme: its pull skipped the remote
        // profile (its own edit was newer), so it never learned about the
        // exclusion, and then it pushed its stale empty list back over the top.
        //
        // Comparing decisions rather than saves fixes that in both directions.
        // A union would also have stopped the leak and was the obvious idea,
        // but it would mean a category could never be re-enabled: the server's
        // copy would always win and "keep my journal local" would be permanent.
        ...pickExclusions(local, row),
        theme: isThemeId(row.theme) ? row.theme : local.theme,
        appearance: isAppearance(row.appearance) ? row.appearance : local.appearance,
        gentleMode: row.gentle_mode === true,
        sensitiveModulesLocked: Boolean(row.sensitive_modules_locked),
        // Never clears a lock that exists on this device: if either the
        // account or this device wants it locked, it stays locked. Stops a
        // stale profile row from a device where the lock was off silently
        // unlocking one where it's on.
        appLockEnabled: Boolean(row.app_lock_enabled) || Boolean(local.appLockEnabled),
        ageConfirmedAt: nullableString(row.age_confirmed_at),
        onboardingCompletedAt: nullableString(row.onboarding_completed_at),
        quietHoursEnabled: Boolean(row.quiet_hours_enabled),
        quietHoursStart: nullableString(row.quiet_hours_start),
        quietHoursEnd: nullableString(row.quiet_hours_end),
        checkInMorningReminderEnabled: Boolean(row.check_in_morning_reminder_enabled),
        checkInMorningReminderTime: nullableString(row.check_in_morning_reminder_time) ?? "09:00",
        checkInEveningReminderEnabled: Boolean(row.check_in_evening_reminder_enabled),
        checkInEveningReminderTime: nullableString(row.check_in_evening_reminder_time) ?? "21:00",
        syncEnabled: true,
        createdAt: createdAt || local.createdAt,
        updatedAt: changedAt || local.updatedAt,
      });
      return;
    }
    case "milestone": {
      const precision = stringValue(row.date_precision) as DatePrecision;
      await db.milestones.put({
        id,
        title: stringValue(row.title),
        templateKey: nullableString(row.template_key),
        category: nullableString(row.category) as JourneyCategory | null,
        eventDate: precision === "approximate" ? nullableString(row.approximate_date) : nullableString(row.event_date),
        datePrecision: precision,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    }
    case "journey_event": {
      const precision = stringValue(row.date_precision) as DatePrecision;
      await db.journeyEvents.put({
        id,
        type: stringValue(row.type),
        title: stringValue(row.title),
        category: nullableString(row.category) as JourneyCategory | null,
        eventDate: precision === "approximate" ? nullableString(row.approximate_date) : nullableString(row.event_date),
        datePrecision: precision,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    }
    case "medication": {
      const frequency = row.frequency && typeof row.frequency === "object"
        ? row.frequency as MedicationFrequency
        : null;
      await db.medications.put({
        id,
        name: stringValue(row.name),
        route: nullableString(row.route) as MedicationRoute | null,
        unit: nullableString(row.unit),
        frequency,
        activeSupplyId: nullableString(row.active_supply_id),
        active: Boolean(row.active),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    }
    case "medication_supply":
      await db.medicationSupplies.put({
        id,
        medicationId: stringValue(row.medication_id),
        label: nullableString(row.label),
        quantity: nullableNumber(row.quantity) ?? 0,
        supplyUnit: stringValue(row.supply_unit),
        amountPerDose: nullableNumber(row.amount_per_dose) ?? 1,
        lowSupplyDays: nullableNumber(row.low_supply_days),
        renewalDate: nullableString(row.renewal_date),
        expiryDate: nullableString(row.expiry_date),
        pharmacy: nullableString(row.pharmacy),
        note: nullableString(row.note),
        snoozedUntil: nullableString(row.snoozed_until),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    case "medication_log":
      await db.medicationLogs.put({
        id,
        medicationId: stringValue(row.medication_id),
        scheduledTime: nullableString(row.scheduled_time),
        status: stringValue(row.status) as DoseStatus,
        loggedAt: stringValue(row.logged_at),
        note: nullableString(row.note),
        injectionSite: nullableString(row.injection_site) as InjectionSite | null,
        updatedAt: changedAt,
      });
      return;
    case "medication_supply_adjustment":
      await db.medicationSupplyAdjustments.put({
        id,
        supplyId: stringValue(row.supply_id),
        medicationId: stringValue(row.medication_id),
        kind: stringValue(row.kind) as MedicationSupplyAdjustmentKind,
        quantityChange: nullableNumber(row.quantity_change) ?? 0,
        quantityAfter: nullableNumber(row.quantity_after) ?? 0,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    case "care_supply":
      await db.careSupplies.put({
        id,
        name: stringValue(row.name),
        category: stringValue(row.category) as "injection" | "care" | "other",
        quantity: nullableNumber(row.quantity) ?? 0,
        supplyUnit: stringValue(row.supply_unit),
        lowQuantity: nullableNumber(row.low_quantity),
        renewalDate: nullableString(row.renewal_date),
        deliveryDate: nullableString(row.delivery_date),
        expiryDate: nullableString(row.expiry_date),
        provider: nullableString(row.provider),
        batchNumber: nullableString(row.batch_number),
        note: nullableString(row.note),
        snoozedUntil: nullableString(row.snoozed_until),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    case "care_supply_adjustment":
      await db.careSupplyAdjustments.put({
        id,
        supplyId: stringValue(row.supply_id),
        kind: stringValue(row.kind) as CareSupplyAdjustmentKind,
        quantityChange: nullableNumber(row.quantity_change) ?? 0,
        quantityAfter: nullableNumber(row.quantity_after) ?? 0,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      });
      return;
    case "appointment": {
      const settings = row.reminder_settings as { minutesBefore?: number } | null | undefined;
      await db.appointments.put({
        id,
        title: stringValue(row.title),
        appointmentAt: stringValue(row.appointment_at),
        location: nullableString(row.location),
        preparationNote: nullableString(row.preparation_note),
        outcomeNote: nullableString(row.outcome_note),
        rescheduledFrom: nullableString(row.rescheduled_from),
        builderData: appointmentBuilderData(row.builder_data),
        reminderMinutesBefore: typeof settings?.minutesBefore === "number" ? settings.minutesBefore : null,
        createdAt,
        updatedAt: changedAt,
      } satisfies Appointment);
      return;
    }
    case "referral": {
      await db.referrals.put({
        id,
        serviceName: stringValue(row.service_name),
        kind: (nullableString(row.kind) ?? "other") as ReferralKind,
        referredOn: nullableString(row.referred_on),
        referredBy: nullableString(row.referred_by),
        referenceNumber: nullableString(row.reference_number),
        status: (nullableString(row.status) ?? "waiting") as ReferralStatus,
        chaseEveryDays: nullableNumber(row.chase_every_days),
        lastChasedOn: nullableString(row.last_chased_on),
        clinicIndexId: nullableNumber(row.clinic_index_id),
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      } satisfies Referral);
      return;
    }
    case "referral_update": {
      await db.referralUpdates.put({
        id,
        referralId: stringValue(row.referral_id),
        happenedOn: stringValue(row.happened_on),
        kind: (nullableString(row.kind) ?? "note") as ReferralUpdateKind,
        contactMethod: nullableString(row.contact_method) as ContactMethod | null,
        spokeTo: nullableString(row.spoke_to),
        body: stringValue(row.body),
        createdAt,
        updatedAt: changedAt,
      } satisfies ReferralUpdate);
      return;
    }
    case "self_directed": {
      // Always the local single row, never the server's id. One row per
      // device, one row per account, same row.
      await db.selfDirected.put({
        id: SELF_DIRECTED_ID,
        label: nullableString(row.label),
        prescriberStatus: nullableString(row.prescriber_status) as PrescriberStatus | null,
        hrtStartedOn: nullableString(row.hrt_started_on),
        bloodCheckIntervalDays: nullableNumber(row.blood_check_interval_days),
        setupCompletedAt: nullableString(row.setup_completed_at),
        createdAt,
        updatedAt: changedAt,
      } satisfies SelfDirectedSettings);
      return;
    }
    case "check_in": {
      await db.checkIns.put({
        id,
        mood: nullableNumber(row.mood),
        energy: nullableNumber(row.energy),
        confidence: nullableNumber(row.confidence),
        stress: nullableNumber(row.stress),
        comfort: nullableNumber(row.comfort),
        note: nullableString(row.note),
        period: nullableString(row.period) as CheckInPeriod | null,
        createdAt,
        updatedAt: changedAt,
      } satisfies CheckIn);
      return;
    }
    case "goal":
      await db.goals.put({
        id,
        title: stringValue(row.title),
        category: nullableString(row.category) as JourneyCategory | null,
        target: nullableString(row.target),
        status: stringValue(row.status) as GoalStatus,
        convertedToMilestoneId: nullableString(row.converted_to_milestone_id),
        createdAt,
        updatedAt: changedAt,
        completedAt: nullableString(row.completed_at),
      });
      return;
    case "aurora_nudge":
      await db.auroraNudges.put({
        nudgeKey: stringValue(row.nudge_key),
        lastShownAt: stringValue(row.last_shown_at),
        dismissedCount: nullableNumber(row.dismissed_count) ?? 0,
      });
      return;
    case "journal_entry":
      await db.journalEntries.put({
        id,
        bodyText: stringValue(row.body_text),
        createdAt,
        updatedAt: changedAt,
      } satisfies JournalEntry);
      return;
    case "private_link":
      await db.privateLinks.put({
        id,
        label: stringValue(row.label),
        url: stringValue(row.url),
        note: nullableString(row.note),
        createdAt,
      } satisfies PrivateLink);
      return;
    case "blood_test_entry":
      await db.bloodTestEntries.put({
        id,
        testName: stringValue(row.test_name),
        date: stringValue(row.date),
        value: stringValue(row.value),
        unit: nullableString(row.unit),
        labSource: nullableString(row.lab_source),
        referenceRangeRaw: nullableString(row.reference_range_raw),
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      } satisfies BloodTestEntry);
      return;
    case "voice_goal":
      await db.voiceGoals.put({
        id,
        title: stringValue(row.title),
        category: stringValue(row.category) as VoicePracticeCategory,
        targetFrequency: nullableString(row.target_frequency),
        targetDuration: nullableString(row.target_duration),
        createdAt,
        updatedAt: changedAt,
      } satisfies VoiceGoal);
      return;
    case "voice_session": {
      const existing = await db.voiceSessions.get(id);
      await db.voiceSessions.put({
        id,
        goalId: stringValue(row.goal_id),
        sessionDuration: nullableString(row.session_duration),
        comfortRating: nullableNumber(row.comfort_rating),
        note: nullableString(row.note),
        // Never restored from the server - see VoiceSession's own comment.
        // A session that already has a local recording keeps it untouched.
        recording: existing?.recording ?? null,
        pitchLowHz: nullableNumber(row.pitch_low_hz),
        pitchHighHz: nullableNumber(row.pitch_high_hz),
        createdAt,
      } satisfies VoiceSession);
      return;
    }
    case "presentation_entry": {
      const existing = await db.presentationEntries.get(id);
      await db.presentationEntries.put({
        id,
        date: stringValue(row.date),
        category: stringValue(row.category) as PresentationCategory,
        note: nullableString(row.note),
        // Never restored from the server - see PresentationEntry's own comment.
        photo: existing?.photo ?? null,
        confidenceRating: nullableNumber(row.confidence_rating),
        wantToTry: row.want_to_try === true,
        createdAt,
        updatedAt: changedAt,
      } satisfies PresentationEntry);
      return;
    }
    case "body_entry": {
      const existing = await db.bodyEntries.get(id);
      await db.bodyEntries.put({
        id,
        date: stringValue(row.date),
        measurements: measurementsArray(row.measurements),
        // Never restored from the server - see BodyEntry's own comment.
        photo: existing?.photo ?? null,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      } satisfies BodyEntry);
      return;
    }
    case "intimacy_entry":
      await db.intimacyEntries.put({
        id,
        date: stringValue(row.date),
        time: nullableString(row.time),
        datePrecision: stringValue(row.date_precision) as IntimacyDatePrecision,
        label: nullableString(row.label),
        tags: stringArray(row.tags),
        protectionNote: nullableString(row.protection_note),
        feeling: nullableString(row.feeling) as IntimacyFeeling | null,
        aftercareNote: nullableString(row.aftercare_note),
        privateNote: nullableString(row.private_note),
        createdAt,
        updatedAt: changedAt,
      } satisfies IntimacyEntry);
      return;
    case "weight_entry":
      await db.weightEntries.put({
        id,
        date: stringValue(row.date),
        weightGrams: nullableNumber(row.weight_grams) ?? 0,
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      } satisfies WeightEntry);
      return;
    case "calorie_entry":
      await db.calorieEntries.put({
        id,
        date: stringValue(row.date),
        label: stringValue(row.label),
        calories: nullableNumber(row.calories) ?? 0,
        meal: nullableString(row.meal),
        note: nullableString(row.note),
        createdAt,
        updatedAt: changedAt,
      } satisfies CalorieEntry);
      return;
    case "budget_entry":
      await db.budgetEntries.put({
        id,
        category: stringValue(row.category) as BudgetCategory,
        description: nullableString(row.description),
        amount: nullableNumber(row.amount) ?? 0,
        date: stringValue(row.date),
        createdAt,
        updatedAt: changedAt,
      } satisfies BudgetEntry);
      return;
    case "budget_goal":
      await db.budgetGoals.put({
        id,
        label: stringValue(row.label),
        targetAmount: nullableNumber(row.target_amount) ?? 0,
        savedAmount: nullableNumber(row.saved_amount) ?? 0,
        createdAt,
        updatedAt: changedAt,
      } satisfies BudgetGoal);
      return;
    case "support_map_entry":
      await db.supportMapEntries.put({
        id,
        name: stringValue(row.name),
        type: stringValue(row.type) as SupportMapEntryType,
        labels: stringArray(row.labels) as SupportMapLabel[],
        contact: nullableString(row.contact),
        area: nullableString(row.area),
        note: nullableString(row.note),
        reviewOn: nullableString(row.review_on),
        isFavourite: row.is_favourite === true,
        createdAt,
        updatedAt: changedAt,
      } satisfies SupportMapEntry);
      return;
    case "safety_check_in":
      await db.safetyCheckIns.put({
        id,
        startedAt: stringValue(row.started_at),
        dueAt: stringValue(row.due_at),
        status: stringValue(row.status) as SafetyCheckInStatus,
        snoozedOnce: row.snoozed_once === true,
      } satisfies SafetyCheckIn);
  }
}

async function pullEntity(
  client: SupabaseClient,
  entity: SyncEntity,
  userId: string,
  since: string,
  cutoff: string,
  clockOffsetMs: number
): Promise<number> {
  const pageSize = 500;
  let from = 0;
  let overwritten = 0;

  while (true) {
    const base = client
      .from(TABLES[entity])
      .select("*")
      .gt("updated_at", since)
      .lte("updated_at", cutoff)
      .order("updated_at", { ascending: true })
      .range(from, from + pageSize - 1);
    const query = entity === "profile" ? base.eq("id", userId) : base.eq("user_id", userId);
    const { data, error } = await query;
    if (error) throw error;

    const rows = (data ?? []) as RemoteRow[];
    for (const row of rows) {
      const recordId = entity === "profile"
        ? LOCAL_PROFILE_ID
        : entity === "aurora_nudge"
          ? stringValue(row.nudge_key)
          : stringValue(row.id);
      const pending = await db.syncOutbox.get(`${entity}:${recordId}`);
      const remoteChangedAt = stringValue(row.client_updated_at) || stringValue(row.updated_at);
      const pendingAt = pending ? normalizedClientTime(pending.changedAt, clockOffsetMs) : null;
      if (!shouldApplyRemoteChange(pendingAt, remoteChangedAt)) continue;

      await applyRemote(entity, row);
      if (pending) {
        // An edit made here lost to a newer one from another device and has
        // just been replaced. Counted so we can say so, rather than the
        // person quietly finding their words changed later.
        overwritten++;
        await db.syncOutbox.delete(pending.id);
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return overwritten;
}

export class SyncPullFailedError extends Error {
  readonly entities: SyncEntity[];
  constructor(entities: SyncEntity[], cause: unknown) {
    const label = entities.join(", ");
    super(
      `Blossom couldn't download ${entities.length === 1 ? "one category" : `${entities.length} categories`} (${label}). ` +
        (cause instanceof Error ? cause.message : "Unknown error.")
    );
    this.name = "SyncPullFailedError";
    this.entities = entities;
  }
}

interface PullResult {
  overwritten: number;
  failed: SyncEntity[];
  firstError: unknown;
}

/**
 * One entity failing used to throw straight out of here - which meant the
 * pushOutbox call that follows never ran, so a single unreadable table stopped
 * every other category on the device from *uploading* too. Nothing would ever
 * reach the server again, silently, until someone noticed data missing.
 *
 * Now each entity is isolated: a failure is recorded and the rest carry on.
 * The caller still gets told, but only after everything that could work has.
 */
async function pullAll(
  client: SupabaseClient,
  userId: string,
  since: string,
  cutoff: string,
  clockOffsetMs: number
): Promise<PullResult> {
  let overwritten = 0;
  const errors = new Map<SyncEntity, unknown>();

  // The profile has to land before the rest, and now actually does. It carries
  // the "what syncs" choices and everything below is filtered by them, so
  // fetching it first means a choice made on another device takes effect on
  // this pass rather than the next one. The old code read those choices before
  // the loop that fetched the profile, so it promised an ordering it never
  // delivered.
  try {
    overwritten += await pullEntity(client, "profile", userId, since, cutoff, clockOffsetMs);
  } catch (error) {
    errors.set("profile", error);
  }

  const excluded = (await getOrCreateProfile()).syncExcludedCategories ?? [];
  // Nothing to fetch for a category that shouldn't be on the server, and
  // fetching it would quietly re-seed the device from stale rows.
  const rest = SYNC_ORDER.filter(
    (entity) => entity !== "profile" && !isEntityExcluded(entity, excluded)
  );

  // Together, not one after another. Every category costs a round trip even
  // when it has nothing new to send back, so a sync used to be twenty-seven of
  // them end to end: unnoticeable on a laptop, long enough on mobile data that
  // people assumed sync wasn't running and went hunting for a button. Each
  // entity writes to its own local table and none of them reads another's, so
  // there is no order here worth keeping.
  const settled = await Promise.allSettled(
    rest.map((entity) => pullEntity(client, entity, userId, since, cutoff, clockOffsetMs))
  );
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") overwritten += result.value;
    else errors.set(rest[index], result.reason);
  });

  // Reported in SYNC_ORDER rather than in whichever order the requests happened
  // to fail, so the same broken sync reads the same way twice running.
  const failed = SYNC_ORDER.filter((entity) => errors.has(entity));
  return { overwritten, failed, firstError: failed.length ? errors.get(failed[0]) : null };
}

async function pushOutbox(
  client: SupabaseClient,
  userId: string,
  clockOffsetMs: number
): Promise<void> {
  const priority = new Map(SYNC_ORDER.map((entity, index) => [entity, index]));
  const excluded = (await getOrCreateProfile()).syncExcludedCategories ?? [];
  const queued = await db.syncOutbox.toArray();

  // A belt-and-braces second gate. recordSyncChange already refuses to queue
  // excluded records, but a change made before the choice - or arriving from
  // another device mid-sync - must not slip out here either.
  const blocked = queued.filter((item) => isEntityExcluded(item.entity, excluded));
  if (blocked.length) await db.syncOutbox.bulkDelete(blocked.map((item) => item.id));

  const items = queued
    .filter((item) => !isEntityExcluded(item.entity, excluded))
    .sort((a, b) => (priority.get(a.entity) ?? 99) - (priority.get(b.entity) ?? 99));

  let firstError: unknown = null;
  let stuck = 0;

  for (const item of items) {
    // A record the server keeps refusing (a constraint it violates, a parent
    // deleted on another device) used to abort the whole loop and sit at the
    // front of the queue forever, so nothing behind it ever uploaded. Park it
    // instead and carry on - the rest of someone's journal is more important
    // than this one row, and it stays in the outbox rather than being thrown
    // away.
    // Parked items used to be skipped here forever: attempts only ever went up,
    // nothing reset it, and "Sync now" ran this same loop - so five failures on
    // one flaky train journey stranded a record permanently. A retry now clears
    // the count first (see retryStuckSyncItems), and this stays as the guard
    // for a genuinely unsendable record rather than a life sentence.
    if (item.attempts >= MAX_PUSH_ATTEMPTS) {
      stuck++;
      continue;
    }

    try {
      await pushChange(client, userId, item, clockOffsetMs);
      await db.syncOutbox.delete(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      await db.syncOutbox.update(item.id, {
        attempts: item.attempts + 1,
        lastError: message,
      });
      if (item.attempts + 1 >= MAX_PUSH_ATTEMPTS) stuck++;
      // Remember the first failure but keep going, so one bad record can't
      // hold up everything else.
      if (firstError === null) firstError = error;
    }
  }

  // Surfaced rather than swallowed: the user should know some changes aren't
  // reaching the server, even though the rest of the sync worked.
  if (stuck > 0) {
    throw new SyncItemsStuckError(stuck);
  }
  if (firstError !== null) throw firstError;
}


let activeSync: Promise<void> | null = null;

async function performSync(userId: string): Promise<void> {
  const state = await getOrCreateSyncState();
  const profile = await getOrCreateProfile();
  if (!profile.syncEnabled) return;
  if (state.ownerId && state.ownerId !== userId) throw new LocalDataOwnershipError();

  const client = createClient();
  await db.syncMeta.update("sync", { syncing: true, lastError: null });
  try {
    const firstCutoff = await serverClock(client);
    const clockOffsetMs = new Date(firstCutoff).getTime() - Date.now();
    const since = state.lastPulledAt ?? "1970-01-01T00:00:00.000Z";
    const firstPull = await pullAll(client, userId, since, firstCutoff, clockOffsetMs);

    // Deliberately not gated on the pull succeeding. Uploading is the half
    // that protects someone's data; it should happen even on a day when
    // downloading is broken.
    let pushError: unknown = null;
    try {
      await pushOutbox(client, userId, clockOffsetMs);
    } catch (error) {
      pushError = error;
    }

    const secondCutoff = await serverClock(client);
    const secondPull = await pullAll(client, userId, since, secondCutoff, clockOffsetMs);
    const overwritten = firstPull.overwritten + secondPull.overwritten;
    const failed = secondPull.failed;

    // Only advance the watermark when every category came down. Moving it past
    // an entity that failed would skip those rows forever - they'd never be
    // requested again, and the gap would look like data that simply vanished.
    await db.syncMeta.update("sync", {
      ...(failed.length === 0 ? { lastPulledAt: secondCutoff } : {}),
      lastSyncedAt: secondCutoff,
      lastError: null,
      lastOverwrittenCount: overwritten,
    });

    if (failed.length > 0) throw new SyncPullFailedError(failed, secondPull.firstError);
    if (pushError !== null) throw pushError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blossom couldn't sync just now.";
    await db.syncMeta.update("sync", { lastError: message });
    throw error;
  } finally {
    await db.syncMeta.update("sync", { syncing: false });
  }
}

/**
 * Remove already-uploaded records for categories that are now device-only.
 *
 * A HARD delete, deliberately - and this is the load-bearing detail of the
 * whole feature. The normal removal path sets `deleted_at`, and applyRemote
 * treats any row carrying it as an instruction to delete locally. Going that
 * way would mean switching off journal sync silently wiped the person's
 * journal on their other phone: a privacy setting destroying the thing it
 * exists to protect.
 *
 * A hard-deleted row is simply absent from the next pull. Other devices are
 * told nothing, keep every local record they hold, and stop uploading because
 * the profile carries the new choice. Nothing on any device is lost.
 */
export async function purgeExcludedFromServer(userId: string, categoryKeys: string[]): Promise<number> {
  if (categoryKeys.length === 0) return 0;
  const client = createClient();
  const entities = entitiesForCategories(categoryKeys);
  let removed = 0;

  for (const entity of entities) {
    const { count, error } = await client
      .from(TABLES[entity])
      .delete({ count: "exact" })
      .eq("user_id", userId);
    if (error) throw error;
    removed += count ?? 0;
  }
  return removed;
}

export async function syncNow(userId: string): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = performSync(userId).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

/**
 * Give parked records another go.
 *
 * Most push failures are transient - offline, an expired token, a server
 * blip - and five of those in a row is an ordinary bad afternoon, not proof a
 * record is unsendable. Without this the only escape was pausing and
 * re-enabling sync, which nobody would guess.
 */
export async function retryStuckSyncItems(userId: string): Promise<void> {
  const stuck = await db.syncOutbox.filter((item) => item.attempts > 0).toArray();
  if (stuck.length) {
    await db.syncOutbox.bulkPut(stuck.map((item) => ({ ...item, attempts: 0, lastError: null })));
  }
  await syncNow(userId);
}

/** How long a parked record waits before the app gives it another go unasked. */
const UNPARK_EVERY_MS = 30 * 60 * 1000;
let lastUnparkAt = 0;

/**
 * The background pass, which is the same sync as the button with one addition:
 * every so often it unparks records first.
 *
 * Until now retryStuckSyncItems was reachable from exactly one place, the
 * "Sync now" button, so a record that failed five times stayed stuck until
 * somebody happened to visit the account screen and press it. Nobody would
 * guess that, and the app gave no sign there was anything to guess.
 *
 * Half-hourly rather than every pass, because MAX_PUSH_ATTEMPTS exists to stop
 * a genuinely unsendable record hammering the server forever, and unparking on
 * every tick would delete that protection rather than soften it. Starts at zero
 * so opening the app is itself a retry.
 */
export async function backgroundSync(userId: string): Promise<void> {
  if (Date.now() - lastUnparkAt >= UNPARK_EVERY_MS) {
    lastUnparkAt = Date.now();
    await retryStuckSyncItems(userId);
    return;
  }
  await syncNow(userId);
}

export async function enableSync(userId: string): Promise<void> {
  const state = await getOrCreateSyncState();
  if (state.ownerId && state.ownerId !== userId) throw new LocalDataOwnershipError();

  const changedAt = new Date().toISOString();
  await db.syncMeta.update("sync", { ownerId: userId, lastError: null });
  await db.profiles.update(LOCAL_PROFILE_ID, { syncEnabled: true, updatedAt: changedAt });
  await enqueueSnapshot(SYNC_ORDER);
  await syncNow(userId);
}

export async function pauseSync(): Promise<void> {
  await db.profiles.update(LOCAL_PROFILE_ID, { syncEnabled: false });
  await db.syncMeta.update("sync", { syncing: false, lastError: null });
}
