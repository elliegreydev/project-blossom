"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID, updateProfile, type Profile } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const TEXT_SIZES: { key: Profile["textSize"]; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
  { key: "larger", label: "Larger" },
];

export default function AccessibilitySettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Accessibility" backHref="/settings" />

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Reduce motion</span>
          <span className={styles.toggleDesc}>
            Turns off animated transitions, on top of your device setting
          </span>
        </div>
        <Toggle
          checked={profile.reduceMotion}
          onChange={(v) => updateProfile({ reduceMotion: v })}
          label="Reduce motion"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Text size</span>
        <div className={styles.optionGrid}>
          {TEXT_SIZES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.optionCard} ${profile.textSize === t.key ? styles.selected : ""}`}
              onClick={() => updateProfile({ textSize: t.key })}
            >
              <span className={styles.optionTitle}>{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
