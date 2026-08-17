"use client";

import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, SELF_DIRECTED_ID, updateSelfDirected } from "@/lib/db";
import {
  BLOOD_CHECK_INTERVALS,
  DEFAULT_SECTION_LABEL,
  PRESCRIBER_OPTIONS,
  sectionLabel,
  shouldOfferBloodRhythm,
  type PrescriberStatus,
} from "@/lib/selfDirected";
import styles from "@/components/settingsForm.module.css";

export default function SelfDirectedSettingsPage() {
  // `get` resolves to undefined both while the query is still running and when
  // the row simply does not exist, so the two cannot be told apart. Coercing a
  // missing row to null keeps undefined meaning "still loading" - without this
  // the page returns null forever for anyone who has not set up yet, which is
  // everybody on their first visit.
  const settings = useLiveQuery(async () => (await db.selfDirected.get(SELF_DIRECTED_ID)) ?? null, []);
  if (settings === undefined) return null;

  const label = sectionLabel(settings?.label);
  const status = settings?.prescriberStatus ?? null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title={label} backHref="/track/self-directed" />

      <div className={styles.field}>
        <span className={styles.label}>What this section is called</span>
        <p className={styles.hint}>
          This name shows on your Track screen, so it&apos;s worth picking something
          that means what you want it to mean and nothing to anyone else. Leave
          it empty to go back to &ldquo;{DEFAULT_SECTION_LABEL}&rdquo;.
        </p>
        <input
          className={styles.input}
          value={settings?.label ?? ""}
          placeholder={DEFAULT_SECTION_LABEL}
          maxLength={40}
          onChange={(event) => void updateSelfDirected({ label: event.target.value || null })}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>When you started</span>
        <p className={styles.hint}>
          Nobody else is holding this date if there&apos;s no clinic, and it&apos;s the
          first thing a doctor asks. A rough guess is fine.
        </p>
        <input
          type="date"
          className={styles.input}
          value={settings?.hrtStartedOn ?? ""}
          onChange={(event) => void updateSelfDirected({ hrtStartedOn: event.target.value || null })}
        />
      </div>

      <div className={styles.field}>
        <span className={styles.label}>Is anyone else keeping track?</span>
        <p className={styles.hint}>
          Only so Blossom knows which jobs to pick up. You can change it whenever,
          and it stays on this device unless you turn syncing on for it in
          Account &amp; sync.
        </p>
        <div className={styles.optionGrid}>
          {PRESCRIBER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`${styles.optionCard} ${status === option.key ? styles.selected : ""}`}
              onClick={() => void updateSelfDirected({ prescriberStatus: option.key as PrescriberStatus })}
            >
              <span className={styles.optionTitle}>{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {shouldOfferBloodRhythm(status) && (
        <div className={styles.field}>
          <span className={styles.label}>Nudge about bloods</span>
          <p className={styles.hint}>
            Blossom counts how long it&apos;s been since the last test you recorded,
            and nothing else. It doesn&apos;t know what you should be testing or how
            often, and won&apos;t pretend to.
          </p>
          <div className={styles.optionGrid}>
            {BLOOD_CHECK_INTERVALS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`${styles.optionCard} ${(settings?.bloodCheckIntervalDays ?? null) === option.days ? styles.selected : ""}`}
                onClick={() => void updateSelfDirected({ bloodCheckIntervalDays: option.days })}
              >
                <span className={styles.optionTitle}>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
