"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID, updateProfile, type Profile } from "@/lib/db";
import {
  ACCESSIBILITY_PRESETS,
  applyPreset,
  profileForSettings,
  type AccessibilitySettings,
} from "@/lib/accessibilityProfiles";
import styles from "@/components/settingsForm.module.css";

const TEXT_SIZES: { key: Profile["textSize"]; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
  { key: "larger", label: "Larger" },
];

const SWITCHES: { key: keyof AccessibilitySettings; title: string; desc: string }[] = [
  {
    key: "reduceMotion",
    title: "Reduce motion",
    desc: "Turns off animated transitions, on top of your device setting",
  },
  {
    key: "highContrast",
    title: "Stronger contrast",
    desc: "Sharper text and firmer edges, in both light and dark",
  },
  {
    key: "largeTouchTargets",
    title: "Bigger tap targets",
    desc: "Makes buttons and inputs taller so they're easier to hit",
  },
  {
    key: "readingComfort",
    title: "Easier reading",
    desc: "More space between lines and letters in longer text",
  },
  {
    key: "reduceVisualNoise",
    title: "Less decoration",
    desc: "Removes gradients and background flourishes",
  },
];

export default function AccessibilitySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const settings: AccessibilitySettings = {
    reduceMotion: profile.reduceMotion,
    textSize: profile.textSize,
    highContrast: profile.highContrast,
    largeTouchTargets: profile.largeTouchTargets,
    readingComfort: profile.readingComfort,
    reduceVisualNoise: profile.reduceVisualNoise,
  };
  // Worked out from the switches rather than read from the stored value, so
  // the highlighted preset can never disagree with what's below it.
  const current = profileForSettings(settings);

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Accessibility" backHref="/settings" />

      <div className={styles.field}>
        <span className={styles.label}>Start from a preset</span>
        <p className={styles.hint}>
          A starting point, not a mode. Change anything you like afterwards and
          nothing gets undone.
        </p>
        <div className={styles.optionGrid}>
          {ACCESSIBILITY_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className={`${styles.optionCard} ${current === preset.key ? styles.selected : ""}`}
              onClick={() => void updateProfile(applyPreset(preset.key))}
            >
              <span className={styles.optionTitle}>{preset.label}</span>
              <span className={styles.optionDesc}>{preset.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Text size</span>
        <div className={styles.optionGrid}>
          {TEXT_SIZES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.optionCard} ${profile.textSize === t.key ? styles.selected : ""}`}
              onClick={() =>
                void updateProfile({
                  textSize: t.key,
                  accessibilityProfile: profileForSettings({ ...settings, textSize: t.key }),
                })
              }
            >
              <span className={styles.optionTitle}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {SWITCHES.map((option) => (
        <div key={option.key} className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>{option.title}</span>
            <span className={styles.toggleDesc}>{option.desc}</span>
          </div>
          <Toggle
            checked={settings[option.key] as boolean}
            onChange={(value) => {
              const next = { ...settings, [option.key]: value };
              void updateProfile({
                [option.key]: value,
                accessibilityProfile: profileForSettings(next),
              });
            }}
            label={option.title}
          />
        </div>
      ))}
    </div>
  );
}
