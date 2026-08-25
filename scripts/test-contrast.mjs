import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Colour contrast, for real.
 *
 * Blossom ships several themes, each with a light and a dark variant, to an
 * audience that includes people with low vision and people for whom harsh
 * contrast is a migraine trigger. The existing accessibility test only checks
 * that the preset objects exist. This one reads the actual palette out of
 * globals.css and does the WCAG maths, so a theme where somebody made text the
 * wrong shade against its background fails here instead of on a real person's
 * screen.
 *
 * It is deliberately a parser over the real CSS rather than a copy of the
 * colours: a copy would drift, and then the test would be checking a fiction.
 */

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "..", "src", "app", "globals.css"), "utf8");

// WCAG relative luminance and contrast ratio. Straight from the spec.
function toLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]) {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
function hexToRgb(hex) {
  const h = hex.replace("#", "").toLowerCase();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
}

/**
 * Pull every `--token: value;` out of one CSS block. Values that point at
 * another token (`var(--plum)`) are recorded as references and resolved after,
 * because a block often sets --text-primary to var(--plum) and --plum in the
 * same place.
 */
function parseBlock(body) {
  const tokens = {};
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) {
    tokens[m[1].trim()] = m[2].trim();
  }
  return tokens;
}

// Split the file into { selector, tokens } blocks. Good enough for this file's
// flat structure: no nested rules inside the :root / [data-theme] blocks.
function parseBlocks(text) {
  const blocks = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    const selector = m[1].trim().split("\n").pop().trim();
    const tokens = parseBlock(m[2]);
    if (Object.keys(tokens).length) blocks.push({ selector, tokens });
  }
  return blocks;
}

const blocks = parseBlocks(css);

// The base light palette is bare :root. Everything inherits from it.
const base = blocks.find((b) => b.selector === ":root");
assert(base, "no :root block found in globals.css");

function resolveToken(tokens, name, seen = new Set()) {
  if (seen.has(name)) return null;
  seen.add(name);
  const raw = tokens[name] ?? base.tokens[name];
  if (!raw) return null;
  const varMatch = raw.match(/^var\(--([\w-]+)\)$/);
  if (varMatch) return resolveToken(tokens, varMatch[1], seen);
  const hexMatch = raw.match(/#[0-9a-fA-F]{3,6}/);
  return hexMatch ? hexMatch[0] : null;
}

/**
 * Each palette-defining block is a context to check. We only look at blocks
 * that set at least one text colour, merge them over base, and check the text
 * tones against the two backgrounds a person actually reads on: the page (--bg)
 * and a raised card (--bg-raised).
 */
const AA_NORMAL = 4.5; // body text
const AA_LARGE = 3.0; // large or de-emphasised text

const checks = [];
for (const block of blocks) {
  const setsText =
    "text-primary" in block.tokens ||
    "text-secondary" in block.tokens ||
    "text-muted" in block.tokens ||
    "bg" in block.tokens;
  if (!setsText) continue;
  if (block.selector.includes("::")) continue; // pseudo-elements

  const merged = { ...base.tokens, ...block.tokens };
  const bg = resolveToken(merged, "bg");
  const bgRaised = resolveToken(merged, "bg-raised") ?? bg;
  if (!bg) continue;

  const pairs = [
    ["text-primary", "bg", AA_NORMAL],
    ["text-primary", "bg-raised", AA_NORMAL],
    ["text-secondary", "bg", AA_NORMAL],
    ["text-secondary", "bg-raised", AA_NORMAL],
    // Muted is used for de-emphasised captions; hold it to the large-text bar,
    // which is still a real floor, not a free pass.
    ["text-muted", "bg", AA_LARGE],
    ["text-muted", "bg-raised", AA_LARGE],
  ];

  for (const [textToken, bgToken, threshold] of pairs) {
    const fg = resolveToken(merged, textToken);
    const back = bgToken === "bg" ? bg : bgRaised;
    if (!fg || !back) continue;
    const ratio = contrast(hexToRgb(fg), hexToRgb(back));
    checks.push({
      selector: block.selector,
      pair: `${textToken} on ${bgToken}`,
      fg,
      back,
      ratio: Math.round(ratio * 100) / 100,
      threshold,
      pass: ratio >= threshold,
    });
  }
}

assert(checks.length > 0, "parsed no contrast pairs — the CSS format may have changed");

const failures = checks.filter((c) => !c.pass);

console.log(`  checked ${checks.length} text/background pairs across ${new Set(checks.map((c) => c.selector)).size} palettes`);

if (failures.length) {
  console.log(`\n  ${failures.length} below the WCAG floor:`);
  for (const f of failures) {
    console.log(
      `    ${f.selector}  ${f.pair}  ${f.fg} on ${f.back}  ${f.ratio}:1  (need ${f.threshold}:1)`
    );
  }
}

assert.equal(
  failures.length,
  0,
  `${failures.length} text/background pair(s) fail WCAG AA contrast — see above`
);

console.log("  all palettes meet their WCAG AA contrast floor");
