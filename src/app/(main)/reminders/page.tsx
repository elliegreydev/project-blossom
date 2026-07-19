"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import {
  db,
  LOCAL_PROFILE_ID,
  dueDosesToday,
  activeSafetyCheckIn,
  resolveSafetyCheckIn,
  type SafetyCheckIn,
  type ModuleKey,
} from "@/lib/db";
import styles from "@/components/feature.module.css";

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function RemindersPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const meds = useLiveQuery(() => db.medications.toArray(), []);
  const medLogs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const appts = useLiveQuery(() => db.appointments.toArray(), []);
  const euphoriaEntries = useLiveQuery(() => db.euphoriaEntries.toArray(), []);
  const [checkIn, setCheckIn] = useState<SafetyCheckIn | null | undefined>(undefined);

  async function refreshCheckIn() {
    setCheckIn((await activeSafetyCheckIn()) ?? null);
  }

  useEffect(() => {
    void refreshCheckIn();
  }, []);

  if (
    !profile ||
    meds === undefined ||
    medLogs === undefined ||
    appts === undefined ||
    euphoriaEntries === undefined ||
    checkIn === undefined
  )
    return null;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const enabled = (key: ModuleKey) => profile.enabledModules.includes(key);

  const dueDoses = enabled("medication")
    ? meds
        .filter((m) => m.active)
        .flatMap((med) =>
          dueDosesToday(med, now)
            .filter((slot) => !medLogs.some((l) => l.medicationId === med.id && l.scheduledTime === slot))
            .map((slot) => ({
              id: med.id + slot,
              title: med.name,
              meta: timeLabel(slot),
              overdue: now.getTime() - new Date(slot).getTime() > 15 * 60 * 1000,
            }))
        )
    : [];

  const upcomingAppts = enabled("appointments")
    ? appts
        .filter((a) => new Date(a.appointmentAt) > now)
        .sort((a, b) => a.appointmentAt.localeCompare(b.appointmentAt))
        .slice(0, 5)
    : [];

  const readyCapsules = enabled("journal")
    ? euphoriaEntries.filter((e) => e.reopenAt && e.reopenAt <= today)
    : [];

  const nothingDue = dueDoses.length === 0 && upcomingAppts.length === 0 && !checkIn && readyCapsules.length === 0;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Reminders" backHref="/" />
      <p className={styles.pageSubtitle} style={{ marginTop: -10 }}>
        Everything coming up in one place, instead of checking each part of Blossom separately.
      </p>

      {nothingDue && (
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Nothing needs you right now</div>
          <div className={styles.emptySubtitle}>Doses, appointments, an open check-in, or a ready Time Capsule will show up here.</div>
        </div>
      )}

      {checkIn && (
        <div className={styles.section} style={{ borderTop: "none", paddingTop: 0 }}>
          <div className={styles.sectionTitle}>Safety check-in</div>
          <div className={styles.item}>
            <div className={styles.itemRow}>
              <span className={styles.itemTitle}>
                {new Date(checkIn.dueAt).getTime() <= now.getTime() ? "Check-in is overdue" : "Checking in with you"}
              </span>
            </div>
            <span className={styles.itemMeta}>By {dateTimeLabel(checkIn.dueAt)}</span>
            <div className={styles.doseActions}>
              <button
                type="button"
                className={styles.doseButton}
                onClick={async () => {
                  await resolveSafetyCheckIn(checkIn.id);
                  await refreshCheckIn();
                }}
              >
                I&apos;m okay
              </button>
              <Link href="/settings/safety-checkins" className={styles.linkButton}>
                Open
              </Link>
            </div>
          </div>
        </div>
      )}

      {readyCapsules.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Time Capsule ready</div>
          <div className={styles.list}>
            {readyCapsules.map((c) => (
              <Link key={c.id} href="/track/journal" className={styles.item}>
                <span className={styles.itemTitle}>{c.title || "You left yourself something"}</span>
                <span className={styles.itemMeta}>Ready to open</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {dueDoses.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Due today</div>
          <div className={styles.list}>
            {dueDoses.map((d) => (
              <Link key={d.id} href="/track/medication" className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{d.title}</span>
                  <span className={styles.itemMeta}>{d.overdue ? "Overdue" : d.meta}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcomingAppts.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Coming up</div>
          <div className={styles.list}>
            {upcomingAppts.map((a) => (
              <Link key={a.id} href="/calendar" className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{a.title}</span>
                  <span className={styles.itemMeta}>{dateTimeLabel(a.appointmentAt)}</span>
                </div>
                {a.location && <span className={styles.itemMeta}>{a.location}</span>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
