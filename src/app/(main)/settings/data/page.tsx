"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import { exportAllData, deleteAllData } from "@/lib/db";
import styles from "@/components/settingsForm.module.css";
import sheetStyles from "@/components/Sheet.module.css";

export default function DataSettingsPage() {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blossom-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    setDeleting(true);
    await deleteAllData();
    setDeleting(false);
    setConfirmOpen(false);
    router.replace("/onboarding");
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Data controls" backHref="/settings" />

      <div className={styles.field}>
        <span className={styles.label}>Export your data</span>
        <p className={styles.hint}>
          Download everything you&apos;ve added as a single file you can keep.
        </p>
        <button type="button" className={styles.primaryButton} onClick={handleExport}>
          Export as JSON
        </button>
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Delete everything</span>
        <p className={styles.hint}>
          Permanently erases everything stored on this device. This can&apos;t
          be undone. This is never paywalled.
        </p>
        <button type="button" className={styles.dangerButton} onClick={() => setConfirmOpen(true)}>
          Delete all data
        </button>
      </div>

      {confirmOpen && (
        <div className={sheetStyles.backdrop} onClick={() => setConfirmOpen(false)}>
          <div className={sheetStyles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={sheetStyles.grabber} />
            <h2 className={sheetStyles.title}>Are you sure?</h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              This deletes every milestone, medication, journal entry, appointment,
              and goal on this device. There&apos;s no way to undo this. Type DELETE
              to confirm.
            </p>
            <input
              className={sheetStyles.input}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <div className={sheetStyles.actions}>
              <button
                type="button"
                className={sheetStyles.tertiaryButton}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={sheetStyles.primaryButton}
                style={{ background: "var(--pink)", color: "var(--plum)" }}
                disabled={confirmText !== "DELETE" || deleting}
                onClick={handleDelete}
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
