"use client";

import { useEffect, useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { addReferral, updateReferral, type Referral } from "@/lib/db";
import {
  CHASE_INTERVALS,
  REFERRAL_KINDS,
  REFERRAL_STATUSES,
  type ReferralKind,
  type ReferralStatus,
} from "@/lib/referrals";

interface ClinicOption {
  clinicId: number;
  name: string;
  region: string;
}

export default function AddReferralSheet({
  referral,
  onClose,
}: {
  referral?: Referral | null;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [serviceName, setServiceName] = useState(referral?.serviceName ?? "");
  const [kind, setKind] = useState<ReferralKind>(referral?.kind ?? "gender-clinic");
  const [referredOn, setReferredOn] = useState(referral?.referredOn ?? "");
  // Tracked separately from an empty date, because "I don't know" is a real
  // answer and needs to survive being saved. Without this, not knowing looks
  // identical to not having filled the form in yet.
  const [dateUnknown, setDateUnknown] = useState(referral ? referral.referredOn === null : false);
  const [referredBy, setReferredBy] = useState(referral?.referredBy ?? "");
  const [referenceNumber, setReferenceNumber] = useState(referral?.referenceNumber ?? "");
  const [status, setStatus] = useState<ReferralStatus>(referral?.status ?? "waiting");
  const [chaseEveryDays, setChaseEveryDays] = useState<number | null>(referral?.chaseEveryDays ?? null);
  const [clinicIndexId, setClinicIndexId] = useState<number | null>(referral?.clinicIndexId ?? null);
  const [note, setNote] = useState(referral?.note ?? "");
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [saving, setSaving] = useState(false);

  // The clinic list is a convenience, never a requirement. If it doesn't
  // arrive, the free-text name is all that matters and the picker just isn't
  // there - nobody should be blocked from recording their own referral
  // because somebody else's API is down.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/clinic-index");
        const data = await response.json();
        if (!cancelled && data?.available && Array.isArray(data.clinics)) setClinics(data.clinics);
      } catch {
        // Silent on purpose. See above.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (!serviceName.trim()) return;
    setSaving(true);
    const input = {
      serviceName: serviceName.trim(),
      kind,
      referredOn: dateUnknown ? null : referredOn || null,
      referredBy: referredBy.trim() || null,
      referenceNumber: referenceNumber.trim() || null,
      status,
      chaseEveryDays,
      clinicIndexId,
      note: note.trim() || null,
    };
    if (referral) await updateReferral(referral.id, input);
    else await addReferral(input);
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
        aria-labelledby="referral-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="referral-sheet-title" className={styles.title}>
          {referral ? "Edit this referral" : "Add a referral"}
        </h2>

        <div className={styles.field}>
          <span className={styles.label}>Which service?</span>
          <input
            className={styles.input}
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            placeholder="e.g. Nottingham Gender Clinic"
            autoFocus
          />
          {clinics.length > 0 && (
            <select
              className={styles.select}
              value={clinicIndexId ?? ""}
              onChange={(e) => {
                const id = e.target.value ? Number(e.target.value) : null;
                setClinicIndexId(id);
                const match = clinics.find((c) => c.clinicId === id);
                // Only fills a blank box. Somebody who typed their own name for
                // a service shouldn't have it overwritten by a tidier one.
                if (match && !serviceName.trim()) setServiceName(match.name);
              }}
            >
              <option value="">Not one of these, or I&apos;d rather not link it</option>
              {clinics.map((clinic) => (
                <option key={clinic.clinicId} value={clinic.clinicId}>
                  {clinic.name}
                </option>
              ))}
            </select>
          )}
          {clinics.length > 0 && (
            <span className={styles.fieldHint}>
              Linking a UK gender clinic lets Blossom show what it last published
              about its waiting list. Entirely optional.
            </span>
          )}
        </div>

        <div className={styles.field}>
          <span className={styles.label}>What kind of service?</span>
          <div className={styles.chipRow}>
            {REFERRAL_KINDS.map((option) => (
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
        </div>

        <div className={styles.field}>
          <span className={styles.label}>When were you referred?</span>
          <input
            type="date"
            className={styles.input}
            value={referredOn}
            disabled={dateUnknown}
            onChange={(e) => setReferredOn(e.target.value)}
          />
          <div className={styles.chipRow}>
            <button
              type="button"
              className={styles.chip}
              aria-pressed={dateUnknown}
              onClick={() => setDateUnknown((on) => !on)}
            >
              I don&apos;t know
            </button>
          </div>
          <span className={styles.fieldHint}>
            {dateUnknown
              ? "That's really common. Your GP practice can tell you, and Blossom will suggest asking."
              : "The date your referral was sent, if you know it."}
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Where is it up to?</span>
          <select
            className={styles.select}
            value={status}
            onChange={(e) => setStatus(e.target.value as ReferralStatus)}
          >
            {REFERRAL_STATUSES.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label} - {option.hint}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Remind you to check in?</span>
          <select
            className={styles.select}
            value={chaseEveryDays ?? ""}
            onChange={(e) => setChaseEveryDays(e.target.value ? Number(e.target.value) : null)}
          >
            {CHASE_INTERVALS.map((option) => (
              <option key={option.key} value={option.days ?? ""}>
                {option.label}
              </option>
            ))}
          </select>
          <span className={styles.fieldHint}>
            Off unless you pick something. Blossom won&apos;t contact anyone for
            you, and the notification never names the service.
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Who referred you? (optional)</span>
          <input
            className={styles.input}
            value={referredBy}
            onChange={(e) => setReferredBy(e.target.value)}
            placeholder="e.g. Dr Patel, or self-referral"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Reference number (optional)</span>
          <input
            className={styles.input}
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
          />
          <span className={styles.fieldHint}>
            Worth having. It&apos;s the quickest way to be found again if anyone
            says there&apos;s no record of you.
          </span>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Anything else (optional)</span>
          <textarea
            className={styles.textarea}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!serviceName.trim() || saving}
            onClick={save}
          >
            {referral ? "Save changes" : "Save referral"}
          </button>
        </div>
      </div>
    </div>
  );
}
