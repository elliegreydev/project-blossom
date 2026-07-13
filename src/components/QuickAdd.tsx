"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./QuickAdd.module.css";
import AddMilestoneSheet from "./AddMilestoneSheet";
import AddMedicationSheet from "./AddMedicationSheet";
import AddAppointmentSheet from "./AddAppointmentSheet";
import JournalSheet from "./JournalSheet";

type Sheet = "milestone" | "medication" | "appointment" | "journal" | null;

export default function QuickAdd() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  function handlePress() {
    // On a screen with an obvious primary add action, go straight to it.
    if (pathname.startsWith("/journey")) return setSheet("milestone");
    if (pathname.startsWith("/track/medication")) return setSheet("medication");
    if (pathname.startsWith("/track/journal")) return setSheet("journal");
    if (pathname.startsWith("/calendar")) return setSheet("appointment");
    setMenuOpen((v) => !v);
  }

  function open(s: Sheet) {
    setMenuOpen(false);
    setSheet(s);
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
            <button type="button" className={styles.menuItem} onClick={() => open("milestone")}>
              Add milestone
            </button>
            <button type="button" className={styles.menuItem} onClick={() => open("medication")}>
              Add medication
            </button>
            <button type="button" className={styles.menuItem} onClick={() => open("appointment")}>
              Add appointment
            </button>
            <button type="button" className={styles.menuItem} onClick={() => open("journal")}>
              New journal entry
            </button>
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false);
                router.push("/track/goals");
              }}
            >
              Add goal
            </button>
          </div>
        </>
      )}

      {sheet === "milestone" && <AddMilestoneSheet onClose={() => setSheet(null)} />}
      {sheet === "medication" && <AddMedicationSheet onClose={() => setSheet(null)} />}
      {sheet === "appointment" && <AddAppointmentSheet onClose={() => setSheet(null)} />}
      {sheet === "journal" && <JournalSheet onClose={() => setSheet(null)} />}
    </>
  );
}
