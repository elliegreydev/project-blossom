"use client";

import { useMemo, useState } from "react";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { updateProfile, type Profile, type WeightUnit } from "@/lib/db";
import { defaultWeightUnit, gramsFromWeight, resolvedWeightUnit, weightFromGrams, weightUnitLabel, WEEKDAYS } from "@/lib/weight";

export default function WeightFoodSettingsSheet({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const resolvedUnit = useMemo(() => resolvedWeightUnit(profile.weightUnit, profile.region), [profile.region, profile.weightUnit]);
  const [weightEnabled, setWeightEnabled] = useState(profile.weightTrackingEnabled);
  const [caloriesEnabled, setCaloriesEnabled] = useState(profile.calorieTrackingEnabled);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(profile.weightUnit);
  const [goal, setGoal] = useState(profile.weightGoalGrams == null ? "" : weightFromGrams(profile.weightGoalGrams, resolvedUnit).toFixed(resolvedUnit === "st" ? 2 : 1));
  const [weightReminderEnabled, setWeightReminderEnabled] = useState(profile.weightReminderEnabled);
  const [weightReminderDay, setWeightReminderDay] = useState(profile.weightReminderDay);
  const [weightReminderTime, setWeightReminderTime] = useState(profile.weightReminderTime);
  const [calorieTarget, setCalorieTarget] = useState(profile.calorieTarget?.toString() ?? "");
  const [saving, setSaving] = useState(false);

  const activeUnit = resolvedWeightUnit(weightUnit, profile.region);
  function changeWeightUnit(next: WeightUnit) {
    const currentGoal = Number(goal);
    const nextUnit = resolvedWeightUnit(next, profile.region);
    if (Number.isFinite(currentGoal) && currentGoal > 0) {
      setGoal(weightFromGrams(gramsFromWeight(currentGoal, activeUnit), nextUnit).toFixed(nextUnit === "st" ? 2 : 1));
    }
    setWeightUnit(next);
  }

  async function save() {
    const parsedGoal = Number(goal);
    const parsedTarget = Number(calorieTarget);
    setSaving(true);
    await updateProfile({
      weightTrackingEnabled: weightEnabled,
      weightUnit,
      weightGoalGrams: weightEnabled && Number.isFinite(parsedGoal) && parsedGoal > 0 ? gramsFromWeight(parsedGoal, activeUnit) : null,
      weightReminderEnabled: weightEnabled && weightReminderEnabled,
      weightReminderDay,
      weightReminderTime,
      calorieTrackingEnabled: caloriesEnabled,
      calorieTarget: caloriesEnabled && Number.isFinite(parsedTarget) && parsedTarget > 0 ? Math.round(parsedTarget) : null,
    });
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div ref={dialogRef} className={styles.sheet} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="weight-food-settings-title">
        <div className={styles.grabber} />
        <h2 id="weight-food-settings-title" className={styles.title}>Weight &amp; food</h2>
        <p className={styles.helpText}>Both are optional, private to this device, and can be turned off at any time.</p>

        <div className={styles.field}>
          <label className={styles.label}><input type="checkbox" checked={weightEnabled} onChange={(event) => setWeightEnabled(event.target.checked)} /> Track weight</label>
        </div>

        {weightEnabled && <>
          <div className={styles.field}>
            <span className={styles.label}>Weight unit</span>
            <select className={styles.select} value={weightUnit} onChange={(event) => changeWeightUnit(event.target.value as WeightUnit)}>
              <option value="auto">Country default ({weightUnitLabel(defaultWeightUnit(profile.region))})</option>
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
              <option value="st">Stone (st)</option>
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Goal weight (optional)</span>
            <input type="number" inputMode="decimal" min="0" step="0.1" className={styles.input} value={goal} onChange={(event) => setGoal(event.target.value)} placeholder={`In ${weightUnitLabel(activeUnit)}`} />
            <span className={styles.fieldHint}>This is only a private reference. Blossom will never predict a date or tell you what you should weigh.</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}><input type="checkbox" checked={weightReminderEnabled} onChange={(event) => setWeightReminderEnabled(event.target.checked)} /> Optional weekly weight reminder</label>
            <span className={styles.fieldHint}>Only while Blossom is open and notifications are allowed. It stays off in Gentle Mode.</span>
          </div>
          {weightReminderEnabled && <div className={styles.field}>
            <span className={styles.label}>When</span>
            <div style={{ display: "flex", gap: 8 }}>
              <select className={styles.select} value={weightReminderDay} onChange={(event) => setWeightReminderDay(Number(event.target.value))} style={{ flex: 1 }}>
                {WEEKDAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
              </select>
              <input type="time" className={styles.input} value={weightReminderTime} onChange={(event) => setWeightReminderTime(event.target.value)} style={{ flex: 1 }} />
            </div>
          </div>}
        </>}

        <div className={styles.field}>
          <label className={styles.label}><input type="checkbox" checked={caloriesEnabled} onChange={(event) => setCaloriesEnabled(event.target.checked)} /> Log calories</label>
          <span className={styles.fieldHint}>A manual personal log only. No food database, dieting advice, deficit calculations or streaks.</span>
        </div>
        {caloriesEnabled && <div className={styles.field}>
          <span className={styles.label}>Daily reference (optional)</span>
          <input type="number" inputMode="numeric" min="0" step="1" className={styles.input} value={calorieTarget} onChange={(event) => setCalorieTarget(event.target.value)} placeholder="Leave blank for no target" />
          <span className={styles.fieldHint}>Gentle Mode hides calorie totals and this reference.</span>
        </div>}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.primaryButton} disabled={saving} onClick={save}>{saving ? "Saving…" : "Save preferences"}</button>
        </div>
      </div>
    </div>
  );
}
