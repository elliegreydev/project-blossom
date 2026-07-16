"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addPrivateLink } from "@/lib/db";

export default function AddPrivateLinkSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    await addPrivateLink({ label: label.trim(), url: url.trim(), note: note.trim() || null });
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
        aria-labelledby="private-link-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="private-link-sheet-title" className={styles.title}>
          Save a link
        </h2>

        <div className={styles.field}>
          <span className={styles.label}>Label</span>
          <input
            className={styles.input}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="What is it?"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Link</span>
          <input
            className={styles.input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <input
            className={styles.input}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!label.trim() || !url.trim() || saving}
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
