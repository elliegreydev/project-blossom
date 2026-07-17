"use client";

import { useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import JournalSheet from "@/components/JournalSheet";
import CheckInSheet from "@/components/CheckInSheet";
import {
  db,
  LOCAL_PROFILE_ID,
  dismissAuroraNudge,
  dueDosesToday,
  estimatedMedicationSupplyDays,
  medicationSupplyIsLow,
  careSupplyNeedsAttention,
  type Milestone,
  type JourneyEvent,
} from "@/lib/db";
import { selectAuroraSuggestion } from "@/lib/aurora";
import InstallAppNudge from "@/components/InstallAppNudge";
import SyncNudge from "@/components/SyncNudge";
import AppNotice from "@/components/AppNotice";
import styles from "./home.module.css";

function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function todayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
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
  const auroraNudgeStates = useLiveQuery(() => db.auroraNudges.toArray(), []);
  const [auroraHiddenForSession, setAuroraHiddenForSession] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [focusIntent, setFocusIntent] = useState<FocusIntent | null>(null);

  if (
    !profile ||
    milestones === undefined ||
    journeyEvents === undefined ||
    meds === undefined ||
    medLogs === undefined ||
    medicationSupplies === undefined ||
    careSupplies === undefined ||
    appts === undefined ||
    journalEntries === undefined ||
    checkIns === undefined ||
    goals === undefined ||
    voiceGoals === undefined ||
    voiceSessions === undefined ||
    presentationEntries === undefined ||
    auroraNudgeStates === undefined
  )
    return null;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Today's medication doses not yet logged.
  const dueDoses = meds
    .filter((m) => m.active)
    .flatMap((med) =>
      dueDosesToday(med, now)
        .filter((slot) => !medLogs.some((l) => l.medicationId === med.id && l.scheduledTime === slot))
        .map((slot) => ({ id: med.id + slot, label: med.name, meta: timeLabel(slot), href: "/track/medication" }))
    );

  // Today's appointments.
  const todayAppts = appts
    .filter((a) => {
      const t = new Date(a.appointmentAt);
      return t >= now && t <= todayEnd;
    })
    .map((a) => ({ id: a.id, label: a.title, meta: timeLabel(a.appointmentAt), href: "/calendar" }));

  const medicationSupplyHeadsUps = meds
    .filter((medication) => medication.active)
    .flatMap((medication) => {
      const supply = medicationSupplies.find((item) => item.medicationId === medication.id);
      if (!supply || !medicationSupplyIsLow(medication, supply)) return [];
      const days = estimatedMedicationSupplyDays(medication, supply);
      return [{
        id: medication.id,
        label: medication.name,
        meta: days === null ? "A supply check may be useful" : `Around ${days} ${days === 1 ? "day" : "days"} left`,
      }];
    })
    .slice(0, 2);
  const supplyHeadsUps = [
    ...medicationSupplyHeadsUps,
    ...careSupplies
      .filter((supply) => careSupplyNeedsAttention(supply))
      .map((supply) => ({ id: supply.id, label: supply.name, meta: "A supply check may be useful" })),
  ].slice(0, 3);

  // Coming up: next appointments after today.
  const upcoming = appts
    .filter((a) => new Date(a.appointmentAt) > todayEnd)
    .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt))
    .slice(0, 3);

  const recentJourney = [...milestones, ...journeyEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  const auroraSuggestion = auroraHiddenForSession || profile.gentleMode
    ? null
    : selectAuroraSuggestion({
        now,
        profile,
        milestones,
        journeyEvents,
        medications: meds,
        medicationLogs: medLogs,
        appointments: appts,
        journalEntries,
        checkIns,
        goals,
        voiceGoals,
        voiceSessions,
        presentationEntries,
        nudgeStates: auroraNudgeStates,
      });

  function acknowledgeAuroraSuggestion() {
    if (!auroraSuggestion) return;
    setAuroraHiddenForSession(true);
    void dismissAuroraNudge(auroraSuggestion.key);
  }

  const name = profile.displayName || "there";
  const focusContent = focusIntent ? FOCUS_CONTENT[focusIntent] : null;
  const todayItems = [...dueDoses, ...todayAppts].slice(0, 3);

  function openFocusAction(action: "checkIn" | "journal") {
    if (action === "checkIn") setCheckInOpen(true);
    if (action === "journal") setJournalOpen(true);
  }

  return (
    <div className={styles.screen}>
      <header className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>{todayLabel(now)}</div>
          <h1 className={styles.greeting}>Hi {name} 🌸</h1>
        </div>
        <div className={styles.heroActions}>
          <Link href="/account" className={styles.accountLink}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M7.5 18.5A5.5 5.5 0 0 1 8 7.52 6.5 6.5 0 0 1 20 11a4 4 0 0 1-1 7.87" />
              <path d="M9 15h6M12 12v6" />
            </svg>
            <span>Account &amp; sync</span>
          </Link>
          <div className={styles.petals} data-blossom-decoration aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <AppNotice />

      <>
        {focusContent ? (
        <section className={styles.focusPanel} aria-labelledby="focus-title">
          <div className={styles.focusHeader}>
            <div className={styles.eyebrow}>What would help right now?</div>
            <h2 id="focus-title" className={styles.focusTitle}>{focusContent.title}</h2>
            <p>{focusContent.description}</p>
            <button type="button" className={styles.focusReset} onClick={() => setFocusIntent(null)}>
              Back to Home
            </button>
          </div>
          <div className={styles.focusActions}>
            {focusContent.actions.map((item) => (
              item.href ? (
                <Link key={item.label} href={item.href} className={styles.focusAction}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              ) : (
                <button key={item.label} type="button" className={styles.focusAction} onClick={() => openFocusAction(item.action!)}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              )
            ))}
          </div>
        </section>
      ) : (
      <>
      <section className={styles.focusPicker} aria-labelledby="focus-picker-title">
        <div className={styles.focusPickerIntro}>
          <div className={styles.eyebrow}>Start where you are</div>
          <h2 id="focus-picker-title" className={styles.focusPickerTitle}>What would help right now?</h2>
        </div>
        <div className={styles.focusChoiceGrid}>
          {FOCUS_CHOICES.map((choice) => (
            <button key={choice.key} type="button" className={styles.focusChoice} onClick={() => setFocusIntent(choice.key)}>
              <strong>{choice.label}</strong>
              <span>{choice.description}</span>
            </button>
          ))}
        </div>
      </section>
      <div className={styles.overviewGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Today</h2>
          {todayItems.length === 0 ? (
            <div className={styles.emptyRow}>
              <strong>Nothing needs you right now.</strong>
              <span>A quiet day is allowed.</span>
            </div>
          ) : (
            todayItems.map((item) => (
              <Link key={item.id} href={item.href} className={styles.card}>
                <div className={styles.cardTitle}>{item.label}</div>
                <div className={styles.cardMeta}>{item.meta}</div>
              </Link>
            ))
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Coming up</h2>
          {upcoming.length === 0 ? (
            <div className={styles.emptyRow}>
              <strong>Nothing scheduled yet.</strong>
              <span>Appointments will appear here when they&apos;re useful.</span>
            </div>
          ) : (
            upcoming.map((a) => (
              <Link key={a.id} href="/calendar" className={styles.card}>
                <div className={styles.cardTitle}>{a.title}</div>
                <div className={styles.cardMeta}>
                  {new Date(a.appointmentAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {timeLabel(a.appointmentAt)}
                </div>
              </Link>
            ))
          )}
        </section>
      </div>
      </>
      )}

      {!profile.gentleMode && !focusIntent && supplyHeadsUps.length > 0 && (
        <section className={styles.section} aria-labelledby="supply-heads-up-title">
          <div className={styles.linkRow}>
            <div>
              <div className={styles.eyebrow}>Supplies</div>
              <h2 id="supply-heads-up-title" className={styles.sectionTitle}>A small supply heads-up</h2>
            </div>
            <Link href="/track/medication" className={styles.link}>Review</Link>
          </div>
          {supplyHeadsUps.map((supply) => (
            <Link key={supply.id} href="/track/medication" className={styles.card}>
              <div className={styles.cardTitle}>{supply.label}</div>
              <div className={styles.cardMeta}>{supply.meta}</div>
            </Link>
          ))}
        </section>
      )}

      {!profile.gentleMode && !focusIntent && (
        <>
          <InstallAppNudge />
          <SyncNudge />
        </>
      )}

      {!focusIntent && auroraSuggestion && (
        <aside className={styles.auroraCard} aria-label="Aurora suggestion">
          <div className={styles.auroraText}>
            <span className={styles.auroraLabel}>{auroraSuggestion.eyebrow}</span>
            <strong className={styles.auroraTitle}>{auroraSuggestion.title}</strong>
            <span>{auroraSuggestion.message}</span>
          </div>
          <div className={styles.auroraActions}>
            <Link
              href={auroraSuggestion.href}
              className={styles.auroraAction}
              onClick={acknowledgeAuroraSuggestion}
            >
              {auroraSuggestion.actionLabel}
            </Link>
            <button
              type="button"
              className={styles.auroraDismiss}
              onClick={acknowledgeAuroraSuggestion}
            >
              Not now
            </button>
          </div>
        </aside>
      )}

      {!profile.gentleMode && !focusIntent && (
        <section className={styles.section}>
          <div className={styles.linkRow}>
            <div>
              <div className={styles.eyebrow}>Journey</div>
              <h2 className={styles.sectionTitle}>Recent activity</h2>
            </div>
            <Link href="/journey" className={styles.link}>
              View all
            </Link>
          </div>
          {recentJourney.length === 0 ? (
            <div className={styles.emptyRow}>Your journey, your pace. Nothing here yet.</div>
          ) : (
            recentJourney.map((entry) => (
              <div key={entry.id} className={styles.card}>
                <div className={styles.cardTitle}>{entry.title}</div>
                {formatEntryDate(entry) && <div className={styles.cardMeta}>{formatEntryDate(entry)}</div>}
              </div>
            ))
          )}
        </section>
      )}

      {profile.gentleMode && !focusIntent && (
        <section className={styles.section}>
          <div className={styles.linkRow}>
            <div>
              <div className={styles.eyebrow}>At your pace</div>
              <h2 className={styles.sectionTitle}>A small place to land</h2>
            </div>
            <Link href="/track/journal" className={styles.link}>Reflect</Link>
          </div>
          <div className={styles.emptyRow}>
            <strong>You do not need to track everything today.</strong>
            <span>Notes and check-ins are here whenever they feel useful.</span>
          </div>
        </section>
      )}
      </>

      <Link href="/crisis-support" className={styles.supportLink}>
        Need support right now?
      </Link>
      {journalOpen && <JournalSheet onClose={() => setJournalOpen(false)} />}
      {checkInOpen && <CheckInSheet onClose={() => setCheckInOpen(false)} />}
    </div>
  );
}

type FocusIntent = "organise" | "prepare" | "reflect" | "calm" | "celebrate" | "support";

const FOCUS_CHOICES: Array<{ key: FocusIntent; label: string; description: string }> = [
  { key: "organise", label: "Organise", description: "See what needs a place." },
  { key: "prepare", label: "Prepare", description: "Get ready for what is ahead." },
  { key: "reflect", label: "Reflect", description: "Make a little room for yourself." },
  { key: "calm", label: "Calm down", description: "Keep things small and steady." },
  { key: "celebrate", label: "Celebrate", description: "Notice what matters to you." },
  { key: "support", label: "Find support", description: "Reach trusted help and resources." },
];

const FOCUS_CONTENT: Record<FocusIntent, {
  title: string;
  description: string;
  actions: Array<{ label: string; description: string; href?: string; action?: "checkIn" | "journal" }>;
}> = {
  organise: {
    title: "A little structure",
    description: "Pick up only the practical bits that feel useful right now.",
    actions: [
      { label: "Medication & supplies", description: "Schedules, doses and the supplies you keep track of.", href: "/track/medication" },
      { label: "Calendar", description: "Appointments and the things you want to prepare for.", href: "/calendar" },
      { label: "Goals", description: "A quiet look at what you are working towards.", href: "/track/goals" },
    ],
  },
  prepare: {
    title: "Get ready, gently",
    description: "A few places to gather what may help before an appointment or an important day.",
    actions: [
      { label: "Appointments", description: "Open your calendar and any private appointment preparation.", href: "/calendar" },
      { label: "Medication details", description: "Keep the practical information you chose close by.", href: "/track/medication" },
      { label: "Write a private note", description: "Jot down anything you want to remember.", action: "journal" },
    ],
  },
  reflect: {
    title: "Make a little space",
    description: "Nothing needs to be measured or solved. Choose what feels right.",
    actions: [
      { label: "Check in", description: "A quick, private way to notice how you are doing.", action: "checkIn" },
      { label: "Write a note", description: "A few words, or as many as you need.", action: "journal" },
      { label: "Journal & check-ins", description: "Return to your existing private reflections.", href: "/track/journal" },
    ],
  },
  calm: {
    title: "Keep it small",
    description: "You do not need to work through everything today.",
    actions: [
      { label: "A quick check-in", description: "Pause and note only what feels useful.", action: "checkIn" },
      { label: "Need support right now?", description: "Open verified support and crisis information.", href: "/crisis-support" },
    ],
  },
  celebrate: {
    title: "Notice what matters",
    description: "Your progress is yours. There is no comparison here.",
    actions: [
      { label: "Your journey", description: "Look back at the moments you chose to keep.", href: "/journey" },
      { label: "Goals", description: "See the things you have been moving towards.", href: "/track/goals" },
    ],
  },
  support: {
    title: "Find support",
    description: "Clear support information, without needing to explain yourself first.",
    actions: [
      { label: "Crisis & support resources", description: "Region-aware support that is available without finishing onboarding.", href: "/crisis-support" },
      { label: "Help with Blossom", description: "Practical help and support for using the app.", href: "/settings/support" },
    ],
  },
};
