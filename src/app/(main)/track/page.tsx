"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, recordTrackModuleVisit, type ModuleKey } from "@/lib/db";
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
  {
    module: "bloodTests",
    href: "/track/blood-tests",
    title: "Blood tests",
    desc: "A private, descriptive record of your results",
    tint: "var(--pink)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 3h6M10 3v6.2a4 4 0 0 1-.7 2.3L6.8 15a5 5 0 1 0 10.4 0l-2.5-3.5a4 4 0 0 1-.7-2.3V3" />
        <path d="M7.5 15.5h9" />
      </svg>
    ),
  },
  {
    module: "voicePractice",
    href: "/track/voice",
    title: "Voice practice",
    desc: "Practice goals and session notes, at your own pace",
    tint: "var(--lavender)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
        <path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" />
      </svg>
    ),
  },
  {
    module: "presentation",
    href: "/track/presentation",
    title: "Presentation",
    desc: "Outfits, hair, makeup, and things you want to try",
    tint: "var(--mint)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 21v-2a6 6 0 0 1 12 0v2" />
      </svg>
    ),
  },
  {
    module: "bodyProgress",
    href: "/track/body",
    title: "Body & progress",
    desc: "A quiet, private place to notice change",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 4a8 8 0 1 0 8 8" />
        <path d="M12 4v8l5 3" />
      </svg>
    ),
  },
  {
    module: "budget",
    href: "/track/budget",
    title: "Budget",
    desc: "Transition costs and savings goals, kept private",
    tint: "var(--mint)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1 3 2.2c0 2.8-6 1.3-6 4.1 0 1.2 1.3 2.2 3 2.2s3-1.1 3-2.5" />
      </svg>
    ),
  },
  {
    module: "intimacy",
    href: "/track/intimacy",
    title: "Intimacy & wellbeing",
    desc: "Private notes, in your own words",
    tint: "var(--pink)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 20s-7-4.4-7-10.2C5 7.2 6.8 5.5 9 5.5c1.3 0 2.4.7 3 1.8.6-1.1 1.7-1.8 3-1.8 2.2 0 4 1.7 4 4.3C19 15.6 12 20 12 20Z" />
      </svg>
    ),
  },
];

export default function TrackPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  if (!profile) return null;

  const visible = TRACKERS.filter((t) => profile.enabledModules.includes(t.module));
  const pinnedModules = profile.trackPinnedModules ?? [];
  const recentModules = profile.trackRecentModules ?? [];
  const pinned = pinnedModules.map((key) => visible.find((tool) => tool.module === key)).filter((tool): tool is typeof TRACKERS[number] => Boolean(tool));
  const recent = recentModules
    .map((key) => visible.find((tool) => tool.module === key))
    .filter((tool): tool is typeof TRACKERS[number] => tool !== undefined)
    .filter((tool) => !pinned.some((item) => item.module === tool.module));

  function ToolCard({ tool }: { tool: typeof TRACKERS[number] }) {
    return <Link href={tool.href} className={styles.card} onClick={() => void recordTrackModuleVisit(tool.module)}>
      <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${tool.tint} 30%, var(--bg))` }}>{tool.icon}</div>
      <div className={styles.cardText}><div className={styles.cardTitle}>{tool.title}</div><div className={styles.cardDesc}>{tool.desc}</div></div>
      <svg className={styles.cardArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
    </Link>;
  }

  return (
    <div className={styles.screen}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Your tools</div>
        <h1 className={styles.title}>Track</h1>
        <p className={styles.subtitle}>Choose the space that feels useful today.</p>
      </header>
      {(profile.enabledModules.includes("medication") || profile.enabledModules.includes("appointments") || profile.enabledModules.includes("bloodTests")) && <Link href="/track/care" className={styles.careOverview}><div><span className={styles.careEyebrow}>A calmer overview</span><strong>Care overview</strong><span>Medication, appointments, supplies and blood tests together.</span></div><span aria-hidden="true">→</span></Link>}

      {pinned.length > 0 && <section className={styles.group}><div className={styles.groupHeading}><h2>My spaces</h2><Link href="/settings/modules">Edit</Link></div><div className={styles.cards}>{pinned.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>}
      {recent.length > 0 && <section className={styles.group}><div className={styles.groupHeading}><h2>Recently used</h2></div><div className={styles.cards}>{recent.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>}
      <section className={styles.group}><div className={styles.groupHeading}><h2>{pinned.length || recent.length ? "All tools" : "Your spaces"}</h2>{visible.length > 3 && <Link href="/settings/modules">Choose what appears</Link>}</div><div className={styles.cards}>{visible.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>
    </div>
  );
}
