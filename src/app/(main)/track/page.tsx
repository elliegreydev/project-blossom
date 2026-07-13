"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, type ModuleKey } from "@/lib/db";
import styles from "./track.module.css";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const TRACKERS: {
  module: ModuleKey;
  href: string;
  title: string;
  desc: string;
  tint: string;
  icon: React.ReactNode;
}[] = [
  {
    module: "medication",
    href: "/track/medication",
    title: "Medication",
    desc: "Schedules, doses, and history",
    tint: "var(--mint)",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
        <path d="M9 9l6 6" />
      </svg>
    ),
  },
  {
    module: "journal",
    href: "/track/journal",
    title: "Journal & check-ins",
    desc: "Notes, reflections, and how you feel",
    tint: "var(--lavender)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" />
      </svg>
    ),
  },
  {
    module: "goals",
    href: "/track/goals",
    title: "Goals",
    desc: "Things you're working towards",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function TrackPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const visible = TRACKERS.filter((t) => profile.enabledModules.includes(t.module));

  return (
    <div className={styles.screen}>
      <div className={styles.title}>Track</div>
      {visible.length === 0 ? (
        <div className={styles.empty}>
          You haven&apos;t turned on any trackers yet. You can enable them in Settings.
        </div>
      ) : (
        <div className={styles.cards}>
          {visible.map((t) => (
            <Link key={t.module} href={t.href} className={styles.card}>
              <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${t.tint} 30%, var(--bg))` }}>
                {t.icon}
              </div>
              <div className={styles.cardText}>
                <div className={styles.cardTitle}>{t.title}</div>
                <div className={styles.cardDesc}>{t.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
