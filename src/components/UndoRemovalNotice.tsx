"use client";

import styles from "./UndoRemovalNotice.module.css";

export default function UndoRemovalNotice({ label, onUndo }: { label: string; onUndo: () => void }) {
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <span>{label} will be removed in a few seconds.</span>
      <button type="button" onClick={onUndo}>Undo</button>
    </div>
  );
}
