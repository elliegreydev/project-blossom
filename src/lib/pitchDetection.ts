import { isLiveAnalysisSupported, requestMicStream, stopStream } from "./audioRecorder";

// Autocorrelation-based pitch detection, the standard technique for
// estimating a fundamental frequency from a short audio buffer in the
// browser. Returns null whenever there isn't a clear periodic signal
// (silence, background noise, unvoiced sounds) rather than guessing - a
// jittery wrong reading would be worse than no reading here.
export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const size = buffer.length;

  let rms = 0;
  for (let i = 0; i < size; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / size);
  if (rms < 0.01) return null;

  // Trim leading/trailing near-silence so the autocorrelation window is
  // centred on actual signal.
  let start = 0;
  let end = size - 1;
  const threshold = rms * 0.2;
  while (start < size && Math.abs(buffer[start]) < threshold) start++;
  while (end > start && Math.abs(buffer[end]) < threshold) end--;
  const trimmed = buffer.subarray(start, end + 1);
  if (trimmed.length < sampleRate / 40) return null; // too short to resolve a low pitch

  const n = trimmed.length;
  const correlation = new Float32Array(n);
  for (let lag = 0; lag < n; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    correlation[lag] = sum;
  }

  // Classic autocorrelation pitch-period heuristic: skip past the initial
  // downward slope from lag 0, then take the first strong peak after it.
  let d = 0;
  while (d < n - 1 && correlation[d] > correlation[d + 1]) d++;
  let maxVal = -1;
  let maxPos = -1;
  for (let i = d; i < n; i++) {
    if (correlation[i] > maxVal) {
      maxVal = correlation[i];
      maxPos = i;
    }
  }
  if (maxPos <= 0) return null;

  // Parabolic interpolation around the peak for sub-sample precision.
  const x1 = maxPos > 0 ? correlation[maxPos - 1] : correlation[maxPos];
  const x2 = correlation[maxPos];
  const x3 = maxPos < n - 1 ? correlation[maxPos + 1] : correlation[maxPos];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  const adjustedPos = a !== 0 ? maxPos - b / (2 * a) : maxPos;

  const frequency = sampleRate / adjustedPos;
  // Human speaking fundamental frequency realistically falls in this band;
  // anything outside it is almost certainly a detection artifact.
  if (!Number.isFinite(frequency) || frequency < 60 || frequency > 500) return null;
  return frequency;
}

// A short, opt-in capture for logging alongside a practice session -
// deliberately separate from LiveWatchView, which never saves anything.
// Returns a range rather than a single number or an average: voice pitch
// moves around naturally within a session, and a range says so honestly
// instead of implying one "true" number. Never compared against a target,
// never labelled male/female - purely a number over time for the person to
// read however they want to.
export async function capturePitchRange(durationMs = 4000): Promise<{ low: number; high: number } | null> {
  if (!isLiveAnalysisSupported()) return null;

  const stream = await requestMicStream();
  const audioCtx = new AudioContext();
  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);
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
