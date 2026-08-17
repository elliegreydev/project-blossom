"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import { db, LOCAL_PROFILE_ID, updateProfile } from "@/lib/db";
import {
  APPEARANCES,
  applyThemeToDocument,
  DEFAULT_APPEARANCE,
  DEFAULT_HUE,
  DEFAULT_THEME,
  isAppearance,
  isHue,
  isThemeId,
  THEMES,
  type Appearance,
  type ThemeId,
} from "@/lib/themes";
import styles from "./appearance.module.css";

// The little preview square next to each theme name. Hard-coded rather than
// read from CSS, because the point is to show what a theme looks like while
// you're still using a different one.
const SAMPLES: Record<ThemeId, { bg: string; raised: string; a: string; b: string }> = {
  classic: { bg: "#fcfafc", raised: "#f7f3f8", a: "#f7b4c8", b: "#c4b6f6" },
  "quiet-ink": { bg: "#f7f4ef", raised: "#ffffff", a: "#c4737e", b: "#7c8b6f" },
  "low-profile": { bg: "#f4f5f6", raised: "#ffffff", a: "#5a7184", b: "#8b9297" },
  softbound: { bg: "#fbf7f0", raised: "#fffdf9", a: "#e8b4b8", b: "#c08552" },
  "in-bloom": { bg: "#191033", raised: "#241847", a: "#ff5c8a", b: "#34d1e0" },
  // Replaced at render time with the person's own hue - see swatchFor below.
  "your-colour": { bg: "", raised: "", a: "", b: "" },
};

/** The custom theme's swatch has to show their colour, not a fixed sample,
 *  because the whole point of the card is previewing the choice. Same oklch
 *  values as the theme itself in globals.css, so it can't drift. */
function swatchFor(id: ThemeId, hue: number) {
  if (id !== "your-colour") return SAMPLES[id];
  return {
    bg: `oklch(0.985 0.006 ${hue})`,
    raised: `oklch(0.963 0.013 ${hue})`,
    a: `oklch(0.74 0.19 ${hue})`,
    b: `oklch(0.8 0.16 ${hue})`,
  };
}

export default function AppearanceSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  const theme: ThemeId = isThemeId(profile?.theme) ? profile.theme : DEFAULT_THEME;
  const appearance: Appearance = isAppearance(profile?.appearance) ? profile.appearance : DEFAULT_APPEARANCE;
  const savedHue: number = isHue(profile?.themeHue) ? profile.themeHue : DEFAULT_HUE;
  // The slider is a controlled input, and the saved value only catches up
  // after a write to Dexie. Without somewhere to hold the in-progress value,
  // every re-render snaps the thumb back to where it started and it fights
  // the finger dragging it. This holds the drag; null means "use the saved one".
  const [draftHue, setDraftHue] = useState<number | null>(null);
  const hue = draftHue ?? savedHue;

  async function chooseTheme(next: ThemeId) {
    // Paint first, save second. Waiting on the database before the colours
    // change makes tapping a theme feel broken.
    applyThemeToDocument(next, appearance, hue);
    await updateProfile({ theme: next });
  }

  async function chooseAppearance(next: Appearance) {
    applyThemeToDocument(theme, next, hue);
    await updateProfile({ appearance: next });
  }

  // Repaints on every drag frame so the whole app moves under their finger,
  // then saves once. Writing to Dexie per frame would make the slider stutter.
  function dragHue(next: number) {
    setDraftHue(next);
    applyThemeToDocument("your-colour", appearance, next);
  }

  async function commitHue(next: number) {
    applyThemeToDocument("your-colour", appearance, next);
    await updateProfile({ theme: "your-colour", themeHue: next });
    setDraftHue(null);
  }

  if (!profile) return null;

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Appearance" backHref="/settings" />

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Theme</p>
        <p className={styles.hint}>
          Changes how Blossom looks, not what it does. Some of these are quieter than others if
          you&apos;d rather it wasn&apos;t obvious what you&apos;re looking at.
        </p>
        <div className={styles.themeList}>
          {THEMES.map((t) => {
            const sample = swatchFor(t.id, hue);
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                className={styles.themeCard}
                aria-pressed={active}
                onClick={() => void chooseTheme(t.id)}
              >
                <span className={styles.swatch} style={{ background: sample.raised }} aria-hidden="true">
                  <span className={styles.swatchTop} style={{ background: sample.bg }}>
                    <span className={styles.swatchDot} style={{ background: sample.a }} />
                    <span className={styles.swatchDot} style={{ background: sample.b }} />
                  </span>
                  <span className={styles.swatchBottom} style={{ background: sample.raised }} />
                </span>
                <span className={styles.themeText}>
                  <span className={styles.themeName}>{t.name}</span>
                  <span className={styles.themeDesc}>{t.description}</span>
                </span>
                {active && <span className={styles.check} aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>

        {theme === "your-colour" && (
          <div className={styles.hueBlock}>
            <label className={styles.hueLabel} htmlFor="hue">
              Your colour
            </label>
            <input
              id="hue"
              type="range"
              min={0}
              max={359}
              value={hue}
              className={styles.hueSlider}
              onChange={(e) => dragHue(Number(e.target.value))}
              onPointerUp={(e) => void commitHue(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => void commitHue(Number((e.target as HTMLInputElement).value))}
            />
            <p className={styles.hint}>
              Only the colour changes. How readable everything is stays the same wherever
              you put the slider, and crisis support keeps its own colour so it&apos;s
              always easy to spot.
            </p>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <p className={styles.sectionLabel}>Light or dark</p>
        <div className={styles.segmented} role="group" aria-label="Light or dark">
          {APPEARANCES.map((a) => (
            <button
              key={a.id}
              type="button"
              className={styles.segment}
              aria-pressed={a.id === appearance}
              onClick={() => void chooseAppearance(a.id)}
            >
              {a.id === "system" ? "Automatic" : a.id === "light" ? "Light" : "Dark"}
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          {appearance === "system"
            ? "Following your device. It'll switch when your phone does."
            : appearance === "dark"
              ? "Always dark, whatever your phone is set to."
              : "Always light, whatever your phone is set to."}
        </p>
      </section>

      <p className={styles.footnote}>
        Your choice follows your account, so it&apos;ll look the same on any device you sign in on.
      </p>
    </div>
  );
}
