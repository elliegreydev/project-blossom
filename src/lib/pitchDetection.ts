import { isLiveAnalysisSupported, requestAnalysisStream, stopStream } from "./audioRecorder";
import { detectPitch } from "./pitchMath";

export { detectPitch };

// correctOctave and medianOf live in lib/voiceRanges.ts, which deliberately
// has no imports so the arithmetic can be tested on its own.
// A short, opt-in capture for logging alongside a practice session. The live
// practice screen can also save the range it already heard, which is the same
// idea over a longer window rather than a separate four-second measurement.
// Returns a range rather than a single number or an average: voice pitch moves
// around naturally within a session, and a range says so honestly instead of
// implying one "true" number.
//
// This used to say "never labelled male/female". That was revisited in Aug
// 2026: the live screen can now draw typical speaking ranges behind the trail
// if somebody switches them on, off by default. The rule that still holds, and
// which lib/voiceRanges.ts carries in full, is that a range is a backdrop and
// never a target. Nothing is scored, and nothing reacts to where a voice sits.
export async function capturePitchRange(durationMs = 4000): Promise<{ low: number; high: number } | null> {
  if (!isLiveAnalysisSupported()) return null;

  const stream = await requestAnalysisStream();
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  // Same high-pass as the live screen, and for the same reason: unprocessed
  // audio carries room rumble and DC offset, both of which the detector will
  // happily report as a voice far below anybody's actual pitch. See the
  // comment in care/voice/live/page.tsx.
  const highpass = audioCtx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 75;
  highpass.Q.value = 0.707;
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(highpass);
  highpass.connect(analyser);
  const buffer = new Float32Array(analyser.fftSize);
  const readings: number[] = [];

  await new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      analyser.getFloatTimeDomainData(buffer);
      const pitch = detectPitch(buffer, audioCtx.sampleRate);
      if (pitch !== null) readings.push(pitch);
    }, 50);
    setTimeout(() => {
      clearInterval(interval);
      resolve();
    }, durationMs);
  });

  stopStream(stream);
  await audioCtx.close();

  if (readings.length < 5) return null;
  const sorted = [...readings].sort((a, b) => a - b);
  // Trim the extremes so one glitchy reading doesn't stretch the range.
  const trimCount = Math.floor(sorted.length * 0.1);
  const trimmed = trimCount > 0 ? sorted.slice(trimCount, sorted.length - trimCount) : sorted;
  return { low: Math.round(trimmed[0]), high: Math.round(trimmed[trimmed.length - 1]) };
}
