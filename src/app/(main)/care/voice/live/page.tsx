"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import VoiceSafetyNotice from "@/components/VoiceSafetyNotice";
import { isLiveAnalysisSupported, requestAnalysisStream, stopStream } from "@/lib/audioRecorder";
import { detectPitch } from "@/lib/pitchDetection";
import {
  bandsFor,
  correctOctave,
  medianOf,
  pitchToUnit,
  pitchToY,
  readToken,
  type ReferenceBand,
  type ReferenceMode,
} from "@/lib/voiceRanges";
import { db, addVoiceSession } from "@/lib/db";
import { hasSeenVoiceSafety, markVoiceSafetySeen, hasSeenRangeSafety, markRangeSafetySeen } from "@/lib/voiceSafetyState";
import styles from "./live.module.css";

// The trail is sampled on a fixed clock rather than once per animation frame.
// Per-frame sampling meant "the last few seconds" was really "the last 200
// frames", which is about 3.3 seconds on a 60Hz screen and half that on a
// 120Hz phone. A timer makes the window an actual duration on every device.
const SAMPLE_MS = 40;
const TRAIL_SECONDS = 8;
const TRAIL_LENGTH = Math.round((TRAIL_SECONDS * 1000) / SAMPLE_MS);
const SMOOTHING_WINDOW = 5;
// Reserved strip on the right for the band labels. Must match the width of
// .bandLabel in live.module.css.
const GUTTER_PX = 78;

type Status = "idle" | "starting" | "listening" | "denied" | "unsupported";

const MODES: Array<{ key: ReferenceMode; label: string }> = [
  { key: "off", label: "Off" },
  { key: "zones", label: "Zones" },
  { key: "bands", label: "Bands" },
  { key: "mine", label: "Mine" },
];

const MODE_KEY = "blossom-voice-reference-mode";

export default function LivePitchPage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [showNumber, setShowNumber] = useState(false);
  const [currentHz, setCurrentHz] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const [mode, setMode] = useState<ReferenceMode>("off");
  const [ownRange, setOwnRange] = useState<{ low: number; high: number } | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSafety, setShowSafety] = useState(false);
  const [safetyReason, setSafetyReason] = useState<"first" | "ranges">("first");

  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const recentRef = useRef<number[]>([]);
  const trailRef = useRef<number[]>([]);
  const heldRef = useRef(false);
  // Every voiced reading of the whole session, kept so the range offered at
  // the end reflects what actually happened rather than a separate capture.
  const sessionRef = useRef<number[]>([]);
  // The running pitch an octave slip is judged against. Reset whenever
  // listening starts so a previous session cannot bias a new one.
  const referenceRef = useRef<number | null>(null);
  const bandsRef = useRef<ReferenceBand[]>([]);

  // Load the saved preference. Device-local: which reference somebody wants
  // behind their trail is a property of this screen on this phone, not a fact
  // about their account, so it never syncs.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(MODE_KEY) as ReferenceMode | null;
      if (stored && MODES.some((m) => m.key === stored)) setMode(stored);
    } catch {
      // A missing preference just means "off", which is the default anyway.
    }
    if (!hasSeenVoiceSafety()) {
      setSafetyReason("first");
      setShowSafety(true);
    }
  }, []);

  // Their own usual range, from sessions they already logged. Two or more, so
  // a single session never gets drawn as though it were a settled fact.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sessions = await db.voiceSessions.toArray();
      const withPitch = sessions.filter((s) => s.pitchLowHz !== null && s.pitchHighHz !== null);
      if (cancelled || withPitch.length < 2) return;
      const low = Math.min(...withPitch.map((s) => s.pitchLowHz as number));
      const high = Math.max(...withPitch.map((s) => s.pitchHighHz as number));
      setOwnRange({ low, high });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopListening = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    timerRef.current = null;
    rafRef.current = null;
    if (streamRef.current) stopStream(streamRef.current);
    streamRef.current = null;
    if (audioCtxRef.current) void audioCtxRef.current.close();
    audioCtxRef.current = null;
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  useEffect(() => stopListening, [stopListening]);

  async function start() {
    if (!isLiveAnalysisSupported()) {
      setStatus("unsupported");
      return;
    }
    setStatus("starting");
    let stream: MediaStream;
    try {
      stream = await requestAnalysisStream();
    } catch {
      setStatus("denied");
      return;
    }
    streamRef.current = stream;

    // Practising means not touching the screen for minutes at a time, so the
    // display dimming mid-session is a real interruption. Best effort: this
    // is unsupported on some browsers and rejects if the tab is hidden.
    try {
      wakeLockRef.current = (await navigator.wakeLock?.request("screen")) ?? null;
    } catch {
      // Nothing to do. Practice still works, the screen just sleeps normally.
    }

    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buffer = new Float32Array(analyser.fftSize);

    setStatus("listening");
    setSaved(false);
    sessionRef.current = [];
    referenceRef.current = null;
    recentRef.current = [];
    trailRef.current = [];

    timerRef.current = window.setInterval(() => {
      if (heldRef.current) return;
      analyser.getFloatTimeDomainData(buffer);
      const raw = detectPitch(buffer, audioCtx.sampleRate);
      // Correct an obvious octave slip before it reaches anything else, so a
      // detector mistake never becomes a spike on the trail or a number in
      // somebody's practice log. Judged against the running median rather than
      // the previous reading: if a single bad reading became the reference,
      // every correct reading after it would get "corrected" to match the
      // mistake, and the trail would settle an octave away and stay there.
      const pitch = raw === null ? null : correctOctave(raw, referenceRef.current);
      if (pitch !== null) sessionRef.current.push(pitch);

      recentRef.current.push(pitch ?? NaN);
      if (recentRef.current.length > SMOOTHING_WINDOW) recentRef.current.shift();
      const valid = recentRef.current.filter((v) => !Number.isNaN(v));
      const smoothed = medianOf(valid);
      if (smoothed !== null) referenceRef.current = smoothed;

      setCurrentHz(smoothed);
      trailRef.current.push(smoothed ?? NaN);
      if (trailRef.current.length > TRAIL_LENGTH) trailRef.current.shift();
    }, SAMPLE_MS);

    const draw = () => {
      drawTrail(canvasRef.current, trailRef.current, bandsRef.current);
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();
  }

  function chooseMode(next: ReferenceMode) {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      // The choice just won't persist. Not worth interrupting anybody over.
    }
    // The first time somebody puts a reference on screen is the moment the
    // safety note is actually relevant, because a line to aim at is what
    // tempts people to push. Shown once, here, rather than at the door.
    if (next !== "off" && !hasSeenRangeSafety()) {
      setSafetyReason("ranges");
      setShowSafety(true);
      markRangeSafetySeen();
    }
  }

  const bands = bandsFor(mode, ownRange);
  bandsRef.current = bands;
  heldRef.current = held;

  async function saveToLog() {
    const readings = sessionRef.current;
    if (readings.length < 5) return;
    const sorted = [...readings].sort((a, b) => a - b);
    // Same trim as capturePitchRange, so one glitchy reading can't stretch it.
    const trim = Math.floor(sorted.length * 0.1);
    const kept = trim > 0 ? sorted.slice(trim, sorted.length - trim) : sorted;
    await addVoiceSession({
      goalId: null,
      sessionDuration: null,
      comfortRating: null,
      note: null,
      recording: null,
      pitchLowHz: Math.round(kept[0]),
      pitchHighHz: Math.round(kept[kept.length - 1]),
    });
    setSaved(true);
  }

  const canSave = sessionRef.current.length >= 5;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Live pitch" backHref="/care/voice" />

      <p className={styles.intro}>
        A quiet visual for practice, not a score. Pitch and resonance both shape
        how a voice comes across, and this only shows one of them.
      </p>

      <div className={styles.stage}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {status !== "listening" && (
          <div className={styles.overlay}>
            {status === "unsupported" ? (
              <p className={styles.overlayText}>Your browser can&apos;t do this one.</p>
            ) : status === "denied" ? (
              <p className={styles.overlayText}>
                Blossom couldn&apos;t reach your microphone. You may need to allow it in your
                browser settings.
              </p>
            ) : (
              <button type="button" className={styles.startButton} onClick={() => void start()}>
                {status === "starting" ? "Starting…" : "Start listening"}
              </button>
            )}
          </div>
        )}
        {/* Labels sit against the right edge at the vertical middle of the
            band they name, so each one is physically at the height it refers
            to. They used to be a legend stacked in the top-left corner, which
            covered the upper third of the plot (the female band, of all
            things) and listed the bands in the opposite order to the way the
            canvas draws them. */}
        {bands.length > 0 && (
          <ul className={styles.bandLabels} aria-label="Reference ranges shown behind the trail">
            {bands.map((band) => (
              <li
                key={band.id}
                className={styles.bandLabel}
                style={{
                  color: `var(${band.token})`,
                  top: `${midpointPercent(band.lowHz, band.highHz)}%`,
                }}
              >
                <span className={styles.bandName}>{band.label}</span>
                <span className={styles.bandHz}>
                  {band.lowHz}&ndash;{band.highHz} Hz
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === "listening" && (
        <div className={styles.controlRow}>
          <button
            type="button"
            className={`${styles.holdButton} ${held ? styles.holdActive : ""}`}
            onClick={() => setHeld((h) => !h)}
          >
            {held ? "Carry on" : "Hold it there"}
          </button>
          <span className={styles.holdHint}>
            {held ? "Frozen, so you can look at what you just did." : "You can't watch this while you speak."}
          </span>
        </div>
      )}

      <section className={styles.section}>
        <span className={styles.label}>Reference ranges</span>
        <div className={styles.modes}>
          {MODES.map((option) => {
            const unavailable = option.key === "mine" && !ownRange;
            return (
              <button
                key={option.key}
                type="button"
                className={`${styles.mode} ${mode === option.key ? styles.modeOn : ""}`}
                aria-pressed={mode === option.key}
                disabled={unavailable}
                onClick={() => chooseMode(option.key)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className={styles.hint}>
          {mode === "off"
            ? "Nothing behind the line. Turn one on if a bit of context helps."
            : mode === "mine"
              ? "Where your own logged sessions have usually sat. No one else comes into it."
              : "Typical speaking ranges, not goals. Plenty of people of every gender sit outside them, and nothing here reacts to where your voice lands."}
          {!ownRange && mode !== "mine" && " Your own range appears once you've logged two sessions with pitch."}
        </p>
      </section>

      <VoiceSafetyNotice
        variant="inline"
        onOpen={() => {
          setSafetyReason("first");
          setShowSafety(true);
        }}
      />

      <section className={styles.section}>
        {saved ? (
          <p className={styles.savedNote}>
            Saved to your practice log.{" "}
            <Link href="/care/voice" className={styles.savedLink}>
              Add a note to it
            </Link>
          </p>
        ) : (
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!canSave || status !== "listening"}
            onClick={() => void saveToLog()}
          >
            Save this to your practice log
          </button>
        )}
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            stopListening();
            router.push("/care/voice");
          }}
        >
          Done
        </button>
      </section>

      <div className={styles.toggleRow}>
        <Toggle checked={showNumber} onChange={setShowNumber} label="Show the number" />
        <span className={styles.toggleLabel}>Show the number</span>
        {showNumber && (
          <span className={styles.hzReadout}>
            {status !== "listening" ? "—" : currentHz ? `${Math.round(currentHz)} Hz` : "listening…"}
          </span>
        )}
      </div>

      <p className={styles.privacy}>
        Your voice is read as you speak and never recorded, saved, or sent anywhere. If you
        save a session, only the two pitch numbers go to your practice log. The audio itself
        doesn&apos;t outlast the moment.
      </p>

      {showSafety && (
        <VoiceSafetyNotice
          variant="sheet"
          reason={safetyReason}
          onClose={() => {
            markVoiceSafetySeen();
            setShowSafety(false);
          }}
        />
      )}
    </div>
  );
}

// Where the middle of a band sits, as a percentage down from the top of the
// canvas. Uses the same log mapping the canvas draws with, so a label and its
// band can never drift apart.
function midpointPercent(lowHz: number, highHz: number): number {
  const top = pitchToUnit(highHz);
  const bottom = pitchToUnit(lowHz);
  return (1 - (top + bottom) / 2) * 100;
}

function drawTrail(canvas: HTMLCanvasElement | null, history: number[], bands: ReferenceBand[]) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Match the backing store to the CSS size and device pixel ratio, or the
  // line is soft on every phone made in the last decade.
  const ratio = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (cssWidth === 0 || cssHeight === 0) return;
  if (canvas.width !== cssWidth * ratio || canvas.height !== cssHeight * ratio) {
    canvas.width = cssWidth * ratio;
    canvas.height = cssHeight * ratio;
  }
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  // Everything is drawn into the plot area only, leaving a gutter down the
  // right for the band labels. Nothing overlaps the trail, which is what went
  // wrong when the labels were a legend floating on top of the plot.
  const plotWidth = Math.max(40, cssWidth - GUTTER_PX);

  // Reference bands first, underneath everything, deliberately faint. They
  // are scenery. Nothing about them changes in response to the voice.
  for (const band of bands) {
    const top = pitchToY(band.highHz, cssHeight);
    const bottom = pitchToY(band.lowHz, cssHeight);
    ctx.fillStyle = readToken(band.token, "#c4b6f6");
    ctx.globalAlpha = 0.1;
    ctx.fillRect(0, top, plotWidth, bottom - top);
    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = readToken(band.token, "#c4b6f6");
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, top);
    ctx.lineTo(plotWidth, top);
    ctx.moveTo(0, bottom);
    ctx.lineTo(plotWidth, bottom);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  const line = readToken("--lavender", "#c4b6f6");
  const dot = readToken("--pink", "#f7b4c8");

  // Drawn as runs of consecutive voiced readings. Runs shorter than
  // MIN_RUN are skipped: a couple of stray samples in the middle of silence
  // is the detector catching a cough or a chair, and it rendered as a little
  // dash floating on its own in the middle of the graph, which looked like
  // data and was not.
  const MIN_RUN = 2;
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let run: Array<{ x: number; y: number }> = [];
  const flush = () => {
    if (run.length >= MIN_RUN) {
      ctx.beginPath();
      run.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      });
      ctx.stroke();
    }
    run = [];
  };

  history.forEach((hz, i) => {
    if (Number.isNaN(hz)) {
      flush();
      return;
    }
    run.push({
      x: (i / (TRAIL_LENGTH - 1)) * plotWidth,
      y: pitchToY(hz, cssHeight),
    });
  });
  flush();

  // The dot marks where the voice is right now, so it only appears when the
  // line under it does. Otherwise a skipped stray run left a dot hovering on
  // its own with nothing attached to it.
  const tail = history.slice(-MIN_RUN);
  const tailIsVoiced = tail.length === MIN_RUN && tail.every((v) => !Number.isNaN(v));
  const last = history[history.length - 1];
  if (tailIsVoiced && last !== undefined && !Number.isNaN(last)) {
    const x = ((history.length - 1) / (TRAIL_LENGTH - 1)) * plotWidth;
    const y = pitchToY(last, cssHeight);
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = dot;
    ctx.fill();
  }
}
