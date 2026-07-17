"use client";

import { useEffect, useState } from "react";
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
  updateDeviceProfile,
  type HomeBlockKey,
  type HomeShortcutKey,
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 720px)");
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

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

  const lowEnergyMedication = dueDoses[0] ?? null;
  const lowEnergyAppointment = appts
    .filter((appointment) => new Date(appointment.appointmentAt) >= now)
    .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt))[0] ?? null;

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

  const auroraSuggestion = auroraHiddenForSession || profile.gentleMode || profile.lowEnergyMode
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
  const homeLayout = isDesktop ? profile.homeDesktopLayout : profile.homePhoneLayout;
  const visible = (key: HomeBlockKey) => homeLayout.visibleBlocks.includes(key);
  const blockOrder = (key: HomeBlockKey) => Math.max(0, homeLayout.order.indexOf(key)) + 1;
  const blockClass = (key: HomeBlockKey) => `${styles.homeBlock} ${homeLayout.blockWidths[key] === "half" ? styles.homeBlockHalf : styles.homeBlockWide}`;
  const blockStyle = (key: HomeBlockKey) => ({ order: blockOrder(key) });
  const todayVisible = homeLayout.todayContent === "both" || homeLayout.todayContent === "medication";
  const appointmentsVisible = homeLayout.todayContent === "both" || homeLayout.todayContent === "appointments";
  const selectedTodayItems = [...(todayVisible ? dueDoses : []), ...(appointmentsVisible ? todayAppts : [])].slice(0, 3);

  function openFocusAction(action: "checkIn" | "journal" | "lowEnergy") {
    if (action === "checkIn") setCheckInOpen(true);
    if (action === "journal") setJournalOpen(true);
    if (action === "lowEnergy") void updateDeviceProfile({ lowEnergyMode: true });
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

      {profile.lowEnergyMode ? (
        <section className={styles.lowEnergy} aria-labelledby="low-energy-title">
          <div className={styles.lowEnergyIntro}>
            <div className={styles.eyebrow}>For right now</div>
            <h2 id="low-energy-title" className={styles.lowEnergyTitle}>Just the essentials</h2>
          </div>

          <div className={styles.lowEnergyList}>
            {lowEnergyMedication && (
              <Link href={lowEnergyMedication.href} className={styles.lowEnergyItem}>
                <span className={styles.lowEnergyLabel}>Next medication</span>
                <strong>{lowEnergyMedication.label}</strong>
                <span>{lowEnergyMedication.meta}</span>
              </Link>
            )}
            {lowEnergyAppointment && (
              <Link href="/calendar" className={styles.lowEnergyItem}>
                <span className={styles.lowEnergyLabel}>{new Date(lowEnergyAppointment.appointmentAt) <= todayEnd ? "Today’s appointment" : "Next appointment"}</span>
                <strong>{lowEnergyAppointment.title}</strong>
                <span>
                  {new Date(lowEnergyAppointment.appointmentAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  · {timeLabel(lowEnergyAppointment.appointmentAt)}
                </span>
              </Link>
            )}
            {!lowEnergyMedication && !lowEnergyAppointment && (
              <div className={styles.lowEnergyEmpty}>
                <strong>Nothing else needs your attention today.</strong>
                <span>You can simply take the day as it comes.</span>
              </div>
            )}
          </div>

          <div className={styles.lowEnergyActions}>
            <button type="button" className={styles.lowEnergyPrimary} onClick={() => setCheckInOpen(true)}>
              Check in
            </button>
            <button type="button" className={styles.lowEnergySecondary} onClick={() => setJournalOpen(true)}>
              Write a note
            </button>
          </div>
        </section>
      ) : (
        <div className={styles.homeCanvas} data-density={homeLayout.density}>
        {focusContent ? (
        <section className={`${styles.focusPanel} ${blockClass("focus")}`} style={blockStyle("focus")} aria-labelledby="focus-title">
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
      {visible("focus") && <section className={`${styles.focusPicker} ${blockClass("focus")}`} style={blockStyle("focus")} aria-labelledby="focus-picker-title">
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
      </section>}
      {(visible("today") || visible("upcoming")) && <div className={styles.overviewGrid} style={{ order: Math.min(blockOrder("today"), blockOrder("upcoming")) }}>
        {visible("today") && <section className={`${styles.section} ${blockClass("today")}`}>
          <h2 className={styles.sectionTitle}>Today</h2>
          {homeLayout.todayContent === "none" || selectedTodayItems.length === 0 ? (
            <div className={styles.emptyRow}>
              <strong>Nothing needs you right now.</strong>
              <span>A quiet day is allowed.</span>
            </div>
          ) : (
            selectedTodayItems.map((item) => (
              <Link key={item.id} href={item.href} className={styles.card}>
                <div className={styles.cardTitle}>{item.label}</div>
                <div className={styles.cardMeta}>{item.meta}</div>
              </Link>
            ))
          )}
        </section>}

        {visible("upcoming") && <section className={`${styles.section} ${blockClass("upcoming")}`}>
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
        </section>}
      </div>}
      </>
      )}

      {visible("pinned") && homeLayout.pinnedTools.length > 0 && !focusIntent && (
        <section className={`${styles.section} ${blockClass("pinned")}`} style={blockStyle("pinned")} aria-labelledby="pinned-tools-title">
          <div className={styles.linkRow}><div><div className={styles.eyebrow}>Your shortcuts</div><h2 id="pinned-tools-title" className={styles.sectionTitle}>Pinned tools</h2></div></div>
          <div className={styles.pinnedTools}>{homeLayout.pinnedTools.map((tool) => <Link key={tool} href={PINNED_TOOLS[tool].href} className={styles.pinnedTool}>{PINNED_TOOLS[tool].label}</Link>)}</div>
        </section>
      )}

      {!profile.gentleMode && !focusIntent && visible("supplies") && supplyHeadsUps.length > 0 && (
        <section className={`${styles.section} ${blockClass("supplies")}`} style={blockStyle("supplies")} aria-labelledby="supply-heads-up-title">
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

      {!profile.gentleMode && !focusIntent && visible("nudges") && <div className={blockClass("nudges")} style={blockStyle("nudges")}><InstallAppNudge /><SyncNudge /></div>}

      {!focusIntent && visible("aurora") && auroraSuggestion && (
        <aside className={`${styles.auroraCard} ${blockClass("aurora")}`} style={blockStyle("aurora")} aria-label="Aurora suggestion">
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

      {!profile.gentleMode && !focusIntent && visible("journey") && <section className={`${styles.section} ${blockClass("journey")}`} style={blockStyle("journey")}>
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
      </section>}

      {profile.gentleMode && !focusIntent && visible("focus") && (
        <section className={`${styles.section} ${blockClass("focus")}`} style={blockStyle("focus")}>
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
      </div>
      )}

      {!profile.lowEnergyMode && <AppNotice />}
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
  actions: Array<{ label: string; description: string; href?: string; action?: "checkIn" | "journal" | "lowEnergy" }>;
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
      { label: "Use Low-Energy Mode", description: "Show only the next essential things on Home.", action: "lowEnergy" },
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

const PINNED_TOOLS: Record<HomeShortcutKey, { label: string; href: string }> = {
  medication: { label: "Medication", href: "/track/medication" },
  calendar: { label: "Calendar", href: "/calendar" },
  journal: { label: "Journal & check-ins", href: "/track/journal" },
  goals: { label: "Goals", href: "/track/goals" },
  journey: { label: "Journey", href: "/journey" },
};
