"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile, type HrtStatus } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const HRT_OPTIONS: { key: NonNullable<HrtStatus>; title: string }[] = [
  { key: "on", title: "I'm currently on HRT" },
  { key: "considering", title: "I'm considering it" },
  { key: "not_tracking", title: "I don't want to track this" },
];

export default function ProfileSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName ?? "");
    setPronouns(profile.pronouns ?? "");
  }, [profile]);

  if (!profile) return null;

  async function save() {
    await updateProfile({
      displayName: displayName.trim() || null,
      pronouns: pronouns.trim() || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Profile & preferences" backHref="/settings" />

      <div className={styles.field}>
        <span className={styles.label}>Chosen or display name</span>
        <input
          className={styles.input}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={save}
          placeholder="Whatever feels right"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Pronouns</span>
        <input
          className={styles.input}
          value={pronouns}
          onChange={(e) => setPronouns(e.target.value)}
          onBlur={save}
          placeholder="e.g. she/her, they/them"
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Region</span>
        <input className={styles.input} value="UK" disabled />
        <span className={styles.hint}>
          Only the UK is available right now. More regions are on the way.
        </span>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>HRT tracking</span>
        <div className={styles.optionGrid}>
          {HRT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`${styles.optionCard} ${profile.hrtStatus === opt.key ? styles.selected : ""}`}
              onClick={() => updateProfile({ hrtStatus: opt.key })}
            >
              <span className={styles.optionTitle}>{opt.title}</span>
            </button>
          ))}
        </div>
      </div>

      {saved && <span className={styles.savedTag}>Saved</span>}
    </div>
  );
}
