"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddPresentationEntrySheet from "@/components/AddPresentationEntrySheet";
import MarkTriedSheet from "@/components/MarkTriedSheet";
import PhotoThumbnail from "@/components/PhotoThumbnail";
import { db, deletePresentationEntry, type PresentationCategory, type PresentationEntry } from "@/lib/db";
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
  const [tab, setTab] = useState<"log" | "wantToTry" | "byCategory">("log");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PresentationEntry | null>(null);
  const [tryingEntry, setTryingEntry] = useState<PresentationEntry | null>(null);

  const entries = useLiveQuery(() => db.presentationEntries.orderBy("date").reverse().toArray(), []);

  if (entries === undefined) return null;

  const logged = entries.filter((e) => !e.wantToTry);
  const wantToTry = entries.filter((e) => e.wantToTry);
  const visible = tab === "log" ? logged : tab === "wantToTry" ? wantToTry : [];

  const byCategory = new Map<PresentationCategory, PresentationEntry[]>();
  for (const entry of logged) {
    const list = byCategory.get(entry.category) ?? [];
    list.push(entry);
    byCategory.set(entry.category, list);
  }
  const categoryGroups = [...byCategory.entries()]
    .map(([category, items]) => ({
      category,
      items: items.sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => (b.items[0]?.date ?? "").localeCompare(a.items[0]?.date ?? ""));

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
        <button
          className={`${local.segment} ${tab === "byCategory" ? local.active : ""}`}
          onClick={() => setTab("byCategory")}
        >
          By category
        </button>
      </div>

      {tab === "byCategory" ? (
        <div className={styles.section}>
          {categoryGroups.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Nothing logged yet</div>
              <div className={styles.emptySubtitle}>
                Once you&apos;ve logged a few entries, they&apos;ll show up here grouped
                by category so you can see how comfort has shifted over time.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {categoryGroups.map((group) => (
                <div key={group.category} className={styles.item}>
                  <div className={styles.itemTitle}>{CATEGORY_LABELS[group.category]}</div>
                  <div className={local.byCategoryGroup}>
                    {group.items.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={styles.itemButton}
                        onClick={() => setEditingEntry(entry)}
                      >
                        <div className={local.byCategoryRow}>
                          <span className={styles.itemMeta}>{dateLabel(entry.date)}</span>
                          <span>{entry.confidenceRating ? `Comfort ${entry.confidenceRating}/5` : "—"}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
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
                  <button type="button" className={styles.itemButton} onClick={() => setEditingEntry(entry)}>
                    <span className={local.categoryTag}>{CATEGORY_LABELS[entry.category]}</span>
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
                  </button>
                  <div className={styles.doseActions}>
                    {tab === "wantToTry" && (
                      <button type="button" className={styles.doseButton} onClick={() => setTryingEntry(entry)}>
                        Tried it
                      </button>
                    )}
                    <button className={styles.linkButton} onClick={() => deletePresentationEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
            + {tab === "log" ? "Add entry" : "Add to want-to-try list"}
          </button>
        </div>
      )}

      {(sheetOpen || editingEntry) && (
        <AddPresentationEntrySheet
          entry={editingEntry}
          defaultWantToTry={tab === "wantToTry"}
          onClose={() => {
            setSheetOpen(false);
            setEditingEntry(null);
          }}
        />
      )}
      {tryingEntry && <MarkTriedSheet entryId={tryingEntry.id} onClose={() => setTryingEntry(null)} />}
    </div>
  );
}
