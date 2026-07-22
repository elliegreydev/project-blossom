"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addJournalEntry, updateJournalEntry, type JournalEntry } from "@/lib/db";

export default function JournalSheet({ entry, onClose }: { entry?: JournalEntry | null; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [body, setBody] = useState(entry?.bodyText ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!body.trim()) return;
    setSaving(true);
    if (entry) await updateJournalEntry(entry.id, body.trim());
    else await addJournalEntry(body.trim());
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="journal-sheet-title">
        <div className={styles.grabber} />
        <h2 id="journal-sheet-title" className={styles.title}>{entry ? "Edit journal entry" : "New journal entry"}</h2>
        <div className={styles.field}>
          <textarea
            aria-label="Journal entry"
            className={styles.textarea}
            style={{ minHeight: 160 }}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="This is just for you. Write as much or as little as you like."
            autoFocus
          />
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!body.trim() || saving}
            onClick={save}
          >
            {entry ? "Save changes" : "Save entry"}
          </button>
        </div>
      </div>
    </div>
  );
}
