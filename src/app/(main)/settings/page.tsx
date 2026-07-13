"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import styles from "./settings.module.css";

const CHEVRON = (
  <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

function Row({ href, title, meta }: { href: string; title: string; meta?: string }) {
  return (
    <Link href={href} className={styles.row}>
      <div className={styles.rowText}>
        <span className={styles.rowTitle}>{title}</span>
        {meta && <span className={styles.rowMeta}>{meta}</span>}
      </div>
      {CHEVRON}
    </Link>
  );
}

const AURORA_LABELS: Record<string, string> = {
  quiet: "Quiet",
  gentle: "Gentle",
  supportive: "Supportive",
  disabled: "Disabled",
};

export default function SettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Settings</div>

      <div className={styles.group}>
        <Row href="/settings/profile" title="Profile & preferences" meta={profile.displayName ?? undefined} />
        <Row href="/settings/aurora" title="Aurora" meta={AURORA_LABELS[profile.auroraMode]} />
        <Row href="/settings/modules" title="Enabled modules" meta={`${profile.enabledModules.length} on`} />
      </div>

      <div className={styles.group}>
        <Row href="/settings/notifications" title="Notifications" />
        <Row
          href="/settings/privacy"
          title="Privacy & security"
          meta={profile.appLockEnabled ? "App lock on" : undefined}
        />
        <Row href="/settings/account" title="Account & sync" meta={profile.syncEnabled ? "Sync on" : "Local-only"} />
      </div>

      <div className={styles.group}>
        <Row href="/settings/accessibility" title="Accessibility" />
        <Row href="/settings/data" title="Data controls" />
        <Row href="/settings/support" title="Help & support" />
      </div>
    </div>
  );
}
