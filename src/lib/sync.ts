import type { SupabaseClient } from "@supabase/supabase-js";
import {
  db,
  getOrCreateProfile,
  getOrCreateSyncState,
  LOCAL_PROFILE_ID,
  recordSyncChange,
  type Appointment,
  emptyAppointmentBuilderData,
  type AuroraMode,
  type CheckIn,
  type DatePrecision,
  type DoseStatus,
  type GoalStatus,
  type HrtStatus,
  type JourneyCategory,
  type MedicationFrequency,
  type MedicationRoute,
  type MedicationSupplyAdjustmentKind,
  type CareSupplyAdjustmentKind,
  type ModuleKey,
  type ReminderPrivacy,
  type SyncEntity,
  type SyncOutboxItem,
} from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { shouldApplyRemoteChange } from "@/lib/sync-policy";

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
  "check_in",
  "goal",
  "aurora_nudge",
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
  check_in: "check_ins",
  goal: "goals",
  aurora_nudge: "aurora_interaction_log",
};

export class LocalDataOwnershipError extends Error {
  constructor() {
    super("This device's Blossom data is already connected to a different account.");
    this.name = "LocalDataOwnershipError";
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
        reminder_privacy: profile.reminderPrivacy,
        gentle_mode: profile.gentleMode,
        sensitive_modules_locked: profile.sensitiveModulesLocked,
        age_confirmed_at: profile.ageConfirmedAt,
        onboarding_completed_at: profile.onboardingCompletedAt,
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
            note: null,
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
    case "check_in":
      await db.checkIns.delete(id);
      return;
    case "goal":
      await db.goals.delete(id);
      return;
    case "aurora_nudge":
      await db.auroraNudges.delete(stringValue(row.nudge_key));
  }
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
        gentleMode: row.gentle_mode === true,
        sensitiveModulesLocked: Boolean(row.sensitive_modules_locked),
        ageConfirmedAt: nullableString(row.age_confirmed_at),
        onboardingCompletedAt: nullableString(row.onboarding_completed_at),
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
    case "check_in": {
      const existing = await db.checkIns.get(id);
      await db.checkIns.put({
        id,
        mood: nullableNumber(row.mood),
        energy: nullableNumber(row.energy),
        confidence: nullableNumber(row.confidence),
        stress: nullableNumber(row.stress),
        comfort: nullableNumber(row.comfort),
        note: existing?.note ?? null,
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
  }
}

async function pullEntity(
  client: SupabaseClient,
  entity: SyncEntity,
  userId: string,
  since: string,
  cutoff: string,
  clockOffsetMs: number
): Promise<void> {
  const pageSize = 500;
  let from = 0;

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
      if (pending) await db.syncOutbox.delete(pending.id);
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }
}

async function pullAll(
  client: SupabaseClient,
  userId: string,
  since: string,
  cutoff: string,
  clockOffsetMs: number
): Promise<void> {
  for (const entity of SYNC_ORDER) {
    await pullEntity(client, entity, userId, since, cutoff, clockOffsetMs);
  }
}

async function pushOutbox(
  client: SupabaseClient,
  userId: string,
  clockOffsetMs: number
): Promise<void> {
  const priority = new Map(SYNC_ORDER.map((entity, index) => [entity, index]));
  const items = (await db.syncOutbox.toArray()).sort(
    (a, b) => (priority.get(a.entity) ?? 99) - (priority.get(b.entity) ?? 99)
  );

  for (const item of items) {
    try {
      await pushChange(client, userId, item, clockOffsetMs);
      await db.syncOutbox.delete(item.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed.";
      await db.syncOutbox.update(item.id, {
        attempts: item.attempts + 1,
        lastError: message,
      });
      throw error;
    }
  }
}

async function enqueueFullSnapshot(): Promise<void> {
  const profile = await getOrCreateProfile();
  await recordSyncChange("profile", LOCAL_PROFILE_ID, "upsert", profile.updatedAt);

  const collections: Array<[SyncEntity, Array<{ id: string; updatedAt: string }>]> = [
    ["milestone", await db.milestones.toArray()],
    ["journey_event", await db.journeyEvents.toArray()],
    ["medication", await db.medications.toArray()],
    ["medication_supply", await db.medicationSupplies.toArray()],
    ["medication_log", await db.medicationLogs.toArray()],
    ["medication_supply_adjustment", await db.medicationSupplyAdjustments.toArray()],
    ["care_supply", await db.careSupplies.toArray()],
    ["care_supply_adjustment", await db.careSupplyAdjustments.toArray()],
    ["appointment", await db.appointments.toArray()],
    ["check_in", await db.checkIns.toArray()],
    ["goal", await db.goals.toArray()],
  ];
  for (const [entity, records] of collections) {
    for (const record of records) {
      await recordSyncChange(entity, record.id, "upsert", record.updatedAt);
    }
  }
  for (const nudge of await db.auroraNudges.toArray()) {
    await recordSyncChange("aurora_nudge", nudge.nudgeKey, "upsert", nudge.lastShownAt);
  }
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
    await pullAll(client, userId, since, firstCutoff, clockOffsetMs);
    await pushOutbox(client, userId, clockOffsetMs);

    const secondCutoff = await serverClock(client);
    await pullAll(client, userId, since, secondCutoff, clockOffsetMs);
    await db.syncMeta.update("sync", {
      lastPulledAt: secondCutoff,
      lastSyncedAt: secondCutoff,
      lastError: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Blossom couldn't sync just now.";
    await db.syncMeta.update("sync", { lastError: message });
    throw error;
  } finally {
    await db.syncMeta.update("sync", { syncing: false });
  }
}

export async function syncNow(userId: string): Promise<void> {
  if (activeSync) return activeSync;
  activeSync = performSync(userId).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

export async function enableSync(userId: string): Promise<void> {
  const state = await getOrCreateSyncState();
  if (state.ownerId && state.ownerId !== userId) throw new LocalDataOwnershipError();

  const changedAt = new Date().toISOString();
  await db.syncMeta.update("sync", { ownerId: userId, lastError: null });
  await db.profiles.update(LOCAL_PROFILE_ID, { syncEnabled: true, updatedAt: changedAt });
  await enqueueFullSnapshot();
  await syncNow(userId);
}

export async function pauseSync(): Promise<void> {
  await db.profiles.update(LOCAL_PROFILE_ID, { syncEnabled: false });
  await db.syncMeta.update("sync", { syncing: false, lastError: null });
}
