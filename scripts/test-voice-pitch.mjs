import assert from "node:assert/strict";
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
