"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddVoiceGoalSheet from "@/components/AddVoiceGoalSheet";
import LogVoiceSessionSheet from "@/components/LogVoiceSessionSheet";
import LivePitchView from "@/components/LivePitchView";
import UndoRemovalNotice from "@/components/UndoRemovalNotice";
import { useUndoableRemoval } from "@/components/useUndoableRemoval";
import { db, deleteVoiceGoal, deleteVoiceSession, type VoiceGoal, type VoicePracticeCategory } from "@/lib/db";
import TrendChart from "@/components/TrendChart";
import styles from "@/components/feature.module.css";
import local from "./voice.module.css";

function RecordingPlayback({ recording }: { recording: Blob }) {
  const url = useMemo(() => URL.createObjectURL(recording), [recording]);

  useEffect(() => {
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return <audio controls src={url} style={{ width: "100%", marginTop: 6 }} />;
}

const CATEGORY_LABELS: Record<VoicePracticeCategory, string> = {
  pitch: "Pitch",
  resonance: "Resonance",
  breathing: "Breathing",
  articulation: "Articulation",
  projection: "Projection",
  confidence: "Confidence",
};

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function VoicePracticePage() {
  const [tab, setTab] = useState<"goals" | "sessions" | "progress">("goals");
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<VoiceGoal | null>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [pitchViewOpen, setPitchViewOpen] = useState(false);
  const { pendingRemoval, stageRemoval, undoRemoval, isPendingRemoval } = useUndoableRemoval();

  const goals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const sessions = useLiveQuery(() => db.voiceSessions.orderBy("createdAt").reverse().toArray(), []);

  if (goals === undefined || sessions === undefined) return null;

  const visibleGoals = goals.filter((goal) => !isPendingRemoval(goal.id));
  const visibleSessions = sessions.filter((session) => !isPendingRemoval(session.id));
  const goalTitle = (goalId: string) => visibleGoals.find((g) => g.id === goalId)?.title ?? "Deleted goal";

  const sessionsByGoal = new Map<string, typeof sessions>();
  for (const session of visibleSessions) {
    const list = sessionsByGoal.get(session.goalId) ?? [];
    list.push(session);
    sessionsByGoal.set(session.goalId, list);
  }
  const sessionGroups = [...sessionsByGoal.entries()]
    .map(([goalId, items]) => ({ goalId, items }))
    .sort((a, b) => (b.items[0]?.createdAt ?? "").localeCompare(a.items[0]?.createdAt ?? ""));

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Voice practice" backHref="/track" />

      <div className={local.segmented}>
        <button
          className={`${local.segment} ${tab === "goals" ? local.active : ""}`}
          onClick={() => setTab("goals")}
        >
          Goals
        </button>
        <button
          className={`${local.segment} ${tab === "sessions" ? local.active : ""}`}
          onClick={() => setTab("sessions")}
        >
          Practice log
        </button>
        <button
          className={`${local.segment} ${tab === "progress" ? local.active : ""}`}
          onClick={() => setTab("progress")}
        >
          Progress
        </button>
      </div>

      <button type="button" className={local.pitchViewButton} onClick={() => setPitchViewOpen(true)}>
        🎤 Live pitch view
      </button>

      {tab === "progress" ? (
        <div className={styles.section}>
          {sessionGroups.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Nothing to show yet</div>
              <div className={styles.emptySubtitle}>
                Once you&apos;ve logged a few sessions, they&apos;ll show up here per goal so you
                can look back over time.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {sessionGroups.map((group) => {
                const withComfort = group.items.filter((s) => s.comfortRating !== null);
                const avgComfort =
                  withComfort.length > 0
                    ? withComfort.reduce((sum, s) => sum + (s.comfortRating ?? 0), 0) / withComfort.length
                    : null;
                const comfortPoints = withComfort.map((s) => ({ date: s.createdAt, value: s.comfortRating as number }));
                const pitchBand = group.items
                  .filter((s) => s.pitchLowHz !== null && s.pitchHighHz !== null)
                  .map((s) => ({ date: s.createdAt, low: s.pitchLowHz as number, high: s.pitchHighHz as number }));
                return (
                  <div key={group.goalId} className={styles.item}>
                    <div className={styles.itemTitle}>{goalTitle(group.goalId)}</div>
                    {avgComfort !== null && (
                      <div className={local.trendAverage}>Average comfort {avgComfort.toFixed(1)}/5</div>
                    )}
                    <TrendChart points={comfortPoints} min={1} max={5} />
                    {pitchBand.length >= 2 && (
                      <>
                        <div className={local.trendAverage} style={{ marginTop: 8 }}>Pitch range</div>
                        <TrendChart band={pitchBand} color="var(--sky)" />
                      </>
                    )}
                    <div className={local.trendGroup}>
                      {group.items.map((s) => (
                        <div key={s.id} className={local.trendRow}>
                          <span className={styles.itemMeta}>{dateLabel(s.createdAt)}</span>
                          <span>
                            {[
                              s.comfortRating ? `Comfort ${s.comfortRating}/5` : null,
                              s.pitchLowHz !== null && s.pitchHighHz !== null ? `≈${s.pitchLowHz}–${s.pitchHighHz} Hz` : null,
                            ]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : tab === "goals" ? (
        <div className={styles.section}>
          {visibleGoals.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No practice goals yet</div>
              <div className={styles.emptySubtitle}>
                Set your own pace. There&apos;s no score here and nothing to
                compare against.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {visibleGoals.map((goal) => (
                <div key={goal.id} className={styles.item}>
                  <button type="button" className={styles.itemButton} onClick={() => setEditingGoal(goal)}>
                    <span className={local.categoryTag}>{CATEGORY_LABELS[goal.category]}</span>
                    <span className={styles.itemTitle}>{goal.title}</span>
                    {(goal.targetFrequency || goal.targetDuration) && (
                      <span className={styles.itemMeta}>
                        {[goal.targetFrequency, goal.targetDuration].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </button>
                  <div className={styles.doseActions}>
                    <button
                      className={styles.doseButton}
                      onClick={() => {
                        setTab("sessions");
                        setSessionSheetOpen(true);
                      }}
                    >
                      Log session
                    </button>
                    <button className={styles.linkButton} onClick={() => stageRemoval(goal.id, "This voice practice goal and its sessions", () => deleteVoiceGoal(goal.id))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setGoalSheetOpen(true)}>
            + Add goal
          </button>
        </div>
      ) : (
        <div className={styles.section}>
          {visibleSessions.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>Nothing logged yet</div>
              <div className={styles.emptySubtitle}>
                Log a session whenever you practice. Skipping days is fine.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {sessionGroups.map((group) => (
                <div key={group.goalId} className={styles.item}>
                  <div className={styles.itemTitle}>{goalTitle(group.goalId)}</div>
                  {group.items.map((session) => (
                    <div key={session.id} style={{ marginTop: 8 }}>
                      <div className={styles.itemRow}>
                        <span className={styles.itemMeta}>{dateLabel(session.createdAt)}</span>
                        <button className={styles.linkButton} onClick={() => stageRemoval(session.id, "This voice session", () => deleteVoiceSession(session.id))}>
                          Remove
                        </button>
                      </div>
                      <span className={styles.itemMeta}>
                        {[
                          session.sessionDuration,
                          session.comfortRating ? `Comfort ${session.comfortRating}/5` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      {session.note && <div className={styles.itemBody}>{session.note}</div>}
                      {session.recording && <RecordingPlayback recording={session.recording} />}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
          <button className={styles.addButton} onClick={() => setSessionSheetOpen(true)}>
            + Log session
          </button>
        </div>
      )}

      {(goalSheetOpen || editingGoal) && (
        <AddVoiceGoalSheet
          goal={editingGoal}
          onClose={() => {
            setGoalSheetOpen(false);
            setEditingGoal(null);
          }}
        />
      )}
      {sessionSheetOpen && <LogVoiceSessionSheet onClose={() => setSessionSheetOpen(false)} />}
      {pitchViewOpen && <LivePitchView onClose={() => setPitchViewOpen(false)} />}
      {pendingRemoval && <UndoRemovalNotice label={pendingRemoval.label} onUndo={undoRemoval} />}
    </div>
  );
}
