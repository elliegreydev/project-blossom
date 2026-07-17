"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddMedicationSheet from "@/components/AddMedicationSheet";
import MedicationSupplySheet from "@/components/MedicationSupplySheet";
import {
  db,
  dueDosesToday,
  estimatedMedicationSupplyDays,
  logDose,
  medicationSupplyIsLow,
  type DoseStatus,
  type Medication,
} from "@/lib/db";
import styles from "@/components/feature.module.css";

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

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function MedicationPage() {
  const allMeds = useLiveQuery(() => db.medications.toArray(), []);
  const logs = useLiveQuery(() => db.medicationLogs.toArray(), []);
  const supplies = useLiveQuery(() => db.medicationSupplies.toArray(), []);
  const supplyAdjustments = useLiveQuery(() => db.medicationSupplyAdjustments.toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [supplyMedication, setSupplyMedication] = useState<Medication | null>(null);

  if (allMeds === undefined || logs === undefined || supplies === undefined || supplyAdjustments === undefined) return null;

  const meds = allMeds.filter((m) => m.active);
  const allSupplies = supplies;

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Build today's dose slots across all scheduled meds.
  const slots = meds.flatMap((med) =>
    dueDosesToday(med, now).map((slotIso) => ({ med, slotIso }))
  );

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
    const supply = allSupplies.find((item) => item.medicationId === medication.id);
    if (!supply) return "Set up supply tracking";
    const days = estimatedMedicationSupplyDays(medication, supply);
    if (medicationSupplyIsLow(medication, supply)) return "Supply: running low soon";
    if (days !== null) return `Supply: around ${days} ${days === 1 ? "day" : "days"} left`;
    return `Supply: ${new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(supply.quantity)} ${supply.supplyUnit}`;
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Medication" backHref="/track" />

      {slots.length > 0 && (
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
      )}

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
              const supply = allSupplies.find((item) => item.medicationId === med.id);
              const lowSupply = supply ? medicationSupplyIsLow(med, supply) : false;
              return <div key={med.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{med.name}</span>
                  {med.route && <span className={styles.itemMeta}>{ROUTE_LABELS[med.route]}</span>}
                </div>
                <span className={styles.itemMeta}>
                  {med.unit ? med.unit + " · " : ""}
                  {med.frequency
                    ? `${med.frequency.times.join(", ")}${med.frequency.days ? " on set days" : " daily"}`
                    : "No schedule"}
                </span>
                <button
                  type="button"
                  className={styles.supplyButton}
                  data-low-supply={lowSupply || undefined}
                  onClick={() => setSupplyMedication(med)}
                >
                  {supplyLabel(med)}
                </button>
              </div>;
            })}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + Add medication
        </button>
      </div>

      {sheetOpen && <AddMedicationSheet onClose={() => setSheetOpen(false)} />}
      {supplyMedication && (
        <MedicationSupplySheet
          medication={supplyMedication}
          supply={allSupplies.find((supply) => supply.medicationId === supplyMedication.id) ?? null}
          adjustments={supplyAdjustments.filter((adjustment) => adjustment.medicationId === supplyMedication.id)}
          onClose={() => setSupplyMedication(null)}
        />
      )}
    </div>
  );
}
