/**
 * Accessibility presets, and the individual settings underneath them.
 *
 * Everything here was already built and unreachable. The CSS exists in
 * globals.css, AccessibilityEffects.tsx already puts the data attributes on
 * <html>, the fields are already on the profile and already sync. What was
 * missing was any control at all: four of the six settings had no switch
 * anywhere in the app, so high contrast, large touch targets, reading comfort
 * and reduced visual noise were finished features nobody could turn on. For an
 * app used by people who may have low vision, motion sensitivity or a bad
 * migraine week, that's the whole feature missing rather than a rough edge.
 *
 * The presets are the roadmap item on top of that, and its wording set the
 * rule: "optional presets ... while keeping every setting adjustable". So a
 * preset is a starting point, never a mode. Pick one and it sets several
 * switches at once; change any switch afterwards and you quietly become
 * "custom" rather than being told off or locked out.
 */

export type AccessibilityProfile =
  | "custom"
  | "lowVision"
  | "readingComfort"
  | "lowCognitiveLoad"
  | "migraineFriendly"
  | "largeTouchTargets";

/** The settings a preset can drive. Mirrors the profile fields exactly. */
export interface AccessibilitySettings {
  reduceMotion: boolean;
  textSize: "normal" | "large" | "larger";
  highContrast: boolean;
  largeTouchTargets: boolean;
  readingComfort: boolean;
  reduceVisualNoise: boolean;
}

export const ACCESSIBILITY_DEFAULTS: AccessibilitySettings = {
  reduceMotion: false,
  textSize: "normal",
  highContrast: false,
  largeTouchTargets: false,
  readingComfort: false,
  reduceVisualNoise: false,
};

export interface AccessibilityPreset {
  key: Exclude<AccessibilityProfile, "custom">;
  label: string;
  desc: string;
  settings: AccessibilitySettings;
}

/**
 * Note what migraineFriendly deliberately does NOT do: it leaves high contrast
 * off. The instinct is to turn everything up for anybody with a visual
 * difficulty, but stark black-on-white is a common migraine trigger, so this
 * one calms the page down rather than sharpening it. Getting that backwards
 * would actively hurt the people picking it.
 */
export const ACCESSIBILITY_PRESETS: AccessibilityPreset[] = [
  {
    key: "lowVision",
    label: "Low vision",
    desc: "Bigger text, stronger contrast and larger things to tap.",
    settings: {
      ...ACCESSIBILITY_DEFAULTS,
      textSize: "larger",
      highContrast: true,
      largeTouchTargets: true,
    },
  },
  {
    key: "readingComfort",
    label: "Easier reading",
    desc: "More space between lines and letters, and slightly bigger text.",
    settings: { ...ACCESSIBILITY_DEFAULTS, textSize: "large", readingComfort: true },
  },
  {
    key: "lowCognitiveLoad",
    label: "Less to take in",
    desc: "Fewer decorations, no movement, and text that's easier to hold onto.",
    settings: {
      ...ACCESSIBILITY_DEFAULTS,
      reduceMotion: true,
      readingComfort: true,
      reduceVisualNoise: true,
    },
  },
  {
    key: "migraineFriendly",
    label: "Migraine-friendly",
    desc: "Nothing moves and nothing shimmers. Contrast is left alone on purpose, since harsh contrast can make things worse.",
    settings: { ...ACCESSIBILITY_DEFAULTS, reduceMotion: true, reduceVisualNoise: true },
  },
  {
    key: "largeTouchTargets",
    label: "Easier to tap",
    desc: "Bigger buttons and controls, everything else left as it is.",
    settings: { ...ACCESSIBILITY_DEFAULTS, largeTouchTargets: true },
  },
];

export function presetFor(key: AccessibilityProfile): AccessibilityPreset | null {
  return ACCESSIBILITY_PRESETS.find((preset) => preset.key === key) ?? null;
}

function sameSettings(a: AccessibilitySettings, b: AccessibilitySettings): boolean {
  return (
    a.reduceMotion === b.reduceMotion &&
    a.textSize === b.textSize &&
    a.highContrast === b.highContrast &&
    a.largeTouchTargets === b.largeTouchTargets &&
    a.readingComfort === b.readingComfort &&
    a.reduceVisualNoise === b.reduceVisualNoise
  );
}

/**
 * Which preset the current settings correspond to, or "custom".
 *
 * Derived from the settings rather than trusted from the stored value, so the
 * highlighted preset can never disagree with the switches below it. If someone
 * fiddles their way back to exactly the Low vision combination, it says Low
 * vision again - the app shouldn't insist they're "custom" when they're
 * demonstrably not.
 */
export function profileForSettings(settings: AccessibilitySettings): AccessibilityProfile {
  for (const preset of ACCESSIBILITY_PRESETS) {
    if (sameSettings(preset.settings, settings)) return preset.key;
  }
  return "custom";
}

/** Everything a preset changes, as a patch. Always a full set, so picking a
 *  preset clears whatever the last one turned on rather than accumulating. */
export function applyPreset(key: Exclude<AccessibilityProfile, "custom">): AccessibilitySettings & {
  accessibilityProfile: AccessibilityProfile;
} {
  const preset = presetFor(key);
  const settings = preset ? preset.settings : ACCESSIBILITY_DEFAULTS;
  return { ...settings, accessibilityProfile: key };
}
