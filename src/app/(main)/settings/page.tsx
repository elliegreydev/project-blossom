"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { useUnreadBetaChat } from "@/components/useUnreadBetaChat";
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
  const [isBetaTester, setIsBetaTester] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkStaffAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const [{ data: staffData, error: staffError }, { data: betaData }] = await Promise.all([
        supabase.rpc("is_staff"),
        supabase.rpc("is_beta_tester"),
      ]);
      if (cancelled) return;
      if (!staffError) setIsStaff(staffData === true);
      setIsBetaTester(betaData === true);
    }

    void checkStaffAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  const hasUnreadBetaChat = useUnreadBetaChat(isBetaTester || isStaff);

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Settings</div>

      {(isBetaTester || isStaff) && (
        <div className={styles.adminSection}>
          <p className={styles.sectionLabel}>Beta</p>
          <div className={styles.group}>
            <Row
              href="/beta"
              title="🧪 You're a beta tester"
              meta={hasUnreadBetaChat ? "New message · What's new, beta chat, report a bug" : "What's new, beta chat, report a bug"}
            />
          </div>
        </div>
      )}

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
        <Row
          href="/settings/safety-checkins"
          title="Safety check-ins"
          meta={profile.safetyCheckInsEnabled ? "On" : "Off - optional"}
        />
        <Row href="/settings/circle" title="Trusted Circle" meta="Share specific data with specific people" />
      </div>

      <div className={styles.group}>
        <Row href="/settings/accessibility" title="Accessibility" />
        <Row href="/settings/passport" title="Blossom Passport" meta="Build a document to share" />
        <Row href="/settings/data" title="Data controls" />
        <Row href="/settings/support" title="Help & support" />
      </div>

      <div className={styles.group}>
        <Row href="/beta" title="Beta" />
        <Row href="/roadmap" title="Blossom roadmap" meta="What's here and what's next" />
        <Row href="/ideas" title="Ideas & bug reports" meta="Suggest a feature or tell us what's broken" />
        <Row href="/join" title="Join the team" meta="Apply to help build Blossom" />
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
