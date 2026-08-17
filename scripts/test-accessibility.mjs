import assert from "node:assert/strict";
import {
  ACCESSIBILITY_DEFAULTS,
  ACCESSIBILITY_PRESETS,
  applyPreset,
  presetFor,
  profileForSettings,
} from "../src/lib/accessibilityProfiles.ts";

// Every preset is distinct, or two of them are the same button.
const shapes = ACCESSIBILITY_PRESETS.map((p) => JSON.stringify(p.settings));
assert.equal(new Set(shapes).size, shapes.length, "two presets produce identical settings");

// A preset that changes nothing is a button that does nothing.
for (const preset of ACCESSIBILITY_PRESETS) {
  assert.notDeepEqual(preset.settings, ACCESSIBILITY_DEFAULTS, `${preset.key} changes nothing`);
  assert.ok(preset.label && preset.desc.length > 20, `${preset.key} needs a real description`);
}

// Nothing starts switched on.
assert.deepEqual(ACCESSIBILITY_DEFAULTS, {
  reduceMotion: false,
  textSize: "normal",
  highContrast: false,
  largeTouchTargets: false,
  readingComfort: false,
  reduceVisualNoise: false,
});

// Presets are a full set, not a layer. Picking a second one must clear what the
// first turned on, or someone ends up with the union of everything they ever
// tapped and no way back short of toggling six switches.
const low = applyPreset("lowVision");
assert.equal(low.highContrast, true);
assert.equal(low.textSize, "larger");
assert.equal(low.largeTouchTargets, true);
assert.equal(low.reduceMotion, false);

const migraine = applyPreset("migraineFriendly");
assert.equal(migraine.highContrast, false, "switching preset left the old contrast on");
assert.equal(migraine.textSize, "normal");
assert.equal(migraine.reduceMotion, true);
assert.equal(migraine.reduceVisualNoise, true);

// The one that would actively hurt if it were wrong. Harsh contrast is a
// common migraine trigger, so this preset must calm the page rather than
// sharpen it.
assert.equal(
  presetFor("migraineFriendly").settings.highContrast,
  false,
  "migraine-friendly must not force high contrast"
);

// Every preset records which one it was.
for (const preset of ACCESSIBILITY_PRESETS) {
  assert.equal(applyPreset(preset.key).accessibilityProfile, preset.key);
}

// Round trip: applying a preset and reading the settings back names it again.
for (const preset of ACCESSIBILITY_PRESETS) {
  const { accessibilityProfile, ...settings } = applyPreset(preset.key);
  assert.equal(profileForSettings(settings), preset.key, `${preset.key} did not round trip`);
}

// Defaults are nobody's preset.
assert.equal(profileForSettings(ACCESSIBILITY_DEFAULTS), "custom");

// Change one switch away from a preset and you become custom, without being
// blocked. "Keeping every setting adjustable" is the roadmap wording.
const tweaked = { ...presetFor("lowVision").settings, reduceMotion: true };
assert.equal(profileForSettings(tweaked), "custom");

// ...and fiddling back to an exact preset says so again, rather than insisting
// you're custom when you demonstrably aren't.
const backAgain = { ...tweaked, reduceMotion: false };
assert.equal(profileForSettings(backAgain), "lowVision");

assert.equal(presetFor("custom"), null);
assert.equal(presetFor("nonsense"), null);

console.log("Accessibility preset checks passed.");
