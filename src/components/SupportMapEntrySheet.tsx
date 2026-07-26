"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import {
  addSupportMapEntry,
  updateSupportMapEntry,
  type SupportMapEntry,
  type SupportMapEntryType,
  type SupportMapLabel,
} from "@/lib/db";

const TYPES: { key: SupportMapEntryType; label: string }[] = [
  { key: "person", label: "Person" },
  { key: "clinic", label: "Clinic" },
  { key: "organisation", label: "Organisation" },
  { key: "community", label: "Community" },
  { key: "place", label: "Place" },
  { key: "other", label: "Other" },
];

const LABELS: { key: SupportMapLabel; label: string }[] = [
  { key: "affirming", label: "Affirming" },
  { key: "unknown", label: "Unknown" },
  { key: "avoid", label: "Avoid" },
  { key: "emergency", label: "Emergency contact" },
  { key: "practical", label: "Practical support" },
  { key: "emotional", label: "Emotional support" },
  { key: "medical", label: "Medical support" },
  { key: "legal", label: "Legal support" },
];

export default function SupportMapEntrySheet({
  entry,
  onClose,
}: {
  entry?: SupportMapEntry | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [name, setName] = useState(entry?.name ?? "");
  const [type, setType] = useState<SupportMapEntryType>(entry?.type ?? "person");
  const [labels, setLabels] = useState<SupportMapLabel[]>(entry?.labels ?? []);
  const [contact, setContact] = useState(entry?.contact ?? "");
  const [area, setArea] = useState(entry?.area ?? "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [reviewOn, setReviewOn] = useState(entry?.reviewOn ?? "");
  const [isFavourite, setIsFavourite] = useState(entry?.isFavourite ?? false);
  const [saving, setSaving] = useState(false);

  function toggleLabel(label: SupportMapLabel) {
    setLabels((current) => current.includes(label) ? current.filter((item) => item !== label) : [...current, label]);
  }

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    const input = {
      name: trimmedName,
      type,
      labels,
      contact: contact.trim() || null,
      area: area.trim() || null,
      note: note.trim() || null,
      reviewOn: reviewOn || null,
      isFavourite,
    };
    if (entry) await updateSupportMapEntry(entry.id, input);
    else await addSupportMapEntry(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="support-map-sheet-title">
        <div className={styles.grabber} />
        <h2 id="support-map-sheet-title" className={styles.title}>{entry ? "Edit support" : "Add support"}</h2>

        <label className={styles.field}>
          <span className={styles.label}>Name</span>
          <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Their name, a place or organisation" autoFocus />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>What is this?</span>
          <div className={styles.chipRow}>
            {TYPES.map((option) => <button key={option.key} type="button" className={`${styles.chip} ${type === option.key ? styles.selected : ""}`} onClick={() => setType(option.key)}>{option.label}</button>)}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Private labels</span>
          <div className={styles.chipRow}>
            {LABELS.map((option) => <button key={option.key} type="button" className={`${styles.chip} ${labels.includes(option.key) ? styles.selected : ""}`} onClick={() => toggleLabel(option.key)}>{option.label}</button>)}
          </div>
          <span className={styles.fieldHint}>These are only for you. They never become public ratings.</span>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Contact or website (optional)</span>
          <input className={styles.input} value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Phone, email or website" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>General area (optional)</span>
          <input className={styles.input} value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. South London or near work" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Private notes (optional)</span>
          <textarea className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything you want to remember" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Review on (optional)</span>
          <input className={styles.input} type="date" value={reviewOn} onChange={(event) => setReviewOn(event.target.value)} />
          <span className={styles.fieldHint}>A quiet prompt inside this list, not a notification.</span>
        </label>

        <label className={styles.field} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={isFavourite} onChange={(event) => setIsFavourite(event.target.checked)} />
          <span className={styles.label}>Keep near the top</span>
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!name.trim() || saving} onClick={() => void save()}>
            {entry ? "Save changes" : "Add to my support map"}
          </button>
        </div>
      </div>
    </div>
  );
}
