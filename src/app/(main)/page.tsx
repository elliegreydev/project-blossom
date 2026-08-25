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
import { resourcesForRegion } from "@/lib/regionResources";
import InstallAppNudge from "@/components/InstallAppNudge";
import SyncNudge from "@/components/SyncNudge";
import DiscordNudge from "@/components/DiscordNudge";
import SharingToolsNudge from "@/components/SharingToolsNudge";
import AppNotice from "@/components/AppNotice";
import SupportCard from "@/components/SupportCard";
import { ESSENTIALS_DURATIONS, essentialsActive, essentialsDaysLeft, filterBlocksForEssentials } from "@/lib/justTheEssentials";
import { INTENTIONS, orderIntentions, rememberIntention, type IntentionKey } from "@/lib/intentions";
import { turnOffEssentials, turnOnEssentials, updateDeviceProfile } from "@/lib/db";
import styles from "./home.module.css";


const SHORTCUTS: Record<HomeShortcutKey, { label: string; href: string }> = {
  medication: { label: "Medication", href: "/track/medication" },
  calendar: { label: "Calendar", href: "/calendar" },
  journal: { label: "Journal & check-ins", href: "/track/journal" },
  goals: { label: "Goals", href: "/track/goals" },
  journey: { label: "Journey", href: "/journey" },
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

/* Empty means empty: not a single row in any of the tables Home already reads.
   A table that hasn't loaded yet is not the same thing as an empty one, so
   undefined counts as "has something" and the ordinary four nudges render.
   Guessing wrong in that direction is harmless; guessing wrong in the other
   would show a stranger's welcome card to somebody with a year of records. */
function nothingRecordedIn(tables: ({ length: number } | undefined)[]): boolean {
  return tables.every((rows) => rows !== undefined && rows.length === 0);
}

/* The only two countries on the list that take a "the". Spelled out rather
   than guessed at, because "services for United States" reads like a form
   letter and this card is meant to sound like a person. Onboarding says the
   same sentence and works this out the same way. */
function countryLabel(country: string): string {
  return country === "United Kingdom" || country === "United States" ? `the ${country}` : country;
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

  /* The tables above are the ones Home happens to render, which is nowhere
     near all of them. Somebody can have a waiting list entry, a social
     transition plan, blood tests, a budget or a trip and still look brand new
     to that list, and for a UK user the clinic referral is very often the
     first thing they ever put in. Counting these rather than loading them
     keeps it cheap, since Home has no use for the rows themselves. */
  const nothingRecordedElsewhere = useLiveQuery(async () => {
    const counts = await Promise.all([
      db.referrals.count(), db.referralUpdates.count(), db.selfDirected.count(),
      db.intimacyEntries.count(), db.socialTransitionPeople.count(),
      db.socialTransitionPlans.count(), db.socialTransitionTasks.count(),
      db.privateLinks.count(), db.supportMapEntries.count(), db.safetyCheckIns.count(),
      db.budgetEntries.count(), db.budgetGoals.count(), db.bloodTestEntries.count(),
      db.bodyEntries.count(), db.weightEntries.count(), db.trips.count(),
      db.calorieEntries.count(), db.medicationSupplyAdjustments.count(),
      db.careSupplyAdjustments.count(),
    ]);
    return counts.every((count) => count === 0);
  }, []);

  /* The four nudges at the foot of Home each ask for something: add to home
     screen, make an account, try these tools, come to Discord. To somebody
     who has just arrived and put nothing in yet, that is the entire closing
     note of the page, and it reads as four more jobs before anything has
     given them anything. So while there is genuinely nothing in here, the
     nudges stand aside for one card that points at what is already on the
     phone. A lens over the saved layout, never an edit to it: the moment a
     single thing is recorded, all four come back exactly as they were.
     An unresolved count is treated as "has something" for the same reason
     nothingRecordedIn treats an unloaded table that way. */
  const nothingRecordedYet = nothingRecordedElsewhere === true && nothingRecordedIn([
    milestones, journeyEvents, meds, medLogs, medicationSupplies, careSupplies,
    appts, journalEntries, checkIns, goals, voiceGoals, voiceSessions,
    presentationEntries, euphoriaEntries,
  ]);

  /* Only read the resource cache for somebody who could actually see the card.
     It is a couple of hundred rows and every other visit to Home has no use
     for it. Null rather than 0 when there's no region, because the card must
     never render a number it hasn't counted - see the copy below. */
  const regionServiceCount = useLiveQuery(async () => {
    if (!nothingRecordedYet || !profile?.region) return null;
    const inCountry = await db.cachedRegionResources.where("country").equals(profile.region).toArray();
    return resourcesForRegion(inCountry, profile.region, profile.subregion).length;
  }, [nothingRecordedYet, profile?.region, profile?.subregion]);

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

  const orderedBlocks = [...selectedLayout.order, ...Object.keys(selectedLayout.blockWidths) as HomeBlockKey[]]
    .filter((block, index, all) => all.indexOf(block) === index)
    .filter((block): block is HomeBlockKey => ["focus", "today", "upcoming", "supplies", "pinned", "journey", "aurora", "nudges"].includes(block))
    .filter((block) => selectedLayout.visibleBlocks.includes(block))
    .filter((block) => !desiredBlocks || desiredBlocks.has(block));

  /* The one card is worth reading, so on an empty Home it goes first rather
     than sitting under five different ways of saying "nothing". Nothing else
     moves, and the order is theirs again the moment anything is recorded.
     If they've hidden the nudges block entirely, this respects that and shows
     nothing, same as it would have shown no nudges. */
  const blocksInReadingOrder = nothingRecordedYet && orderedBlocks.includes("nudges")
    ? (["nudges", ...orderedBlocks.filter((block) => block !== "nudges")] as HomeBlockKey[])
    : orderedBlocks;
  const activeIntention = intention ? INTENTIONS[intention] : null;

  /* Never a zero and never a number we haven't actually counted. Somebody with
     no region set, or a region whose services haven't loaded, gets the same
     sentence without the figure rather than a hollow "0 services".
     "Device" rather than "phone": Home has a desktop layout, so a laptop is a
     perfectly ordinary place to be reading this. */
  const alreadyHereCopy = regionServiceCount && profile.region
    ? `Blossom has ${regionServiceCount} support ${regionServiceCount === 1 ? "service" : "services"} for ${countryLabel(profile.region)} saved on this device, along with the guides. They work with no signal, and there’s nothing to set up.`
    : "Blossom has support services and written guides saved on this device. They work with no signal, and there’s nothing to set up.";

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
        <div className={styles.linkRow}>
          <div><div className={styles.eyebrow}>Your Home, for right now</div><h2 id="intention-title" className={styles.sectionTitle}>What would help right now?</h2></div>
          {activeIntention && <button type="button" className={styles.resetIntention} onClick={() => setIntention(null)}>Back to my Home</button>}
        </div>
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
    if (block === "today") return <section className={styles.section}><h2 className={styles.sectionTitle}>Today</h2>{todayItems.length === 0 ? <div className={styles.emptyRow}><strong>Nothing needs you right now.</strong><span>A quiet day is allowed.</span></div> : todayItems.map((item) => <Link key={item.id} href={item.href} className={`${styles.card} ${item.overdue ? styles.cardOverdue : ""}`}><div className={styles.cardTitle}>{item.label}</div><div className={styles.cardMeta}>{item.overdue ? `Overdue · was due ${item.meta}` : item.meta}</div></Link>)}</section>;
    if (block === "upcoming") return <section className={styles.section}><h2 className={styles.sectionTitle}>Coming up</h2>{upcoming.length === 0 ? <div className={styles.emptyRow}><strong>Nothing scheduled yet.</strong><span>Appointments will appear here when they’re useful.</span></div> : upcoming.map((appointment) => <Link key={appointment.id} href="/calendar" className={styles.card}><div className={styles.cardTitle}>{appointment.title}</div><div className={styles.cardMeta}>{new Date(appointment.appointmentAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })} · {timeLabel(appointment.appointmentAt)}</div></Link>)}</section>;
    if (block === "supplies") return <section className={styles.section} aria-labelledby="supply-heads-up-title"><div className={styles.linkRow}><div><div className={styles.eyebrow}>Supplies</div><h2 id="supply-heads-up-title" className={styles.sectionTitle}>A small supply heads-up</h2></div><Link href="/track/medication" className={styles.link}>Review</Link></div>{supplyHeadsUps.length === 0 ? <div className={styles.emptyRow}><strong>Nothing needs checking.</strong><span>Supply heads-ups appear only when they may help.</span></div> : supplyHeadsUps.map((supply) => <Link key={supply.id} href="/track/medication" className={styles.card}><div className={styles.cardTitle}>{supply.label}</div><div className={styles.cardMeta}>{supply.meta}</div></Link>)}</section>;
    if (block === "pinned") return <section className={styles.section}><div className={styles.linkRow}><div><div className={styles.eyebrow}>Shortcuts</div><h2 className={styles.sectionTitle}>Pinned tools</h2></div><Link href="/settings/home" className={styles.link}>Edit</Link></div>{selectedLayout.pinnedTools.length === 0 ? <div className={styles.emptyRow}><strong>Nothing pinned yet.</strong><span>Choose shortcuts in Home screen settings.</span></div> : <div className={styles.pinnedGrid}>{selectedLayout.pinnedTools.map((key) => <Link key={key} href={SHORTCUTS[key].href} className={styles.pinnedTool}>{SHORTCUTS[key].label}</Link>)}</div>}</section>;
    if (block === "journey") return <section className={styles.section}><div className={styles.linkRow}><div><div className={styles.eyebrow}>Journey</div><h2 className={styles.sectionTitle}>Recent activity</h2></div><Link href="/journey" className={styles.link}>View all</Link></div>{recentJourney.length === 0 ? <div className={styles.emptyRow}>Your journey, your pace. Nothing here yet.</div> : recentJourney.map((entry) => <div key={entry.id} className={styles.card}><div className={styles.cardTitle}>{entry.title}</div>{formatEntryDate(entry) && <div className={styles.cardMeta}>{formatEntryDate(entry)}</div>}</div>)}</section>;
    if (block === "aurora") return activeProfile.auroraMode === "disabled" ? null : <aside className={styles.auroraCard} aria-label="Aurora suggestion"><div className={styles.auroraText}><span className={styles.auroraLabel}>{auroraSuggestion?.eyebrow ?? auroraStatus.eyebrow}</span><strong className={styles.auroraTitle}>{auroraSuggestion?.title ?? auroraStatus.title}</strong><span>{auroraSuggestion?.message ?? auroraStatus.message}</span>{auroraReasonOpen && <span className={styles.auroraReason}>{auroraReason()}</span>}</div><div className={styles.auroraActions}>{auroraSuggestion ? <><Link href={auroraSuggestion.href} className={styles.auroraAction}>{auroraSuggestion.actionLabel}</Link><button type="button" className={styles.auroraDismiss} onClick={dismissAuroraSuggestion}>Not now</button><button type="button" className={styles.auroraDismiss} aria-expanded={auroraReasonOpen} onClick={() => setAuroraReasonOpen((open) => !open)}>{auroraReasonOpen ? "Hide why" : "Why this?"}</button></> : <Link href="/settings/aurora" className={styles.auroraDismiss}>Aurora settings</Link>}</div></aside>;
    /* Something to read, not something to do. No steps, no percentage, no
       "get started": it offers what's already sitting on the phone and then
       gets out of the way. */
    if (nothingRecordedYet) return (
      <section className={styles.alreadyHere} aria-labelledby="already-here-title">
        <div className={styles.eyebrow}>Already here</div>
        <h2 id="already-here-title" className={styles.alreadyHereTitle}>There’s more in here than you’ve put in.</h2>
        <p className={styles.alreadyHereCopy}>{alreadyHereCopy}</p>
        <div className={styles.alreadyHereLinks}>
          <Link href="/settings/support" className={styles.alreadyHereLink}>Support services</Link>
          <Link href="/info" className={styles.alreadyHereLink}>Guides in Info</Link>
        </div>
      </section>
    );
    return <section className={styles.nudges}><InstallAppNudge /><SyncNudge /><SharingToolsNudge /><DiscordNudge /></section>;
  }

  const name = profile.displayName || "there";
  return <div className={styles.screen} data-density={selectedLayout.density}>
    <header className={styles.hero}><div><div className={styles.eyebrow}>{todayLabel(now)}</div><h1 className={styles.greeting}>Hi {name} 🌸</h1></div><div className={styles.heroActions}><Link href="/reminders" className={styles.accountLink} aria-label="Reminders">{HEADER_ICONS.reminders}<span>Reminders</span></Link><Link href="/search" className={styles.accountLink} aria-label="Search">{HEADER_ICONS.search}<span>Search</span></Link><Link href="/account" className={styles.accountLink} aria-label="Account &amp; sync">{HEADER_ICONS.account}<span>Account &amp; sync</span></Link><div className={styles.petals} data-blossom-decoration aria-hidden="true"><span /><span /><span /></div></div></header>
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
    <div className={styles.homeBlocks}>{filterBlocksForEssentials(blocksInReadingOrder, quietHome).map((block) => <div key={block} className={`${styles.homeBlock} ${selectedLayout.blockWidths[block] === "half" ? styles.half : styles.wide}`}>{renderBlock(block)}</div>)}</div>
    {/* Asking for money on a day somebody has told us is hard is the wrong
        instinct, so the whole donation entry point steps back too. */}
    {!quietHome && <SupportCard />}
  </div>;
}
