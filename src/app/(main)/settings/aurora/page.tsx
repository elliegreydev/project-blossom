"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile, type AuroraMode } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const AURORA_MODES: { key: AuroraMode; title: string; desc: string }[] = [
  { key: "quiet", title: "Quiet", desc: "No proactive Home suggestions" },
  { key: "gentle", title: "Gentle", desc: "Occasional reminders and soft suggestions" },
  { key: "supportive", title: "Supportive", desc: "More frequent check-ins and encouragement" },
  { key: "disabled", title: "Disabled", desc: "No prompts beyond essential messages" },
];

export default function AuroraSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Aurora" backHref="/settings" />
      <p className={styles.hint}>
        Aurora is your optional guide. She never gives medical advice, never
        guilt-trips you, and never repeats a suggestion you&apos;ve dismissed.
      </p>
      <div className={styles.field}>
        <span className={styles.label}>Local suggestions</span>
        <p className={styles.hint}>
          Aurora can quietly notice practical things already recorded on this
          device, such as a scheduled medication, an upcoming appointment, a
          supply that may need checking, a ready Time Capsule, or a goal you
          chose to revisit. This works without AI and never sends those records
          anywhere.
        </p>
      </div>
      <div className={styles.optionGrid}>
        {AURORA_MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            className={`${styles.optionCard} ${profile.auroraMode === m.key ? styles.selected : ""}`}
            onClick={() => updateProfile({ auroraMode: m.key })}
          >
            <span className={styles.optionTitle}>{m.title}</span>
            <span className={styles.optionDesc}>{m.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
