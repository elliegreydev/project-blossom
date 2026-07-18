"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Sheet.module.css";
import local from "./LivePitchView.module.css";
import Toggle from "./Toggle";
import { useSheetDialog } from "./useSheetDialog";
import { isLiveAnalysisSupported, requestMicStream, stopStream } from "@/lib/audioRecorder";
import { detectPitch } from "@/lib/pitchDetection";

// Vertical range the trail maps across - wide enough to cover typical
// speaking pitch without implying any specific target within it.
const MIN_DISPLAY_HZ = 70;
const MAX_DISPLAY_HZ = 350;
const SMOOTHING_WINDOW = 5;
const TRAIL_LENGTH = 200;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 220;

type Status = "loading" | "listening" | "denied" | "unsupported";

export default function LivePitchView({ onClose }: { onClose: () => void }) {
  const dialogRef = useSheetDialog(onClose);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [showNumber, setShowNumber] = useState(false);
  const [currentHz, setCurrentHz] = useState<number | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef<number | null>(null);
  const recentRef = useRef<number[]>([]); // rolling raw readings, used only for smoothing
  const trailRef = useRef<number[]>([]); // smoothed readings kept for the visual trail

  useEffect(() => {
    if (!isLiveAnalysisSupported()) {
      setStatus("unsupported");
      return;
    }

    let cancelled = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await requestMicStream();
      } catch {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (cancelled) {
        stopStream(stream);
        return;
      }
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      const buffer = new Float32Array(analyser.fftSize);

      setStatus("listening");

      const tick = () => {
        analyser.getFloatTimeDomainData(buffer);
        const pitch = detectPitch(buffer, audioCtx.sampleRate);

        recentRef.current.push(pitch ?? NaN);
        if (recentRef.current.length > SMOOTHING_WINDOW) recentRef.current.shift();
        const valid = recentRef.current.filter((v) => !Number.isNaN(v));
        const smoothed = valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : null;

        setCurrentHz(smoothed);
        trailRef.current.push(smoothed ?? NaN);
        if (trailRef.current.length > TRAIL_LENGTH) trailRef.current.shift();
        drawTrail(canvasRef.current, trailRef.current);

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) stopStream(streamRef.current);
      if (audioCtxRef.current) void audioCtxRef.current.close();
    };
  }, []);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={dialogRef}
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-pitch-title"
      >
        <div className={styles.grabber} />
        <h2 id="live-pitch-title" className={styles.title}>
          Live pitch view
        </h2>
        <p className={styles.helpText}>
          A quiet visual for practice, not a score. Pitch is only one part of
          how a voice comes across - resonance, intonation and articulation
          often matter more than this number ever could.
        </p>

        {status === "unsupported" && (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Your browser doesn&apos;t support this.
          </p>
        )}
        {status === "denied" && (
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Couldn&apos;t access your microphone.
          </p>
        )}
        {(status === "loading" || status === "listening") && (
          <>
            <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className={local.canvas} />
            <div className={local.toggleRow}>
              <Toggle checked={showNumber} onChange={setShowNumber} label="Show the number" />
              <span className={local.toggleLabel}>Show the number</span>
            </div>
            {showNumber && (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {status === "loading"
                  ? "Starting…"
                  : currentHz
                    ? `${Math.round(currentHz)} Hz`
                    : "Listening…"}
              </p>
            )}
          </>
        )}

        <p className={styles.fieldHint}>
          Audio is analysed in the moment and never recorded, saved, or leaves
          this device. Nothing here is logged to your practice history.
        </p>

        <div className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function drawTrail(canvas: HTMLCanvasElement | null, history: number[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const toY = (hz: number) => {
    const clamped = Math.min(MAX_DISPLAY_HZ, Math.max(MIN_DISPLAY_HZ, hz));
    const t = (clamped - MIN_DISPLAY_HZ) / (MAX_DISPLAY_HZ - MIN_DISPLAY_HZ);
    return height - t * height;
  };

  ctx.beginPath();
  let started = false;
  history.forEach((hz, i) => {
    if (Number.isNaN(hz)) {
      started = false;
      return;
    }
    const x = (i / (TRAIL_LENGTH - 1)) * width;
    const y = toY(hz);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.strokeStyle = "#c4b6f6";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();

  const last = history[history.length - 1];
  if (last !== undefined && !Number.isNaN(last)) {
    const x = ((history.length - 1) / (TRAIL_LENGTH - 1)) * width;
    const y = toY(last);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#f7b4c8";
    ctx.fill();
  }
}
