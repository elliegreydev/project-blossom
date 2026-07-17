"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import {
  db,
  LOCAL_PROFILE_ID,
  updateProfile,
  type AccessibilityProfile,
  type Profile,
} from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const TEXT_SIZES: { key: Profile["textSize"]; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
  { key: "larger", label: "Larger" },
];

type PresetKey = Exclude<AccessibilityProfile, "custom">;

const PRESETS: Array<{
  key: PresetKey;
  title: string;
  desc: string;
  values: Pick<Profile, "textSize" | "reduceMotion" | "highContrast" | "largeTouchTargets" | "readingComfort" | "reduceVisualNoise">;
}> = [
  {
    key: "lowVision",
    title: "Low vision",
    desc: "Larger text, stronger contrast and roomier controls.",
    values: { textSize: "larger", reduceMotion: false, highContrast: true, largeTouchTargets: true, readingComfort: false, reduceVisualNoise: false },
  },
  {
    key: "readingComfort",
    title: "Reading comfort",
    desc: "More relaxed text spacing and line height for easier reading.",
    values: { textSize: "large", reduceMotion: false, highContrast: false, largeTouchTargets: false, readingComfort: true, reduceVisualNoise: false },
  },
  {
    key: "lowCognitiveLoad",
    title: "Low cognitive load",
    desc: "Less decorative noise, calmer screens and fewer moving parts.",
    values: { textSize: "large", reduceMotion: true, highContrast: false, largeTouchTargets: true, readingComfort: true, reduceVisualNoise: true },
  },
  {
    key: "migraineFriendly",
    title: "Migraine-friendly",
    desc: "No extra motion or decorative gradients, with a calmer visual field.",
    values: { textSize: "normal", reduceMotion: true, highContrast: false, largeTouchTargets: false, readingComfort: false, reduceVisualNoise: true },
  },
  {
    key: "largeTouchTargets",
    title: "Large touch targets",
    desc: "Bigger controls without changing the rest of the layout.",
    values: { textSize: "normal", reduceMotion: false, highContrast: false, largeTouchTargets: true, readingComfort: false, reduceVisualNoise: false },
  },
];

export default function AccessibilitySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  function applyPreset(preset: (typeof PRESETS)[number]) {
    void updateProfile({ ...preset.values, accessibilityProfile: preset.key });
  }

  function updateIndividually(patch: Partial<Profile>) {
    void updateProfile({ ...patch, accessibilityProfile: "custom" });
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Accessibility" backHref="/settings" />

      <div className={styles.field}>
        <span className={styles.label}>Choose a starting point</span>
        <p className={styles.hint}>
          Presets are only a shortcut. Change anything below and Blossom will simply call your setup Custom.
        </p>
        <div className={styles.optionGrid}>
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`${styles.optionCard} ${profile.accessibilityProfile === preset.key ? styles.selected : ""}`}
              onClick={() => applyPreset(preset)}
            >
              <span className={styles.optionTitle}>{preset.title}</span>
              <span className={styles.optionDesc}>{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Reduce motion</span>
          <span className={styles.toggleDesc}>
            Turns off animated transitions, on top of your device setting
          </span>
        </div>
        <Toggle
          checked={profile.reduceMotion}
          onChange={(v) => updateIndividually({ reduceMotion: v })}
          label="Reduce motion"
        />
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>High contrast</span>
          <span className={styles.toggleDesc}>Makes text, borders and focus states more distinct</span>
        </div>
        <Toggle checked={profile.highContrast} onChange={(v) => updateIndividually({ highContrast: v })} label="High contrast" />
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Large touch targets</span>
          <span className={styles.toggleDesc}>Gives buttons and form controls more room to tap</span>
        </div>
        <Toggle checked={profile.largeTouchTargets} onChange={(v) => updateIndividually({ largeTouchTargets: v })} label="Large touch targets" />
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Reading comfort</span>
          <span className={styles.toggleDesc}>Uses more relaxed spacing and line height</span>
        </div>
        <Toggle checked={profile.readingComfort} onChange={(v) => updateIndividually({ readingComfort: v })} label="Reading comfort" />
      </div>

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Reduce visual noise</span>
          <span className={styles.toggleDesc}>Hides decorative elements and removes extra gradients</span>
        </div>
        <Toggle checked={profile.reduceVisualNoise} onChange={(v) => updateIndividually({ reduceVisualNoise: v })} label="Reduce visual noise" />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Text size</span>
        <div className={styles.optionGrid}>
          {TEXT_SIZES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.optionCard} ${profile.textSize === t.key ? styles.selected : ""}`}
              onClick={() => updateIndividually({ textSize: t.key })}
            >
              <span className={styles.optionTitle}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
