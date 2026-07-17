"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
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
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkStaffAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase.rpc("is_staff");
      if (!cancelled && !error) setIsStaff(data === true);
    }

    void checkStaffAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Settings</div>

      <div className={styles.group}>
        <Row href="/settings/profile" title="Profile & preferences" meta={profile.displayName ?? undefined} />
        <Row href="/settings/aurora" title="Aurora" meta={AURORA_LABELS[profile.auroraMode]} />
        <Row href="/settings/gentle" title="Gentle Mode" meta={profile.gentleMode ? "On" : "Off"} />
        <Row href="/settings/low-energy" title="Low-Energy Mode" meta={profile.lowEnergyMode ? "On" : "Off"} />
        <Row href="/settings/home" title="Home screen" meta="Customise this device" />
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

      <div className={styles.group}>
        <Row href="/roadmap" title="Blossom roadmap" meta="What's here and what's next" />
        <Row href="/legal/privacy" title="Privacy Policy" />
        <Row href="/legal/terms" title="Terms of Service" />
      </div>

      {isStaff && (
        <div className={styles.adminSection}>
          <p className={styles.sectionLabel}>App management</p>
          <div className={styles.group}>
            <Row href="/admin" title="Admin tools" meta="Staff only" />
          </div>
        </div>
      )}
    </div>
  );
}
