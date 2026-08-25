"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addReferralUpdate } from "@/lib/db";
import { todayLocalDateKey } from "@/lib/dates";
import {
  CONTACT_METHODS,
  REFERRAL_UPDATE_KINDS,
  countsAsContact,
  type ContactMethod,
  type ReferralUpdateKind,
} from "@/lib/referrals";

/**
 * Logging something that happened to a referral.
 *
 * The prompts are written for somebody who has just put the phone down and is
 * still annoyed, which is when this actually gets used. Short fields, nothing
 * required except what was said, and no tidy-up expected later.
 */
export default function AddReferralUpdateSheet({
  referralId,
  serviceName,
  onClose,
}: {
  referralId: string;
  serviceName: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [kind, setKind] = useState<ReferralUpdateKind>("chased");
  const [happenedOn, setHappenedOn] = useState(todayLocalDateKey());
  const [contactMethod, setContactMethod] = useState<ContactMethod | null>("phone");
  const [spokeTo, setSpokeTo] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  const isContact = countsAsContact(kind);

  async function save() {
    if (!body.trim() || !happenedOn) return;
    setSaving(true);
    await addReferralUpdate({
      referralId,
      happenedOn,
      kind,
      contactMethod: isContact ? contactMethod : null,
      spokeTo: spokeTo.trim() || null,
      body: body.trim(),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="referral-update-title"
      >
        <div className={styles.grabber} />
        <h2 id="referral-update-title" className={styles.title}>
          Add to the record
        </h2>
        <p className={styles.helpText}>{serviceName}</p>

        <div className={styles.field}>
          <span className={styles.label}>What happened?</span>
          <div className={styles.chipRow}>
            {REFERRAL_UPDATE_KINDS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={styles.chip}
                aria-pressed={kind === option.key}
                onClick={() => setKind(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <span className={styles.fieldHint}>
            {REFERRAL_UPDATE_KINDS.find((option) => option.key === kind)?.hint}
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>When?</span>
          <input
            type="date"
            className={styles.input}
            value={happenedOn}
            onChange={(e) => setHappenedOn(e.target.value)}
          />
        </div>

        {isContact && (
          <div className={styles.field}>
            <span className={styles.label}>How did you contact them?</span>
            <div className={styles.chipRow}>
              {CONTACT_METHODS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={styles.chip}
                  aria-pressed={contactMethod === option.key}
                  onClick={() => setContactMethod(option.key)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Who did you speak to? (optional)</span>
          <input
            className={styles.input}
            value={spokeTo}
            onChange={(e) => setSpokeTo(e.target.value)}
            placeholder="A first name is enough"
          />
          <span className={styles.fieldHint}>
            Worth writing down. &quot;I spoke to Sam on the 4th&quot; is much
            harder to wave away than &quot;I rang a while back&quot;.
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>What did they say?</span>
          <textarea
            className={styles.textarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={
              kind === "position"
                ? "e.g. They're booking people referred in June 2023"
                : "In your own words, for you to look back on."
            }
          />
        </div>

        {isContact && (
          <p className={styles.helpText}>
            Saving this counts as a check-in, so any reminder you&apos;ve set
            starts again from this date.
          </p>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!body.trim() || !happenedOn || saving}
            onClick={save}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
