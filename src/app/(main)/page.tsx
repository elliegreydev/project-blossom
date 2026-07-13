"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  LOCAL_PROFILE_ID,
  dismissAuroraNudge,
  dueDosesToday,
  type Milestone,
  type JourneyEvent,
} from "@/lib/db";
import styles from "./home.module.css";

function formatEntryDate(entry: Milestone | JourneyEvent): string | null {
  if (entry.datePrecision === "none" || !entry.eventDate) return null;
  if (entry.datePrecision === "approximate") return entry.eventDate;
  return new Date(entry.eventDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function HomePage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const milestones = useLiveQuery(() => db.milestones.toArray(), []);
  const journeyEvents = useLiveQuery(() => db.journeyEvents.toArray(), []);
  const meds = useLiveQuery(() => db.medications.toArray(), []);
  const medLogs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const appts = useLiveQuery(() => db.appointments.toArray(), []);
  const firstMilestoneNudge = useLiveQuery(() => db.auroraNudges.get("first_milestone"));

  if (
    !profile ||
    milestones === undefined ||
    journeyEvents === undefined ||
    meds === undefined ||
    medLogs === undefined ||
    appts === undefined
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

  // Coming up: next appointments after today.
  const upcoming = appts
    .filter((a) => new Date(a.appointmentAt) > todayEnd)
    .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt))
    .slice(0, 3);

  const recentJourney = [...milestones, ...journeyEvents]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  const showFirstMilestoneNudge =
    profile.auroraMode !== "disabled" && milestones.length === 0 && !firstMilestoneNudge;

  const name = profile.displayName || "there";

  return (
    <div className={styles.screen}>
      <div className={styles.greeting}>Hi {name} 🌸</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Today</div>
        {todayItems.length === 0 ? (
          <div className={styles.emptyRow}>Nothing needs you right now.</div>
        ) : (
          todayItems.map((item) => (
            <Link key={item.id} href={item.href} className={styles.card}>
              <div className={styles.cardTitle}>{item.label}</div>
              <div className={styles.cardMeta}>{item.meta}</div>
            </Link>
          ))
        )}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Coming up</div>
        {upcoming.length === 0 ? (
          <div className={styles.emptyRow}>
            Once you add appointments or medication, they&apos;ll show up here.
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
      </div>

      {showFirstMilestoneNudge && (
        <div className={styles.auroraCard}>
          <div className={styles.auroraText}>
            Whenever you&apos;re ready, your Journey is a quiet place to note things that
            matter to you. No pressure.
          </div>
          <button
            type="button"
            className={styles.auroraDismiss}
            onClick={() => dismissAuroraNudge("first_milestone")}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.linkRow}>
          <div className={styles.sectionTitle}>Recent journey activity</div>
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
      </div>

      <Link href="/settings/support" className={styles.supportLink}>
        Need support right now?
      </Link>
    </div>
  );
}
