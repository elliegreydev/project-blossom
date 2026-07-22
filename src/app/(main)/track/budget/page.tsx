"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddBudgetEntrySheet from "@/components/AddBudgetEntrySheet";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import {
  db,
  deleteBudgetEntry,
  addBudgetGoal,
  addToBudgetGoalSaved,
  deleteBudgetGoal,
  type BudgetCategory,
  type BudgetEntry,
} from "@/lib/db";
import styles from "@/components/feature.module.css";

const CATEGORY_LABELS: Record<BudgetCategory, string> = {
  hrt: "HRT",
  surgery: "Surgery",
  legal: "Legal",
  other: "Other",
};
const CURRENCY = "£";

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function money(amount: number): string {
  return `${CURRENCY}${amount.toFixed(2)}`;
}

export default function BudgetPage() {
  const entries = useLiveQuery(() => db.budgetEntries.orderBy("date").reverse().toArray(), []);
  const goals = useLiveQuery(() => db.budgetGoals.toArray(), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BudgetEntry | null>(null);
  const [activeCategory, setActiveCategory] = useState<BudgetCategory | null>(null);

  const [newGoalLabel, setNewGoalLabel] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);
  const [savingsInputFor, setSavingsInputFor] = useState<string | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("");
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  if (entries === undefined || goals === undefined) return null;

  const visibleGoals = goals.filter((goal) => !isPendingRemoval(goal.id));
  const visibleEntries = entries.filter((entry) => !isPendingRemoval(entry.id) && (!activeCategory || entry.category === activeCategory));
  const total = visibleEntries.reduce((sum, e) => sum + e.amount, 0);

  async function createGoal() {
    const target = Number(newGoalTarget);
    if (!newGoalLabel.trim() || !Number.isFinite(target) || target <= 0) return;
    setAddingGoal(true);
    await addBudgetGoal({ label: newGoalLabel.trim(), targetAmount: target });
    setAddingGoal(false);
    setNewGoalLabel("");
    setNewGoalTarget("");
  }

  async function addSavings(goalId: string) {
    const amount = Number(savingsAmount);
    if (!Number.isFinite(amount) || amount === 0) return;
    await addToBudgetGoalSaved(goalId, amount);
    setSavingsInputFor(null);
    setSavingsAmount("");
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Budget" backHref="/track" />
      <p className={styles.pageSubtitle} style={{ marginTop: -10 }}>
        A private record of transition-related costs and savings goals. Nothing here is compared
        against anyone else&apos;s numbers or pace - it&apos;s just yours.
      </p>

      <div className={styles.section} style={{ borderTop: "none", paddingTop: 0 }}>
        <div className={styles.sectionTitle}>Savings goals</div>
        {visibleGoals.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No goals yet</div>
            <div className={styles.emptySubtitle}>Set one whenever it feels useful - a surgery fund, a legal fee pot, anything.</div>
          </div>
        )}
        <div className={styles.list}>
          {visibleGoals.map((goal) => {
            const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
            return (
              <div key={goal.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{goal.label}</span>
                  <button type="button" className={styles.linkButton} onClick={() => stageRemoval(goal.id, "This savings goal", () => deleteBudgetGoal(goal.id))}>
                    Remove
                  </button>
                </div>
                <span className={styles.itemMeta}>
                  {money(goal.savedAmount)} of {money(goal.targetAmount)} ({pct}%)
                </span>
                <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "var(--mint)", borderRadius: 999 }} />
                </div>
                {savingsInputFor === goal.id ? (
                  <div className={styles.doseActions}>
                    <input
                      className={styles.itemBody}
                      style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", width: 100 }}
                      type="number"
                      inputMode="decimal"
                      value={savingsAmount}
                      onChange={(e) => setSavingsAmount(e.target.value)}
                      placeholder="Amount"
                      autoFocus
                    />
                    <button type="button" className={styles.doseButton} onClick={() => addSavings(goal.id)}>Add</button>
                    <button type="button" className={styles.linkButton} onClick={() => setSavingsInputFor(null)}>Cancel</button>
                  </div>
                ) : (
                  <div className={styles.doseActions}>
                    <button type="button" className={styles.doseButton} onClick={() => setSavingsInputFor(goal.id)}>+ Add savings</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.item}>
          <span className={styles.itemTitle}>New goal</span>
          <div className={styles.doseActions}>
            <input
              className={styles.itemBody}
              style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", flex: 1, minWidth: 120 }}
              value={newGoalLabel}
              onChange={(e) => setNewGoalLabel(e.target.value)}
              placeholder="e.g. Surgery fund"
            />
            <input
              className={styles.itemBody}
              style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", width: 110 }}
              type="number"
              inputMode="decimal"
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(e.target.value)}
              placeholder="Target"
            />
            <button type="button" className={styles.doseButton} disabled={addingGoal} onClick={createGoal}>
              {addingGoal ? "Adding…" : "+ Add goal"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Expenses</div>

        <div className={styles.doseActions}>
          <button type="button" className={styles.doseButton} style={activeCategory === null ? { borderColor: "var(--lavender)" } : undefined} onClick={() => setActiveCategory(null)}>
            All
          </button>
          {(Object.keys(CATEGORY_LABELS) as BudgetCategory[]).map((c) => (
            <button
              key={c}
              type="button"
              className={styles.doseButton}
              style={activeCategory === c ? { borderColor: "var(--lavender)" } : undefined}
              onClick={() => setActiveCategory(c)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <span className={styles.itemMeta}>Total: {money(total)}</span>

        {visibleEntries.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>Nothing logged yet</div>
            <div className={styles.emptySubtitle}>Log a cost whenever one comes up. Skipping stretches of time is completely fine.</div>
          </div>
        ) : (
          <div className={styles.list}>
            {visibleEntries.map((entry) => (
              <div key={entry.id} className={styles.item}>
                <button type="button" className={styles.itemButton} onClick={() => setEditingEntry(entry)}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemTitle}>{money(entry.amount)}</span>
                    <span className={styles.itemMeta}>{CATEGORY_LABELS[entry.category]} · {dateLabel(entry.date)}</span>
                  </div>
                  {entry.description && <span className={styles.itemMeta}>{entry.description}</span>}
                </button>
                <button type="button" className={styles.linkButton} onClick={() => stageRemoval(entry.id, "This expense", () => deleteBudgetEntry(entry.id))}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setSheetOpen(true)}>
          + Add expense
        </button>
      </div>

      {(sheetOpen || editingEntry) && (
        <AddBudgetEntrySheet
          entry={editingEntry}
          onClose={() => {
            setSheetOpen(false);
            setEditingEntry(null);
          }}
        />
      )}
      {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
    </div>
  );
}
