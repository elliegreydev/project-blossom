"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addAppointment, updateAppointment, type Appointment } from "@/lib/db";

const REMINDER_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: "No reminder", minutes: null },
  { label: "30 min before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "3 hours before", minutes: 180 },
  { label: "1 day before", minutes: 60 * 24 },
  { label: "3 days before", minutes: 60 * 24 * 3 },
];

function toLocalDateTimeParts(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

export default function AddAppointmentSheet({
  appointment,
  initialTitle,
  onClose,
}: {
  appointment?: Appointment | null;
  initialTitle?: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const initial = appointment ? toLocalDateTimeParts(appointment.appointmentAt) : null;
  const [title, setTitle] = useState(appointment?.title ?? initialTitle ?? "");
  const [date, setDate] = useState(initial?.date ?? "");
  const [time, setTime] = useState(initial?.time ?? "09:00");
  const [location, setLocation] = useState(appointment?.location ?? "");
  const [prep, setPrep] = useState(appointment?.preparationNote ?? "");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState<number | null>(
    appointment ? appointment.reminderMinutesBefore : 60
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim() || !date) return;
    setSaving(true);
    const appointmentAt = new Date(`${date}T${time || "09:00"}`).toISOString();
    const input = {
      title: title.trim(),
      appointmentAt,
      location: location.trim() || null,
      preparationNote: prep.trim() || null,
      reminderMinutesBefore,
    };
    if (appointment) await updateAppointment(appointment.id, input);
    else await addAppointment(input);
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="appointment-sheet-title">
        <div className={styles.grabber} />
        <h2 id="appointment-sheet-title" className={styles.title}>{appointment ? "Edit appointment" : "Add an appointment"}</h2>

        <div className={styles.field}>
          <span className={styles.label}>What&apos;s it for?</span>
          <input
            aria-label="Appointment title"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Clinic, blood test, GP"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Date</span>
          <input aria-label="Appointment date" type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Time</span>
          <input aria-label="Appointment time" type="time" className={styles.input} value={time} onChange={(e) => setTime(e.target.value)} />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Location (optional)</span>
          <input
            aria-label="Appointment location"
            className={styles.input}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Where is it?"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Anything to prepare? (optional)</span>
          <textarea
            aria-label="Appointment preparation note"
            className={styles.textarea}
            value={prep}
            onChange={(e) => setPrep(e.target.value)}
            placeholder="Questions to ask, things to bring"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Remind me</span>
          <div className={styles.chipRow}>
            {REMINDER_OPTIONS.map((option) => (
              <button
                key={option.label}
                type="button"
                className={`${styles.chip} ${reminderMinutesBefore === option.minutes ? styles.selected : ""}`}
                onClick={() => setReminderMinutesBefore(option.minutes)}
              >
                {option.label}
              </button>
            ))}
          </div>
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
            {appointment ? "Save changes" : "Add appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
