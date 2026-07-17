"use client";

import { useState } from "react";
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

  const todayItems = [...dueDoses, ...todayAppts].slice(0, 3);

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

  const auroraSuggestion = auroraHiddenForSession
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

      {supplyHeadsUps.length > 0 && (
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

      <InstallAppNudge />
      <SyncNudge />

      {auroraSuggestion && (
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

      <Link href="/crisis-support" className={styles.supportLink}>
        Need support right now?
      </Link>
    </div>
  );
}
