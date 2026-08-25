"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID } from "@/lib/db";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/changelog";
import { THEMES } from "@/lib/themes";
import styles from "./settings.module.css";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const CHEVRON = (
  <svg className={styles.chevron} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 5l7 7-7 7" />
  </svg>
);

/* One icon per row. They earn their place: this screen is a list of twelve
   near-identical lines of text, and the icon is what your eye lands on when
   you already know which one you want. */
const ICONS = {
  profile: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </svg>
  ),
  appearance: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" fill="currentColor" stroke="none" />
    </svg>
  ),
  home: (
    <svg {...ICON_PROPS}>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19Z" />
      <path d="M9.5 20.5v-6h5v6" />
    </svg>
  ),
  modules: (
    <svg {...ICON_PROPS}>
      <rect x="3.8" y="3.8" width="7" height="7" rx="2" />
      <rect x="13.2" y="3.8" width="7" height="7" rx="2" />
      <rect x="3.8" y="13.2" width="7" height="7" rx="2" />
      <rect x="13.2" y="13.2" width="7" height="7" rx="2" />
    </svg>
  ),
  aurora: (
    <svg {...ICON_PROPS}>
      <path d="M12 3.6 13.7 9l5.4 1.7-5.4 1.7L12 17.8l-1.7-5.4L4.9 10.7 10.3 9Z" />
      <path d="M18.4 16.2l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6Z" />
    </svg>
  ),
  notifications: (
    <svg {...ICON_PROPS}>
      <path d="M6.6 10.2a5.4 5.4 0 0 1 10.8 0c0 3.9 1.5 5.3 1.5 5.3H5.1s1.5-1.4 1.5-5.3Z" />
      <path d="M10 18.4a2.2 2.2 0 0 0 4 0" />
    </svg>
  ),
  accessibility: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.4" />
      <circle cx="12" cy="8.2" r="1.1" fill="currentColor" stroke="none" />
      <path d="M8.4 10.8h7.2M12 10.8v3.1m0 0-1.9 3.5m1.9-3.5 1.9 3.5" />
    </svg>
  ),
  privacy: (
    <svg {...ICON_PROPS}>
      <path d="M12 20.8s6.8-3.7 6.8-9.2V6.2L12 3.5 5.2 6.2v5.4c0 5.5 6.8 9.2 6.8 9.2Z" />
      <circle cx="12" cy="10.8" r="1.5" />
      <path d="M12 12.3v2.1" />
    </svg>
  ),
  account: (
    <svg {...ICON_PROPS}>
      <path d="M19.8 12a7.8 7.8 0 0 1-13.4 5.4M4.2 12a7.8 7.8 0 0 1 13.4-5.4" />
      <path d="M17.6 3.4v3.4h-3.4M6.4 20.6v-3.4h3.4" />
    </svg>
  ),
  data: (
    <svg {...ICON_PROPS}>
      <rect x="3.6" y="4.4" width="16.8" height="4.4" rx="1.6" />
      <path d="M5.4 8.8V18a1.6 1.6 0 0 0 1.6 1.6h10a1.6 1.6 0 0 0 1.6-1.6V8.8" />
      <path d="M10 12.4h4" />
    </svg>
  ),
  about: (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 11.2v5.2" />
      <circle cx="12" cy="7.9" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
};

function Row({
  href,
  icon,
  title,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  meta?: string;
}) {
  return (
    <Link href={href} className={styles.row}>
      <span className={styles.rowIcon} aria-hidden="true">
        {icon}
      </span>
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
  const [activeShares, setActiveShares] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    /* The sharing tools live in Care now, so Settings carries the count instead -
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
      <header className={styles.pageHeader}>
        <div className={styles.pageEyebrow}>Your app</div>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Set Blossom up the way you want it.</p>
      </header>

      <section className={styles.section}>
        <div className={styles.groupHead}>
          <span className={styles.groupEyebrow}>You</span>
          <h2 className={styles.groupTitle}>How Blossom works for you</h2>
        </div>
        <div className={`${styles.group} ${styles.tintPink}`}>
          <Row
            href="/settings/profile"
            icon={ICONS.profile}
            title="Profile & preferences"
            meta={profile.displayName ?? "Your name, pronouns and the basics"}
          />
          <Row href="/settings/appearance" icon={ICONS.appearance} title="Appearance" meta={THEME_LABELS[profile.theme] ?? "Classic"} />
          <Row href="/settings/home" icon={ICONS.home} title="Home screen" meta="Make this device’s Home your own" />
          <Row href="/settings/modules" icon={ICONS.modules} title="Enabled modules" meta={`${profile.enabledModules.length} on`} />
          <Row href="/settings/aurora" icon={ICONS.aurora} title="Aurora" meta={AURORA_LABELS[profile.auroraMode]} />
          <Row href="/settings/notifications" icon={ICONS.notifications} title="Notifications" meta="Reminders, quiet hours, and what they say" />
          <Row href="/settings/accessibility" icon={ICONS.accessibility} title="Accessibility" meta="Contrast, text size, motion and touch" />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.groupHead}>
          <span className={styles.groupEyebrow}>Privacy</span>
          <h2 className={styles.groupTitle}>Your data, and who sees it</h2>
        </div>
        <div className={`${styles.group} ${styles.tintLavender}`}>
          <Row
            href="/settings/privacy"
            icon={ICONS.privacy}
            title="Privacy & security"
            meta={privacyMeta || "App lock, biometrics and connected services"}
          />
          <Row href="/settings/account" icon={ICONS.account} title="Account & sync" meta={profile.syncEnabled ? "Sync on" : "Local-only"} />
          <Row href="/settings/data" icon={ICONS.data} title="Data controls" meta="Export, import, delete" />
        </div>
        <div className={styles.note}>
          <svg className={styles.noteIcon} {...ICON_PROPS} aria-hidden="true">
            <circle cx="12" cy="12" r="8.4" />
            <path d="M9.6 12h4.9M12.6 9.6 15 12l-2.4 2.4" />
          </svg>
          <span>
            Trusted Circle, Bridge, your support map, Passport and safety check-ins now live in{" "}
            <Link href="/care">Care</Link>.
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.groupHead}>
          <span className={styles.groupEyebrow}>Blossom</span>
          <h2 className={styles.groupTitle}>About the app</h2>
        </div>
        <div className={`${styles.group} ${styles.tintMint}`}>
          <Row href="/settings/about" icon={ICONS.about} title="About Blossom" meta="Help, the roadmap, the team, legal" />
        </div>

        <p className={styles.versionStamp}>Blossom v{APP_VERSION}</p>
      </section>
    </div>
  );
}
