"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

export default function LowEnergyModeSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const enabled = profile.lowEnergyMode;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Low-Energy Mode" backHref="/settings" />
      <p className={styles.hint}>
        A very small Home screen for days when even a helpful list can feel like too much. It never changes your records, reminders or schedule.
      </p>
      <button
        type="button"
        className={`${styles.optionCard} ${enabled ? styles.selected : ""}`}
        aria-pressed={enabled}
        onClick={() => void updateProfile({ lowEnergyMode: !enabled })}
      >
        <span className={styles.optionTitle}>{enabled ? "Low-Energy Mode is on" : "Turn on Low-Energy Mode"}</span>
        <span className={styles.optionDesc}>
          {enabled
            ? "Home shows only the next medication, next appointment and two gentle ways to check in with yourself."
            : "Keep your existing Home layout, including the details you normally find useful."}
        </span>
      </button>
      <p className={styles.hint}>
        <strong>What stays visible:</strong> your next medication or appointment, support, and the rest of Blossom through the navigation. Turn it off whenever you want.
      </p>
    </div>
  );
}
