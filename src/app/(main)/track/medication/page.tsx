"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddMedicationSheet from "@/components/AddMedicationSheet";
import MedicationSupplySheet from "@/components/MedicationSupplySheet";
import CareSupplySheet from "@/components/CareSupplySheet";
import ManualDoseSheet from "@/components/ManualDoseSheet";
import SensitiveModuleGate from "@/components/SensitiveModuleGate";
import {
  db,
  dueDosesToday,
  currentMedicationSupply,
  deleteMedicationLog,
  estimatedMedicationSupplyDays,
  logDose,
  medicationSupplyIsLow,
  nextMedicationDose,
  careSupplyNeedsAttention,
  updateMedication,
  type DoseStatus,
  type Medication,
  type MedicationSupply,
  type CareSupply,
} from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./medication.module.css";

const ROUTE_LABELS: Record<string, string> = {
  tablet: "Tablet",
  injection: "Injection",
  patch: "Patch",
  gel: "Gel",
  spray: "Spray",
  implant: "Implant",
  cream: "Cream",
  blocker: "Blocker",
  other: "Other",
};

const STATUS_LABELS: Record<string, string> = {
  taken: "Taken",
  skipped: "Skipped",
  delayed: "Delayed",
  not_logged: "Not logged",
};

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dateTimeLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + timeLabel(iso);
}

function countdownLabel(scheduledTime: string, now: Date): string {
  const difference = new Date(scheduledTime).getTime() - now.getTime();
  const absoluteMinutes = Math.max(0, Math.round(Math.abs(difference) / 60000));
  if (Math.abs(difference) < 60_000) return "Due now";
  const days = Math.floor(absoluteMinutes / 1440);
  const hours = Math.floor((absoluteMinutes % 1440) / 60);
  const minutes = absoluteMinutes % 60;
  const parts = [
    days > 0 ? `${days} ${days === 1 ? "day" : "days"}` : "",
    hours > 0 ? `${hours}h` : "",
    minutes > 0 ? `${minutes}m` : "",
  ].filter(Boolean).slice(0, 2).join(" ");
  return difference < 0 ? `Scheduled ${parts} ago` : `In ${parts}`;
}

export default function MedicationPage() {
  const allMeds = useLiveQuery(() => db.medications.toArray(), []);
  const logs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const supplies = useLiveQuery(() => db.medicationSupplies.toArray(), []);
  const supplyAdjustments = useLiveQuery(() => db.medicationSupplyAdjustments.toArray(), []);
  const careSupplies = useLiveQuery(() => db.careSupplies.toArray(), []);
  const careSupplyAdjustments = useLiveQuery(() => db.careSupplyAdjustments.toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [supplyMedication, setSupplyMedication] = useState<Medication | null>(null);
  const [supplyToEdit, setSupplyToEdit] = useState<MedicationSupply | null>(null);
  const [creatingSupply, setCreatingSupply] = useState(false);
  const [careSupply, setCareSupply] = useState<CareSupply | null | "new">(null);
  const [manualDoseOpen, setManualDoseOpen] = useState(false);
  const [doseTab, setDoseTab] = useState<"today" | "history">("today");
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  if (allMeds === undefined || logs === undefined || supplies === undefined || supplyAdjustments === undefined || careSupplies === undefined || careSupplyAdjustments === undefined) return null;

  const meds = allMeds.filter((m) => m.active);
  const allSupplies = supplies;

  const historyCutoff = new Date();
  historyCutoff.setDate(historyCutoff.getDate() - 30);
  const historyGroups = meds
    .map((med) => {
      const medLogs = logs
        .filter((l) => l.medicationId === med.id)
        .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt));
      const recentLogs = medLogs.filter((l) => new Date(l.loggedAt) >= historyCutoff);
      const takenCount = recentLogs.filter((l) => l.status === "taken").length;
      const adherence = recentLogs.length > 0 ? Math.round((takenCount / recentLogs.length) * 100) : null;
      return { med, logs: medLogs, adherence };
    })
    .filter((group) => group.logs.length > 0);

  const now = clock;
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Build today's dose slots across all scheduled meds.
  const slots = meds.flatMap((med) =>
    dueDosesToday(med, now).map((slotIso) => ({ med, slotIso }))
  );
  const nextDose = nextMedicationDose(meds, logs, now);

  function loggedStatusFor(medId: string, slotIso: string): DoseStatus | null {
    const match = logs!.find(
      (l) => l.medicationId === medId && l.scheduledTime === slotIso
    );
    return match?.status ?? null;
  }

  async function handleLog(med: Medication, slotIso: string, status: DoseStatus) {
    await logDose({ medicationId: med.id, scheduledTime: slotIso, status, note: null });
  }

  function supplyLabel(medication: Medication): string {
    const medicationSupplies = allSupplies.filter((item) => item.medicationId === medication.id);
    const supply = currentMedicationSupply(medication, medicationSupplies);
    if (!supply) return "Set up supply tracking";
    const days = estimatedMedicationSupplyDays(medication, supply);
    const backups = medicationSupplies.length - 1;
    const suffix = backups > 0 ? ` · ${backups} backup ${backups === 1 ? "supply" : "supplies"}` : "";
    if (medicationSupplyIsLow(medication, supply)) return `Current supply: a check may be useful${suffix}`;
    if (days !== null) return `Current supply: around ${days} ${days === 1 ? "day" : "days"} left${suffix}`;
    return `Current supply: ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(supply.quantity)} ${supply.supplyUnit}${suffix}`;
  }

  return (
    <SensitiveModuleGate>
    <div className={styles.screen}>
      <ScreenHeader title="Medication" backHref="/track" />

      {meds.length > 0 && (
        <button type="button" className={styles.addButton} onClick={() => setManualDoseOpen(true)}>
          + Log a dose
        </button>
      )}

      {(slots.length > 0 || historyGroups.length > 0) && (
        <div className={local.segmented}>
          <button
            className={`${local.segment} ${doseTab === "today" ? local.active : ""}`}
            onClick={() => setDoseTab("today")}
          >
            Today
          </button>
          <button
            className={`${local.segment} ${doseTab === "history" ? local.active : ""}`}
            onClick={() => setDoseTab("history")}
          >
            History
          </button>
        </div>
      )}

      {nextDose && (
        <section className={`${styles.section} ${local.nextDose}`} aria-label="Next medication dose">
          <div className={styles.sectionTitle}>Next dose</div>
          <div className={local.nextDoseCard}>
            <div>
              <div className={styles.itemTitle}>{nextDose.medication.name}</div>
              <div className={styles.itemMeta}>{dateTimeLabel(nextDose.scheduledTime)}</div>
            </div>
            <strong className={local.countdown}>{countdownLabel(nextDose.scheduledTime, now)}</strong>
          </div>
        </section>
      )}

      {doseTab === "history" ? (
        <div className={styles.section}>
          {historyGroups.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Nothing logged yet</div>
              <div className={styles.emptySubtitle}>
                Once you&apos;ve logged a few doses, they&apos;ll show up here so today
                doesn&apos;t disappear once it&apos;s over.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {historyGroups.map((group) => (
                <div key={group.med.id} className={styles.item}>
                  <div className={styles.itemTitle}>{group.med.name}</div>
                  {group.adherence !== null && (
                    <div className={local.adherence}>{group.adherence}% taken on schedule (last 30 days)</div>
                  )}
                  <div className={local.historyGroup}>
                    {group.logs.map((log) => (
                      <div key={log.id} className={local.historyRow}>
                        <span className={styles.itemMeta}>{dateTimeLabel(log.scheduledTime ?? log.loggedAt)}</span>
                        <span>{STATUS_LABELS[log.status]}</span>
                        <button type="button" className={styles.linkButton} onClick={() => { if (window.confirm("Remove this dose record? Any linked supply count will be corrected too.")) void deleteMedicationLog(log.id); }}>Remove</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : slots.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Today</div>
          <div className={styles.list}>
            {slots
              .sort((a, b) => a.slotIso.localeCompare(b.slotIso))
              .map(({ med, slotIso }) => {
                const status = loggedStatusFor(med.id, slotIso);
                return (
                  <div key={med.id + slotIso} className={styles.item}>
                    <div className={styles.itemRow}>
                      <span className={styles.itemTitle}>{med.name}</span>
                      <span className={styles.itemMeta}>{timeLabel(slotIso)}</span>
                    </div>
                    {med.unit && <span className={styles.itemMeta}>{med.unit}</span>}
                    {status ? (
                      <span
                        className={styles.pill}
                        style={{
                          background:
                            status === "taken"
                              ? "color-mix(in srgb, var(--mint) 32%, var(--bg))"
                              : status === "skipped"
                              ? "color-mix(in srgb, var(--pink) 28%, var(--bg))"
                              : "color-mix(in srgb, var(--lavender) 28%, var(--bg))",
                        }}
                      >
                        <span
                          className={styles.pillDot}
                          style={{
                            background:
                              status === "taken"
                                ? "var(--mint)"
                                : status === "skipped"
                                ? "var(--pink)"
                                : "var(--lavender)",
                          }}
                        />
                        {status === "taken" ? "Taken" : status === "skipped" ? "Skipped" : "Delayed"}
                      </span>
                    ) : (
                      <div className={styles.doseActions}>
                        <button className={styles.doseButton} onClick={() => handleLog(med, slotIso, "taken")}>
                          Taken
                        </button>
                        <button className={styles.doseButton} onClick={() => handleLog(med, slotIso, "delayed")}>
                          Delayed
                        </button>
                        <button className={styles.doseButton} onClick={() => handleLog(med, slotIso, "skipped")}>
                          Skipped
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Your medications</div>
        {meds.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing added yet</div>
            <div className={styles.emptySubtitle}>
              Add a medication to keep a private record. Blossom never gives dose advice.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {meds.map((med) => {
              const medicationSupplies = allSupplies
                .filter((item) => item.medicationId === med.id)
                .sort((first, second) => first.createdAt.localeCompare(second.createdAt));
              const supply = currentMedicationSupply(med, medicationSupplies);
              const lowSupply = supply ? medicationSupplyIsLow(med, supply) : false;
              return <div key={med.id} className={styles.item}>
                <button type="button" className={styles.itemButton} onClick={() => setEditingMedication(med)}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemTitle}>{med.name}</span>
                    {med.route && <span className={styles.itemMeta}>{ROUTE_LABELS[med.route]}</span>}
                  </div>
                  <span className={styles.itemMeta}>
                    {med.unit ? med.unit + " · " : ""}
                    {med.frequency
                      ? `${med.frequency.times.join(", ")}${
                          med.frequency.intervalDays
                            ? ` every ${med.frequency.intervalDays} days`
                            : med.frequency.days
                            ? " on set days"
                            : " daily"
                        }`
                      : "No schedule"}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.supplyButton}
                  data-low-supply={lowSupply || undefined}
                  onClick={() => {
                    setSupplyMedication(med);
                    setSupplyToEdit(supply);
                    setCreatingSupply(false);
                  }}
                >
                  {supplyLabel(med)}
                </button>
                {medicationSupplies.length > 0 && (
                  <div className={local.supplyList} aria-label={`${med.name} supplies`}>
                    {medicationSupplies.map((item) => {
                      const isCurrent = item.id === supply?.id;
                      const days = estimatedMedicationSupplyDays(med, item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={local.supplyRow}
                          data-current={isCurrent || undefined}
                          onClick={() => {
                            setSupplyMedication(med);
                            setSupplyToEdit(item);
                            setCreatingSupply(false);
                          }}
                        >
                          <span>{item.label || (isCurrent ? "Current supply" : "Backup supply")}</span>
                          <span>{isCurrent ? "In use · " : ""}{days === null ? `${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(item.quantity)} ${item.supplyUnit}` : `around ${days} ${days === 1 ? "day" : "days"} left`}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  type="button"
                  className={styles.linkButton}
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => {
                    setSupplyMedication(med);
                    setSupplyToEdit(null);
                    setCreatingSupply(true);
                  }}
                >
                  + Add another supply
                </button>
                <button
                  type="button"
                  className={styles.linkButton}
                  style={{ alignSelf: "flex-start" }}
                  onClick={() => updateMedication(med.id, { active: false })}
                >
                  Archive
                </button>
              </div>;
            })}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + Add medication
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Other supplies</div>
        <p className={styles.sectionNote}>Keep practical items like needles, wipes or a sharps container in one private place.</p>
        {careSupplies.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing added yet</div>
            <div className={styles.emptySubtitle}>You can track what you have, plus renewal, delivery and expiry dates.</div>
          </div>
        ) : (
          <div className={styles.list}>
            {careSupplies.map((item) => {
              const needsAttention = careSupplyNeedsAttention(item);
              return (
                <button key={item.id} type="button" className={styles.supplyItemButton} data-low-supply={needsAttention || undefined} onClick={() => setCareSupply(item)}>
                  <span className={styles.itemTitle}>{item.name}</span>
                  <span className={styles.itemMeta}>{new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(item.quantity)} {item.supplyUnit}{needsAttention ? " · A check may be useful" : ""}</span>
                </button>
              );
            })}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setCareSupply("new")}>+ Add a supply</button>
      </div>

      {(sheetOpen || editingMedication) && (
        <AddMedicationSheet
          medication={editingMedication}
          onClose={() => {
            setSheetOpen(false);
            setEditingMedication(null);
          }}
        />
      )}
      {supplyMedication && (
        <MedicationSupplySheet
          medication={supplyMedication}
          supply={creatingSupply ? null : (supplyToEdit ?? currentMedicationSupply(supplyMedication, allSupplies))}
          hasOtherSupplies={allSupplies.filter((supply) => supply.medicationId === supplyMedication.id).length > 1}
          isCurrentSupply={!creatingSupply && (supplyToEdit?.id ?? currentMedicationSupply(supplyMedication, allSupplies)?.id) === currentMedicationSupply(supplyMedication, allSupplies)?.id}
          adjustments={creatingSupply ? [] : supplyAdjustments.filter((adjustment) => adjustment.supplyId === (supplyToEdit?.id ?? currentMedicationSupply(supplyMedication, allSupplies)?.id))}
          onClose={() => {
            setSupplyMedication(null);
            setSupplyToEdit(null);
            setCreatingSupply(false);
          }}
        />
      )}
      {careSupply && (
        <CareSupplySheet
          supply={careSupply === "new" ? null : careSupply}
          adjustments={careSupply === "new" ? [] : careSupplyAdjustments.filter((adjustment) => adjustment.supplyId === careSupply.id)}
          onClose={() => setCareSupply(null)}
        />
      )}
      {manualDoseOpen && <ManualDoseSheet medications={meds} onClose={() => setManualDoseOpen(false)} />}
    </div>
    </SensitiveModuleGate>
  );
}
