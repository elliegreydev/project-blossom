"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID, togglePinnedTrackModule, updateProfile, type ModuleKey } from "@/lib/db";
import { MODULE_OPTIONS as MODULES } from "@/lib/moduleOptions";
import styles from "@/components/settingsForm.module.css";

export default function ModulesSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;
  const pinnedModules = profile.trackPinnedModules ?? [];

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
        any time, and nothing you&apos;ve already added is deleted. Pin up to three
        enabled tools to My spaces in Track. Those pins stay on this device.
      </p>
      {MODULES.map((m) => (
        <div key={m.key} className={styles.toggleRow}>
          <div className={styles.toggleText}>
            <span className={styles.toggleTitle}>{m.title}</span>
            <span className={styles.toggleDesc}>{m.desc}</span>
            {profile.enabledModules.includes(m.key) && <button type="button" className={styles.tertiaryButton} style={{ alignSelf: "flex-start", padding: "4px 0", minHeight: 34 }} disabled={!pinnedModules.includes(m.key) && pinnedModules.length >= 3} onClick={() => void togglePinnedTrackModule(m.key)}>{pinnedModules.includes(m.key) ? "Remove from My spaces" : pinnedModules.length >= 3 ? "My spaces is full" : "Pin to My spaces"}</button>}
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
