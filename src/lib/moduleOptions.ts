import type { ModuleKey } from "./db";

/**
 * The one list of what Blossom's modules are called and what they're for.
 *
 * Both the onboarding picker and Settings > Enabled modules render from this.
 * They used to each keep their own copy, and the copies drifted: Settings grew
 * to eleven modules while onboarding still showed the original five, so a new
 * person's first impression of the app was a fifth of it.
 */
export interface ModuleOption {
  key: ModuleKey;
  title: string;
  desc: string;
}

export const MODULE_OPTIONS: ModuleOption[] = [
  { key: "journey", title: "Journey", desc: "Milestones and your timeline" },
  { key: "medication", title: "Medication", desc: "Schedules, reminders, history" },
  { key: "appointments", title: "Appointments", desc: "Clinics, tests, reminders" },
  { key: "journal", title: "Journal & check-ins", desc: "Notes, mood, reflections" },
  { key: "goals", title: "Goals", desc: "Things you're working towards" },
  { key: "bloodTests", title: "Blood tests", desc: "A private, descriptive record of your results" },
  { key: "voicePractice", title: "Voice practice", desc: "Practice goals and session notes" },
  { key: "presentation", title: "Presentation", desc: "Outfits, hair, makeup, and things you want to try" },
  { key: "bodyProgress", title: "Body & progress", desc: "A quiet, private place to notice change" },
  { key: "budget", title: "Budget tracker", desc: "Transition costs and savings goals, kept private" },
  { key: "intimacy", title: "Intimacy & wellbeing", desc: "A private space for personal notes" },
];

/** What a fresh profile starts with selected during onboarding. The original
 *  five, kept deliberately: "pick what you want" reads more like a choice than
 *  "deselect what you don't". */
export const DEFAULT_ONBOARDING_MODULES: ModuleKey[] = [
  "journey",
  "medication",
  "appointments",
  "journal",
  "goals",
];
