"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import SupportMapEntrySheet from "@/components/SupportMapEntrySheet";
import {
  db,
  deleteSupportMapEntry,
  updateSupportMapEntry,
  type SupportMapEntry,
  type SupportMapEntryType,
  type SupportMapLabel,
} from "@/lib/db";
import feature from "@/components/feature.module.css";
import styles from "./support-map.module.css";

const TYPES: { key: "all" | SupportMapEntryType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "person", label: "People" },
  { key: "clinic", label: "Healthcare" },
  { key: "organisation", label: "Organisations" },
  { key: "community", label: "Community" },
  { key: "place", label: "Places" },
];

const QUICK_LABELS: { key: "all" | SupportMapLabel; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "affirming", label: "Affirming" },
  { key: "emergency", label: "Emergency" },
  { key: "medical", label: "Medical" },
  { key: "avoid", label: "Avoid" },
];

const TYPE_LABELS: Record<SupportMapEntryType, string> = {
  person: "Person",
  clinic: "Clinic",
  organisation: "Organisation",
  community: "Community",
  place: "Place",
  other: "Other",
};

const LABELS: Record<SupportMapLabel, string> = {
  affirming: "Affirming",
  unknown: "Unknown",
  avoid: "Avoid",
  emergency: "Emergency contact",
  practical: "Practical support",
  emotional: "Emotional support",
  medical: "Medical support",
  legal: "Legal support",
};

function reviewLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function PersonalSupportMapPage() {
  const entries = useLiveQuery(() => db.supportMapEntries.orderBy("updatedAt").reverse().toArray(), []);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | SupportMapEntryType>("all");
  const [label, setLabel] = useState<"all" | SupportMapLabel>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SupportMapEntry | null>(null);

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return [...(entries ?? [])]
      .filter((entry) => type === "all" || entry.type === type)
      .filter((entry) => label === "all" || entry.labels.includes(label))
      .filter((entry) => !query || [entry.name, entry.contact, entry.area, entry.note, entry.labels.join(" ")].filter(Boolean).join(" ").toLocaleLowerCase().includes(query))
      .sort((first, second) => Number(second.isFavourite) - Number(first.isFavourite) || second.updatedAt.localeCompare(first.updatedAt));
  }, [entries, label, search, type]);

  if (entries === undefined) return null;
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className={feature.screen}>
      <ScreenHeader title="Personal Support Map" backHref="/settings" />
      <p className={feature.pageSubtitle} style={{ marginTop: -10 }}>
        A private place for people, places and organisations that matter to you. It stays only on this device.
      </p>

      <div className={styles.privacyNote}>
        No live map, precise location, public ratings or automatic sharing. You decide what belongs here.
      </div>

      <div className={styles.controls}>
        <input className={styles.search} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your support map" aria-label="Search your support map" />
        <div className={styles.filterGroup} aria-label="Filter by type">
          {TYPES.map((option) => <button key={option.key} type="button" className={`${styles.filter} ${type === option.key ? styles.active : ""}`} onClick={() => setType(option.key)}>{option.label}</button>)}
        </div>
        <div className={styles.filterGroup} aria-label="Filter by private label">
          {QUICK_LABELS.map((option) => <button key={option.key} type="button" className={`${styles.filter} ${label === option.key ? styles.active : ""}`} onClick={() => setLabel(option.key)}>{option.label}</button>)}
        </div>
      </div>

      <div className={feature.section}>
        {entries.length === 0 ? (
          <div className={feature.empty}>
            <div className={feature.emptyTitle}>Nothing here yet</div>
            <div className={feature.emptySubtitle}>Add someone, somewhere or an organisation whenever it could make life a little easier.</div>
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className={feature.empty}>
            <div className={feature.emptyTitle}>Nothing matches that</div>
            <div className={feature.emptySubtitle}>Try another search or clear a filter.</div>
          </div>
        ) : (
          <div className={feature.list}>
            {visibleEntries.map((entry) => {
              const reviewDue = entry.reviewOn !== null && entry.reviewOn <= today;
              return (
                <article key={entry.id} className={`${feature.item} ${styles.entry}`}>
                  <div className={feature.itemRow}>
                    <button type="button" className={styles.entryButton} onClick={() => setEditing(entry)}>
                      <span className={feature.itemTitle}>{entry.name}</span>
                      <span className={feature.itemMeta}>{TYPE_LABELS[entry.type]}{entry.area ? ` · ${entry.area}` : ""}</span>
                    </button>
                    <button type="button" className={styles.favourite} aria-label={entry.isFavourite ? `Remove ${entry.name} from favourites` : `Keep ${entry.name} near the top`} onClick={() => void updateSupportMapEntry(entry.id, { isFavourite: !entry.isFavourite })}>
                      {entry.isFavourite ? "★" : "☆"}
                    </button>
                  </div>
                  {entry.labels.length > 0 && <div className={styles.pills}>{entry.labels.map((item) => <span key={item} className={`${styles.pill} ${item === "avoid" ? styles.avoid : ""}`}>{LABELS[item]}</span>)}</div>}
                  {entry.note && <p className={feature.itemBody}>{entry.note}</p>}
                  {entry.contact && <span className={feature.itemMeta}>{entry.contact}</span>}
                  {entry.reviewOn && <span className={`${styles.review} ${reviewDue ? styles.reviewDue : ""}`}>{reviewDue ? "Review due" : "Review"} {reviewLabel(entry.reviewOn)}</span>}
                  <div className={styles.entryActions}>
                    <button type="button" className={feature.linkButton} onClick={() => setEditing(entry)}>Edit</button>
                    <button type="button" className={feature.linkButton} onClick={() => void deleteSupportMapEntry(entry.id)}>Remove</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <button type="button" className={feature.addButton} onClick={() => setSheetOpen(true)}>+ Add support</button>
      </div>

      {(sheetOpen || editing) && <SupportMapEntrySheet entry={editing} onClose={() => { setSheetOpen(false); setEditing(null); }} />}
    </div>
  );
}
