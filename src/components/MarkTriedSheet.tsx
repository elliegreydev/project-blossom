"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { updatePresentationEntry } from "@/lib/db";

export default function MarkTriedSheet({
  entryId,
  onClose,
}: {
  entryId: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [confidenceRating, setConfidenceRating] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await updatePresentationEntry(entryId, {
      wantToTry: false,
      date: new Date().toISOString().slice(0, 10),
      confidenceRating,
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
        aria-labelledby="mark-tried-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="mark-tried-sheet-title" className={styles.title}>
          How did it go?
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          This moves the entry into your log with today&apos;s date. A comfort
          rating is optional.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Comfort (optional)</span>
          <div className={styles.chipRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.chip} ${confidenceRating === n ? styles.selected : ""}`}
                onClick={() => setConfidenceRating(confidenceRating === n ? null : n)}
                style={{ minWidth: 40, justifyContent: "center" }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} disabled={saving} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => void save()}>
            Move to log
          </button>
        </div>
      </div>
    </div>
  );
}
