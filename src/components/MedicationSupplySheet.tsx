"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import supplyStyles from "./MedicationSupplySheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import {
  createMedicationSupply,
  setMedicationSupplyQuantity,
  updateMedicationSupply,
  type Medication,
  type MedicationSupply,
  type MedicationSupplyAdjustment,
} from "@/lib/db";

function displayNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

function adjustmentLabel(adjustment: MedicationSupplyAdjustment): string {
  if (adjustment.kind === "initial") return "Supply tracking started";
  if (adjustment.kind === "restock") return "Stock added";
  if (adjustment.kind === "discarded") return "Amount discarded";
  if (adjustment.kind === "dose") return "Dose logged";
  return "Count updated";
}

export default function MedicationSupplySheet({
  medication,
  supply,
  adjustments,
  onClose,
}: {
  medication: Medication;
  supply: MedicationSupply | null;
  adjustments: MedicationSupplyAdjustment[];
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [quantity, setQuantity] = useState(String(supply?.quantity ?? ""));
  const [supplyUnit, setSupplyUnit] = useState(supply?.supplyUnit ?? "items");
  const [amountPerDose, setAmountPerDose] = useState(String(supply?.amountPerDose ?? "1"));
  const [lowSupplyDays, setLowSupplyDays] = useState(supply?.lowSupplyDays === null || supply?.lowSupplyDays === undefined ? "7" : String(supply.lowSupplyDays));
  const [renewalDate, setRenewalDate] = useState(supply?.renewalDate ?? "");
  const [expiryDate, setExpiryDate] = useState(supply?.expiryDate ?? "");
  const [pharmacy, setPharmacy] = useState(supply?.pharmacy ?? "");
  const [note, setNote] = useState(supply?.note ?? "");
  const [restockAmount, setRestockAmount] = useState("");
  const [exactAmount, setExactAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedQuantity = Number(quantity);
  const parsedAmountPerDose = Number(amountPerDose);
  const parsedLowSupplyDays = lowSupplyDays.trim() === "" ? null : Number(lowSupplyDays);
  const canSave =
    (!supply ? Number.isFinite(parsedQuantity) && parsedQuantity >= 0 : true) &&
    supplyUnit.trim().length > 0 &&
    Number.isFinite(parsedAmountPerDose) &&
    parsedAmountPerDose > 0 &&
    (parsedLowSupplyDays === null || (Number.isInteger(parsedLowSupplyDays) && parsedLowSupplyDays >= 0));

  async function saveDetails() {
    if (!canSave) return;
    setSaving(true);
    const details = {
      supplyUnit: supplyUnit.trim(),
      amountPerDose: parsedAmountPerDose,
      lowSupplyDays: parsedLowSupplyDays,
      renewalDate: renewalDate || null,
      expiryDate: expiryDate || null,
      pharmacy: pharmacy.trim() || null,
      note: note.trim() || null,
    };
    if (supply) {
      await updateMedicationSupply(supply.id, details);
    } else {
      await createMedicationSupply({ medicationId: medication.id, quantity: parsedQuantity, ...details });
    }
    setSaving(false);
    onClose();
  }

  async function addStock() {
    const amount = Number(restockAmount);
    if (!supply || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true);
    await setMedicationSupplyQuantity(supply, supply.quantity + amount, "restock");
    setSaving(false);
    onClose();
  }

  async function updateCount() {
    const amount = Number(exactAmount);
    if (!supply || !Number.isFinite(amount) || amount < 0) return;
    setSaving(true);
    await setMedicationSupplyQuantity(supply, amount, "correction");
    setSaving(false);
    onClose();
  }

  const recentAdjustments = [...adjustments]
    .sort((first, second) => second.createdAt.localeCompare(first.createdAt))
    .slice(0, 4);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="supply-sheet-title">
        <div className={styles.grabber} />
        <div className={supplyStyles.titleRow}>
          <div>
            <h2 id="supply-sheet-title" className={styles.title}>{supply ? "Medication supply" : "Set up supply tracking"}</h2>
            <p className={supplyStyles.subtitle}>{medication.name}</p>
          </div>
          {supply && <strong className={supplyStyles.count}>{displayNumber(supply.quantity)} {supply.supplyUnit}</strong>}
        </div>

        {!supply && (
          <p className={supplyStyles.explainer}>
            Blossom will only reduce this count when you mark a dose as taken. It never changes your schedule or gives dose advice.
          </p>
        )}

        {supply && (
          <section className={supplyStyles.adjustments} aria-label="Adjust supply">
            <div className={styles.field}>
              <label className={styles.label} htmlFor="supply-restock">Add stock</label>
              <div className={supplyStyles.inlineAction}>
                <input id="supply-restock" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={restockAmount} onChange={(event) => setRestockAmount(event.target.value)} placeholder={`How many ${supply.supplyUnit}?`} />
                <button type="button" className={supplyStyles.actionButton} disabled={saving || Number(restockAmount) <= 0} onClick={() => void addStock()}>Add</button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="supply-correction">Set exact count</label>
              <div className={supplyStyles.inlineAction}>
                <input id="supply-correction" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={exactAmount} onChange={(event) => setExactAmount(event.target.value)} placeholder="Correct the count" />
                <button type="button" className={styles.tertiaryButton} disabled={saving || exactAmount === "" || Number(exactAmount) < 0} onClick={() => void updateCount()}>Update</button>
              </div>
            </div>
          </section>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="supply-unit">What are you counting?</label>
          <input id="supply-unit" className={styles.input} value={supplyUnit} onChange={(event) => setSupplyUnit(event.target.value)} placeholder="e.g. tablets, patches, ml" />
        </div>

        {!supply && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="supply-quantity">How many do you have now?</label>
            <input id="supply-quantity" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" />
          </div>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="supply-per-dose">How many are used when you log one dose?</label>
          <input id="supply-per-dose" className={styles.input} type="number" inputMode="decimal" min="0.01" step="any" value={amountPerDose} onChange={(event) => setAmountPerDose(event.target.value)} placeholder="1" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="supply-buffer">A gentle heads-up when about this many days remain</label>
          <input id="supply-buffer" className={styles.input} type="number" inputMode="numeric" min="0" step="1" value={lowSupplyDays} onChange={(event) => setLowSupplyDays(event.target.value)} placeholder="Leave blank for no heads-up" />
        </div>

        <div className={supplyStyles.dateGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="supply-renewal">Renewal date (optional)</label>
            <input id="supply-renewal" className={styles.input} type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="supply-expiry">Expiry date (optional)</label>
            <input id="supply-expiry" className={styles.input} type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="supply-pharmacy">Pharmacy or provider (optional)</label>
          <input id="supply-pharmacy" className={styles.input} value={pharmacy} onChange={(event) => setPharmacy(event.target.value)} placeholder="Only if it is useful to you" />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="supply-note">Private note (optional)</label>
          <textarea id="supply-note" className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful to remember" />
        </div>

        {supply && recentAdjustments.length > 0 && (
          <section className={supplyStyles.history} aria-labelledby="supply-history-title">
            <h3 id="supply-history-title">Recent changes</h3>
            {recentAdjustments.map((adjustment) => (
              <div key={adjustment.id} className={supplyStyles.historyRow}>
                <span>{adjustmentLabel(adjustment)}</span>
                <span>{adjustment.quantityChange > 0 ? "+" : ""}{displayNumber(adjustment.quantityChange)} · {new Date(adjustment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
              </div>
            ))}
          </section>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={saving || !canSave} onClick={() => void saveDetails()}>
            {supply ? "Save details" : "Start tracking"}
          </button>
        </div>
      </div>
    </div>
  );
}
