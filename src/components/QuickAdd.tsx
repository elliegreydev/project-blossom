"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import styles from "./QuickAdd.module.css";
import AddMilestoneSheet from "./AddMilestoneSheet";

export default function QuickAdd() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [milestoneOpen, setMilestoneOpen] = useState(false);

  function handlePress() {
    if (pathname.startsWith("/journey")) {
      setMilestoneOpen(true);
      return;
    }
    setMenuOpen((v) => !v);
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={handlePress} aria-label="Quick add">
        <svg
          className={styles.icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {menuOpen && (
        <>
          <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
          <div className={styles.menu}>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                setMilestoneOpen(true);
              }}
            >
              Add milestone
            </button>
            <button type="button" className={styles.menuItem} disabled>
              Log a dose
              <span className={styles.menuItemHint}>Coming soon</span>
            </button>
            <button type="button" className={styles.menuItem} disabled>
              Add appointment
              <span className={styles.menuItemHint}>Coming soon</span>
            </button>
            <button type="button" className={styles.menuItem} disabled>
              New journal entry
              <span className={styles.menuItemHint}>Coming soon</span>
            </button>
          </div>
        </>
      )}

      {milestoneOpen && <AddMilestoneSheet onClose={() => setMilestoneOpen(false)} />}
    </>
  );
}
