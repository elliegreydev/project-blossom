"use client";

import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import styles from "./Sheet.module.css";
import { useSheetDialog } from "./useSheetDialog";
import { db, addVoiceSession } from "@/lib/db";
import { isRecordingSupported, requestMicStream, stopStream } from "@/lib/audioRecorder";

const MAX_RECORDING_SECONDS = 180;

type RecordingState = "idle" | "recording" | "recorded" | "unavailable";

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LogVoiceSessionSheet({
  goalId,
  onClose,
}: {
  goalId?: string;
  onClose: () => void;
}) {
  const dialogRef = useSheetDialog(onClose);
  const goals = useLiveQuery(() => db.voiceGoals.toArray(), []);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(goalId ?? null);
  const [sessionDuration, setSessionDuration] = useState("");
  const [comfortRating, setComfortRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (streamRef.current) stopStream(streamRef.current);
    };
  }, []);

  useEffect(() => {
    if (!recordingBlob) {
      setPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordingBlob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordingBlob]);

  async function startRecording() {
    if (!isRecordingSupported()) {
      setRecordingState("unavailable");
      return;
    }
    try {
      const stream = await requestMicStream();
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setRecordingBlob(blob);
        setRecordingState("recorded");
        if (streamRef.current) {
          stopStream(streamRef.current);
          streamRef.current = null;
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setElapsedSeconds(0);
      setRecordingState("recording");
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_RECORDING_SECONDS) stopRecording();
          return next;
        });
      }, 1000);
    } catch {
      setRecordingState("unavailable");
    }
  }

  function stopRecording() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  }

  function discardRecording() {
    setRecordingBlob(null);
    setRecordingState("idle");
    setElapsedSeconds(0);
  }

  if (goals === undefined) return null;

  const activeGoalId = selectedGoalId ?? goals[0]?.id ?? null;

  async function save() {
    if (!activeGoalId) return;
    setSaving(true);
    await addVoiceSession({
      goalId: activeGoalId,
      sessionDuration: sessionDuration.trim() || null,
      comfortRating,
      note: note.trim() || null,
      recording: recordingBlob,
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-session-sheet-title"
      >
        <div className={styles.grabber} />
        <h2 id="voice-session-sheet-title" className={styles.title}>
          Log a practice session
        </h2>

        {goals.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Add a practice goal first, then you can log sessions against it.
          </p>
        ) : (
          <>
            <div className={styles.field}>
              <span className={styles.label}>Which goal?</span>
              <div className={styles.chipRow}>
                {goals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className={`${styles.chip} ${activeGoalId === g.id ? styles.selected : ""}`}
                    onClick={() => setSelectedGoalId(g.id)}
                  >
                    {g.title}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>How long did you practice? (optional)</span>
              <input
                className={styles.input}
                value={sessionDuration}
                onChange={(e) => setSessionDuration(e.target.value)}
                placeholder="e.g. 10 minutes"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Comfort (optional)</span>
              <div className={styles.chipRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.chip} ${comfortRating === n ? styles.selected : ""}`}
                    onClick={() => setComfortRating(comfortRating === n ? null : n)}
                    style={{ minWidth: 40, justifyContent: "center" }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Note (optional)</span>
              <textarea
                className={styles.textarea}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Whatever's useful to remember"
              />
            </div>

            <div className={styles.field}>
              <span className={styles.label}>Record a clip (optional)</span>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 8px" }}>
                Just for you to listen back to - stays on this device, never analysed, never synced.
              </p>
              {recordingState === "idle" && (
                <button type="button" className={styles.tertiaryButton} style={{ alignSelf: "flex-start" }} onClick={() => void startRecording()}>
                  🎙 Start recording
                </button>
              )}
              {recordingState === "recording" && (
                <button type="button" className={styles.primaryButton} style={{ alignSelf: "flex-start" }} onClick={stopRecording}>
                  ⏹ Stop ({formatElapsed(elapsedSeconds)})
                </button>
              )}
              {recordingState === "recorded" && playbackUrl && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio controls src={playbackUrl} style={{ width: "100%" }} />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="button" className={styles.tertiaryButton} onClick={discardRecording}>
                      Remove
                    </button>
                    <button type="button" className={styles.tertiaryButton} onClick={() => void startRecording()}>
                      Record again
                    </button>
                  </div>
                </div>
              )}
              {recordingState === "unavailable" && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  Couldn&apos;t access your microphone - you can still save this session without a recording.
                </p>
              )}
            </div>
          </>
        )}

        <div className={styles.actions}>
          <button type="button" className={styles.tertiaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!activeGoalId || saving}
            onClick={() => void save()}
          >
            Save session
          </button>
        </div>
      </div>
    </div>
  );
}
