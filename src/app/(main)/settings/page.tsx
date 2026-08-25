"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/changelog";
import { THEMES } from "@/lib/themes";
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

const THEME_LABELS: Record<string, string> = Object.fromEntries(THEMES.map((t) => [t.id, t.name]));

export default function SettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [isStaff, setIsStaff] = useState(false);
  const [activeShares, setActiveShares] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkStaffAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data: staffData, error: staffError } = await supabase.rpc("is_staff");
      if (cancelled) return;
      if (!staffError) setIsStaff(staffData === true);
    }

    /* The sharing tools live in Track now, so Settings carries the count instead -
       "who can see my data" should never be something you have to go looking for. */
    async function countActiveShares() {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;

      const nowIso = new Date().toISOString();
      const [{ count: grants }, { count: links }] = await Promise.all([
        supabase
          .from("trusted_circle_grants")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", uid)
          .eq("status", "active"),
        supabase
          .from("bridge_links")
          .select("id", { count: "exact", head: true })
          .is("revoked_at", null)
          .gt("expires_at", nowIso),
      ]);
      if (cancelled) return;
      setActiveShares((grants ?? 0) + (links ?? 0));
    }

    void checkStaffAccess();
    void countActiveShares();
    return () => {
      cancelled = true;
    };
  }, []);


  if (!profile) return null;

  const privacyMeta = [
    profile.appLockEnabled ? "App lock on" : null,
    activeShares ? `${activeShares} active ${activeShares === 1 ? "share" : "shares"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Settings</div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>You</p>
        <div className={styles.group}>
          <Row href="/settings/profile" title="Profile & preferences" meta={profile.displayName ?? undefined} />
          <Row href="/settings/appearance" title="Appearance" meta={THEME_LABELS[profile.theme] ?? "Classic"} />
          <Row href="/settings/home" title="Home screen" meta="Make this device’s Home your own" />
          <Row href="/settings/modules" title="Enabled modules" meta={`${profile.enabledModules.length} on`} />
          <Row href="/settings/aurora" title="Aurora" meta={AURORA_LABELS[profile.auroraMode]} />
        </div>
      </div>

      <div className={styles.section}>
        <p className={styles.sectionLabel}>Privacy & your data</p>
        <div className={styles.group}>
          <Row href="/settings/notifications" title="Notifications" />
          <Row href="/settings/privacy" title="Privacy & security" meta={privacyMeta || undefined} />
          <Row href="/settings/accessibility" title="Accessibility" />
          <Row href="/settings/account" title="Account & sync" meta={profile.syncEnabled ? "Sync on" : "Local-only"} />
          <Row href="/settings/data" title="Data controls" meta="Export, import, delete" />
        </div>
        <p className={styles.note}>
          Trusted Circle, Bridge, your support map, Passport and safety check-ins now live in{" "}
          <Link href="/track">Track</Link>.
        </p>
      </div>

      <div className={styles.section}>
        <div className={styles.group}>
          <Row href="/settings/about" title="About Blossom" meta="Help, the roadmap, the team, legal" />
        </div>

        <p className={styles.versionStamp}>Blossom v{APP_VERSION}</p>
      </div>
    </div>
  );
}
