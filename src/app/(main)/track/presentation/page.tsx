"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddPresentationEntrySheet from "@/components/AddPresentationEntrySheet";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { db, deletePresentationEntry, type PresentationCategory } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./presentation.module.css";

const CATEGORY_LABELS: Record<PresentationCategory, string> = {
  outfit: "Outfit",
  hair: "Hair",
  makeup: "Makeup",
  clothing: "Clothing",
  grooming: "Grooming",
  experiment: "Experiment",
};

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PresentationPage() {
  const [tab, setTab] = useState<"log" | "wantToTry">("log");
  const [sheetOpen, setSheetOpen] = useState(false);

  const entries = useLiveQuery(() => db.presentationEntries.orderBy("date").reverse().toArray(), []);

  if (entries === undefined) return null;

  const logged = entries.filter((e) => !e.wantToTry);
  const wantToTry = entries.filter((e) => e.wantToTry);
  const visible = tab === "log" ? logged : wantToTry;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Presentation" backHref="/track" />

      <div className={local.segmented}>
        <button
          className={`${local.segment} ${tab === "log" ? local.active : ""}`}
          onClick={() => setTab("log")}
        >
          Log
        </button>
        <button
          className={`${local.segment} ${tab === "wantToTry" ? local.active : ""}`}
          onClick={() => setTab("wantToTry")}
        >
          Want to try
        </button>
      </div>

      <div className={styles.section}>
        {visible.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>
              {tab === "log" ? "Nothing logged yet" : "Nothing on your list yet"}
            </div>
            <div className={styles.emptySubtitle}>
              {tab === "log"
                ? "Notice what felt comfortable, at whatever pace suits you."
                : "A place to save outfit, hair, or makeup ideas for later. No pressure to act on any of it."}
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {visible.map((entry) => (
              <div key={entry.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={local.categoryTag}>{CATEGORY_LABELS[entry.category]}</span>
                  <button className={styles.linkButton} onClick={() => deletePresentationEntry(entry.id)}>
                    Remove
                  </button>
                </div>
                {entry.photo && (
                  <div className={local.photoWrap}>
                    <PhotoThumbnail photo={entry.photo} alt={CATEGORY_LABELS[entry.category]} />
                  </div>
                )}
                <span className={styles.itemMeta}>
                  {dateLabel(entry.date)}
                  {entry.confidenceRating ? ` · Comfort ${entry.confidenceRating}/5` : ""}
                </span>
                {entry.note && <div className={styles.itemBody}>{entry.note}</div>}
              </div>
            ))}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + {tab === "log" ? "Add entry" : "Add to want-to-try list"}
        </button>
      </div>

      {sheetOpen && (
        <AddPresentationEntrySheet defaultWantToTry={tab === "wantToTry"} onClose={() => setSheetOpen(false)} />
      )}
    </div>
  );
}
