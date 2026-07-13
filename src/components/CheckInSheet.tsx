"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { addCheckIn } from "@/lib/db";

const SCALES: { key: "mood" | "energy" | "confidence" | "stress" | "comfort"; label: string }[] = [
  { key: "mood", label: "Mood" },
  { key: "energy", label: "Energy" },
  { key: "confidence", label: "Confidence" },
  { key: "stress", label: "Stress" },
  { key: "comfort", label: "Comfort" },
];

export default function CheckInSheet({ onClose }: { onClose: () => void }) {
  const [values, setValues] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  function setValue(key: string, v: number) {
    setValues((prev) => ({ ...prev, [key]: prev[key] === v ? 0 : v }));
  }

  async function save() {
    setSaving(true);
    await addCheckIn({
      mood: values.mood || null,
      energy: values.energy || null,
      confidence: values.confidence || null,
      stress: values.stress || null,
      comfort: values.comfort || null,
      note: note.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  const hasAny = Object.values(values).some((v) => v > 0) || note.trim().length > 0;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>How are you today?</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: -6 }}>
          Every part is optional. Fill in only what feels right.
        </p>

        {SCALES.map((scale) => (
          <div key={scale.key} className={styles.field}>
            <span className={styles.label}>{scale.label}</span>
            <div className={styles.chipRow}>
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
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
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
            Save check-in
          </button>
        </div>
      </div>
    </div>
  );
}
