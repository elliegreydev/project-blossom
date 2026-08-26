// Reference ranges and the pitch-to-screen mapping for the live practice
// screen.
//
// THE RULE THIS FILE EXISTS TO HOLD:
// A reference range is a BACKDROP, never a target. Nothing in Blossom may
// react to a voice entering or leaving one. No colour change, no "you're in
// range", no percentage of time spent inside, no streak, no celebration. The
// moment the app congratulates somebody for a number it has started scoring
// them, and this is the one screen where that would hurt most.
//
// Ranges are OFF unless the person turns them on. Blossom's older comments
// said pitch would never be labelled male or female anywhere; that was
// deliberately revisited in Aug 2026. A bare 70-350 Hz canvas with no
// landmarks is not neutrality, it just withholds context that people look up
// elsewhere and find in worse, unsourced forms. Offering it, off by default,
// clearly labelled as typical speaking ranges rather than goals, is the more
// honest position. What has NOT changed is that Blossom never tells anybody
// where their voice ought to sit.

export type ReferenceMode = "off" | "zones" | "bands" | "mine";

export interface ReferenceBand {
  id: string;
  label: string;
  lowHz: number;
  highHz: number;
  /** Which themeable token paints it. Never a hardcoded colour. */
  token: "--pink" | "--lavender" | "--sky" | "--mint";
}

// Typical adult speaking fundamental frequency. These are population
// averages from the voice-science literature, not goals, and plenty of people
// of every gender sit outside them. Figures cross-checked Aug 2026 against
// commonly reported values (male roughly 85-155 Hz, female roughly 165-255 Hz,
// with a genuinely shared middle around 140-165 Hz that is usually described
// as the ambiguous or gender-neutral zone).
export const TYPICAL_LOW_HZ = 85;
export const TYPICAL_HIGH_HZ = 255;
export const OVERLAP_LOW_HZ = 140;
export const OVERLAP_HIGH_HZ = 165;

// "Zones" draws the overlap as its own region, because it is real. Two clean
// separated bands imply a gap that does not exist in the data, and the middle
// is where a great deal of trans voice practice actually happens.
export const ZONE_BANDS: ReferenceBand[] = [
  { id: "lower", label: "typical male range", lowHz: 85, highHz: 140, token: "--sky" },
  { id: "overlap", label: "where they overlap", lowHz: 140, highHz: 165, token: "--lavender" },
  { id: "upper", label: "typical female range", lowHz: 165, highHz: 255, token: "--pink" },
];

// "Bands" is the plainer two-band presentation, for anyone who finds the
// three-way split more confusing than useful. The overlap still exists; here
// the two bands simply meet across it rather than being drawn apart.
export const SIMPLE_BANDS: ReferenceBand[] = [
  { id: "male", label: "typical male range", lowHz: 85, highHz: 155, token: "--sky" },
  { id: "female", label: "typical female range", lowHz: 165, highHz: 255, token: "--pink" },
];

export function bandsFor(mode: ReferenceMode, own: { low: number; high: number } | null): ReferenceBand[] {
  if (mode === "zones") return ZONE_BANDS;
  if (mode === "bands") return SIMPLE_BANDS;
  if (mode === "mine" && own) {
    return [{ id: "mine", label: "where you usually sit", lowHz: own.low, highHz: own.high, token: "--mint" }];
  }
  return [];
}

// The display window. Kept wide enough to hold any speaking voice without
// implying anything about where within it a voice should be.
export const DISPLAY_MIN_HZ = 70;
export const DISPLAY_MAX_HZ = 350;

// Pitch is perceived logarithmically: the distance from 100 to 200 Hz is one
// octave, and so is 175 to 350 Hz. The old linear mapping gave the first of
// those 36% of the canvas and the second 62%, which quietly squashed lower
// voices flat and made them look less mobile than they actually were. Mapping
// by log frequency gives an octave the same height wherever it sits, so the
// shape of the trail finally means the same thing for everybody.
//
// This is a correctness fix, not a preference, so there is no toggle for it.
export function pitchToUnit(hz: number): number {
  const clamped = Math.min(DISPLAY_MAX_HZ, Math.max(DISPLAY_MIN_HZ, hz));
  const lo = Math.log(DISPLAY_MIN_HZ);
  const hi = Math.log(DISPLAY_MAX_HZ);
  return (Math.log(clamped) - lo) / (hi - lo);
}

/** 0 at the top of the canvas, `height` at the bottom. */
export function pitchToY(hz: number, height: number): number {
  return height - pitchToUnit(hz) * height;
}

// Colours come from the live theme rather than the stylesheet's defaults, so
// the trail follows Low Profile and "Your colour" like everything else does.
// Canvas cannot read a CSS custom property on its own, which is how two
// hardcoded pinks ended up here and stayed visible under a theme somebody
// chose specifically so the app would not look trans-coded over their
// shoulder.
export function readToken(token: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value.length > 0 ? value : fallback;
}
