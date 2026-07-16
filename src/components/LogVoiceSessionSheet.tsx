"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { db, addVoiceSession } from "@/lib/db";

export default function LogVoiceSessionSheet({
  goalId,
  onClose,
}: {
  goalId?: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const goals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goalId ?? null);
  const [sessionDuration, setSessionDuration] = useState("");
  const [comfortRating, setComfortRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (goals === undefined) return null;

  const activeGoalId = selectedGoalId ?? goals[0]?.id ?? null;

  async function save() {
    if (!activeGoalId) return;
    setSaving(true);
    await addVoiceSession({
      goalId: activeGoalId,
      sessionDuration: sessionDuration.trim() || null,
      comfortRating,
      note: note.trim() || null,
    });
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
        aria-labelledby="voice-session-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="voice-session-sheet-title" className={styles.title}>
          Log a practice session
        </h2>

        {goals.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Add a practice goal first, then you can log sessions against it.
          </p>
        ) : (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Which goal?</span>
              <div className={styles.chipRow}>
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`${styles.chip} ${activeGoalId === g.id ? styles.selected : ""}`}
                    onClick={() => setSelectedGoalId(g.id)}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>How long did you practice? (optional)</span>
              <input
                className={styles.input}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="e.g. 10 minutes"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Comfort (optional)</span>
              <div className={styles.chipRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.chip} ${comfortRating === n ? styles.selected : ""}`}
                    onClick={() => setComfortRating(comfortRating === n ? null : n)}
                    style={{ minWidth: 40, justifyContent: "center" }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Note (optional)</span>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Whatever's useful to remember"
              />
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!activeGoalId || saving}
            onClick={save}
          >
            Save session
          </button>
        </div>
      </div>
    </div>
  );
}
