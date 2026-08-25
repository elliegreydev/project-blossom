"use client";

import { useState } from "react";
import styles from "./StrengthConverter.module.css";

/**
 * Strength converter.
 *
 * WHAT THIS IS: arithmetic on two numbers the person typed in. If a vial says
 * 40mg/mL and they are working with 4mg, this says 0.1mL. That is it.
 *
 * WHAT THIS IS NOT, and the distinction is the whole reason it is allowed to
 * exist alongside the doctrine in src/lib/selfDirected.ts: it does not suggest a
 * dose, it does not know what anybody should be taking, it has no opinion on
 * whether a number is high or low, and it never stores what was typed. Ask it
 * to convert 4000mg and it will tell you the volume for 4000mg, because
 * deciding that 4000mg is wrong is exactly the clinical judgement this must not
 * pretend to have.
 *
 * The reason it is worth having at all is that people already do this sum, in
 * their heads, at the point of drawing up. A calculator that shows its working
 * makes a slipped decimal visible in a way that mental arithmetic does not.
 * That is harm reduction, not advice.
 *
 * Deliberately stateless. Nothing is written to the database, so there is no
 * new field to sync, export or protect, and nothing is left on the screen for
 * the next person who picks the phone up.
 */

type Direction = "mgToMl" | "mlToMg";

/** Accepts a comma as a decimal point, because plenty of keyboards give one. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  return value;
}

/**
 * Three decimal places, with trailing zeros stripped. More precision than that
 * is false confidence: nobody is measuring a thousandth of a milliliter, and a
 * result reading 0.13333 invites somebody to round it themselves under time
 * pressure.
 */
function format(value: number): string {
  return String(Number(value.toFixed(3)));
}

export default function StrengthConverter() {
  const [direction, setDirection] = useState<Direction>("mgToMl");
  const [strength, setStrength] = useState("");
  const [amount, setAmount] = useState("");

  const strengthValue = parseAmount(strength);
  const amountValue = parseAmount(amount);

  const mgToMl = direction === "mgToMl";
  const amountUnit = mgToMl ? "mg" : "mL";
  const resultUnit = mgToMl ? "mL" : "mg";

  let problem: string | null = null;
  let result: string | null = null;
  let working: string | null = null;

  if (strengthValue !== null && strengthValue < 0) {
    problem = "Strength can't be a negative number.";
  } else if (amountValue !== null && amountValue < 0) {
    problem = "That amount can't be a negative number.";
  } else if (strengthValue !== null && strengthValue === 0) {
    // Guarded rather than shown as Infinity, which is what dividing by zero
    // would otherwise put on screen.
    problem = "Strength can't be zero, so there's nothing to divide by.";
  } else if (strengthValue !== null && amountValue !== null) {
    const computed = mgToMl ? amountValue / strengthValue : amountValue * strengthValue;
    if (Number.isFinite(computed)) {
      result = `${format(computed)} ${resultUnit}`;
      working = mgToMl
        ? `${format(amountValue)} mg ÷ ${format(strengthValue)} mg/mL`
        : `${format(amountValue)} mL × ${format(strengthValue)} mg/mL`;
    }
  }

  const ready = result !== null;

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.eyebrow}>Converter</div>
        <h2 className={styles.title}>Work out a volume</h2>
      </div>

      <p className={styles.intro}>
        If you know the strength of what you have, this does the arithmetic and shows
        its working, so a slipped decimal is easy to spot.
      </p>

      <div className={styles.toggle} role="group" aria-label="What you're converting">
        <button
          type="button"
          className={styles.toggleButton}
          aria-pressed={mgToMl}
          onClick={() => setDirection("mgToMl")}
        >
          mg to mL
        </button>
        <button
          type="button"
          className={styles.toggleButton}
          aria-pressed={!mgToMl}
          onClick={() => setDirection("mlToMg")}
        >
          mL to mg
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="converter-strength">
          Strength of what you have
        </label>
        <div className={styles.inputRow}>
          <input
            id="converter-strength"
            className={styles.input}
            inputMode="decimal"
            autoComplete="off"
            /* "0", not a realistic example. A placeholder reading 40 next to a
               placeholder reading 4 is Blossom putting a dose-shaped pair of
               numbers on the screen unprompted, which is the one thing the
               doctrine in lib/selfDirected.ts says this must never do. */
            placeholder="0"
            value={strength}
            onChange={(e) => setStrength(e.target.value)}
          />
          <span className={styles.unit}>mg/mL</span>
        </div>
        <p className={styles.hint}>Usually printed on the vial or the box.</p>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="converter-amount">
          {mgToMl ? "Amount you're working out" : "Volume you're working out"}
        </label>
        <div className={styles.inputRow}>
          <input
            id="converter-amount"
            className={styles.input}
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <span className={styles.unit}>{amountUnit}</span>
        </div>
      </div>

      {/* Polite rather than assertive: this updates on every keystroke, and an
          assertive region would interrupt a screen reader mid-word each time. */}
      <div className={styles.result} aria-live="polite">
        {problem ? (
          <p className={styles.problem}>{problem}</p>
        ) : ready ? (
          <>
            <div className={styles.resultValue}>{result}</div>
            <div className={styles.working}>{working}</div>
          </>
        ) : (
          <p className={styles.resultEmpty}>Fill in both boxes and the answer appears here.</p>
        )}
      </div>

      <p className={styles.disclaimer}>
        This is a calculator, not advice. It works out one number from two others and
        nothing else. It doesn&apos;t know what&apos;s right for you, it can&apos;t tell
        whether what you&apos;ve typed is sensible, and it isn&apos;t checking anything.
        What goes in the boxes should come from whoever prescribes or monitors for you.
        Nothing you type here is saved.
      </p>
    </div>
  );
}
