"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddReferralSheet from "@/components/AddReferralSheet";
import AddReferralUpdateSheet from "@/components/AddReferralUpdateSheet";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import { db, deleteReferral, type Referral, type ReferralUpdate } from "@/lib/db";
import { todayLocalDateKey } from "@/lib/dates";
import {
  CONTACT_METHODS,
  REFERRAL_KINDS,
  REFERRAL_STATUSES,
  REFERRAL_UPDATE_KINDS,
  isOpen,
  sortReferrals,
  suggestedAction,
  waitedLabel,
} from "@/lib/referrals";
import {
  CLINIC_INDEX_HOME,
  CLINIC_INDEX_NAME,
  freshnessLabel,
  monthLabel,
  type ClinicSnapshot,
} from "@/lib/clinicIndex";
import feature from "@/components/feature.module.css";
import styles from "./waiting-list.module.css";

function dateLabel(key: string): string {
  // Split rather than parsed. A "YYYY-MM-DD" fed to new Date() is read as UTC
  // midnight, which renders as the previous day for anyone west of Greenwich
  // and, during BST, misreports dates typed by people in Britain too.
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return key;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function labelFor(list: { key: string; label: string }[], key: string): string {
  return list.find((item) => item.key === key)?.label ?? key;
}

/**
 * What the service last published about its own waiting list.
 *
 * Never rendered without the date it was true, and never rendered as Blossom's
 * own claim. If the fetch fails nothing appears at all, which is correct: an
 * absent figure is honest, a stale one presented as current is not.
 */
function ClinicContext({ clinicIndexId, today }: { clinicIndexId: number; today: string }) {
  const [snapshot, setSnapshot] = useState<ClinicSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/clinic-index?id=${clinicIndexId}`);
        const data = await response.json();
        if (!cancelled && data?.available && data.clinic) setSnapshot(data.clinic);
      } catch {
        // Their own usage notes say there's no uptime guarantee. Silence is
        // the designed outcome, not a swallowed bug.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clinicIndexId]);

  if (!snapshot) return null;
  const referral = monthLabel(snapshot.referralMonth);
  const freshness = freshnessLabel(snapshot.snapshotMonth, today);
  if (!referral && snapshot.waitlistSize === null) return null;

  return (
    <div className={styles.clinicBox}>
      {referral && (
        <div className={styles.clinicFigure}>
          They were working through referrals from <strong>{referral}</strong>.
        </div>
      )}
      {snapshot.waitlistSize !== null && (
        <div className={styles.clinicFigure}>
          {snapshot.waitlistSize.toLocaleString("en-GB")} people were on the list.
        </div>
      )}
      <div className={styles.clinicSource}>
        {freshness} Collected by{" "}
        <a href={CLINIC_INDEX_HOME} target="_blank" rel="noreferrer noopener">
          {CLINIC_INDEX_NAME}
        </a>
        {snapshot.sourceUrl && (
          <>
            {" "}
            from{" "}
            <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer noopener">
              the clinic&apos;s own page
            </a>
          </>
        )}
        . Ring them for today&apos;s position.
      </div>
    </div>
  );
}

export default function WaitingListPage() {
  const referrals = useLiveQuery(() => db.referrals.toArray(), []);
  const updates = useLiveQuery(() => db.referralUpdates.toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Referral | null>(null);
  const [logging, setLogging] = useState<Referral | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  const today = todayLocalDateKey();

  if (referrals === undefined || updates === undefined) return null;

  const visible = sortReferrals(referrals.filter((item) => !isPendingRemoval(item.id)));
  const updatesByReferral = new Map<string, ReferralUpdate[]>();
  for (const update of updates) {
    const list = updatesByReferral.get(update.referralId) ?? [];
    list.push(update);
    updatesByReferral.set(update.referralId, list);
  }

  return (
    <div className={feature.screen}>
      <ScreenHeader title="Waiting lists" backHref="/track" />

      <div className={feature.section}>
        <div className={feature.sectionTitle}>Your referrals</div>

        {visible.length === 0 ? (
          <div className={feature.empty}>
            <div className={feature.emptyTitle}>Nothing here yet</div>
            <div className={feature.emptySubtitle}>
              Somewhere to keep the wait itself: when you were referred, what
              they said when you last chased it, and the reference number you
              can quote if anyone tells you there&apos;s no record of you.
            </div>
          </div>
        ) : (
          <div className={feature.list}>
            {visible.map((referral) => {
              const log = (updatesByReferral.get(referral.id) ?? []).sort((a, b) =>
                b.happenedOn.localeCompare(a.happenedOn)
              );
              const showAll = expanded.has(referral.id);
              const shown = showAll ? log : log.slice(0, 2);
              const action = suggestedAction(referral, today);
              const waited = isOpen(referral.status) ? waitedLabel(referral.referredOn, today) : null;

              return (
                <div key={referral.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div>
                      <div className={styles.serviceName}>{referral.serviceName}</div>
                      <div className={styles.kind}>{labelFor(REFERRAL_KINDS, referral.kind)}</div>
                    </div>
                    <span
                      className={`${styles.status} ${referral.status === "lost" ? styles.statusLost : ""}`}
                    >
                      {labelFor(REFERRAL_STATUSES, referral.status)}
                    </span>
                  </div>

                  <div className={styles.meta}>
                    {referral.referredOn ? (
                      <>
                        Referred {dateLabel(referral.referredOn)}
                        {waited && <span className={styles.metaDim}> · {waited}</span>}
                      </>
                    ) : (
                      <span className={styles.metaDim}>Referral date not recorded</span>
                    )}
                    {referral.referenceNumber && (
                      <>
                        <br />
                        Reference {referral.referenceNumber}
                      </>
                    )}
                    {referral.referredBy && (
                      <>
                        <br />
                        Referred by {referral.referredBy}
                      </>
                    )}
                    {referral.lastChasedOn && (
                      <>
                        <br />
                        <span className={styles.metaDim}>
                          Last checked in {dateLabel(referral.lastChasedOn)}
                        </span>
                      </>
                    )}
                  </div>

                  {referral.note && <div className={styles.meta}>{referral.note}</div>}

                  {action && (
                    <div className={styles.action}>
                      <div className={styles.actionTitle}>{action.title}</div>
                      <div className={styles.actionBody}>{action.body}</div>
                    </div>
                  )}

                  {referral.clinicIndexId !== null && (
                    <ClinicContext clinicIndexId={referral.clinicIndexId} today={today} />
                  )}

                  {shown.length > 0 && (
                    <div className={styles.log}>
                      {shown.map((update) => (
                        <div key={update.id} className={styles.logEntry}>
                          <div className={styles.logMeta}>
                            {dateLabel(update.happenedOn)} ·{" "}
                            {labelFor(REFERRAL_UPDATE_KINDS, update.kind)}
                            {update.contactMethod &&
                              ` · ${labelFor(CONTACT_METHODS, update.contactMethod)}`}
                            {update.spokeTo && ` · ${update.spokeTo}`}
                          </div>
                          <div className={styles.logBody}>{update.body}</div>
                        </div>
                      ))}
                      {log.length > 2 && (
                        <button
                          type="button"
                          className={feature.linkButton}
                          onClick={() =>
                            setExpanded((previous) => {
                              const next = new Set(previous);
                              if (next.has(referral.id)) next.delete(referral.id);
                              else next.add(referral.id);
                              return next;
                            })
                          }
                        >
                          {showAll ? "Show less" : `Show all ${log.length}`}
                        </button>
                      )}
                    </div>
                  )}

                  <div className={styles.rowActions}>
                    <button
                      type="button"
                      className={`${styles.rowButton} ${styles.rowButtonPrimary}`}
                      onClick={() => setLogging(referral)}
                    >
                      Add to the record
                    </button>
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() => setEditing(referral)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.rowButton}
                      onClick={() =>
                        stageRemoval(referral.id, "This referral", () => deleteReferral(referral.id))
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button className={feature.addButton} onClick={() => setSheetOpen(true)}>
          + Add a referral
        </button>
      </div>

      <div className={feature.section}>
        <div className={feature.sectionTitle}>While you wait</div>
        <p className={feature.sectionNote}>
          Blossom doesn&apos;t keep waiting times of its own, because a number
          typed in here would be wrong within months. These are the people who
          keep track properly.
        </p>
        <div className={styles.elsewhere}>
          <a
            className={styles.elsewhereItem}
            href={CLINIC_INDEX_HOME}
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className={styles.elsewhereTitle}>{CLINIC_INDEX_NAME}</span>
            <span className={styles.elsewhereBody}>
              Waiting list figures for every UK gender clinic, read out of FOI
              responses and the clinics&apos; own pages.
            </span>
          </a>
          <a
            className={styles.elsewhereItem}
            href="https://transactual.org.uk/medical-transition/"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className={styles.elsewhereTitle}>TransActual</span>
            <span className={styles.elsewhereBody}>
              Plain guides to referrals, what you can ask for, and what to do
              when a service says no.
            </span>
          </a>
          <a
            className={styles.elsewhereItem}
            href="https://www.nhs.uk/nhs-services/how-to-find-an-nhs-gender-identity-clinic/"
            target="_blank"
            rel="noreferrer noopener"
          >
            <span className={styles.elsewhereTitle}>NHS: finding a gender clinic</span>
            <span className={styles.elsewhereBody}>
              The official list of clinics and how referrals are meant to work.
            </span>
          </a>
        </div>
        <p className={styles.attribution}>
          Waiting list figures shown against a linked clinic come from{" "}
          <a href={CLINIC_INDEX_HOME} target="_blank" rel="noreferrer noopener">
            {CLINIC_INDEX_NAME}
          </a>
          , an independent project, and are their published figures rather than
          official NHS statements. Blossom shows what a service last published
          and when. It never estimates when you&apos;ll be seen, because nobody
          honestly can.
        </p>
      </div>

      {(sheetOpen || editing) && (
        <AddReferralSheet
          referral={editing}
          onClose={() => {
            setSheetOpen(false);
            setEditing(null);
          }}
        />
      )}
      {logging && (
        <AddReferralUpdateSheet
          referralId={logging.id}
          serviceName={logging.serviceName}
          onClose={() => setLogging(null)}
        />
      )}
      {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
    </div>
  );
}
