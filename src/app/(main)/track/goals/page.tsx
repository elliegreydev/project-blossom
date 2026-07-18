"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddGoalSheet from "@/components/AddGoalSheet";
import CompleteGoalSheet from "@/components/CompleteGoalSheet";
import { db, updateGoal, type Goal, type JourneyCategory } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./goals.module.css";

const CATEGORY_LABELS: Record<JourneyCategory, string> = {
  identity: "Identity",
  medical: "Medical",
  legal: "Legal",
  social: "Social",
  voice_presentation: "Voice & presentation",
};

export default function GoalsPage() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [tab, setTab] = useState<"list" | "byArea">("list");
  const [addOpen, setAddOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [completing, setCompleting] = useState<Goal | null>(null);

  if (goals === undefined) return null;

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");

  const byArea = new Map<JourneyCategory, Goal[]>();
  for (const goal of [...active, ...done]) {
    if (!goal.category) continue;
    const list = byArea.get(goal.category) ?? [];
    list.push(goal);
    byArea.set(goal.category, list);
  }
  const areaGroups = (Object.keys(CATEGORY_LABELS) as JourneyCategory[])
    .map((category) => ({ category, items: byArea.get(category) ?? [] }))
    .filter((group) => group.items.length > 0);

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Goals" backHref="/track" />

      {(active.length > 0 || done.length > 0) && (
        <div className={local.segmented}>
          <button
            className={`${local.segment} ${tab === "list" ? local.active : ""}`}
            onClick={() => setTab("list")}
          >
            List
          </button>
          <button
            className={`${local.segment} ${tab === "byArea" ? local.active : ""}`}
            onClick={() => setTab("byArea")}
          >
            By area
          </button>
        </div>
      )}

      {tab === "byArea" ? (
        <div className={styles.section}>
          {areaGroups.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No areas set yet</div>
              <div className={styles.emptySubtitle}>
                Give a goal an area when you add it, and it&apos;ll show up here grouped
                alongside the others in that part of your journey.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {areaGroups.map((group) => (
                <div key={group.category} className={styles.item}>
                  <div className={styles.itemTitle}>{CATEGORY_LABELS[group.category]}</div>
                  {group.items.map((goal) => (
                    <button
                      key={goal.id}
                      type="button"
                      className={styles.itemButton}
                      style={{ marginTop: 6 }}
                      onClick={() => setEditingGoal(goal)}
                    >
                      <div className={styles.itemRow}>
                        <span className={styles.itemMeta}>{goal.title}</span>
                        <span className={styles.itemMeta}>{goal.status === "completed" ? "Done" : "In progress"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
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
                    <button type="button" className={styles.itemButton} onClick={() => setEditingGoal(goal)}>
                      {goal.category && (
                        <span className={local.categoryTag}>{CATEGORY_LABELS[goal.category]}</span>
                      )}
                      <span className={styles.itemTitle}>{goal.title}</span>
                      {goal.target && <span className={styles.itemMeta}>{goal.target}</span>}
                    </button>
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
                    <button type="button" className={styles.itemButton} onClick={() => setEditingGoal(goal)}>
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
                      {goal.category && (
                        <span className={local.categoryTag}>{CATEGORY_LABELS[goal.category]}</span>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(addOpen || editingGoal) && (
        <AddGoalSheet
          goal={editingGoal}
          onClose={() => {
            setAddOpen(false);
            setEditingGoal(null);
          }}
        />
      )}
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
