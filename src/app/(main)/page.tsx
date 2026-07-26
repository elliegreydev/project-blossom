"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
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
  type Milestone,
  type JourneyEvent,
} from "@/lib/db";
import { auroraQuietStatus, selectAuroraSuggestion } from "@/lib/aurora";
import InstallAppNudge from "@/components/InstallAppNudge";
import SyncNudge from "@/components/SyncNudge";
import BetaNudge from "@/components/BetaNudge";
import DiscordNudge from "@/components/DiscordNudge";
import AppNotice from "@/components/AppNotice";
import styles from "./home.module.css";

type IntentionKey = "organise" | "prepare" | "reflect" | "calm" | "celebrate" | "support" | "today" | "record";

const SHORTCUTS: Record<HomeShortcutKey, { label: string; href: string }> = {
  medication: { label: "Medication", href: "/track/medication" },
  calendar: { label: "Calendar", href: "/calendar" },
  journal: { label: "Journal & check-ins", href: "/track/journal" },
  goals: { label: "Goals", href: "/track/goals" },
  journey: { label: "Journey", href: "/journey" },
};

const INTENTIONS: Record<IntentionKey, { label: string; description: string; blocks: HomeBlockKey[]; href: string; action: string }> = {
  organise: { label: "Organise", description: "Today, appointments and your chosen shortcuts.", blocks: ["focus", "today", "upcoming", "pinned"], href: "/calendar", action: "Open calendar" },
  prepare: { label: "Prepare", description: "Upcoming plans, medication and practical supplies.", blocks: ["focus", "today", "upcoming", "supplies", "pinned"], href: "/calendar", action: "Review appointments" },
  reflect: { label: "Reflect", description: "A quieter place for notes and your Journey.", blocks: ["focus", "journey", "pinned", "aurora"], href: "/track/journal", action: "Open journal" },
  calm: { label: "Calm down", description: "Just the essentials. Nothing else needs your attention right now.", blocks: ["focus", "today", "upcoming"], href: "/track/journal", action: "A quick check-in" },
  celebrate: { label: "Celebrate", description: "A moment for affirming wins and milestones.", blocks: ["focus", "journey", "pinned"], href: "/track/journal", action: "Record a good moment" },
  support: { label: "Find support", description: "Verified regional sources and urgent support, when useful.", blocks: ["focus", "aurora", "pinned"], href: "/aurora", action: "Find support" },
  today: { label: "Check today’s tasks", description: "Your medication and appointments, without the rest of Home.", blocks: ["focus", "today", "upcoming"], href: "/reminders", action: "Open reminders" },
  record: { label: "Record something quickly", description: "A short route to the thing you want to capture.", blocks: ["focus", "pinned", "journey"], href: "/track/journal", action: "Write a note" },
};

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
    .map((slot) => ({ id: med.id + slot, label: med.name, meta: timeLabel(slot), href: "/track/medication", overdue: now.getTime() - new Date(slot).getTime() > OVERDUE_THRESHOLD_MS })));
  const todayAppts = appts.filter((appointment) => {
    const time = new Date(appointment.appointmentAt);
    return time >= now && time <= todayEnd;
  }).map((appointment) => ({ id: appointment.id, label: appointment.title, meta: timeLabel(appointment.appointmentAt), href: "/calendar", overdue: false }));

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
  const orderedBlocks = [...selectedLayout.order, ...Object.keys(selectedLayout.blockWidths) as HomeBlockKey[]]
    .filter((block, index, all) => all.indexOf(block) === index)
    .filter((block): block is HomeBlockKey => ["focus", "today", "upcoming", "supplies", "pinned", "journey", "aurora", "nudges"].includes(block))
    .filter((block) => selectedLayout.visibleBlocks.includes(block))
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
    return "Aurora noticed something you recorded in Blossom. This suggestion is made locally and does not use AI or send your records anywhere.";
  }

  function renderBlock(block: HomeBlockKey) {
    if (block === "focus") return (
      <section className={`${styles.section} ${styles.intentionCard}`} aria-labelledby="intention-title">
        <div className={styles.linkRow}>
          <div><div className={styles.eyebrow}>Your Home, for right now</div><h2 id="intention-title" className={styles.sectionTitle}>What would help right now?</h2></div>
          {activeIntention && <button type="button" className={styles.resetIntention} onClick={() => setIntention(null)}>Back to my Home</button>}
        </div>
        {activeIntention ? <div className={styles.intentionActive}><p>{activeIntention.description}</p><Link href={activeIntention.href} className={styles.intentionAction}>{activeIntention.action}</Link></div> : <p className={styles.intentionCopy}>Choose a temporary lens. Your saved Home layout stays exactly as it is.</p>}
        <div className={styles.intentionChoices}>{(Object.keys(INTENTIONS) as IntentionKey[]).map((key) => <button type="button" key={key} className={intention === key ? styles.intentionSelected : styles.intentionButton} onClick={() => setIntention(key)}>{INTENTIONS[key].label}</button>)}</div>
      </section>
    );
    if (block === "today") return <section className={styles.section}><h2 className={styles.sectionTitle}>Today</h2>{todayItems.length === 0 ? <div className={styles.emptyRow}><strong>Nothing needs you right now.</strong><span>A quiet day is allowed.</span></div> : todayItems.map((item) => <Link key={item.id} href={item.href} className={`${styles.card} ${item.overdue ? styles.cardOverdue : ""}`}><div className={styles.cardTitle}>{item.label}</div><div className={styles.cardMeta}>{item.overdue ? `Overdue · was due ${item.meta}` : item.meta}</div></Link>)}</section>;
    if (block === "upcoming") return <section className={styles.section}><h2 className={styles.sectionTitle}>Coming up</h2>{upcoming.length === 0 ? <div className={styles.emptyRow}><strong>Nothing scheduled yet.</strong><span>Appointments will appear here when they’re useful.</span></div> : upcoming.map((appointment) => <Link key={appointment.id} href="/calendar" className={styles.card}><div className={styles.cardTitle}>{appointment.title}</div><div className={styles.cardMeta}>{new Date(appointment.appointmentAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {timeLabel(appointment.appointmentAt)}</div></Link>)}</section>;
    if (block === "supplies") return <section className={styles.section} aria-labelledby="supply-heads-up-title"><div className={styles.linkRow}><div><div className={styles.eyebrow}>Supplies</div><h2 id="supply-heads-up-title" className={styles.sectionTitle}>A small supply heads-up</h2></div><Link href="/track/medication" className={styles.link}>Review</Link></div>{supplyHeadsUps.length === 0 ? <div className={styles.emptyRow}><strong>Nothing needs checking.</strong><span>Supply heads-ups appear only when they may help.</span></div> : supplyHeadsUps.map((supply) => <Link key={supply.id} href="/track/medication" className={styles.card}><div className={styles.cardTitle}>{supply.label}</div><div className={styles.cardMeta}>{supply.meta}</div></Link>)}</section>;
    if (block === "pinned") return <section className={styles.section}><div className={styles.linkRow}><div><div className={styles.eyebrow}>Shortcuts</div><h2 className={styles.sectionTitle}>Pinned tools</h2></div><Link href="/settings/home" className={styles.link}>Edit</Link></div>{selectedLayout.pinnedTools.length === 0 ? <div className={styles.emptyRow}><strong>Nothing pinned yet.</strong><span>Choose shortcuts in Home screen settings.</span></div> : <div className={styles.pinnedGrid}>{selectedLayout.pinnedTools.map((key) => <Link key={key} href={SHORTCUTS[key].href} className={styles.pinnedTool}>{SHORTCUTS[key].label}</Link>)}</div>}</section>;
    if (block === "journey") return <section className={styles.section}><div className={styles.linkRow}><div><div className={styles.eyebrow}>Journey</div><h2 className={styles.sectionTitle}>Recent activity</h2></div><Link href="/journey" className={styles.link}>View all</Link></div>{recentJourney.length === 0 ? <div className={styles.emptyRow}>Your journey, your pace. Nothing here yet.</div> : recentJourney.map((entry) => <div key={entry.id} className={styles.card}><div className={styles.cardTitle}>{entry.title}</div>{formatEntryDate(entry) && <div className={styles.cardMeta}>{formatEntryDate(entry)}</div>}</div>)}</section>;
    if (block === "aurora") return activeProfile.auroraMode === "disabled" ? null : <aside className={styles.auroraCard} aria-label="Aurora suggestion"><div className={styles.auroraText}><span className={styles.auroraLabel}>{auroraSuggestion?.eyebrow ?? auroraStatus.eyebrow}</span><strong className={styles.auroraTitle}>{auroraSuggestion?.title ?? auroraStatus.title}</strong><span>{auroraSuggestion?.message ?? auroraStatus.message}</span>{auroraReasonOpen && <span className={styles.auroraReason}>{auroraReason()}</span>}</div><div className={styles.auroraActions}>{auroraSuggestion ? <><Link href={auroraSuggestion.href} className={styles.auroraAction}>{auroraSuggestion.actionLabel}</Link><button type="button" className={styles.auroraDismiss} onClick={dismissAuroraSuggestion}>Not now</button><button type="button" className={styles.auroraDismiss} aria-expanded={auroraReasonOpen} onClick={() => setAuroraReasonOpen((open) => !open)}>{auroraReasonOpen ? "Hide why" : "Why this?"}</button></> : <Link href="/settings/aurora" className={styles.auroraDismiss}>Aurora settings</Link>}</div></aside>;
    return <section className={styles.nudges}><InstallAppNudge /><SyncNudge /><BetaNudge /><DiscordNudge /></section>;
  }

  const name = profile.displayName || "there";
  return <div className={styles.screen} data-density={selectedLayout.density}>
    <header className={styles.hero}><div><div className={styles.eyebrow}>{todayLabel(now)}</div><h1 className={styles.greeting}>Hi {name} 🌸</h1></div><div className={styles.heroActions}><Link href="/reminders" className={styles.accountLink} aria-label="Reminders">🔔<span>Reminders</span></Link><Link href="/search" className={styles.accountLink} aria-label="Search">⌕<span>Search</span></Link><Link href="/account" className={styles.accountLink}>⌘<span>Account &amp; sync</span></Link><div className={styles.petals} data-blossom-decoration aria-hidden="true"><span /><span /><span /></div></div></header>
    <AppNotice />
    <div className={styles.homeBlocks}>{orderedBlocks.map((block) => <div key={block} className={`${styles.homeBlock} ${selectedLayout.blockWidths[block] === "half" ? styles.half : styles.wide}`}>{renderBlock(block)}</div>)}</div>
    <Link href="/crisis-support" className={styles.supportLink}>Need support right now?</Link>
  </div>;
}
