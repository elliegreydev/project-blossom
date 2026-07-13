"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { addAppointment } from "@/lib/db";

export default function AddAppointmentSheet({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [location, setLocation] = useState("");
  const [prep, setPrep] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !date) return;
    setSaving(true);
    const appointmentAt = new Date(`${date}T${time || "09:00"}`).toISOString();
    await addAppointment({
      title: title.trim(),
      appointmentAt,
      location: location.trim() || null,
      preparationNote: prep.trim() || null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.grabber} />
        <h2 className={styles.title}>Add an appointment</h2>

        <div className={styles.field}>
          <span className={styles.label}>What&apos;s it for?</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Clinic, blood test, GP"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Time</span>
          <input type="time" className={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Location (optional)</span>
          <input
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where is it?"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Anything to prepare? (optional)</span>
          <textarea
            className={styles.textarea}
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            placeholder="Questions to ask, things to bring"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!title.trim() || !date || saving}
            onClick={save}
          >
            Add appointment
          </button>
        </div>
      </div>
    </div>
  );
}
