"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import PhotoThumbnail from "./PhotoThumbnail";
import { addPresentationEntry, updatePresentationEntry, type PresentationCategory, type PresentationEntry } from "@/lib/db";

const CATEGORIES: { key: PresentationCategory; label: string }[] = [
  { key: "outfit", label: "Outfit" },
  { key: "hair", label: "Hair" },
  { key: "makeup", label: "Makeup" },
  { key: "clothing", label: "Clothing" },
  { key: "grooming", label: "Grooming" },
  { key: "experiment", label: "Experiment" },
];

export default function AddPresentationEntrySheet({
  entry,
  defaultWantToTry = false,
  onClose,
}: {
  entry?: PresentationEntry | null;
  defaultWantToTry?: boolean;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [category, setCategory] = useState<PresentationCategory>(entry?.category ?? "outfit");
  const [note, setNote] = useState(entry?.note ?? "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState<number | null>(entry?.confidenceRating ?? null);
  const [wantToTry, setWantToTry] = useState(entry?.wantToTry ?? defaultWantToTry);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (entry) {
      const patch: Partial<PresentationEntry> = { category, note: note.trim() || null, confidenceRating, wantToTry };
      if (photo) patch.photo = photo;
      else if (removePhoto) patch.photo = null;
      await updatePresentationEntry(entry.id, patch);
    } else {
      await addPresentationEntry({
        date: new Date().toISOString().slice(0, 10),
        category,
        note: note.trim() || null,
        photo,
        confidenceRating,
        wantToTry,
      });
    }
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
        aria-labelledby="presentation-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="presentation-sheet-title" className={styles.title}>
          {entry ? "Edit entry" : wantToTry ? "Add something to try" : "Add an entry"}
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, marginTop: -8 }}>
          Any photo you add stays only on this device. It&apos;s never uploaded,
          synced, or used to train anything.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>This is about</span>
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
          <span className={styles.label}>Is this something you tried, or want to try?</span>
          <div className={styles.chipRow}>
            <button
              type="button"
              className={`${styles.chip} ${!wantToTry ? styles.selected : ""}`}
              onClick={() => setWantToTry(false)}
            >
              I tried this
            </button>
            <button
              type="button"
              className={`${styles.chip} ${wantToTry ? styles.selected : ""}`}
              onClick={() => setWantToTry(true)}
            >
              Want to try
            </button>
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Photo (optional)</span>
          {entry?.photo && !removePhoto && !photo && (
            <div style={{ maxWidth: 220 }}>
              <PhotoThumbnail photo={entry.photo} alt={CATEGORIES.find((c) => c.key === category)?.label ?? "Photo"} />
              <button
                type="button"
                className={styles.tertiaryButton}
                style={{ padding: "6px 0" }}
                onClick={() => setRemovePhoto(true)}
              >
                Remove photo
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className={styles.input}
            onChange={(e) => {
              setPhoto(e.target.files?.[0] ?? null);
              setRemovePhoto(false);
            }}
          />
        </div>

        {!wantToTry && (
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
        )}

        <div className={styles.field}>
          <span className={styles.label}>Note (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Whatever's useful to remember"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.primaryButton} disabled={saving} onClick={save}>
            {entry ? "Save changes" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
