"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import {
  db,
  LOCAL_PROFILE_ID,
  activeSafetyCheckIn,
  resolveSafetyCheckIn,
  snoozeSafetyCheckIn,
  startSafetyCheckIn,
  updateSafetyCheckInSettings,
  type SafetyCheckIn,
} from "@/lib/db";
import styles from "@/components/settingsForm.module.css";

const DURATIONS = [
  { label: "1 hour", hours: 1 },
  { label: "4 hours", hours: 4 },
  { label: "24 hours", hours: 24 },
];

function contactHref(method: string): string | null {
  const digits = method.replace(/[^\d+]/g, "");
  if (digits.length >= 7 && digits.length === method.replace(/[\s()-]/g, "").length) {
    return `tel:${digits}`;
  }
  if (method.includes("@")) return `mailto:${method.trim()}`;
  return null;
}

export default function SafetyCheckInsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));
  const [current, setCurrent] = useState<SafetyCheckIn | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const [contactName, setContactName] = useState("");
  const [contactMethod, setContactMethod] = useState("");

  async function refresh() {
    setCurrent((await activeSafetyCheckIn()) ?? null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (profile) {
      setContactName(profile.trustedContactName ?? "");
      setContactMethod(profile.trustedContactMethod ?? "");
    }
  }, [profile]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30 * 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!profile) return null;

  const overdue = current ? new Date(current.dueAt).getTime() <= now : false;
  const hasContact = Boolean(profile.trustedContactName?.trim());

  async function toggleEnabled(enabled: boolean) {
    await updateSafetyCheckInSettings({ safetyCheckInsEnabled: enabled });
  }

  async function saveContact() {
    await updateSafetyCheckInSettings({
      trustedContactName: contactName.trim() || null,
      trustedContactMethod: contactMethod.trim() || null,
    });
  }

  async function start(hours: number) {
    await startSafetyCheckIn(hours);
    await refresh();
  }

  async function resolve() {
    if (!current) return;
    await resolveSafetyCheckIn(current.id);
    await refresh();
  }

  async function snooze() {
    if (!current) return;
    await snoozeSafetyCheckIn(current.id, 1);
    await refresh();
  }

  const href = profile.trustedContactMethod ? contactHref(profile.trustedContactMethod) : null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Safety check-ins" backHref="/care" />

      <div className={styles.toggleRow}>
        <div className={styles.toggleText}>
          <span className={styles.toggleTitle}>Safety check-ins</span>
          <span className={styles.toggleDesc}>{profile.safetyCheckInsEnabled ? "On" : "Off"}</span>
        </div>
        <Toggle checked={profile.safetyCheckInsEnabled} onChange={toggleEnabled} label="Safety check-ins" />
      </div>

      {!profile.safetyCheckInsEnabled && (
        <p className={styles.hint}>
          {/* "never reports this to us" and "stays only on this device" were both
              false: the check-in rows sync, and because status is only pending or
              completed, a pending one with a due time in the past is a missed
              check-in that is visible server-side. "Never contacts anyone" is
              true and worth keeping. Who your trusted contact is genuinely never
              leaves the device: their name and contact method are absent from the
              profile upload. */}
          Start a timed check-in on yourself around something stressful. If you don&apos;t
          resolve it in time, Blossom will gently suggest reaching out to someone you trust.
          It never contacts anyone for you, and who you choose as that person never leaves
          this device. The check-ins themselves sync with your account if sync is on, so
          switch off &ldquo;Your people and safety&rdquo; in Choose what syncs to keep them
          here only.
        </p>
      )}

      {profile.safetyCheckInsEnabled && (
        <>
          <div className={styles.field}>
            <span className={styles.label}>Trusted contact</span>
            <input
              className={styles.input}
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              onBlur={saveContact}
              placeholder="Their name"
            />
            <input
              className={styles.input}
              type="text"
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value)}
              onBlur={saveContact}
              placeholder="Phone number or email (optional)"
            />
            <p className={styles.hint}>
              Stored only on this device. Blossom never contacts this person - it&apos;s just
              here so the app can suggest reaching out and give you a quick way to do it.
            </p>
          </div>

          {current === undefined ? null : current ? (
            <div className={styles.field}>
              {overdue ? (
                <>
                  <span className={styles.label}>You missed a check-in</span>
                  <p className={styles.hint}>
                    No pressure - just checking. Want to reach out{hasContact ? ` to ${profile.trustedContactName}` : ""}?
                  </p>
                  {href && (
                    <a className={styles.primaryButton} style={{ textAlign: "center" }} href={href}>
                      Reach out to {profile.trustedContactName}
                    </a>
                  )}
                  <button type="button" className={styles.tertiaryButton} onClick={resolve}>
                    I&apos;m okay
                  </button>
                  {!current.snoozedOnce && (
                    <button type="button" className={styles.tertiaryButton} onClick={snooze}>
                      Give me another hour
                    </button>
                  )}
                </>
              ) : (
                <>
                  <span className={styles.label}>Checking in with you</span>
                  <p className={styles.hint}>
                    By {new Date(current.dueAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <button type="button" className={styles.tertiaryButton} onClick={resolve}>
                    I&apos;m okay now
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className={styles.field}>
              <span className={styles.label}>Start a check-in</span>
              <div className={styles.optionGrid}>
                {DURATIONS.map((d) => (
                  <button key={d.hours} type="button" className={styles.optionCard} onClick={() => start(d.hours)}>
                    <span className={styles.optionTitle}>{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
