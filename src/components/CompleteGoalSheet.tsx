"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
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
  const [saving, setSaving] = useState(false);

  async function finish(asMilestone: boolean) {
    setSaving(true);
    await completeGoal(goalId, asMilestone);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>Nice work</h2>
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
