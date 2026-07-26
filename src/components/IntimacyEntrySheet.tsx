"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import {
  addIntimacyEntry,
  updateIntimacyEntry,
  type IntimacyDatePrecision,
  type IntimacyEntry,
  type IntimacyFeeling,
} from "@/lib/db";

const FEELINGS: { key: IntimacyFeeling; label: string }[] = [
  { key: "good", label: "Good" },
  { key: "mixed", label: "Mixed" },
  { key: "unsure", label: "Unsure" },
  { key: "not-good", label: "Not good" },
];

const QUICK_LABELS = ["Intimate time", "Solo time", "Date night", "Something else"];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function IntimacyEntrySheet({ entry, onClose }: { entry?: IntimacyEntry | null; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [date, setDate] = useState(entry?.date ?? today());
  const [time, setTime] = useState(entry?.time ?? "");
  const [datePrecision, setDatePrecision] = useState<IntimacyDatePrecision>(entry?.datePrecision ?? "exact");
  const [label, setLabel] = useState(entry?.label ?? "");
  const [tags, setTags] = useState(entry?.tags.join(", ") ?? "");
  const [protectionNote, setProtectionNote] = useState(entry?.protectionNote ?? "");
  const [feeling, setFeeling] = useState<IntimacyFeeling | null>(entry?.feeling ?? null);
  const [aftercareNote, setAftercareNote] = useState(entry?.aftercareNote ?? "");
  const [privateNote, setPrivateNote] = useState(entry?.privateNote ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!date) return;
    setSaving(true);
    const input = {
      date,
      time: datePrecision === "exact" ? time || null : null,
      datePrecision,
      label: label.trim() || null,
      tags: tags.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
      protectionNote: protectionNote.trim() || null,
      feeling,
      aftercareNote: aftercareNote.trim() || null,
      privateNote: privateNote.trim() || null,
    };
    if (entry) await updateIntimacyEntry(entry.id, input);
    else await addIntimacyEntry(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="intimacy-entry-title">
        <div className={styles.grabber} />
        <h2 id="intimacy-entry-title" className={styles.title}>{entry ? "Edit private entry" : "Add a private entry"}</h2>
        <p className={styles.helpText}>Use as much or as little as you want. Nothing here is shared, counted or shown in a notification.</p>

        <div className={styles.field}>
          <span className={styles.label}>When</span>
          <div className={styles.chipRow}>
            <button type="button" className={`${styles.chip} ${datePrecision === "exact" ? styles.selected : ""}`} onClick={() => setDatePrecision("exact")}>Exact date</button>
            <button type="button" className={`${styles.chip} ${datePrecision === "approximate" ? styles.selected : ""}`} onClick={() => setDatePrecision("approximate")}>Around this date</button>
          </div>
          <input className={styles.input} type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          {datePrecision === "exact" && <input className={styles.input} type="time" value={time} onChange={(event) => setTime(event.target.value)} aria-label="Time, optional" />}
        </div>

        <label className={styles.field}>
          <span className={styles.label}>What would you call it? (optional)</span>
          <input className={styles.input} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Your own words" />
          <div className={styles.chipRow}>{QUICK_LABELS.map((quick) => <button key={quick} type="button" className={`${styles.chip} ${label === quick ? styles.selected : ""}`} onClick={() => setLabel(quick)}>{quick}</button>)}</div>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Private tags (optional)</span>
          <input className={styles.input} value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g. aftercare, connection" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Protection or practical note (optional)</span>
          <textarea className={styles.textarea} value={protectionNote} onChange={(event) => setProtectionNote(event.target.value)} placeholder="Anything useful to remember" />
        </label>

        <div className={styles.field}>
          <span className={styles.label}>How did it feel? (optional)</span>
          <div className={styles.chipRow}>
            {FEELINGS.map((option) => <button key={option.key} type="button" className={`${styles.chip} ${feeling === option.key ? styles.selected : ""}`} onClick={() => setFeeling(feeling === option.key ? null : option.key)}>{option.label}</button>)}
          </div>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>Aftercare note (optional)</span>
          <textarea className={styles.textarea} value={aftercareNote} onChange={(event) => setAftercareNote(event.target.value)} placeholder="What helped, or what you want to remember" />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Private note (optional)</span>
          <textarea className={styles.textarea} value={privateNote} onChange={(event) => setPrivateNote(event.target.value)} placeholder="Anything else, just for you" />
        </label>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={!date || saving} onClick={() => void save()}>{entry ? "Save changes" : "Keep private entry"}</button>
        </div>
      </div>
    </div>
  );
}
