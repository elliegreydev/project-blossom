/**
 * What leaves the device, in categories a person recognises.
 *
 * Sync used to be one boolean: turn it on and everything went - journal,
 * intimacy notes, body measurements, the lot. For an app whose promise is that
 * your data is yours, that's a single switch standing in for a real choice.
 *
 * Categories rather than the 27 internal entity names, because "Journal and
 * check-ins" is a thing someone has an opinion about and "aurora_nudge" isn't.
 *
 * No runtime imports: this is referenced from both the sync layer and the UI,
 * and the mapping needs to stay a plain fact about the data.
 */

import type { SyncEntity } from "./db";

export interface SyncCategory {
  key: string;
  label: string;
  description: string;
  entities: SyncEntity[];
}

/**
 * `profile` is deliberately absent and always syncs. It carries these very
 * choices, so a new device has to be able to read them - see the note in
 * sync.ts about profile being first in SYNC_ORDER.
 */
export const SYNC_CATEGORIES: SyncCategory[] = [
  {
    key: "journal",
    label: "Journal and check-ins",
    description: "Everything you write, and how you've been feeling",
    entities: ["journal_entry", "check_in", "aurora_nudge"],
  },
  {
    key: "medication",
    label: "Medication and supplies",
    description: "What you take, when you took it, and what you have left",
    entities: [
      "medication",
      "medication_supply",
      "medication_log",
      "medication_supply_adjustment",
      "care_supply",
      "care_supply_adjustment",
    ],
  },
  {
    key: "appointments",
    label: "Appointments",
    description: "Dates, places and who you're seeing",
    entities: ["appointment"],
  },
  {
    key: "journey",
    label: "Journey and goals",
    description: "Milestones, your timeline, and what you're working towards",
    entities: ["milestone", "journey_event", "goal"],
  },
  {
    key: "body",
    label: "Body, voice and presentation",
    description: "Measurements, blood tests, voice practice and what you've tried",
    entities: [
      "body_entry",
      "blood_test_entry",
      "presentation_entry",
      "voice_goal",
      "voice_session",
      "weight_entry",
      "calorie_entry",
    ],
  },
  {
    key: "intimacy",
    label: "Intimacy and wellbeing",
    description: "Private notes, in your own words",
    entities: ["intimacy_entry"],
  },
  {
    key: "money",
    label: "Budget",
    description: "Transition costs and savings goals",
    entities: ["budget_entry", "budget_goal"],
  },
  {
    key: "support",
    label: "Your people and safety",
    description: "Support map, saved links and safety check-ins",
    entities: ["support_map_entry", "private_link", "safety_check_in"],
  },
];

/** Things that never reach the server whatever anyone chooses. Worth saying out
 *  loud on the same screen - otherwise the absence looks like an oversight. */
export const NEVER_SYNCED = [
  "Photos and voice recordings",
  "Euphoria entries and Time Capsules",
  "Aurora AI conversations",
  "Trips you've planned",
  "Your app lock PIN",
];

const ENTITY_TO_CATEGORY = new Map<SyncEntity, string>(
  SYNC_CATEGORIES.flatMap((c) => c.entities.map((e) => [e, c.key] as [SyncEntity, string]))
);

/** Profile is not in any category and is always allowed - excluding it would
 *  strand the choices themselves on one device. */
export function isEntityExcluded(entity: SyncEntity, excluded: string[]): boolean {
  if (excluded.length === 0) return false;
  const category = ENTITY_TO_CATEGORY.get(entity);
  return category ? excluded.includes(category) : false;
}

export function entitiesForCategories(keys: string[]): SyncEntity[] {
  return SYNC_CATEGORIES.filter((c) => keys.includes(c.key)).flatMap((c) => c.entities);
}

export function categoryLabel(key: string): string {
  return SYNC_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
