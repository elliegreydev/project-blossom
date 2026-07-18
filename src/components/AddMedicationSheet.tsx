"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addMedication, type MedicationRoute } from "@/lib/db";

const ROUTES: { key: MedicationRoute; label: string }[] = [
  { key: "tablet", label: "Tablet / pill" },
  { key: "injection", label: "Injection" },
  { key: "patch", label: "Patch" },
  { key: "gel", label: "Gel" },
  { key: "spray", label: "Spray" },
  { key: "implant", label: "Implant" },
  { key: "cream", label: "Cream" },
  { key: "blocker", label: "Blocker" },
  { key: "other", label: "Other" },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Deliberately local, not toISOString().slice(0, 10) - that's UTC, which
// reports "yesterday" for part of the day in any zone ahead of UTC. The
// due-date check this anchor feeds into (db.ts's isDueByInterval) compares
// against the local calendar date, so the default has to match.
function todayLocalDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AddMedicationSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const [name, setName] = useState("");
  const [route, setRoute] = useState<MedicationRoute | null>(null);
  const [unit, setUnit] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [cadence, setCadence] = useState<"everyDay" | "specificDays" | "interval">("everyDay");
  const [days, setDays] = useState<number[]>([]);
  const [intervalDays, setIntervalDays] = useState(5);
  const [anchorDate, setAnchorDate] = useState(todayLocalDateKey);
  const [saving, setSaving] = useState(false);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  function setTime(i: number, value: string) {
    setTimes((prev) => prev.map((t, idx) => (idx === i ? value : t)));
  }

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    await addMedication({
      name: name.trim(),
      route,
      unit: unit.trim() || null,
      frequency: scheduled
        ? cadence === "interval"
          ? { times: times.filter(Boolean), days: null, intervalDays, anchorDate }
          : { times: times.filter(Boolean), days: cadence === "specificDays" ? days.sort() : null, intervalDays: null, anchorDate: null }
        : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="medication-sheet-title">
        <div className={styles.grabber} />
        <h2 id="medication-sheet-title" className={styles.title}>Add a medication</h2>

        <div className={styles.field}>
          <span className={styles.label}>Name</span>
          <input
            aria-label="Medication name"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Whatever you call it"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Type (optional)</span>
          <div className={styles.chipRow} role="group" aria-label="Medication type">
            {ROUTES.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`${styles.chip} ${route === r.key ? styles.selected : ""}`}
                onClick={() => setRoute(route === r.key ? null : r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Dose / units (optional)</span>
          <input
            aria-label="Medication dose or units"
            className={styles.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. 2mg, 0.5ml, one patch"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Schedule</span>
          <div className={styles.chipRow} role="group" aria-label="Medication schedule">
            <button
              type="button"
              className={`${styles.chip} ${!scheduled ? styles.selected : ""}`}
              onClick={() => setScheduled(false)}
            >
              No reminder
            </button>
            <button
              type="button"
              className={`${styles.chip} ${scheduled ? styles.selected : ""}`}
              onClick={() => setScheduled(true)}
            >
              Set a schedule
            </button>
          </div>
        </div>

        {scheduled && (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Time(s)</span>
              {times.map((t, i) => (
                <input
                  key={i}
                  aria-label={`Dose time ${i + 1}`}
                  type="time"
                  className={styles.input}
                  value={t}
                  onChange={(e) => setTime(i, e.target.value)}
                />
              ))}
              <button
                type="button"
                className={styles.tertiaryButton}
                style={{ alignSelf: "flex-start", padding: "6px 0" }}
                onClick={() => setTimes((prev) => [...prev, "21:00"])}
              >
                + Add another time
              </button>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Days</span>
              <div className={styles.chipRow} role="group" aria-label="Schedule frequency">
                <button
                  type="button"
                  className={`${styles.chip} ${cadence === "everyDay" ? styles.selected : ""}`}
                  onClick={() => setCadence("everyDay")}
                >
                  Every day
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${cadence === "specificDays" ? styles.selected : ""}`}
                  onClick={() => setCadence("specificDays")}
                >
                  Specific days
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${cadence === "interval" ? styles.selected : ""}`}
                  onClick={() => setCadence("interval")}
                >
                  Every X days
                </button>
              </div>
              {cadence === "specificDays" && (
                <div className={styles.chipRow} role="group" aria-label="Schedule days">
                  {WEEKDAYS.map((label, d) => (
                    <button
                      key={d}
                      type="button"
                      className={`${styles.chip} ${days.includes(d) ? styles.selected : ""}`}
                      onClick={() => toggleDay(d)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {cadence === "interval" && (
                <div className={styles.field} style={{ marginTop: 8 }}>
                  <label className={styles.label} htmlFor="interval-days-input">
                    Every
                    <input
                      id="interval-days-input"
                      type="number"
                      min={2}
                      max={90}
                      className={styles.input}
                      style={{ display: "inline-block", width: 64, margin: "0 6px" }}
                      value={intervalDays}
                      onChange={(e) => setIntervalDays(Math.max(2, Math.min(90, Number(e.target.value) || 2)))}
                    />
                    days
                  </label>
                  <label className={styles.label} htmlFor="anchor-date-input" style={{ marginTop: 10 }}>
                    Starting from
                  </label>
                  <input
                    id="anchor-date-input"
                    type="date"
                    className={styles.input}
                    value={anchorDate}
                    onChange={(e) => setAnchorDate(e.target.value)}
                  />
                  <span className={styles.fieldHint}>
                    Your next dose after this one lines up will be exactly {intervalDays} days later.
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!name.trim() || saving}
            onClick={save}
          >
            Add medication
          </button>
        </div>
      </div>
    </div>
  );
}
