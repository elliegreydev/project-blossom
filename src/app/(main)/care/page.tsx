"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, recordTrackModuleVisit, type ModuleKey } from "@/lib/db";
import { sectionLabel } from "@/lib/selfDirected";
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
    href: "/care/medication",
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
    href: "/care/journal",
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
    module: "selfDirected",
    href: "/care/self-directed",
    title: "Self-directed care",
    desc: "The jobs a clinic would do, if there isn't one",
    tint: "var(--mint)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 20.5s-7-4.3-7-9.4A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 3.1c0 5.1-7 9.4-7 9.4Z" />
        <path d="M9.4 12.2h1.8l.8-1.7 1 3 .8-1.3h1.8" />
      </svg>
    ),
  },
  {
    module: "waitingList",
    href: "/care/waiting-list",
    title: "Waiting lists",
    desc: "Referrals, chasing them, and where you are",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7v5.4l3.2 2" />
      </svg>
    ),
  },
  {
    module: "goals",
    href: "/care/goals",
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
    href: "/care/blood-tests",
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
    href: "/care/voice",
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
    href: "/care/presentation",
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
    href: "/care/body",
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
    href: "/care/budget",
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
    href: "/care/intimacy",
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

/* These five used to be filed in Settings, which is nobody's first guess for
   "show my endo what I've been tracking". They're things you use, so they sit
   with the other things you use. */
const SHARING: { href: string; title: string; desc: string; tint: string; icon: React.ReactNode }[] = [
  {
    href: "/travel",
    title: "Travel",
    desc: "Trips, what to pack, and what happens to your reminders",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.4" />
        <path d="M3.6 12h16.8" />
        <path d="M12 3.6a13 13 0 0 1 0 16.8a13 13 0 0 1 0-16.8Z" />
      </svg>
    ),
  },
  {
    href: "/settings/circle",
    title: "Trusted Circle",
    desc: "Share specific data with specific people",
    tint: "var(--lavender)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="9" cy="9" r="3.2" />
        <path d="M3.5 19c0-3 2.5-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
        <path d="M16 6.4a3 3 0 0 1 0 5.6M17.5 14.6c1.9.6 3 2.2 3 4.4" />
      </svg>
    ),
  },
  {
    href: "/settings/bridge",
    title: "Blossom Bridge",
    desc: "Temporary links for people without an account",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.3-2.3a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
        <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.3 2.3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
      </svg>
    ),
  },
  {
    href: "/settings/safety-checkins",
    title: "Safety check-ins",
    desc: "Someone hears from you, or hears that you're quiet",
    tint: "var(--mint)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 21s7-3.8 7-9.4V6.2L12 3.4 5 6.2v5.4C5 17.2 12 21 12 21Z" />
        <path d="m9.2 11.6 2 2 3.6-3.8" />
      </svg>
    ),
  },
  {
    href: "/settings/support-map",
    title: "Personal Support Map",
    desc: "Private people, places and organisations",
    tint: "var(--pink)",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M9 4.2 3.8 6.4v13.4L9 17.6l6 2.2 5.2-2.2V4.2L15 6.4Z" />
        <path d="M9 4.2v13.4M15 6.4v13.4" />
      </svg>
    ),
  },
  {
    href: "/settings/passport",
    title: "Blossom Passport",
    desc: "Build a document to share",
    tint: "var(--lavender)",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="5" y="3.2" width="14" height="17.6" rx="2.4" />
        <path d="M9 8.4h6M9 12h6M9 15.6h3.5" />
      </svg>
    ),
  },
  {
    href: "/settings/getting-started",
    title: "Starting HRT safely",
    desc: "Practical steps, not medical advice",
    tint: "var(--sky)",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="12" r="8.4" />
        <path d="m14.8 9.2-1.6 4-4 1.6 1.6-4Z" />
      </svg>
    ),
  },
];

export default function TrackPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const selfDirected = useLiveQuery(() => db.selfDirected.get("local"), []);
  if (!profile) return null;

  // Self-directed care is renameable, and the point of that is that the chosen
  // word is the one on screen. A hardcoded title here would leave
  // "Self-directed care" sat on the Track page for anyone glancing at the
  // phone, which is exactly what renaming exists to avoid.
  const customLabel = sectionLabel(selfDirected?.label);
  const renamed = Boolean((selfDirected?.label ?? "").trim());
  const titleFor = (tool: typeof TRACKERS[number]) =>
    tool.module === "selfDirected" ? customLabel : tool.title;
  // Renaming to something bland is pointless if the line underneath still
  // reads "the jobs a clinic would do, if there isn't one". Somebody who
  // renamed this did so to make it unremarkable at a glance, so the
  // description goes too.
  const descFor = (tool: typeof TRACKERS[number]) =>
    tool.module === "selfDirected" && renamed ? "" : tool.desc;

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
      <div className={styles.cardText}><div className={styles.cardTitle}>{titleFor(tool)}</div>{descFor(tool) && <div className={styles.cardDesc}>{descFor(tool)}</div>}</div>
      <svg className={styles.cardArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
    </Link>;
  }

  return (
    <div className={styles.screen}>
      <header className={styles.pageHeader}>
        <div className={styles.eyebrow}>Your tools</div>
        <h1 className={styles.title}>Care</h1>
        <p className={styles.subtitle}>Here's your care at a glance.</p>
      </header>
      {(profile.enabledModules.includes("medication") || profile.enabledModules.includes("appointments") || profile.enabledModules.includes("bloodTests")) && <Link href="/care/overview" className={styles.careOverview}><div><span className={styles.careEyebrow}>A calmer overview</span><strong>Care overview</strong><span>Medication, appointments, supplies and blood tests together.</span></div><span aria-hidden="true">→</span></Link>}

      {pinned.length > 0 && <section className={styles.group}><div className={styles.groupHeading}><h2>My spaces</h2><Link href="/settings/modules">Edit</Link></div><div className={styles.cards}>{pinned.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>}
      {recent.length > 0 && <section className={styles.group}><div className={styles.groupHeading}><h2>Recently used</h2></div><div className={styles.cards}>{recent.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>}
      <section className={styles.group}><div className={styles.groupHeading}><h2>{pinned.length || recent.length ? "All tools" : "Your spaces"}</h2>{visible.length > 3 && <Link href="/settings/modules">Choose what appears</Link>}</div><div className={styles.cards}>{visible.map((tool) => <ToolCard key={tool.module} tool={tool} />)}</div></section>

      <section className={styles.group}>
        <div className={styles.groupHeading}><h2>Sharing &amp; support</h2></div>
        <div className={styles.cards}>
          {SHARING.map((tool) => (
            <Link key={tool.href} href={tool.href} className={styles.card}>
              <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${tool.tint} 30%, var(--bg))` }}>{tool.icon}</div>
              <div className={styles.cardText}><div className={styles.cardTitle}>{tool.title}</div><div className={styles.cardDesc}>{tool.desc}</div></div>
              <svg className={styles.cardArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
