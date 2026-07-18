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
