"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function GentleModeSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const enabled = profile.gentleMode;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Gentle Mode" backHref="/settings" />
      <p className={styles.hint}>
        A quieter version of Blossom for days when tracking feels like too much. It never changes your records, reminders or medication schedule.
      </p>
      <button
        type="button"
        className={`${styles.optionCard} ${enabled ? styles.selected : ""}`}
        aria-pressed={enabled}
        onClick={() => void updateProfile({ gentleMode: !enabled })}
      >
        <span className={styles.optionTitle}>{enabled ? "Gentle Mode is on" : "Turn on Gentle Mode"}</span>
        <span className={styles.optionDesc}>
          {enabled
            ? "Home shows essentials, Aurora steps back, and body or supply numbers stay out of the way."
            : "Keep your existing Blossom layout, prompts and practical details."}
        </span>
      </button>
      <p className={styles.hint}>
        <strong>What stays visible:</strong> medication and appointment reminders you chose, private notes, and support links. You can turn this off whenever you like.
      </p>
    </div>
  );
}
