// Blossom's selectable themes.
//
// Two independent choices: which *theme* (the palette and personality) and
// which *appearance* (light, dark, or follow the phone). They're separate on
// purpose - someone might want In Bloom in daylight and Low Profile at work,
// and forcing dark-only or light-only per theme would take that away.
//
// The actual colours live in globals.css, keyed off data-theme and
// data-appearance on <html>. This file is just the list and the plumbing.

export const THEMES = [
  {
    id: "classic",
    name: "Classic",
    description: "Blossom as it's always looked. Soft pink and lavender.",
  },
  {
    id: "quiet-ink",
    name: "Quiet Ink",
    description: "Warm paper and a serif. Reads like a notebook rather than an app.",
  },
  {
    id: "low-profile",
    name: "Low Profile",
    description: "Greys and one steel blue. Deliberately unremarkable if someone glances over.",
  },
  {
    id: "softbound",
    name: "Softbound",
    description: "Cream, clay and moss. Warmer and less sweet than Classic.",
  },
  {
    id: "in-bloom",
    name: "In Bloom",
    description: "Deep violet with hot pink and cyan. Loud, and not sorry about it.",
  },
  {
    id: "your-colour",
    name: "Your colour",
    description: "Pick any colour you like and Blossom builds itself around it.",
  },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
export type Appearance = "system" | "light" | "dark";

export const DEFAULT_THEME: ThemeId = "classic";

/**
 * The hue behind the "Your colour" theme, 0-359 on the colour wheel.
 *
 * Only the hue is the person's to choose. Every lightness and chroma in that
 * theme is fixed in globals.css using oklch, which is perceptually uniform:
 * the same lightness looks equally light at every hue. That's the whole
 * safety property. Sliders for background and text separately would let
 * somebody build a palette they can't read - probably on a good day, and then
 * need the app on a bad one - and there'd be no way back except finding
 * Settings they can no longer see.
 *
 * The semantic colours stay out of it too. Crisis help is pink because it is
 * always pink; a custom palette must never be able to hide the one thing on
 * Home that somebody might be looking for in a hurry.
 */
export const DEFAULT_HUE = 295;
export const HUE_STORAGE_KEY = "blossom-hue";

export function isHue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 359;
}
export const DEFAULT_APPEARANCE: Appearance = "system";

export const APPEARANCES: { id: Appearance; name: string; description: string }[] = [
  { id: "system", name: "Match my phone", description: "Follows your device's light or dark setting." },
  { id: "light", name: "Always light", description: "" },
  { id: "dark", name: "Always dark", description: "" },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value);
}

export function isAppearance(value: unknown): value is Appearance {
  return value === "system" || value === "light" || value === "dark";
}

// Mirrored into localStorage purely so the inline boot script in the root
// layout can apply the theme before the first paint. Dexie is async, and
// waiting for it means every app open flashes the wrong colours first. The
// database stays the source of truth; this is only a cache.
export const THEME_STORAGE_KEY = "blossom-theme";
export const APPEARANCE_STORAGE_KEY = "blossom-appearance";

export function applyThemeToDocument(theme: ThemeId, appearance: Appearance, hue?: number): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.appearance = appearance;
  if (isHue(hue)) {
    root.style.setProperty("--accent-hue", String(hue));
    try {
      localStorage.setItem(HUE_STORAGE_KEY, String(hue));
    } catch {
      // Same as below: it still applies for this session.
    }
  }
  // Keeps native form controls and scrollbars in step with the choice.
  root.style.colorScheme = appearance === "system" ? "light dark" : appearance;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.setItem(APPEARANCE_STORAGE_KEY, appearance);
  } catch {
    // Storage blocked (private browsing). The theme still applies for this
    // session; it just won't beat the flash on the next load.
  }
}
