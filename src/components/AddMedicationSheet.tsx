"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
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

export default function AddMedicationSheet({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [route, setRoute] = useState<MedicationRoute | null>(null);
  const [unit, setUnit] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [times, setTimes] = useState<string[]>(["09:00"]);
  const [everyDay, setEveryDay] = useState(true);
  const [days, setDays] = useState<number[]>([]);
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
        ? { times: times.filter(Boolean), days: everyDay ? null : days.sort() }
        : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>Add a medication</h2>

        <div className={styles.field}>
          <span className={styles.label}>Name</span>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Whatever you call it"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Type (optional)</span>
          <div className={styles.chipRow}>
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
            className={styles.input}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. 2mg, 0.5ml, one patch"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Schedule</span>
          <div className={styles.chipRow}>
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
              <div className={styles.chipRow}>
                <button
                  type="button"
                  className={`${styles.chip} ${everyDay ? styles.selected : ""}`}
                  onClick={() => setEveryDay(true)}
                >
                  Every day
                </button>
                <button
                  type="button"
                  className={`${styles.chip} ${!everyDay ? styles.selected : ""}`}
                  onClick={() => setEveryDay(false)}
                >
                  Specific days
                </button>
              </div>
              {!everyDay && (
                <div className={styles.chipRow}>
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
