"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import AddAppointmentSheet from "@/components/AddAppointmentSheet";
import { db, type Appointment } from "@/lib/db";
import styles from "@/components/feature.module.css";

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function CalendarPage() {
  const appts = useLiveQuery(() => db.appointments.orderBy("appointmentAt").toArray(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [now] = useState(() => Date.now());

  if (appts === undefined) return null;

  const upcoming = appts.filter((a) => new Date(a.appointmentAt).getTime() >= now);
  const past = appts.filter((a) => new Date(a.appointmentAt).getTime() < now).reverse();

  function renderAppt(a: Appointment) {
    return (
      <div key={a.id} className={styles.item}>
        <div className={styles.itemRow}>
          <span className={styles.itemTitle}>{a.title}</span>
          <span className={styles.itemMeta}>{timeLabel(a.appointmentAt)}</span>
        </div>
        <span className={styles.itemMeta}>{dayLabel(a.appointmentAt)}</span>
        {a.location && <span className={styles.itemMeta}>{a.location}</span>}
        {a.preparationNote && <div className={styles.itemBody}>{a.preparationNote}</div>}
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      <header>
        <h1 className={styles.pageTitle}>Calendar</h1>
        <p className={styles.pageSubtitle}>Appointments and important dates, in one calm place.</p>
      </header>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Upcoming</div>
        {upcoming.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing scheduled</div>
            <div className={styles.emptySubtitle}>
              Add appointments, blood tests, or any important dates.
            </div>
          </div>
        ) : (
          <div className={styles.list}>{upcoming.map(renderAppt)}</div>
        )}
        <button className={styles.addButton} onClick={() => setAddOpen(true)}>
          + Add appointment
        </button>
      </div>

      {past.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Past</div>
          <div className={styles.list}>{past.map(renderAppt)}</div>
        </div>
      )}

      {addOpen && <AddAppointmentSheet onClose={() => setAddOpen(false)} />}
    </div>
  );
}
