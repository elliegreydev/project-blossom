"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import ScreenHeader from "@/components/ScreenHeader";
import Toggle from "@/components/Toggle";
import { db, LOCAL_PROFILE_ID, updateProfile, type Profile } from "@/lib/db";
import { profileForSettings, type AccessibilitySettings } from "@/lib/accessibilityProfiles";
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

/** The five colours a circle needs to stand for a whole palette: the page
 *  behind everything, the cards on top of it, the line around them, and the
 *  two accents. */
type Swatch = { bg: string; raised: string; border: string; accentA: string; accentB: string };

// The theme you're already on doesn't need reading off anything. A live var()
// resolves to exactly what's on screen this frame, including a hue still
// moving under a finger, so the selected circle can never lag behind the app.
const LIVE_SWATCH: Swatch = {
  bg: "var(--bg)",
  raised: "var(--bg-raised)",
  border: "var(--border)",
  accentA: "var(--pink)",
  accentB: "var(--lavender)",
};

const TEXT_SIZES: { key: Profile["textSize"]; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "large", label: "Large" },
  { key: "larger", label: "Larger" },
];

/**
 * Ask the document what each theme actually looks like.
 *
 * This screen used to keep its own copy of every palette, so each theme was
 * written down twice and only one of the two was ever the truth. Flipping
 * data-theme on <html> and reading the tokens back gets the real thing
 * instead, and gets it in dark, in stronger contrast, and at whatever hue
 * somebody built for themselves, without this file knowing any of that
 * exists. Nothing paints in between: the attribute is put back before this
 * function returns, and it runs inside a layout effect.
 */
function readSwatches(hue: number, probingClass: string): Partial<Record<ThemeId, Swatch>> {
  const root = document.documentElement;
  const previousTheme = root.dataset.theme;
  const previousHue = root.style.getPropertyValue("--accent-hue");
  // Six palettes in one frame. Without this the whole app would animate its
  // way through every one of them on the way back to the chosen one.
  root.classList.add(probingClass);

  const found: Partial<Record<ThemeId, Swatch>> = {};
  try {
    for (const t of THEMES) {
      root.dataset.theme = t.id;
      // Their hue, not the cached one, so the custom circle is honest even
      // when the value arrived by sync rather than from this device.
      if (t.id === "your-colour") root.style.setProperty("--accent-hue", String(hue));
      const tokens = getComputedStyle(root);
      const swatch: Swatch = {
        bg: tokens.getPropertyValue("--bg").trim(),
        raised: tokens.getPropertyValue("--bg-raised").trim(),
        border: tokens.getPropertyValue("--border").trim(),
        accentA: tokens.getPropertyValue("--pink").trim(),
        accentB: tokens.getPropertyValue("--lavender").trim(),
      };
      // A blank means something moved in globals.css. Better to fall back to
      // the live theme than to draw a circle with holes in it.
      if (Object.values(swatch).every(Boolean)) found[t.id] = swatch;
    }
  } finally {
    if (previousTheme) root.dataset.theme = previousTheme;
    else delete root.dataset.theme;
    if (previousHue) root.style.setProperty("--accent-hue", previousHue);
    else root.style.removeProperty("--accent-hue");
    root.classList.remove(probingClass);
  }
  return found;
}

// The reading above has to happen before the first paint, or every circle
// shows the current theme for a frame and then snaps. On the server there is
// no document to read and useLayoutEffect only warns, so it stands down.
const useProbeEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function AppearanceSettingsPage() {
  const profile = useLiveQuery(() => db.profiles.get(LOCAL_PROFILE_ID));

  const theme: ThemeId = isThemeId(profile?.theme) ? profile.theme : DEFAULT_THEME;
  const appearance: Appearance = isAppearance(profile?.appearance) ? profile.appearance : DEFAULT_APPEARANCE;
  const savedHue: number = isHue(profile?.themeHue) ? profile.themeHue : DEFAULT_HUE;
  const highContrast = profile?.highContrast ?? false;
  // The slider is a controlled input, and the saved value only catches up
  // after a write to Dexie. Without somewhere to hold the in-progress value,
  // every re-render snaps the thumb back to where it started and it fights
  // the finger dragging it. This holds the drag; null means "use the saved one".
  const [draftHue, setDraftHue] = useState<number | null>(null);
  const hue = draftHue ?? savedHue;
  // Same story for the size slider, one step at a time instead of a drag.
  const [draftSize, setDraftSize] = useState<number | null>(null);

  const [swatches, setSwatches] = useState<Partial<Record<ThemeId, Swatch>>>({});

  // Re-read when anything that moves a palette moves: light or dark, stronger
  // contrast, a committed hue, or the phone flipping to dark on its own while
  // this screen is open. Deliberately not the hue mid-drag, which would mean
  // six style recalculations per frame for a circle that is already live.
  useProbeEffect(() => {
    const refresh = () => setSwatches(readSwatches(savedHue, styles.probing));
    refresh();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", refresh);
    return () => media.removeEventListener("change", refresh);
  }, [savedHue, appearance, highContrast]);

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

  const chosen = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const savedSize = Math.max(
    0,
    TEXT_SIZES.findIndex((t) => t.key === profile.textSize)
  );
  const sizeIndex = draftSize ?? savedSize;

  // Both switches below also live on the Accessibility screen. The stored
  // preset name is worked out from the whole set, so it has to be rewritten
  // here too or the two screens would disagree about which preset is on.
  const settings: AccessibilitySettings = {
    reduceMotion: profile.reduceMotion,
    textSize: profile.textSize,
    highContrast: profile.highContrast,
    largeTouchTargets: profile.largeTouchTargets,
    readingComfort: profile.readingComfort,
    reduceVisualNoise: profile.reduceVisualNoise,
  };

  const saveSettings = async (patch: Partial<AccessibilitySettings>) => {
    const next = { ...settings, ...patch };
    await updateProfile({ ...patch, accessibilityProfile: profileForSettings(next) });
  };

  // Writes as it moves, so the app really does grow under the finger, but the
  // draft is only let go of once the gesture ends. Clearing it after every
  // step (which is what the await tempts you into) lets a write started two
  // steps ago hand the thumb back to a value the finger has already left, and
  // the whole page resizes on the way past. Same shape as the hue slider.
  function dragTextSize(index: number) {
    setDraftSize(index);
    void saveSettings({ textSize: TEXT_SIZES[index].key });
  }

  async function commitTextSize(index: number) {
    await saveSettings({ textSize: TEXT_SIZES[index].key });
    setDraftSize(null);
  }

  return (
    <div className={styles.screen}>
      <ScreenHeader title="Appearance" backHref="/settings" />

      {/* Everything in here is drawn with the same tokens as the rest of the
          app, so it can't flatter a theme that doesn't deserve it. */}
      <div className={styles.preview}>
        <p className={styles.eyebrow}>Preview</p>
        <div className={styles.previewFrame}>
          <div className={styles.previewCard}>
            <div className={styles.previewHead}>
              <span className={styles.previewMark} aria-hidden="true" />
              <p className={styles.previewTitle}>How Blossom looks</p>
            </div>
            <p className={styles.previewBody}>Body text sits at this size, in these colours.</p>
            <p className={styles.previewNote}>Gentle notes and reminders are tinted like this.</p>
            <div className={styles.previewChips}>
              <span className={styles.previewChip}>Journey</span>
              <span className={`${styles.previewChip} ${styles.previewChipAlt}`}>Care</span>
            </div>
          </div>
        </div>
        <p className={styles.previewMeta}>
          <strong>{chosen.name}.</strong> {chosen.description}
        </p>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Colour</p>
          <h2 className={styles.sectionTitle}>Theme</h2>
        </div>
        <p className={styles.hint}>
          Changes how Blossom looks, not what it does. Some of these are quieter than others if
          you&apos;d rather it wasn&apos;t obvious what you&apos;re looking at.
        </p>

        <div className={styles.themeGrid} role="group" aria-label="Theme">
          {THEMES.map((t) => {
            const active = t.id === theme;
            const sample = active ? LIVE_SWATCH : swatches[t.id] ?? LIVE_SWATCH;
            return (
              <button
                key={t.id}
                type="button"
                className={styles.themeCell}
                aria-pressed={active}
                aria-label={`${t.name}. ${t.description}`}
                onClick={() => void chooseTheme(t.id)}
              >
                <span className={styles.circleWrap}>
                  <span
                    className={styles.circle}
                    aria-hidden="true"
                    style={{
                      background: `linear-gradient(140deg, ${sample.bg} 0 52%, ${sample.raised} 52%)`,
                      borderColor: sample.border,
                    }}
                  >
                    <span className={styles.dot} style={{ background: sample.accentA }} />
                    <span className={styles.dot} style={{ background: sample.accentB }} />
                  </span>
                  {/* A tick as well as the ring, so the chosen one isn't told
                      by colour alone. */}
                  {active && (
                    <span className={styles.tick} aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 13l4 4 10-10" />
                      </svg>
                    </span>
                  )}
                </span>
                <span className={styles.themeName}>{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* The descriptions stay readable without trying a theme on first.
            Somebody who chose Low Profile so a screen looks unremarkable in
            public shouldn't have to flash In Bloom across the room to find
            out what In Bloom is. */}
        <details className={styles.themeNotes}>
          <summary>What each one looks like</summary>
          <dl>
            {THEMES.map((t) => (
              <div key={t.id}>
                <dt>{t.name}</dt>
                <dd>{t.description}</dd>
              </div>
            ))}
          </dl>
        </details>

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
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Time of day</p>
          <h2 className={styles.sectionTitle}>Light or dark</h2>
        </div>
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

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Reading</p>
          <h2 className={styles.sectionTitle}>Text size</h2>
        </div>
        <div className={styles.sizeRow}>
          <span className={styles.sizeSmall} aria-hidden="true">
            Aa
          </span>
          <input
            type="range"
            min={0}
            max={TEXT_SIZES.length - 1}
            step={1}
            value={sizeIndex}
            className={styles.sizeSlider}
            aria-label="Text size"
            aria-valuetext={TEXT_SIZES[sizeIndex].label}
            onChange={(e) => dragTextSize(Number(e.target.value))}
            onPointerUp={(e) => void commitTextSize(Number((e.target as HTMLInputElement).value))}
            onKeyUp={(e) => void commitTextSize(Number((e.target as HTMLInputElement).value))}
          />
          <span className={styles.sizeLarge} aria-hidden="true">
            Aa
          </span>
        </div>
        <div className={styles.sizeTicks} aria-hidden="true">
          {TEXT_SIZES.map((t, i) => (
            <span key={t.key} className={`${styles.sizeTick} ${i === sizeIndex ? styles.sizeTickOn : ""}`}>
              {t.label}
            </span>
          ))}
        </div>
        <p className={styles.hint}>Makes the writing bigger. The preview above changes as you move it.</p>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <p className={styles.eyebrow}>Comfort</p>
          <h2 className={styles.sectionTitle}>Contrast and decoration</h2>
        </div>
        <div className={styles.switchCard}>
          <div className={styles.switchRow}>
            <span className={styles.switchText}>
              <span className={styles.switchTitle}>Stronger contrast</span>
              <span className={styles.switchDesc}>Sharper text and firmer edges, in both light and dark</span>
            </span>
            <Toggle
              checked={profile.highContrast}
              onChange={(value) => void saveSettings({ highContrast: value })}
              label="Stronger contrast"
            />
          </div>
          <div className={styles.switchRow}>
            <span className={styles.switchText}>
              <span className={styles.switchTitle}>Less decoration</span>
              <span className={styles.switchDesc}>Removes gradients and background flourishes</span>
            </span>
            <Toggle
              checked={profile.reduceVisualNoise}
              onChange={(value) => void saveSettings({ reduceVisualNoise: value })}
              label="Less decoration"
            />
          </div>
        </div>
        <Link href="/settings/accessibility" className={styles.moreLink}>
          <span className={styles.moreText}>
            <strong>All accessibility settings</strong>
            <span>These two live there too, with reduced motion, bigger tap targets and easier reading.</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </section>

      <p className={styles.footnote}>
        Your choice follows your account, so it&apos;ll look the same on any device you sign in on.
      </p>
    </div>
  );
}
