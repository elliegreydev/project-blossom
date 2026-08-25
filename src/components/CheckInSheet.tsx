"use client";

import { useState, type ReactNode } from "react";
import styles from "./Sheet.module.css";
import local from "./CheckInSheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addCheckIn, guessCheckInPeriod, updateCheckIn, type CheckIn, type CheckInPeriod } from "@/lib/db";
import { readDraft, writeDraft, clearDraft, draftKey } from "@/lib/drafts";

/* The faces run calm to anxious, not bad to good, and they are the same five
   words as the one-tap row on Home so a check-in means the same thing wherever
   it was made. Drawn rather than emoji: they take the theme's colour, which
   matters under Low Profile, and they don't change shape per platform. */
function Face({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      {children}
    </svg>
  );
}

function Eyes() {
  return (
    <>
      <circle cx="9.4" cy="10.3" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.6" cy="10.3" r="0.9" fill="currentColor" stroke="none" />
    </>
  );
}

const MOODS: { value: number; label: string; face: ReactNode }[] = [
  {
    value: 5,
    label: "Calm",
    face: (
      <Face>
        <path d="M8.3 10.9c.6-.8 1.5-.8 2.1 0" />
        <path d="M13.6 10.9c.6-.8 1.5-.8 2.1 0" />
        <path d="M8.6 14.2c1.9 1.7 4.9 1.7 6.8 0" />
      </Face>
    ),
  },
  {
    value: 4,
    label: "Good",
    face: (
      <Face>
        <Eyes />
        <path d="M8.8 14.3c1.8 1.5 4.6 1.5 6.4 0" />
      </Face>
    ),
  },
  {
    value: 3,
    label: "Okay",
    face: (
      <Face>
        <Eyes />
        <path d="M9.2 14.9h5.6" />
      </Face>
    ),
  },
  {
    value: 2,
    label: "Not great",
    face: (
      <Face>
        <Eyes />
        <path d="M8.8 15.6c1.8-1.5 4.6-1.5 6.4 0" />
      </Face>
    ),
  },
  {
    value: 1,
    label: "Anxious",
    face: (
      <Face>
        <Eyes />
        <path d="M8.85 15c.5-1.1 1.6-1.1 2.1 0s1.6 1.1 2.1 0 1.6-1.1 2.1 0" />
      </Face>
    ),
  },
];

/* Every scale is worded so 5 means more of the thing named, which is how the
   journal already reads them back ("Stress 4/5"). The hints exist because a
   bare 1 to 5 asks somebody to invent their own meaning every time. */
const SCALES: { key: "energy" | "confidence" | "stress" | "comfort"; label: string; hint: string }[] = [
  { key: "energy", label: "Energy", hint: "running low to plenty" },
  { key: "confidence", label: "Confidence", hint: "shaky to steady" },
  { key: "stress", label: "Stress", hint: "settled to wound up" },
  { key: "comfort", label: "Comfort", hint: "uneasy to at ease" },
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
        <div className={local.header}>
          <span className={local.eyebrow}>Check-in</span>
          <h2 id="checkin-sheet-title" className={local.title}>{entry ? "Edit check-in" : "How are you today?"}</h2>
          <p className={local.subtitle}>
            Every part is optional. Fill in only what feels right, and tap a face or a number twice to clear it.
          </p>
        </div>

        <div className={local.group} role="group" aria-label="Mood">
          <div className={local.scaleHead}>
            <span className={local.scaleName}>Mood</span>
            <span className={local.scaleHint}>calm to anxious</span>
          </div>
          <div className={local.moods}>
            {MOODS.map((mood) => (
              <button
                key={mood.value}
                type="button"
                aria-pressed={values.mood === mood.value}
                className={`${local.mood} ${values.mood === mood.value ? local.selected : ""}`}
                onClick={() => setValue("mood", mood.value)}
              >
                {mood.face}
                <span className={local.moodLabel}>{mood.label}</span>
              </button>
            ))}
          </div>
        </div>

        {SCALES.map((scale) => (
          <div key={scale.key} className={local.group} role="group" aria-label={scale.label}>
            <div className={local.scaleHead}>
              <span className={local.scaleName}>{scale.label}</span>
              <span className={local.scaleHint}>{scale.hint}</span>
            </div>
            <div className={local.steps}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={values[scale.key] === n}
                  aria-label={`${scale.label} ${n} of 5`}
                  className={`${local.step} ${values[scale.key] === n ? local.selected : ""}`}
                  onClick={() => setValue(scale.key, n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={local.group} role="group" aria-label="When">
          <span className={local.scaleName}>When</span>
          <div className={local.whenRow}>
            {(["morning", "evening", null] as const).map((option) => (
              <button
                key={option ?? "anytime"}
                type="button"
                aria-pressed={period === option}
                className={`${local.when} ${period === option ? local.selected : ""}`}
                onClick={() => setPeriod(option)}
              >
                {option === "morning" ? "Morning" : option === "evening" ? "Evening" : "Anytime"}
              </button>
            ))}
          </div>
        </div>

        <div className={local.group}>
          <span className={local.scaleName}>Note (optional)</span>
          {noteRestored && <p className={local.draftNote}>Your note from last time is still here.</p>}
          <textarea
            aria-label="Check-in note"
            className={`${styles.textarea} ${local.note}`}
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
