// The pitch detector itself: pure arithmetic over a buffer of samples, with
// no imports at all. Same discipline as reminders.ts and travel.ts, and for
// the same reason: getting this wrong is invisible on screen (a squashed
// scale just looks like a flat voice, a missed frame just looks like a
// pause), so it has to be testable on its own outside a browser.
// Pitch detection, using the normalised square difference function (the
// McLeod Pitch Method). This replaced a plain autocorrelation detector in
// Aug 2026 after it turned out to be unusable on a real phone.
//
// What was wrong with the old one: it decided whether somebody was speaking
// by measuring LOUDNESS, bailing out whenever the buffer RMS fell below 0.01.
// Measured against synthesised speech it was flawless down to an RMS of
// 0.0132 and then died completely by 0.0088, a cliff edge sitting in exactly
// the range a phone microphone puts an ordinary speaking voice at arm's
// length. A whole spoken sentence produced a handful of disconnected
// fragments, because only the loudest vowels ever crossed the line.
//
// The NSDF fixes this because its peak height is a CLARITY score between 0
// and 1 for how periodic the signal is, which is what "is this a voice"
// actually asks, and it does not care how loud the voice is. A quiet vowel
// and a loud one are equally periodic. Measured the same way, this version
// holds full accuracy at a fifteenth of the amplitude the old one needed and
// stays correct down to roughly 3 dB signal-to-noise. Where it does fail it
// returns null rather than a number, which matters here: a wrong reading gets
// drawn on screen as a pitch somebody thinks they made.
//
// It is no more expensive either, around 1.7ms per frame, because capping the
// lag search at the lowest pitch worth caring about is less work than the old
// full-length autocorrelation.

// The window of human speaking pitch. Anything outside it is an artifact
// rather than a voice, and capping the search here is what keeps this cheap.
const MIN_HZ = 60;
const MAX_HZ = 500;

// Deliberately far below anything audible. This exists only to skip dead air
// so the analysis is not run over silence. It is NOT the test for whether
// somebody is speaking, which is where the old design went wrong.
const SILENCE_FLOOR_RMS = 0.0008;

// How periodic a buffer must be before it counts as a voice. Tuned against
// synthesised speech across signal-to-noise ratios: 0.5 holds full accuracy
// down to about 3 dB, and at 0 dB it produces silence rather than wrong
// answers, which is the failure to prefer.
const MIN_CLARITY = 0.5;

export function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const n = buffer.length;
  const maxTau = Math.min(n - 1, Math.floor(sampleRate / MIN_HZ));
  const minTau = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  if (maxTau <= minTau) return null;

  let rms = 0;
  for (let i = 0; i < n; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / n);
  if (rms < SILENCE_FLOOR_RMS) return null;

  // n'(tau) = 2 * sum(x[i] * x[i+tau]) / sum(x[i]^2 + x[i+tau]^2). Dividing by
  // the signal's own energy is what makes the result a ratio rather than a
  // magnitude, and so independent of how loudly somebody is speaking.
  const nsdf = new Float32Array(maxTau + 1);
  for (let tau = minTau; tau <= maxTau; tau++) {
    let acf = 0;
    let div = 0;
    for (let i = 0; i < n - tau; i++) {
      acf += buffer[i] * buffer[i + tau];
      div += buffer[i] * buffer[i] + buffer[i + tau] * buffer[i + tau];
    }
    nsdf[tau] = div > 0 ? (2 * acf) / div : 0;
  }

  // The highest point of each positive-going region of the curve.
  const peaks: number[] = [];
  let tau = minTau;
  while (tau < maxTau && nsdf[tau] > 0) tau++;
  while (tau < maxTau) {
    if (nsdf[tau] > 0 && nsdf[tau] > nsdf[tau - 1]) {
      let best = tau;
      while (tau < maxTau && nsdf[tau] > 0) {
        if (nsdf[tau] > nsdf[best]) best = tau;
        tau++;
      }
      peaks.push(best);
    }
    tau++;
  }
  if (peaks.length === 0) return null;

  // Take the FIRST peak that is nearly as tall as the tallest, rather than the
  // tallest outright. A peak at twice the true period is often a hair higher,
  // and taking it is precisely how a detector comes to report a voice an
  // octave below where it actually is.
  let maxVal = 0;
  for (const peak of peaks) if (nsdf[peak] > maxVal) maxVal = nsdf[peak];
  const threshold = maxVal * 0.9;
  let chosen = peaks[0];
  for (const peak of peaks) {
    if (nsdf[peak] >= threshold) {
      chosen = peak;
      break;
    }
  }

  if (nsdf[chosen] < MIN_CLARITY) return null;

  // Parabolic interpolation around the peak, for sub-sample precision.
  const y1 = chosen > 0 ? nsdf[chosen - 1] : nsdf[chosen];
  const y2 = nsdf[chosen];
  const y3 = chosen < maxTau ? nsdf[chosen + 1] : nsdf[chosen];
  const a = (y1 + y3 - 2 * y2) / 2;
  const b = (y3 - y1) / 2;
  const refined = a !== 0 ? chosen - b / (2 * a) : chosen;

  const frequency = sampleRate / refined;
  if (!Number.isFinite(frequency) || frequency < MIN_HZ || frequency > MAX_HZ) return null;
  return frequency;
}

// A noise gate that learns the room.
//
// The detector answers "is this sound periodic", which is the right question
// for telling a voice from a hiss, and the wrong one for telling a voice from
// a fan. A fan is a motor hum plus a blade-passing tone, and those are more
// perfectly periodic than a human voice is, so a clarity test accepts them
// happily. Measured: a fan alone produced a reading on 100% of frames, at the
// blade frequency, and no high-pass fixes it because the tone's harmonics
// survive any cutoff low enough to keep real voices.
//
// So periodicity decides WHAT the pitch is, and this decides WHETHER anything
// is worth reading at all. It is a relative test, not the absolute loudness
// threshold that broke the original detector: it watches the quietest recent
// moments to learn what this room sounds like with nobody speaking, then asks
// whether right now is meaningfully louder than that. A quiet room sets a
// quiet floor and a whisper still gets through; a room with a fan sets a
// higher one and the fan stops being mistaken for a person.
//
// The floor is a low percentile rather than the true minimum, so a single
// freak frame cannot drag it down, and it is taken over a couple of seconds,
// which is long enough that ordinary gaps between words land in it.
const GATE_WINDOW_FRAMES = 75;
const GATE_PERCENTILE = 0.15;

// About 12 dB above the room. Tuned by measurement, and deliberately not
// higher: past roughly 16 dB the gate starts defeating itself, because
// somebody talking steadily fills the whole window and drags their own floor
// up with them.
const GATE_RATIO = 4;

export interface NoiseGate {
  /** Feed every frame's RMS, in order. True means this frame is worth reading. */
  accepts(rms: number): boolean;
  /** The current estimate of the room's own level, for showing a hint. */
  floor(): number;
}

export function createNoiseGate(): NoiseGate {
  const history: number[] = [];
  let currentFloor = SILENCE_FLOOR_RMS;

  return {
    accepts(rms: number): boolean {
      history.push(rms);
      if (history.length > GATE_WINDOW_FRAMES) history.shift();
      const sorted = [...history].sort((a, b) => a - b);
      const at = sorted[Math.floor(sorted.length * GATE_PERCENTILE)] ?? sorted[0];
      currentFloor = Math.max(at, SILENCE_FLOOR_RMS);
      return rms > currentFloor * GATE_RATIO;
    },
    floor(): number {
      return currentFloor;
    },
  };
}

/** RMS of a frame. Shared so the gate and the detector agree on "how loud". */
export function frameRms(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) sum += buffer[i] * buffer[i];
  return Math.sqrt(sum / buffer.length);
}
