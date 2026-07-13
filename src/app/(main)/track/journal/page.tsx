"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import JournalSheet from "@/components/JournalSheet";
import CheckInSheet from "@/components/CheckInSheet";
import { db, type CheckIn } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./journal.module.css";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const SCALE_LABELS: [keyof CheckIn, string][] = [
  ["mood", "Mood"],
  ["energy", "Energy"],
  ["confidence", "Confidence"],
  ["stress", "Stress"],
  ["comfort", "Comfort"],
];

export default function JournalPage() {
  const [tab, setTab] = useState<"journal" | "checkins">("journal");
  const [journalOpen, setJournalOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);

  const entries = useLiveQuery(() => db.journalEntries.orderBy("createdAt").reverse().toArray(), []);
  const checkIns = useLiveQuery(() => db.checkIns.orderBy("createdAt").reverse().toArray(), []);

  if (entries === undefined || checkIns === undefined) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Journal & check-ins" backHref="/track" />

      <div className={local.segmented}>
        <button
          className={`${local.segment} ${tab === "journal" ? local.active : ""}`}
          onClick={() => setTab("journal")}
        >
          Journal
        </button>
        <button
          className={`${local.segment} ${tab === "checkins" ? local.active : ""}`}
          onClick={() => setTab("checkins")}
        >
          Check-ins
        </button>
      </div>

      {tab === "journal" ? (
        <div className={styles.section}>
          {entries.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>A private space</div>
              <div className={styles.emptySubtitle}>
                Nothing here but you. Write whenever you feel like it.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {entries.map((entry) => (
                <div key={entry.id} className={styles.item}>
                  <span className={styles.itemMeta}>{dateLabel(entry.createdAt)}</span>
                  <div className={styles.itemBody}>{entry.bodyText}</div>
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setJournalOpen(true)}>
            + New entry
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          {checkIns.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No check-ins yet</div>
              <div className={styles.emptySubtitle}>
                A quick, gentle way to note how you feel. No streaks, no pressure.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {checkIns.map((ci) => (
                <div key={ci.id} className={styles.item}>
                  <span className={styles.itemMeta}>{dateLabel(ci.createdAt)}</span>
                  <div className={local.checkInScales}>
                    {SCALE_LABELS.map(([key, label]) =>
                      ci[key] ? (
                        <span key={String(key)} className={local.scaleTag}>
                          {label} {ci[key] as number}/5
                        </span>
                      ) : null
                    )}
                  </div>
                  {ci.note && <div className={styles.itemBody}>{ci.note}</div>}
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setCheckInOpen(true)}>
            + New check-in
          </button>
        </div>
      )}

      {journalOpen && <JournalSheet onClose={() => setJournalOpen(false)} />}
      {checkInOpen && <CheckInSheet onClose={() => setCheckInOpen(false)} />}
    </div>
  );
}
