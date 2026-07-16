"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { completeGoal } from "@/lib/db";

export default function CompleteGoalSheet({
  goalId,
  goalTitle,
  onClose,
}: {
  goalId: string;
  goalTitle: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [saving, setSaving] = useState(false);

  async function finish(asMilestone: boolean) {
    setSaving(true);
    await completeGoal(goalId, asMilestone);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="complete-goal-sheet-title">
        <div className={styles.grabber} />
        <h2 id="complete-goal-sheet-title" className={styles.title}>Nice work</h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          You&apos;ve completed &ldquo;{goalTitle}&rdquo;. Would you like to add it to your
          Journey as a milestone?
        </p>
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.tertiaryButton}
            disabled={saving}
            onClick={() => finish(false)}
          >
            Just complete it
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={saving}
            onClick={() => finish(true)}
          >
            Add as milestone
          </button>
        </div>
      </div>
    </div>
  );
}
