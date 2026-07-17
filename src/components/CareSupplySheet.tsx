"use client";

import { useState } from "react";
import styles from "./Sheet.module.css";
import supplyStyles from "./MedicationSupplySheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import {
  createCareSupply,
  setCareSupplyQuantity,
  updateCareSupply,
  type CareSupply,
  type CareSupplyAdjustment,
} from "@/lib/db";

const CATEGORIES = [
  ["injection", "Injection supply"],
  ["care", "Care supply"],
  ["other", "Other"],
] as const;

function displayNumber(value: number): string {
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 2 }).format(value);
}

function adjustmentLabel(adjustment: CareSupplyAdjustment): string {
  if (adjustment.kind === "initial") return "Supply tracking started";
  if (adjustment.kind === "restock") return "Stock added";
  if (adjustment.kind === "discarded") return "Amount discarded";
  return "Count updated";
}

export default function CareSupplySheet({
  supply,
  adjustments,
  onClose,
}: {
  supply: CareSupply | null;
  adjustments: CareSupplyAdjustment[];
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const [name, setName] = useState(supply?.name ?? "");
  const [category, setCategory] = useState<CareSupply["category"]>(supply?.category ?? "injection");
  const [quantity, setQuantity] = useState(String(supply?.quantity ?? ""));
  const [supplyUnit, setSupplyUnit] = useState(supply?.supplyUnit ?? "items");
  const [lowQuantity, setLowQuantity] = useState(supply?.lowQuantity == null ? "" : String(supply.lowQuantity));
  const [renewalDate, setRenewalDate] = useState(supply?.renewalDate ?? "");
  const [deliveryDate, setDeliveryDate] = useState(supply?.deliveryDate ?? "");
  const [expiryDate, setExpiryDate] = useState(supply?.expiryDate ?? "");
  const [provider, setProvider] = useState(supply?.provider ?? "");
  const [batchNumber, setBatchNumber] = useState(supply?.batchNumber ?? "");
  const [note, setNote] = useState(supply?.note ?? "");
  const [restockAmount, setRestockAmount] = useState("");
  const [exactAmount, setExactAmount] = useState("");
  const [saving, setSaving] = useState(false);

  const parsedQuantity = Number(quantity);
  const parsedLowQuantity = lowQuantity.trim() === "" ? null : Number(lowQuantity);
  const canSave =
    name.trim().length > 0 &&
    supplyUnit.trim().length > 0 &&
    (!supply ? Number.isFinite(parsedQuantity) && parsedQuantity >= 0 : true) &&
    (parsedLowQuantity === null || (Number.isFinite(parsedLowQuantity) && parsedLowQuantity >= 0));

  async function saveDetails() {
    if (!canSave) return;
    setSaving(true);
    const details = {
      name: name.trim(), category, supplyUnit: supplyUnit.trim(), lowQuantity: parsedLowQuantity,
      renewalDate: renewalDate || null, deliveryDate: deliveryDate || null, expiryDate: expiryDate || null,
      provider: provider.trim() || null, batchNumber: batchNumber.trim() || null, note: note.trim() || null,
    };
    if (supply) await updateCareSupply(supply.id, details);
    else await createCareSupply({ ...details, quantity: parsedQuantity });
    setSaving(false);
    onClose();
  }

  async function changeQuantity(kind: "restock" | "correction", value: string) {
    const amount = Number(value);
    if (!supply || !Number.isFinite(amount) || amount < 0 || (kind === "restock" && amount === 0)) return;
    setSaving(true);
    await setCareSupplyQuantity(supply, kind === "restock" ? supply.quantity + amount : amount, kind);
    setSaving(false);
    onClose();
  }

  const recentAdjustments = [...adjustments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="care-supply-sheet-title">
        <div className={styles.grabber} />
        <div className={supplyStyles.titleRow}>
          <div>
            <h2 id="care-supply-sheet-title" className={styles.title}>{supply ? "Supply item" : "Add a supply item"}</h2>
            <p className={supplyStyles.subtitle}>Private, practical organisation only.</p>
          </div>
          {supply && <strong className={supplyStyles.count}>{displayNumber(supply.quantity)} {supply.supplyUnit}</strong>}
        </div>

        {supply && (
          <section className={supplyStyles.adjustments} aria-label="Adjust supply">
            <div className={styles.field}>
              <label className={styles.label} htmlFor="care-supply-restock">Add stock</label>
              <div className={supplyStyles.inlineAction}>
                <input id="care-supply-restock" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={restockAmount} onChange={(event) => setRestockAmount(event.target.value)} placeholder={`How many ${supply.supplyUnit}?`} />
                <button type="button" className={supplyStyles.actionButton} disabled={saving || Number(restockAmount) <= 0} onClick={() => void changeQuantity("restock", restockAmount)}>Add</button>
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="care-supply-correction">Set exact count</label>
              <div className={supplyStyles.inlineAction}>
                <input id="care-supply-correction" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={exactAmount} onChange={(event) => setExactAmount(event.target.value)} placeholder="Correct the count" />
                <button type="button" className={styles.tertiaryButton} disabled={saving || exactAmount === "" || Number(exactAmount) < 0} onClick={() => void changeQuantity("correction", exactAmount)}>Update</button>
              </div>
            </div>
          </section>
        )}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="care-supply-name">What is this?</label>
          <input id="care-supply-name" className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Needles, alcohol wipes, sharps container" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="care-supply-category">Type</label>
          <select id="care-supply-category" className={styles.input} value={category} onChange={(event) => setCategory(event.target.value as CareSupply["category"])}>
            {CATEGORIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className={supplyStyles.dateGrid}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="care-supply-unit">What are you counting?</label>
            <input id="care-supply-unit" className={styles.input} value={supplyUnit} onChange={(event) => setSupplyUnit(event.target.value)} placeholder="e.g. needles, wipes" />
          </div>
          {!supply && <div className={styles.field}>
            <label className={styles.label} htmlFor="care-supply-quantity">How many do you have?</label>
            <input id="care-supply-quantity" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="0" />
          </div>}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="care-supply-buffer">A gentle heads-up at this count</label>
          <input id="care-supply-buffer" className={styles.input} type="number" inputMode="decimal" min="0" step="any" value={lowQuantity} onChange={(event) => setLowQuantity(event.target.value)} placeholder="Leave blank for no heads-up" />
        </div>
        <div className={supplyStyles.dateGrid}>
          <div className={styles.field}><label className={styles.label} htmlFor="care-supply-renewal">Renewal date</label><input id="care-supply-renewal" className={styles.input} type="date" value={renewalDate} onChange={(event) => setRenewalDate(event.target.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="care-supply-delivery">Expected delivery</label><input id="care-supply-delivery" className={styles.input} type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></div>
          <div className={styles.field}><label className={styles.label} htmlFor="care-supply-expiry">Expiry date</label><input id="care-supply-expiry" className={styles.input} type="date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} /></div>
        </div>
        <div className={styles.field}><label className={styles.label} htmlFor="care-supply-provider">Pharmacy or provider (optional)</label><input id="care-supply-provider" className={styles.input} value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Only if useful to you" /></div>
        <div className={styles.field}><label className={styles.label} htmlFor="care-supply-batch">Batch or lot number (optional)</label><input id="care-supply-batch" className={styles.input} value={batchNumber} onChange={(event) => setBatchNumber(event.target.value)} /></div>
        <div className={styles.field}><label className={styles.label} htmlFor="care-supply-note">Private note (optional)</label><textarea id="care-supply-note" className={styles.textarea} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Anything useful to remember" /></div>

        {supply && recentAdjustments.length > 0 && <section className={supplyStyles.history} aria-labelledby="care-supply-history-title"><h3 id="care-supply-history-title">Recent changes</h3>{recentAdjustments.map((adjustment) => <div key={adjustment.id} className={supplyStyles.historyRow}><span>{adjustmentLabel(adjustment)}</span><span>{adjustment.quantityChange > 0 ? "+" : ""}{displayNumber(adjustment.quantityChange)} / {new Date(adjustment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span></div>)}</section>}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={saving || !canSave} onClick={() => void saveDetails()}>{supply ? "Save details" : "Add supply"}</button>
        </div>
      </div>
    </div>
  );
}
