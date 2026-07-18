"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import AddVoiceGoalSheet from "@/components/AddVoiceGoalSheet";
import LogVoiceSessionSheet from "@/components/LogVoiceSessionSheet";
import LivePitchView from "@/components/LivePitchView";
import { db, deleteVoiceGoal, deleteVoiceSession, type VoiceGoal, type VoicePracticeCategory } from "@/lib/db";
import styles from "@/components/feature.module.css";
import local from "./voice.module.css";

function RecordingPlayback({ recording }: { recording: Blob }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(recording);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [recording]);

  if (!url) return null;
  // eslint-disable-next-line jsx-a11y/media-has-caption
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
  const [tab, setTab] = useState<"goals" | "sessions">("goals");
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<VoiceGoal | null>(null);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [pitchViewOpen, setPitchViewOpen] = useState(false);

  const goals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const sessions = useLiveQuery(() => db.voiceSessions.orderBy("createdAt").reverse().toArray(), []);

  if (goals === undefined || sessions === undefined) return null;

  const goalTitle = (goalId: string) => goals.find((g) => g.id === goalId)?.title ?? "Deleted goal";

  const sessionsByGoal = new Map<string, typeof sessions>();
  for (const session of sessions) {
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
      </div>

      <button type="button" className={local.pitchViewButton} onClick={() => setPitchViewOpen(true)}>
        🎤 Live pitch view
      </button>

      {tab === "goals" ? (
        <div className={styles.section}>
          {goals.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyTitle}>No practice goals yet</div>
              <div className={styles.emptySubtitle}>
                Set your own pace. There&apos;s no score here and nothing to
                compare against.
              </div>
            </div>
          ) : (
            <div className={styles.list}>
              {goals.map((goal) => (
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
                    <button className={styles.linkButton} onClick={() => deleteVoiceGoal(goal.id)}>
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
          {sessions.length === 0 ? (
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
                        <button className={styles.linkButton} onClick={() => deleteVoiceSession(session.id)}>
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
    </div>
  );
}
