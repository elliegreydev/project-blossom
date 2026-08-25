"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  addCheckIn,
  db,
  LOCAL_PROFILE_ID,
  dismissAuroraNudge,
  dueDosesToday,
  estimatedMedicationSupplyDays,
  medicationSupplyIsLow,
  careSupplyNeedsAttention,
  defaultHomeLayout,
  type HomeBlockKey,
  type HomeShortcutKey,
  type ModuleKey,
  type Milestone,
  type JourneyEvent,
} from "@/lib/db";
import { todayLocalDateKey } from "@/lib/dates";
import { auroraQuietStatus, selectAuroraSuggestion } from "@/lib/aurora";

/* Ellie's Home mockup, in her order and her words. The scale runs calm to
   anxious rather than bad to good, because "how are you" is not a score. */
const HOME_MOODS: { value: number; label: string; face: string }[] = [
  { value: 5, label: "Calm", face: "😌" },
  { value: 4, label: "Good", face: "🙂" },
  { value: 3, label: "Okay", face: "😐" },
  { value: 2, label: "Not great", face: "🙁" },
  { value: 1, label: "Anxious", face: "😰" },
];
import InstallAppNudge from "@/components/InstallAppNudge";
import SyncNudge from "@/components/SyncNudge";
import BetaNudge from "@/components/BetaNudge";
import DiscordNudge from "@/components/DiscordNudge";
import SharingToolsNudge from "@/components/SharingToolsNudge";
import AppNotice from "@/components/AppNotice";
import SupportCard from "@/components/SupportCard";
import { ESSENTIALS_DURATIONS, essentialsActive, essentialsDaysLeft, filterBlocksForEssentials } from "@/lib/justTheEssentials";
import { INTENTIONS, orderIntentions, rememberIntention, type IntentionKey } from "@/lib/intentions";
import { turnOffEssentials, turnOnEssentials, updateDeviceProfile } from "@/lib/db";
import styles from "./home.module.css";


/* One stroked style for every icon on Home, matching Care and Library. */
const TILE_ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const PILL_ICON = (
  <svg {...TILE_ICON_PROPS}>
    <rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(45 12 12)" />
    <path d="M9 9l6 6" />
  </svg>
);

const CALENDAR_ICON = (
  <svg {...TILE_ICON_PROPS}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M3.5 10.2h17M8 3.4v3.2M16 3.4v3.2" />
  </svg>
);

const SUPPLY_ICON = (
  <svg {...TILE_ICON_PROPS}>
    <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5Z" />
    <path d="M4 8.5 12 13l8-4.5M12 13v7" />
  </svg>
);

const TICK_ICON = (
  <svg {...TILE_ICON_PROPS}>
    <path d="m5 12.6 4.6 4.4L19 7.4" />
  </svg>
);

/* `module` is what decides whether a suggested shortcut is offered at all.
   Pointing somebody at Medication when they turned the medication module off
   is a dead end, and Home is the worst place to find one. Null means the
   destination is always there. */
const SHORTCUTS: Record<HomeShortcutKey, { label: string; href: string; tint: string; module: ModuleKey | null; icon: React.ReactNode }> = {
  medication: {
    label: "Medication",
    href: "/care/medication",
    tint: "var(--mint)",
    module: "medication",
    icon: PILL_ICON,
  },
  calendar: {
    label: "Plan",
    href: "/plan",
    tint: "var(--sky)",
    module: "appointments",
    icon: CALENDAR_ICON,
  },
  journal: {
    label: "Journal & check-ins",
    href: "/care/journal",
    tint: "var(--lavender)",
    module: "journal",
    icon: (
      <svg {...TILE_ICON_PROPS}>
        <path d="M6 4h9l4 4v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
        <path d="M14 4v5h5M8.5 13h7M8.5 16.5h5" />
      </svg>
    ),
  },
  goals: {
    label: "Goals",
    href: "/care/goals",
    tint: "var(--sky)",
    module: "goals",
    icon: (
      <svg {...TILE_ICON_PROPS}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
  journey: {
    label: "Journey",
    href: "/journey",
    tint: "var(--pink)",
    module: "journey",
    icon: (
      <svg {...TILE_ICON_PROPS}>
        <circle cx="6.2" cy="7" r="2.2" />
        <circle cx="6.2" cy="17" r="2.2" />
        <path d="M6.2 9.2v5.6M11 7h8.5M11 17h5.5" />
      </svg>
    ),
  },
};

/* Every block on Home wears the same heading: a quiet eyebrow, a display-face
   title, and an optional link on the right. */
function SectionHead({ eyebrow, title, titleId, action }: { eyebrow: string; title: string; titleId?: string; action?: React.ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionHeadText}>
        <div className={styles.eyebrow}>{eyebrow}</div>
        <h2 id={titleId} className={styles.sectionTitle}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function CardArrow() {
  return (
    <svg className={styles.cardArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}


function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function todayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/* These three were text glyphs: a bell emoji, U+2315 (a telephone recorder,
   not a magnifier) and U+2318 (the Mac Command key, standing in for "account").
   Two of them are missing from common Android fonts, and the labels beside
   them are hidden below 600px - so on a phone the button could be an empty
   box with nothing to read. Real icons, in the same stroked style as Track. */
const HEADER_ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const HEADER_ICONS = {
  reminders: (
    <svg {...HEADER_ICON_PROPS}>
      <path d="M18 8.5a6 6 0 1 0-12 0c0 4.2-1.2 5.7-2 6.6-.4.4-.1 1.1.5 1.1h15c.6 0 .9-.7.5-1.1-.8-.9-2-2.4-2-6.6Z" />
      <path d="M10.4 19.5a2 2 0 0 0 3.2 0" />
    </svg>
  ),
  search: (
    <svg {...HEADER_ICON_PROPS}>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m15.8 15.8 4.2 4.2" />
    </svg>
  ),
  account: (
    <svg {...HEADER_ICON_PROPS}>
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M5.4 20a6.6 6.6 0 0 1 13.2 0" />
    </svg>
  ),
};

export default function HomePage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const meds = useLiveQuery(() => db.medications.toArray(), []);
  const medLogs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const medicationSupplies = useLiveQuery(() => db.medicationSupplies.toArray(), []);
  const careSupplies = useLiveQuery(() => db.careSupplies.toArray(), []);
  const appts = useLiveQuery(() => db.appointments.toArray(), []);
  const journalEntries = useLiveQuery(() => db.journalEntries.toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const voiceGoals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const voiceSessions = useLiveQuery(() => db.voiceSessions.toArray(), []);
  const presentationEntries = useLiveQuery(() => db.presentationEntries.toArray(), []);
  const euphoriaEntries = useLiveQuery(() => db.euphoriaEntries.toArray(), []);
  const auroraNudgeStates = useLiveQuery(() => db.auroraNudges.toArray(), []);
  const [auroraHiddenForSession, setAuroraHiddenForSession] = useState(false);
  const [auroraReasonOpen, setAuroraReasonOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [intention, setIntention] = useState<IntentionKey | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 720px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  if (!profile || milestones === undefined || journeyEvents === undefined || meds === undefined || medLogs === undefined || medicationSupplies === undefined || careSupplies === undefined || appts === undefined || journalEntries === undefined || checkIns === undefined || goals === undefined || voiceGoals === undefined || voiceSessions === undefined || presentationEntries === undefined || euphoriaEntries === undefined || auroraNudgeStates === undefined) return null;
  const activeProfile = profile;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const OVERDUE_THRESHOLD_MS = 15 * 60 * 1000;

  const dueDoses = meds.filter((med) => med.active).flatMap((med) => dueDosesToday(med, now)
    .filter((slot) => !medLogs.some((log) => log.medicationId === med.id && log.scheduledTime === slot))
    .map((slot) => ({ kind: "dose" as const, id: med.id + slot, label: med.name, meta: timeLabel(slot), href: "/care/medication", overdue: now.getTime() - new Date(slot).getTime() > OVERDUE_THRESHOLD_MS })));
  const todayAppts = appts.filter((appointment) => {
    const time = new Date(appointment.appointmentAt);
    return time >= now && time <= todayEnd;
  }).map((appointment) => ({ kind: "appointment" as const, id: appointment.id, label: appointment.title, meta: timeLabel(appointment.appointmentAt), href: "/plan", overdue: false }));

  const selectedLayout = (desktop ? profile.homeDesktopLayout : profile.homePhoneLayout) ?? defaultHomeLayout();
  const todayItems = [
    ...(selectedLayout.todayContent === "appointments" || selectedLayout.todayContent === "none" ? [] : dueDoses),
    ...(selectedLayout.todayContent === "medication" || selectedLayout.todayContent === "none" ? [] : todayAppts),
  ].sort((a, b) => (a.overdue === b.overdue ? 0 : a.overdue ? -1 : 1)).slice(0, 3);
  const supplyHeadsUps = [
    ...meds.filter((medication) => medication.active).flatMap((medication) => {
      const supply = medicationSupplies.find((item) => item.medicationId === medication.id);
      if (!supply || !medicationSupplyIsLow(medication, supply)) return [];
      const days = estimatedMedicationSupplyDays(medication, supply);
      return [{ id: medication.id, label: medication.name, meta: days === null ? "A supply check may be useful" : `Around ${days} ${days === 1 ? "day" : "days"} left` }];
    }),
    ...careSupplies.filter((supply) => careSupplyNeedsAttention(supply)).map((supply) => ({ id: supply.id, label: supply.name, meta: "A supply check may be useful" })),
  ].slice(0, 3);
  const upcoming = appts.filter((appointment) => new Date(appointment.appointmentAt) > todayEnd).sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt)).slice(0, 3);
  const recentJourney = [...milestones, ...journeyEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 2);
  const auroraSuggestion = auroraHiddenForSession ? null : selectAuroraSuggestion({ now, profile, milestones, journeyEvents, medications: meds, medicationLogs: medLogs, medicationSupplies, careSupplies, appointments: appts, journalEntries, checkIns, goals, voiceGoals, voiceSessions, presentationEntries, euphoriaEntries, nudgeStates: auroraNudgeStates });
  const auroraStatus = auroraQuietStatus(profile);
  const desiredBlocks = intention ? new Set(INTENTIONS[intention].blocks) : null;

  const recentIntentions = (profile.recentIntentions ?? []) as IntentionKey[];
  // Practical facts only - never anything that amounts to guessing how
  // somebody feels. See the note in src/lib/intentions.ts.
  const orderedIntentions = orderIntentions({
    dueToday: todayItems.length,
    appointmentSoon: upcoming.length > 0,
    supplyNeedsAttention: supplyHeadsUps.length > 0,
    timeCapsuleReady: euphoriaEntries.some((e) => e.reopenAt && new Date(e.reopenAt) <= now),
    recentlyUsed: recentIntentions,
  });

  function chooseIntention(key: IntentionKey) {
    setIntention(key);
    void updateDeviceProfile({ recentIntentions: rememberIntention(recentIntentions, key) });
  }
  // A lens over the saved layout, never an edit to it - see
  // src/lib/justTheEssentials.ts. Their own order and widths are untouched;
  // this only decides which of their blocks get rendered today.
  const quietHome = essentialsActive(profile.lowEnergyMode, profile.lowEnergyUntil, now);
  const quietDaysLeft = essentialsDaysLeft(profile.lowEnergyUntil, now);

  // Blocks introduced after the layout system shipped. Anyone whose saved
  // layout predates one of these still sees it.
  const NEWER_BLOCKS: HomeBlockKey[] = ["checkin"];

  // One a day is the point at which a prompt stops being a kindness, so the
  // block acknowledges the check-in rather than asking again.
  const checkedInToday = (checkIns ?? []).some(
    (entry) => entry.createdAt.slice(0, 10) === todayLocalDateKey()
  );

  async function quickCheckIn(mood: number) {
    await addCheckIn({ mood, energy: null, confidence: null, stress: null, comfort: null, note: null, period: null });
  }

  // NEWER_BLOCKS has to be in the source array as well as the filter. An
  // existing profile has neither `order` nor `blockWidths` entry for a block
  // added later, so filtering alone never sees it and the block silently does
  // not exist for anybody who already uses Blossom.
  const orderedBlocks = [...selectedLayout.order, ...Object.keys(selectedLayout.blockWidths) as HomeBlockKey[], ...NEWER_BLOCKS]
    .filter((block, index, all) => all.indexOf(block) === index)
    .filter((block): block is HomeBlockKey => ["focus", "today", "upcoming", "checkin", "supplies", "pinned", "journey", "aurora", "nudges"].includes(block))
    // A block added after somebody saved their layout is absent from both
    // their `order` and their `visibleBlocks`, so filtering strictly on what
    // they saved would hide every future block from every existing user. New
    // keys are treated as visible until they deliberately turn one off, which
    // is why NEWER_BLOCKS exists rather than a Dexie migration rewriting
    // everybody's saved layout underneath them.
    .filter((block) => selectedLayout.visibleBlocks.includes(block) || NEWER_BLOCKS.includes(block))
    .filter((block) => !desiredBlocks || desiredBlocks.has(block));
  const activeIntention = intention ? INTENTIONS[intention] : null;

  function dismissAuroraSuggestion() {
    if (!auroraSuggestion) return;
    setAuroraHiddenForSession(true);
    void dismissAuroraNudge(auroraSuggestion.key);
  }

  function auroraReason(): string {
    if (!auroraSuggestion) return "Aurora has not found a practical, local reminder that needs to take up your space right now.";
    if (auroraSuggestion.kind === "medication") return "Aurora noticed a schedule or supply detail you recorded on this device.";
    if (auroraSuggestion.kind === "appointment") return "Aurora noticed an appointment you recorded on this device.";
    if (auroraSuggestion.kind === "goal") return "Aurora noticed a goal you chose to keep in Blossom.";
    if (auroraSuggestion.kind === "backup") return "A quiet, occasional reminder based on how long it's been since your last backup export.";
    return "Aurora noticed something you recorded in Blossom. This suggestion is made locally and does not use AI or send your records anywhere.";
  }

  function renderBlock(block: HomeBlockKey) {
    if (block === "focus") return (
      <section className={`${styles.section} ${styles.intentionCard}`} aria-labelledby="intention-title">
        <SectionHead
          eyebrow="Your Home, for right now"
          title="What would help right now?"
          titleId="intention-title"
          action={activeIntention ? <button type="button" className={styles.resetIntention} onClick={() => setIntention(null)}>Back to my Home</button> : undefined}
        />
        {activeIntention ? <div className={styles.intentionActive}><p>{activeIntention.description}</p><Link href={activeIntention.href} className={styles.intentionAction}>{activeIntention.action}</Link></div> : <p className={styles.intentionCopy}>Choose a temporary lens. Your saved Home layout stays exactly as it is.</p>}
        {/* Calm down already shows exactly what Just the essentials shows, but
            it evaporates on reload. Somebody who reaches for it on a bad day
            often wants it to last longer than one look at the screen, so this
            offers that here rather than making them find Settings. Only after
            they've chosen it, so it's never an unprompted suggestion that they
            might be struggling. */}
        {intention === "calm" && !quietHome && (
          <div className={styles.keepQuiet}>
            <span className={styles.keepQuietLabel}>Keep it like this?</span>
            <div className={styles.keepQuietRow}>
              {ESSENTIALS_DURATIONS.filter((d) => d.key !== "indefinite").map((d) => (
                <button key={d.key} type="button" className={styles.keepQuietButton} onClick={() => void turnOnEssentials(d.key)}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={styles.intentionChoices}>{orderedIntentions.map((item) => <button type="button" key={item.key} className={intention === item.key ? styles.intentionSelected : styles.intentionButton} onClick={() => chooseIntention(item.key)}><span className={styles.intentionLabel}>{item.label}</span><span className={styles.intentionSummary}>{item.summary}</span></button>)}</div>
      </section>
    );
    /* The stack Home opens on: what is actually due, as cards you can read at
       arm's length, rather than a list of hairline rows. */
    if (block === "today") return (
      <section className={styles.section} aria-labelledby="home-today-title">
        <SectionHead eyebrow="Right now" title="Today" titleId="home-today-title" />
        {todayItems.length === 0 ? (
          <div className={styles.emptyRow}><strong>Nothing needs you right now.</strong><span>A quiet day is allowed.</span></div>
        ) : (
          <div className={styles.stack}>
            {todayItems.map((item) => (
              <Link key={item.id} href={item.href} className={`${styles.card} ${item.overdue ? styles.cardOverdue : ""}`}>
                <span className={styles.cardIcon} data-kind={item.kind}>{item.kind === "dose" ? PILL_ICON : CALENDAR_ICON}</span>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{item.label}</span>
                  <span className={styles.cardMeta}>{item.overdue ? `Overdue · was due ${item.meta}` : item.meta}</span>
                </span>
                <CardArrow />
              </Link>
            ))}
          </div>
        )}
      </section>
    );
    if (block === "upcoming") return (
      <section className={styles.section} aria-labelledby="home-upcoming-title">
        <SectionHead eyebrow="Ahead" title="Coming up" titleId="home-upcoming-title" />
        {upcoming.length === 0 ? (
          <div className={styles.emptyRow}><strong>Nothing scheduled yet.</strong><span>Appointments will appear here when they’re useful.</span></div>
        ) : (
          <div className={styles.stack}>
            {upcoming.map((appointment) => (
              <Link key={appointment.id} href="/plan" className={styles.card}>
                <span className={styles.cardIcon} data-kind="appointment">{CALENDAR_ICON}</span>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{appointment.title}</span>
                  <span className={styles.cardMeta}>{new Date(appointment.appointmentAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {timeLabel(appointment.appointmentAt)}</span>
                </span>
                <CardArrow />
              </Link>
            ))}
          </div>
        )}
      </section>
    );
    if (block === "checkin") return (
      <section className={styles.section} aria-labelledby="home-checkin-title">
        <SectionHead eyebrow="Check-in" title="How are you feeling?" titleId="home-checkin-title" />
        {checkedInToday ? (
          // "Add another whenever you want" needs somewhere to go, or it's just
          // a nice sentence. The Journal is where the full check-in lives.
          <Link href="/care/journal" className={styles.doneRow}>
            <span className={styles.doneMark}>{TICK_ICON}</span>
            <span className={styles.doneText}>
              <strong>Checked in today.</strong>
              <span>Come back tomorrow, or add another whenever you want.</span>
            </span>
            <CardArrow />
          </Link>
        ) : (
          <>
            {/* Five faces, one tap, saved immediately. The full check-in with
                notes and influences lives in the Journal; this is the version
                you can do while the kettle boils. Deliberately no streak and
                no "you missed a day", per the design principle. */}
            <div className={styles.moodRow}>
              {HOME_MOODS.map((mood) => (
                <button
                  key={mood.value}
                  type="button"
                  className={styles.moodButton}
                  onClick={() => void quickCheckIn(mood.value)}
                >
                  <span aria-hidden="true">{mood.face}</span>
                  <span>{mood.label}</span>
                </button>
              ))}
            </div>
            <Link href="/care/journal" className={styles.link}>Add more detail</Link>
          </>
        )}
      </section>
    );
    if (block === "supplies") return (
      <section className={styles.section} aria-labelledby="supply-heads-up-title">
        <SectionHead eyebrow="Supplies" title="A small supply heads-up" titleId="supply-heads-up-title" action={<Link href="/care/medication" className={styles.link}>Review</Link>} />
        {supplyHeadsUps.length === 0 ? (
          <div className={styles.emptyRow}><strong>Nothing needs checking.</strong><span>Supply heads-ups appear only when they may help.</span></div>
        ) : (
          <div className={styles.stack}>
            {supplyHeadsUps.map((supply) => (
              <Link key={supply.id} href="/care/medication" className={styles.card}>
                <span className={styles.cardIcon} data-kind="supply">{SUPPLY_ICON}</span>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{supply.label}</span>
                  <span className={styles.cardMeta}>{supply.meta}</span>
                </span>
                <CardArrow />
              </Link>
            ))}
          </div>
        )}
      </section>
    );
    if (block === "pinned") {
      // Whatever is pinned, and nothing else. An earlier version filled an empty
      // block with suggestions, which sounds helpful until you notice it cannot
      // tell a new profile from somebody who deliberately unpinned everything,
      // or from the "Day to day" and "Blank canvas" presets that leave this
      // empty on purpose. Putting shortcuts back that a person just removed is
      // the app overruling them on their own home screen.
      // Hide a shortcut whose module is switched off. Pinning Medication and
      // later turning the module off would otherwise leave a tile that goes
      // nowhere useful, and as the note on SHORTCUTS says, Home is the worst
      // place to find a dead end. Nothing is unpinned by this: turn the module
      // back on and the tile comes back.
      const shortcutKeys = selectedLayout.pinnedTools.filter((key) => {
        const needed = SHORTCUTS[key].module;
        return needed === null || activeProfile.enabledModules.includes(needed);
      });
      return (
        <section className={styles.section} aria-labelledby="home-shortcuts-title">
          <SectionHead eyebrow="Shortcuts" title="Quick actions" titleId="home-shortcuts-title" action={<Link href="/settings/home" className={styles.link}>Edit</Link>} />
          {shortcutKeys.length === 0 ? (
            <div className={styles.emptyRow}><strong>Nothing pinned yet.</strong><span>Choose shortcuts in Home screen settings.</span></div>
          ) : (
            <div className={styles.toolGrid}>
              {shortcutKeys.map((key) => (
                <Link key={key} href={SHORTCUTS[key].href} className={styles.tool}>
                  <span className={styles.toolIcon} style={{ color: SHORTCUTS[key].tint }}>{SHORTCUTS[key].icon}</span>
                  <span className={styles.toolLabel}>{SHORTCUTS[key].label}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      );
    }
    if (block === "journey") return (
      <section className={styles.section} aria-labelledby="home-journey-title">
        <SectionHead eyebrow="Journey" title="Recent activity" titleId="home-journey-title" action={<Link href="/journey" className={styles.link}>View all</Link>} />
        {recentJourney.length === 0 ? (
          <div className={styles.emptyRow}>Your journey, your pace. Nothing here yet.</div>
        ) : (
          <div className={styles.stack}>
            {recentJourney.map((entry) => (
              <div key={entry.id} className={styles.card}>
                <span className={styles.cardText}>
                  <span className={styles.cardTitle}>{entry.title}</span>
                  {formatEntryDate(entry) && <span className={styles.cardMeta}>{formatEntryDate(entry)}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
    if (block === "aurora") return activeProfile.auroraMode === "disabled" ? null : <aside className={styles.auroraCard} aria-label="Aurora suggestion"><div className={styles.auroraText}><span className={styles.auroraLabel}>{auroraSuggestion?.eyebrow ?? auroraStatus.eyebrow}</span><strong className={styles.auroraTitle}>{auroraSuggestion?.title ?? auroraStatus.title}</strong><span>{auroraSuggestion?.message ?? auroraStatus.message}</span>{auroraReasonOpen && <span className={styles.auroraReason}>{auroraReason()}</span>}</div><div className={styles.auroraActions}>{auroraSuggestion ? <><Link href={auroraSuggestion.href} className={styles.auroraAction}>{auroraSuggestion.actionLabel}</Link><button type="button" className={styles.auroraDismiss} onClick={dismissAuroraSuggestion}>Not now</button><button type="button" className={styles.auroraDismiss} aria-expanded={auroraReasonOpen} onClick={() => setAuroraReasonOpen((open) => !open)}>{auroraReasonOpen ? "Hide why" : "Why this?"}</button></> : <Link href="/settings/aurora" className={styles.auroraDismiss}>Aurora settings</Link>}</div></aside>;
    return <section className={styles.nudges}><InstallAppNudge /><SyncNudge /><BetaNudge /><SharingToolsNudge /><DiscordNudge /></section>;
  }

  const name = profile.displayName || "there";
  return <div className={styles.screen} data-density={selectedLayout.density}>
    <header className={styles.hero}><div className={styles.heroText}><div className={styles.eyebrow}>{todayLabel(now)}</div><h1 className={styles.greeting}>Hi {name} 🌸</h1></div><div className={styles.heroActions}><Link href="/reminders" className={styles.accountLink} aria-label="Reminders">{HEADER_ICONS.reminders}<span>Reminders</span></Link><Link href="/search" className={styles.accountLink} aria-label="Search">{HEADER_ICONS.search}<span>Search</span></Link><Link href="/account" className={styles.accountLink} aria-label="Account &amp; sync">{HEADER_ICONS.account}<span>Account &amp; sync</span></Link><div className={styles.petals} data-blossom-decoration aria-hidden="true"><span /><span /><span /></div></div></header>
    {/* Up here rather than at the foot of the page, and visible rather than
        muted. Someone who needs this needs it without scrolling past their
        medication and their budget to find it. It stays warm rather than
        alarming - pink, not red - because it's on screen every ordinary day
        too, and a daily emergency banner would make the app heavy to open. */}
    <Link href="/crisis-support" className={styles.crisisChip}>Need support right now?</Link>
    <AppNotice />
    {quietHome && (
      // The way out has to live here, not only in Settings. Somebody who
      // turned this on during a bad week shouldn't have to remember which
      // settings page it was buried in to get their Home back.
      <div className={styles.quietNotice}>
        <span>
          Just the essentials is on.
          {quietDaysLeft !== null && quietDaysLeft > 0
            ? ` Back to normal in ${quietDaysLeft === 1 ? "a day" : `${quietDaysLeft} days`}.`
            : ""}
        </span>
        <button type="button" className={styles.quietNoticeAction} onClick={() => void turnOffEssentials()}>
          Show everything
        </button>
      </div>
    )}
    <div className={styles.homeBlocks}>{filterBlocksForEssentials(orderedBlocks, quietHome).map((block) => <div key={block} className={`${styles.homeBlock} ${selectedLayout.blockWidths[block] === "half" ? styles.half : styles.wide}`}>{renderBlock(block)}</div>)}</div>
    {/* Asking for money on a day somebody has told us is hard is the wrong
        instinct, so the whole donation entry point steps back too. */}
    {!quietHome && <SupportCard />}
  </div>;
}
