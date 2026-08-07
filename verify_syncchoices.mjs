// Per-category sync choices. The claims worth proving:
//  1. an excluded record never reaches the outbox, written through the real UI
//  2. re-including it starts queueing again
//  3. the choice is saved and a server cleanup is offered
//  4. the server purge is a HARD delete - no deleted_at tombstone another
//     device would read as "delete the local copy"
import { chromium } from "playwright";
import { readFileSync } from "fs";

const BASE = process.env.BASE || "http://localhost:5196";
const iso = (d, h = 9) => { const x = new Date(); x.setDate(x.getDate() - d); x.setHours(h, 12, 0, 0); return x.toISOString(); };

const settle = (page) =>
  page.waitForFunction(() => !document.querySelector('main[aria-label="Opening Blossom"]'), null, { timeout: 25000 }).catch(() => {});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 950 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "en-GB" });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(String(e).slice(0, 160)));
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160)));

await page.goto(BASE, { waitUntil: "networkidle" });
await page.evaluate(async (isoStr) => {
  let ok = false;
  for (let i = 0; i < 80 && !ok; i++) {
    ok = (await indexedDB.databases()).some((d) => d.name === "blossom" && (d.version ?? 0) > 0);
    if (!ok) await new Promise((r) => setTimeout(r, 250));
  }
  const db = await new Promise((res, rej) => { const r = indexedDB.open("blossom"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const get = () => new Promise((res) => { const tx = db.transaction("profiles", "readonly"); const rq = tx.objectStore("profiles").get("local"); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); });
  let p = null; for (let i = 0; i < 60 && !p; i++) { p = await get(); if (!p) await new Promise((r) => setTimeout(r, 250)); }
  await new Promise((res, rej) => {
    const tx = db.transaction("profiles", "readwrite");
    tx.objectStore("profiles").put({ ...p, id: "local", displayName: "Robin", pronouns: "they/them",
      region: "United Kingdom", hrtStatus: "on_hrt", onboardingCompletedAt: isoStr, ageConfirmedAt: isoStr,
      onboardingStep: 99, enabledModules: ["medication", "journal", "goals"], syncEnabled: true,
      syncExcludedCategories: [], updatedAt: new Date().toISOString() });
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
  db.close();
}, iso(120));

const outboxEntities = () => page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("blossom"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const rows = await new Promise((res) => { const tx = db.transaction("syncOutbox", "readonly"); const rq = tx.objectStore("syncOutbox").getAll(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => res([]); });
  db.close();
  return [...new Set(rows.map((r) => r.entity))];
});

const journalCount = () => page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("blossom"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const n = await new Promise((res) => { const tx = db.transaction("journalEntries", "readonly"); const rq = tx.objectStore("journalEntries").count(); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(-1); });
  db.close();
  return n;
});

const excludedNow = () => page.evaluate(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open("blossom"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const p = await new Promise((res) => { const tx = db.transaction("profiles", "readonly"); const rq = tx.objectStore("profiles").get("local"); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); });
  db.close();
  return p?.syncExcludedCategories ?? [];
});

// Through the real UI, so it runs addJournalEntry -> recordSyncChange. Writing
// to IndexedDB directly would bypass the very gate under test.
async function addJournalViaUI() {
  await page.goto(BASE + "/track/journal", { waitUntil: "networkidle" });
  await settle(page);
  await page.waitForTimeout(700);
  await page.locator("button").filter({ hasText: "+" }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  await page.getByText(/journal/i).first().click().catch(() => {});
  await page.waitForTimeout(800);
  const ta = page.locator('textarea[aria-label="Journal entry"]');
  if (!(await ta.count())) return false;
  await ta.first().fill("something private");
  await page.getByRole("button", { name: /Save entry/i }).click();
  await page.waitForTimeout(1000);
  return true;
}

async function setCategory(on) {
  await page.goto(BASE + "/account/what-syncs", { waitUntil: "networkidle" });
  await page.waitForTimeout(1100);
  const box = page.getByLabel("Sync Journal and check-ins");
  if ((await box.isChecked()) !== on) {
    await box.click();
    await page.waitForTimeout(900);
  }
}

await page.goto(BASE + "/", { waitUntil: "networkidle" });
await settle(page);

await page.goto(BASE + "/account/what-syncs", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
console.log("screen renders:            ", (await page.getByText("Choose what syncs").count()) > 0);
console.log("lists categories:          ", (await page.getByText("Journal and check-ins").count()) > 0);
console.log("names what never syncs:    ", (await page.getByText("Photos and voice recordings").count()) > 0);

await setCategory(false);
console.log("");
console.log("offers a server cleanup:   ", (await page.getByText("Remove them from the server").count()) > 0);
console.log("promises local copies stay:", (await page.getByText(/nothing is removed from this phone/i).count()) > 0);
console.log("choice saved:              ", JSON.stringify(await excludedNow()));
await page.screenshot({ path: "sync-choices.png", fullPage: true });

const wroteOff = await addJournalViaUI();
const offQueue = await outboxEntities();
const offCount = await journalCount();
console.log("");
console.log("wrote a real entry:        ", wroteOff, "(" + offCount + " on device)");
console.log("saved locally regardless:  ", offCount > 0);
console.log("outbox holds:              ", JSON.stringify(offQueue));
console.log("journal NOT queued:        ", !offQueue.includes("journal_entry"));

await setCategory(true);
await addJournalViaUI();
const onQueue = await outboxEntities();
console.log("");
console.log("after re-including:        ", JSON.stringify(onQueue));
console.log("journal queues again:      ", onQueue.includes("journal_entry"));

const src = readFileSync("src/lib/sync.ts", "utf8");
const purge = src.slice(src.indexOf("export async function purgeExcludedFromServer"), src.indexOf("export async function retryStuckSyncItems"));
console.log("");
console.log("purge is a hard delete:    ", /\.delete\(\{ count: "exact" \}\)/.test(purge));
console.log("purge sets no deleted_at:  ", !/deleted_at/.test(purge));

console.log("");
console.log("errors:", errs.length ? [...new Set(errs)].join(" | ") : "none");
await browser.close();
