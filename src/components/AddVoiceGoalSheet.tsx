"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addVoiceGoal, updateVoiceGoal, type VoiceGoal, type VoicePracticeCategory } from "@/lib/db";

const CATEGORIES: { key: VoicePracticeCategory; label: string }[] = [
  { key: "pitch", label: "Pitch" },
  { key: "resonance", label: "Resonance" },
  { key: "breathing", label: "Breathing" },
  { key: "articulation", label: "Articulation" },
  { key: "projection", label: "Projection" },
  { key: "confidence", label: "Confidence" },
];

export default function AddVoiceGoalSheet({
  goal,
  onClose,
}: {
  goal?: VoiceGoal | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [title, setTitle] = useState(goal?.title ?? "");
  const [category, setCategory] = useState<VoicePracticeCategory>(goal?.category ?? "pitch");
  const [targetFrequency, setTargetFrequency] = useState(goal?.targetFrequency ?? "");
  const [targetDuration, setTargetDuration] = useState(goal?.targetDuration ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const input = {
      title: title.trim(),
      category,
      targetFrequency: targetFrequency.trim() || null,
      targetDuration: targetDuration.trim() || null,
    };
    if (goal) await updateVoiceGoal(goal.id, input);
    else await addVoiceGoal(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-goal-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="voice-goal-sheet-title" className={styles.title}>
          {goal ? "Edit practice goal" : "Add a practice goal"}
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: -8 }}>
          This is just for your own practice. There&apos;s no score and no
          reference voice to match.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Goal title</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Whatever you're working towards"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Practice category</span>
          <div className={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`${styles.chip} ${category === c.key ? styles.selected : ""}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Target frequency (optional)</span>
          <input
            className={styles.input}
            value={targetFrequency}
            onChange={(e) => setTargetFrequency(e.target.value)}
            placeholder="e.g. 3 times a week"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Target session length (optional)</span>
          <input
            className={styles.input}
            value={targetDuration}
            onChange={(e) => setTargetDuration(e.target.value)}
            placeholder="e.g. 15 minutes"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!title.trim() || saving}
            onClick={save}
          >
            {goal ? "Save changes" : "Add goal"}
          </button>
        </div>
      </div>
    </div>
  );
}
