"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddGoalSheet from "@/components/AddGoalSheet";
import CompleteGoalSheet from "@/components/CompleteGoalSheet";
import { db, updateGoal, type Goal } from "@/lib/db";
import styles from "@/components/feature.module.css";

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [addOpen, setAddOpen] = useState(false);
  const [completing, setCompleting] = useState<Goal | null>(null);

  if (goals === undefined) return null;

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Goals" backHref="/track" />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Working on</div>
        {active.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>No goals yet</div>
            <div className={styles.emptySubtitle}>
              A goal is something you intend to do. When you finish one, you can turn it
              into a milestone.
            </div>
          </div>
        ) : (
          <div className={styles.list}>
            {active.map((goal) => (
              <div key={goal.id} className={styles.item}>
                <span className={styles.itemTitle}>{goal.title}</span>
                {goal.target && <span className={styles.itemMeta}>{goal.target}</span>}
                <div className={styles.doseActions}>
                  <button className={styles.doseButton} onClick={() => setCompleting(goal)}>
                    Mark complete
                  </button>
                  <button
                    className={styles.linkButton}
                    onClick={() => updateGoal(goal.id, { status: "archived" })}
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <button className={styles.addButton} onClick={() => setAddOpen(true)}>
          + Add goal
        </button>
      </div>

      {done.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Completed</div>
          <div className={styles.list}>
            {done.map((goal) => (
              <div key={goal.id} className={styles.item}>
                <div className={styles.itemRow}>
                  <span className={styles.itemTitle}>{goal.title}</span>
                  <span
                    className={styles.pill}
                    style={{ background: "color-mix(in srgb, var(--mint) 32%, var(--bg))" }}
                  >
                    <span className={styles.pillDot} style={{ background: "var(--mint)" }} />
                    Done
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {addOpen && <AddGoalSheet onClose={() => setAddOpen(false)} />}
      {completing && (
        <CompleteGoalSheet
          goalId={completing.id}
          goalTitle={completing.title}
          onClose={() => setCompleting(null)}
        />
      )}
    </div>
  );
}
