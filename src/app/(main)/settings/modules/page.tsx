"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID, updateProfile, type ModuleKey } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const MODULES: { key: ModuleKey; title: string; desc: string }[] = [
  { key: "journey", title: "Journey", desc: "Milestones and your timeline" },
  { key: "medication", title: "Medication", desc: "Schedules, reminders, history" },
  { key: "appointments", title: "Appointments", desc: "Clinics, tests, reminders" },
  { key: "journal", title: "Journal & check-ins", desc: "Notes, mood, reflections" },
  { key: "goals", title: "Goals", desc: "Things you're working towards" },
  { key: "bloodTests", title: "Blood tests", desc: "A private, descriptive record of your results" },
  { key: "voicePractice", title: "Voice practice", desc: "Practice goals and session notes" },
  { key: "presentation", title: "Presentation", desc: "Outfits, hair, makeup, and things you want to try" },
];

export default function ModulesSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  function toggle(key: ModuleKey, on: boolean) {
    const next = on
      ? [...profile!.enabledModules, key]
      : profile!.enabledModules.filter((m) => m !== key);
    updateProfile({ enabledModules: next });
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Enabled modules" backHref="/settings" />
      <p className={styles.hint}>
        Turn off anything you don&apos;t want to use. You can turn it back on
        any time, and nothing you&apos;ve already added is deleted.
      </p>
      {MODULES.map((m) => (
        <div key={m.key} className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>{m.title}</span>
            <span className={styles.toggleDesc}>{m.desc}</span>
          </div>
          <Toggle
            checked={profile.enabledModules.includes(m.key)}
            onChange={(v) => toggle(m.key, v)}
            label={m.title}
          />
        </div>
      ))}
    </div>
  );
}
