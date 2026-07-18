"use client";

import { useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, LOCAL_PROFILE_ID, markReminderNotified, notifiedReminderState } from "@/lib/db";
import { dueAppointmentReminders, dueMedicationReminders } from "@/lib/reminders";

const CHECK_INTERVAL_MS = 30 * 1000;

// Renders nothing. Polls while the app is open (foreground or a backgrounded
// but still-alive tab) and fires a real Notification for due reminders. This
// is the "Tier 1" local-only layer - it can't wake a fully closed app; that
// needs either Periodic Background Sync (best-effort, Chromium-only) or
// server push (needs sync), both separate from this component.
export default function LocalReminderService() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const medications = useLiveQuery(() => db.medications.toArray(), []);
  const medicationLogs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const appointments = useLiveQuery(() => db.appointments.toArray(), []);

  const latest = useRef({ profile, medications, medicationLogs, appointments });
  useEffect(() => {
    latest.current = { profile, medications, medicationLogs, appointments };
  }, [profile, medications, medicationLogs, appointments]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    async function check() {
      const { profile, medications, medicationLogs, appointments } = latest.current;
      if (!profile?.notificationsEnabled || Notification.permission !== "granted") return;
      if (!medications || !medicationLogs || !appointments) return;

      const notified = await notifiedReminderState();
      const now = new Date();
      const pending = [
        ...dueMedicationReminders(medications, medicationLogs, notified, now),
        ...dueAppointmentReminders(appointments, notified, now),
      ];

      const detailed = profile.reminderPrivacy === "detailed";
      for (const reminder of pending) {
        new Notification(detailed ? reminder.detailedTitle : reminder.discreetTitle, {
          body: detailed ? reminder.detailedBody : reminder.discreetBody,
          tag: reminder.key,
        });
        await markReminderNotified(reminder.key);
      }
    }

    check();
    const id = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
