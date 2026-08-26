import assert from "node:assert/strict";
import { createNoiseGate, detectPitch, frameRms } from "../src/lib/pitchMath.ts";
import {
  DISPLAY_MAX_HZ,
  DISPLAY_MIN_HZ,
  OVERLAP_HIGH_HZ,
  OVERLAP_LOW_HZ,
  SIMPLE_BANDS,
  ZONE_BANDS,
  bandsFor,
  correctOctave,
  medianOf,
  pitchToUnit,
  pitchToY,
} from "../src/lib/voiceRanges.ts";

// The live pitch screen shows somebody their own voice while they practise,
// and every number behind it is arithmetic whose wrongness is invisible on
// screen: a squashed scale just looks like a flat voice, and an octave error
// just looks like a spike somebody thinks they made. Hence tests.

// The scale ---------------------------------------------------------------
// The bug this replaced: a linear map over 70-350 Hz gave the octave
// 100-200 Hz 36% of the canvas and 175-350 Hz 62%, so lower voices looked
// flatter and less mobile than they were. Every octave must now be the same
// height, wherever it sits.

const octaveA = pitchToUnit(200) - pitchToUnit(100);
const octaveB = pitchToUnit(350) - pitchToUnit(175);
assert.ok(
  Math.abs(octaveA - octaveB) < 1e-9,
  `an octave must occupy the same height anywhere on the scale, got ${octaveA} and ${octaveB}`
);

const octaveC = pitchToUnit(160) - pitchToUnit(80);
assert.ok(Math.abs(octaveA - octaveC) < 1e-9, "and the same again lower down");

// Ends of the scale, and clamping beyond them.
assert.equal(pitchToUnit(DISPLAY_MIN_HZ), 0);
assert.equal(pitchToUnit(DISPLAY_MAX_HZ), 1);
assert.equal(pitchToUnit(20), 0, "below the window clamps rather than going negative");
assert.equal(pitchToUnit(4000), 1, "above the window clamps rather than leaving the canvas");

// y is measured downwards from the top, so a higher pitch is a smaller y.
assert.ok(pitchToY(220, 200) < pitchToY(110, 200), "higher pitch must draw higher up");
assert.equal(pitchToY(DISPLAY_MIN_HZ, 200), 200, "the bottom of the window is the bottom edge");
assert.equal(pitchToY(DISPLAY_MAX_HZ, 200), 0, "the top of the window is the top edge");

// Octave correction --------------------------------------------------------
// Autocorrelation can lock onto twice or half the true pitch period. Left
// alone it draws a spike the voice never made, and worse, it would be saved
// into somebody's practice log as a real reading.

assert.equal(correctOctave(360, 180), 180, "an exact octave up is pulled back");
assert.equal(correctOctave(90, 180), 180, "an exact octave down is pulled back");
assert.ok(Math.abs(correctOctave(340, 180) - 170) < 1e-9, "a near-double is corrected too");
assert.ok(Math.abs(correctOctave(95, 180) - 190) < 1e-9, "a near-half is corrected too");

// Ordinary movement must survive untouched, or the screen would flatten the
// very thing it exists to show.
assert.equal(correctOctave(190, 180), 190, "a normal rise is left alone");
assert.equal(correctOctave(150, 180), 150, "a normal fall is left alone");
assert.equal(correctOctave(270, 180), 270, "a genuine 1.5x leap is not an octave error");
assert.equal(correctOctave(200, null), 200, "with no reference yet, nothing is corrected");
assert.equal(correctOctave(200, 0), 200, "a zero reference is not a reference");

// Median smoothing ---------------------------------------------------------
// A mean over a window holding one octave slip lands halfway between the two
// and invents a pitch that was never produced. 180 and a slipped 90 average
// to 135, which is a confident wrong reading.

assert.equal(medianOf([180, 182, 90, 181, 179]), 180, "one outlier must not move the result");
const mean = [180, 182, 90, 181, 179].reduce((a, b) => a + b, 0) / 5;
assert.ok(mean < 165, "sanity: the mean really would have been dragged down");
assert.equal(medianOf([]), null, "no readings is not a reading");
assert.equal(medianOf([200]), 200);
assert.equal(medianOf([100, 200]), 150, "an even count averages the middle pair");

// The bands ----------------------------------------------------------------
// A reference range is a backdrop, never a target. What is testable here is
// that the numbers stay coherent and the overlap keeps existing.

for (const band of [...ZONE_BANDS, ...SIMPLE_BANDS]) {
  assert.ok(band.lowHz < band.highHz, `${band.id} must not be inverted`);
  assert.ok(band.lowHz >= DISPLAY_MIN_HZ && band.highHz <= DISPLAY_MAX_HZ, `${band.id} must fit the window`);
  assert.ok(band.token.startsWith("--"), `${band.id} must paint from a theme token, never a hardcoded colour`);
}

// The overlap is the point of the "zones" view: drawing two clean bands with
// a gap between them would imply a split that is not in the data.
const overlap = ZONE_BANDS.find((b) => b.id === "overlap");
assert.ok(overlap, "the zones view must include the overlap");
assert.equal(overlap.lowHz, OVERLAP_LOW_HZ);
assert.equal(overlap.highHz, OVERLAP_HIGH_HZ);

// Zones must tile without leaving holes.
const sorted = [...ZONE_BANDS].sort((a, b) => a.lowHz - b.lowHz);
for (let i = 1; i < sorted.length; i += 1) {
  assert.equal(sorted[i].lowHz, sorted[i - 1].highHz, "zones must meet exactly, with no gap between them");
}

// Off means off, and "mine" needs somebody's own data to mean anything.
assert.deepEqual(bandsFor("off", null), []);
assert.deepEqual(bandsFor("off", { low: 150, high: 200 }), [], "off stays off even with data");
assert.deepEqual(bandsFor("mine", null), [], "no logged range means nothing is drawn");
assert.equal(bandsFor("mine", { low: 150, high: 200 })[0].lowHz, 150);
assert.equal(bandsFor("zones", null).length, ZONE_BANDS.length);
assert.equal(bandsFor("bands", null).length, SIMPLE_BANDS.length);

console.log("Voice pitch scale and octave checks passed.");

// The detector itself --------------------------------------------------------
// The bug this guards against: the original detector decided whether somebody
// was speaking by measuring loudness, bailing out below an RMS of 0.01. That
// is a cliff edge sitting exactly where a phone microphone puts an ordinary
// speaking voice, so a whole spoken sentence came out as a few disconnected
// fragments. The replacement measures periodicity instead, which is what the
// question actually is, and does not care how loud the voice is.

const SR = 48000;
const FRAME = 2048;

// A voice-like tone: fundamental plus decaying harmonics, phase accumulated
// rather than recomputed from f*t (recomputing it produces phase jumps, which
// is noise, not a voice, and made an earlier version of this harness lie).
function voiceLike(f0, samples, amplitude, noise = 0) {
  const out = new Float32Array(samples);
  let phase = 0;
  for (let i = 0; i < samples; i += 1) {
    phase += (2 * Math.PI * f0) / SR;
    let s = 0;
    for (let h = 1; h <= 10; h += 1) s += (1 / h) * Math.sin(h * phase);
    out[i] = (amplitude * s) / 2 + (Math.random() - 0.5) * 2 * noise;
  }
  return out;
}

function accuracy(f0, amplitude, noise = 0, frames = 40) {
  const signal = voiceLike(f0, FRAME * frames, amplitude, noise);
  let correct = 0;
  let wrong = 0;
  for (let w = 0; w < frames; w += 1) {
    const hz = detectPitch(signal.subarray(w * FRAME, w * FRAME + FRAME), SR);
    if (hz === null) continue;
    if (Math.abs(hz / f0 - 1) < 0.05) correct += 1;
    else wrong += 1;
  }
  return { correct: correct / frames, wrong: wrong / frames };
}

// Quiet speech is the whole point. 0.02 was dead silence to the old detector.
for (const amplitude of [0.1, 0.05, 0.02, 0.01, 0.005]) {
  const { correct } = accuracy(165, amplitude);
  assert.ok(
    correct > 0.9,
    `a quiet voice must still be heard: at amplitude ${amplitude} only ${Math.round(correct * 100)}% of frames were detected`
  );
}

// And across the range of speaking pitches, not just a comfortable middle.
for (const f0 of [95, 110, 145, 165, 185, 220, 260]) {
  const { correct } = accuracy(f0, 0.02, 0.002);
  assert.ok(correct > 0.9, `${f0} Hz must be detected when quiet, got ${Math.round(correct * 100)}%`);
}

// Being wrong is worse than being silent, because a wrong reading is drawn on
// screen as a pitch somebody believes they produced.
const noisy = accuracy(165, 0.02, 0.02, 60);
assert.equal(noisy.wrong, 0, "under heavy noise it must go quiet rather than invent a pitch");

// Room tone is not a voice.
const roomTone = new Float32Array(FRAME * 40);
for (let i = 0; i < roomTone.length; i += 1) roomTone[i] = (Math.random() - 0.5) * 0.004;
let falsePositives = 0;
for (let w = 0; w < 40; w += 1) {
  if (detectPitch(roomTone.subarray(w * FRAME, w * FRAME + FRAME), SR) !== null) falsePositives += 1;
}
assert.equal(falsePositives, 0, "an empty room must not register as somebody speaking");

// Silence is silence.
assert.equal(detectPitch(new Float32Array(FRAME), SR), null, "digital silence is not a pitch");

console.log("Pitch detector checks passed (quiet voices, full range, no false positives).");

// Room rumble ----------------------------------------------------------------
// Blossom asks for UNPROCESSED microphone audio, because the browser's noise
// suppression is built for phone calls and mangles the harmonic structure this
// detector reads. The cost of that choice is everything noise suppression was
// also removing: traffic, a fan, a hand on the phone, and any DC offset the
// hardware adds. All of it is loud, slow and periodic enough to look like a
// voice an octave or two below anybody's.
//
// So the live screen and capturePitchRange both put a 75 Hz high-pass in front
// of the analyser. These assertions exist to prove that filter is load-bearing
// rather than decorative: without it the detector reports the room, and the
// readings pin themselves to the bottom of the display.

// The RBJ cookbook biquad, matching what Web Audio's BiquadFilterNode does.
function highPass(signal, cutoffHz, sampleRate, q = 0.707) {
  const w0 = (2 * Math.PI * cutoffHz) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = (1 + cos) / 2 / a0;
  const b1 = -(1 + cos) / a0;
  const b2 = (1 + cos) / 2 / a0;
  const a1 = (-2 * cos) / a0;
  const a2 = (1 - alpha) / a0;
  const out = new Float32Array(signal.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < signal.length; i += 1) {
    const x = signal[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    out[i] = y;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
  }
  return out;
}

function withRumble(signal, amplitude) {
  const out = Float32Array.from(signal);
  let p1 = 0, p2 = 0, p3 = 0;
  for (let i = 0; i < out.length; i += 1) {
    p1 += (2 * Math.PI * 18) / SR;
    p2 += (2 * Math.PI * 31) / SR;
    p3 += (2 * Math.PI * 47) / SR;
    out[i] += amplitude * (Math.sin(p1) + 0.7 * Math.sin(p2) + 0.5 * Math.sin(p3));
  }
  return out;
}

function correctFraction(signal, f0) {
  const frames = Math.floor(signal.length / FRAME);
  let correct = 0;
  for (let w = 0; w < frames; w += 1) {
    const hz = detectPitch(signal.subarray(w * FRAME, w * FRAME + FRAME), SR);
    if (hz !== null && Math.abs(hz / f0 - 1) < 0.05) correct += 1;
  }
  return correct / frames;
}

const speech = voiceLike(185, FRAME * 30, 0.05);

// Rumble at a level comparable to the voice itself destroys detection...
const rumbly = withRumble(speech, 0.05);
assert.ok(
  correctFraction(rumbly, 185) < 0.2,
  "sanity: unfiltered room rumble is supposed to break this, otherwise the high-pass proves nothing"
);

// ...and the high-pass hands it straight back.
assert.ok(
  correctFraction(highPass(rumbly, 75, SR), 185) > 0.9,
  "a 75 Hz high-pass must recover a voice buried in room rumble"
);

// DC offset is the same story: it swamps the correlation entirely.
const offset = Float32Array.from(speech);
for (let i = 0; i < offset.length; i += 1) offset[i] += 0.1;
assert.ok(correctFraction(offset, 185) < 0.2, "sanity: DC offset is supposed to break this too");
assert.ok(correctFraction(highPass(offset, 75, SR), 185) > 0.9, "the high-pass must also remove DC offset");

// And it must not cost anybody with a genuinely low voice, which is the whole
// reason the cutoff sits at 75 Hz rather than somewhere more aggressive.
for (const f0 of [85, 95, 110]) {
  const low = voiceLike(f0, FRAME * 30, 0.05);
  assert.ok(
    correctFraction(highPass(low, 75, SR), f0) > 0.9,
    `the high-pass must leave a ${f0} Hz voice alone`
  );
}

console.log("High-pass checks passed (rumble and DC offset rejected, low voices unharmed).");

// Fans, and why "no false positives" was not enough --------------------------
// The room-tone check above passes white noise, which is not periodic, so the
// detector rejects it easily. A fan is a different animal: a motor hum plus a
// blade-passing tone and its harmonics, all of it MORE perfectly periodic than
// a human voice. Measured, the detector reported a pitch on 100% of frames of
// fan-only audio, at the blade frequency, and no high-pass cutoff low enough
// to keep real voices removes it.
//
// So periodicity answers "what pitch is this" and the noise gate answers
// "is anybody actually speaking". These assertions cover the second one.

function fanNoise(samples, amplitude, bladeHz) {
  const out = new Float32Array(samples);
  let motor = 0, blade = 0;
  for (let i = 0; i < samples; i += 1) {
    motor += (2 * Math.PI * 50) / SR;
    blade += (2 * Math.PI * bladeHz) / SR;
    out[i] =
      amplitude *
        (0.6 * Math.sin(motor) + Math.sin(blade) + 0.5 * Math.sin(2 * blade) + 0.3 * Math.sin(3 * blade)) +
      (Math.random() - 0.5) * amplitude * 0.8;
  }
  return out;
}

// Without the gate, a fan is reported as a voice on essentially every frame.
for (const bladeHz of [88, 96, 110, 130]) {
  const fan = highPass(fanNoise(FRAME * 25, 0.05, bladeHz), 75, SR);
  let reported = 0;
  for (let w = 0; w < 25; w += 1) {
    if (detectPitch(fan.subarray(w * FRAME, w * FRAME + FRAME), SR) !== null) reported += 1;
  }
  assert.ok(
    reported > 20,
    `sanity: a ${bladeHz} Hz fan is supposed to fool the detector, otherwise the gate proves nothing`
  );
}

// With it, an empty room with a fan in it produces nothing at all.
for (const bladeHz of [88, 96, 110, 130]) {
  const fan = highPass(fanNoise(FRAME * 60, 0.05, bladeHz), 75, SR);
  const gate = createNoiseGate();
  let reported = 0;
  for (let w = 0; w < 60; w += 1) {
    const frame = fan.subarray(w * FRAME, w * FRAME + FRAME);
    if (!gate.accepts(frameRms(frame))) continue;
    if (detectPitch(frame, SR) !== null) reported += 1;
  }
  assert.equal(reported, 0, `a ${bladeHz} Hz fan alone must never be reported as somebody's voice`);
}

// And somebody speaking over that fan still gets through. The voice has to be
// meaningfully louder than the room, which is physics rather than a setting:
// below about 18 dB the fan wins the correlation whatever we do.
{
  const frames = 140;
  const fan = fanNoise(FRAME * frames, 0.05, 96);
  const speech = voiceLike(185, FRAME * frames, 0.05 * 8);
  const mixed = Float32Array.from(fan);
  const half = Math.floor(frames / 2);
  // First half: fan only. Second half: fan plus a voice.
  for (let i = half * FRAME; i < mixed.length; i += 1) mixed[i] += speech[i];
  const filtered = highPass(mixed, 75, SR);

  const gate = createNoiseGate();
  let falsePositives = 0;
  let correct = 0;
  for (let w = 0; w < frames; w += 1) {
    const frame = filtered.subarray(w * FRAME, w * FRAME + FRAME);
    if (!gate.accepts(frameRms(frame))) continue;
    const hz = detectPitch(frame, SR);
    if (hz === null) continue;
    if (w < half) falsePositives += 1;
    else if (Math.abs(hz / 185 - 1) < 0.05) correct += 1;
  }
  assert.equal(falsePositives, 0, "the quiet stretch before somebody speaks must stay empty");
  assert.ok(correct > half * 0.7, `a voice over a fan must still register, got ${correct} of ${half}`);
}

console.log("Noise gate checks passed (a fan is not a voice, a voice over a fan still is).");
