"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addCheckIn, guessCheckInPeriod, updateCheckIn, type CheckIn, type CheckInPeriod } from "@/lib/db";
import { readDraft, writeDraft, clearDraft, draftKey } from "@/lib/drafts";

const SCALES: { key: "mood" | "energy" | "confidence" | "stress" | "comfort"; label: string }[] = [
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "confidence", label: "Confidence" },
  { key: "stress", label: "Stress" },
  { key: "comfort", label: "Comfort" },
];

export default function CheckInSheet({ entry, onClose }: { entry?: CheckIn | null; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [values, setValues] = useState<Record<string, number>>(() => ({
    mood: entry?.mood ?? 0,
    energy: entry?.energy ?? 0,
    confidence: entry?.confidence ?? 0,
    stress: entry?.stress ?? 0,
    comfort: entry?.comfort ?? 0,
  }));
  const noteKey = draftKey("checkin", entry?.id);
  const savedNote = entry?.note ?? "";
  // The scales are one tap each and cheap to redo; the note is the part that
  // takes effort, so it's the part worth keeping. See src/lib/drafts.ts.
  const [note, setNote] = useState(() => readDraft(noteKey) ?? savedNote);
  const [noteRestored] = useState(() => readDraft(noteKey) !== null);

  function editNote(value: string) {
    setNote(value);
    if (value !== savedNote) writeDraft(noteKey, value);
    else clearDraft(noteKey);
  }
  const [period, setPeriod] = useState<CheckInPeriod | null>(entry ? entry.period ?? null : guessCheckInPeriod());
  const [saving, setSaving] = useState(false);

  function setValue(key: string, v: number) {
    setValues((prev) => ({ ...prev, [key]: prev[key] === v ? 0 : v }));
  }

  async function save() {
    setSaving(true);
    const input = {
      mood: values.mood || null,
      energy: values.energy || null,
      confidence: values.confidence || null,
      stress: values.stress || null,
      comfort: values.comfort || null,
      note: note.trim() || null,
      period,
    };
    if (entry) await updateCheckIn(entry.id, input);
    else await addCheckIn(input);
    clearDraft(noteKey);
    setSaving(false);
    onClose();
  }

  const hasAny = Object.values(values).some((v) => v > 0) || note.trim().length > 0;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="checkin-sheet-title">
        <div className={styles.grabber} />
        <h2 id="checkin-sheet-title" className={styles.title}>{entry ? "Edit check-in" : "How are you today?"}</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -6 }}>
          Every part is optional. Fill in only what feels right.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>When</span>
          <div className={styles.chipRow} role="group" aria-label="When">
            {(["morning", "evening", null] as const).map((option) => (
              <button
                key={option ?? "anytime"}
                type="button"
                className={`${styles.chip} ${period === option ? styles.selected : ""}`}
                onClick={() => setPeriod(option)}
              >
                {option === "morning" ? "Morning" : option === "evening" ? "Evening" : "Anytime"}
              </button>
            ))}
          </div>
        </div>

        {SCALES.map((scale) => (
          <div key={scale.key} className={styles.field}>
            <span className={styles.label}>{scale.label}</span>
            <div className={styles.chipRow} role="group" aria-label={scale.label}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`${styles.chip} ${values[scale.key] === n ? styles.selected : ""}`}
                  onClick={() => setValue(scale.key, n)}
                  style={{ minWidth: 40, justifyContent: "center" }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          {noteRestored && <p className={styles.draftNote}>Your note from last time is still here.</p>}
          <textarea
            aria-label="Check-in note"
            className={styles.textarea}
            value={note}
            onChange={(e) => editNote(e.target.value)}
            placeholder="Anything you'd like to remember about today"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!hasAny || saving}
            onClick={save}
          >
            {entry ? "Save changes" : "Save check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}
