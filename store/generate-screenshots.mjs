// Google Play phone screenshots for Blossom.
//
// EVERYTHING SHOWN IS INVENTED. A Play listing is public and permanent, so no
// real entry, dose, mood or journal line may ever end up in one. This seeds a
// throwaway browser profile's IndexedDB with a fictional person, shoots, and
// throws the profile away. Nothing touches a real account.
//
// 1080x1920 is the safe Play phone size: 9:16, well inside the 320-3840 limits.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";

// Point this at a PRODUCTION build (npm run build && npm run start). A dev
// server renders the Next.js devtools badge into every shot, which cannot go
// on a store listing.
const BASE = process.env.BASE || "http://localhost:5201";
const OUT = process.env.OUT || "./screenshots";
mkdirSync(OUT, { recursive: true });

// 432x768 at 2.5x lands exactly on 1080x1920. Wider than the 360px minimum so
// the date and greeting don't wrap awkwardly, and close to a real modern phone.
const SCALE = 2.5;
const CSS = { width: 1080 / SCALE, height: 1920 / SCALE };

const iso = (daysAgo, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};
const dateOnly = (daysAgo) => iso(daysAgo).slice(0, 10);

// A believable person who does not exist.
const DEMO = {
  profile: {
    displayName: "Robin",
    pronouns: "they/them",
    region: "United Kingdom",
    subregion: "England",
    hrtStatus: "on_hrt",
    onboardingCompletedAt: iso(240),
    ageConfirmedAt: iso(240),
    onboardingStep: 99,
    enabledModules: ["medication", "appointments", "journal", "goals", "journey", "bloodTests", "voicePractice", "presentation"],
  },
  checkIns: [
    { mood: 4, energy: 3, confidence: 4, note: "Wore the green jacket out. Felt like me.", period: "morning", d: 0 },
    { mood: 3, energy: 3, confidence: 3, note: "Quiet day. That's allowed.", period: "evening", d: 1 },
    { mood: 5, energy: 4, confidence: 4, note: "Voice practice actually clicked today.", period: "morning", d: 2 },
    { mood: 3, energy: 2, confidence: 3, note: null, period: "evening", d: 3 },
    { mood: 4, energy: 4, confidence: 5, note: "Coffee with Sam. Easy the whole time.", period: "morning", d: 5 },
  ],
  journal: [
    { body: "Six months today. I keep expecting to feel different in some big obvious way and mostly I just feel more like myself, which is better.", d: 1 },
    { body: "Rang the clinic again. Still nothing. Wrote down what I want to ask so I stop forgetting half of it.", d: 4 },
  ],
  // Safe because SHOOT_TIME below pins the clock to a morning: the 08:00 doses
  // are logged as taken and the 20:00 one reads as genuinely upcoming. Without
  // the pinned clock a late-night run showed a wall of "Overdue", which makes
  // the app look like it's nagging rather than helping.
  medications: [
    { name: "Estradiol", route: "gel", unit: "pump", times: ["08:00", "20:00"], morning: true },
    { name: "Finasteride", route: "oral", unit: "tablet", times: ["08:00"], morning: true },
  ],
  // Fills the "Coming up" block, which was showing its empty state.
  appointments: [
    { title: "Gender clinic, first appointment", location: "Charing Cross", inDays: 12, hour: 14 },
    { title: "Blood test", location: "GP surgery", inDays: 26, hour: 9 },
  ],
  milestones: [
    { title: "First appointment booked", category: "medical", d: 300 },
    { title: "Started HRT", category: "medical", d: 180 },
    { title: "Came out to Sam", category: "social", d: 120 },
    { title: "New name on my bank card", category: "legal", d: 40 },
  ],
  goals: [
    { title: "Book a voice therapy consult", category: "medical", status: "active" },
    { title: "Update my passport", category: "legal", status: "active" },
    { title: "Tell my sister", category: "social", status: "done" },
  ],
};

const settle = (page) =>
  page.waitForFunction(() => !document.querySelector('main[aria-label="Opening Blossom"]'), null, { timeout: 25000 }).catch(() => {});

async function seed(page) {
  await page.evaluate(async (DEMO) => {
    const iso = (daysAgo, hour = 9) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      d.setHours(hour, 12, 0, 0);
      return d.toISOString();
    };
    const now = new Date().toISOString();
    const uid = () => crypto.randomUUID();

    let listed = false;
    for (let i = 0; i < 80 && !listed; i++) {
      listed = (await indexedDB.databases()).some((d) => d.name === "blossom" && (d.version ?? 0) > 0);
      if (!listed) await new Promise((r) => setTimeout(r, 250));
    }
    const db = await new Promise((res, rej) => { const r = indexedDB.open("blossom"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const put = (store, value) => new Promise((res, rej) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = res; tx.onerror = () => rej(tx.error);
    });
    const readProfile = () => new Promise((res) => {
      const tx = db.transaction("profiles", "readonly");
      const rq = tx.objectStore("profiles").get("local");
      rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null);
    });

    // Wait for the app's own DEFAULT_PROFILE, then patch it. Writing a partial
    // profile hangs the app on its loading screen.
    let existing = null;
    for (let i = 0; i < 60 && !existing; i++) {
      existing = await readProfile();
      if (!existing) await new Promise((r) => setTimeout(r, 250));
    }
    if (!existing) throw new Error("app never created its default profile");
    await put("profiles", { ...existing, ...DEMO.profile, id: "local", updatedAt: now });

    for (const c of DEMO.checkIns) {
      await put("checkIns", { id: uid(), mood: c.mood, energy: c.energy, confidence: c.confidence,
        stress: null, comfort: null, note: c.note, period: c.period,
        createdAt: iso(c.d, c.period === "morning" ? 8 : 21), updatedAt: now });
    }
    for (const j of DEMO.journal) {
      await put("journalEntries", { id: uid(), bodyText: j.body, createdAt: iso(j.d, 21), updatedAt: now });
    }
    const morningSlot = new Date();
    morningSlot.setHours(8, 0, 0, 0);

    for (const m of DEMO.medications) {
      const medId = uid();
      await put("medications", { id: medId, name: m.name, route: m.route, unit: m.unit,
        frequency: { times: m.times, days: null, intervalDays: null, anchorDate: null },
        activeSupplyId: null, active: true, createdAt: iso(200), updatedAt: now });

      // This morning's dose, already taken, so Home shows the app being used
      // well rather than a list of missed things.
      if (m.morning) {
        await put("medicationLogs", { id: uid(), medicationId: medId,
          scheduledTime: morningSlot.toISOString(), status: "taken",
          loggedAt: new Date(morningSlot.getTime() + 6 * 60000).toISOString(),
          note: null, supplyAdjustmentId: null });
      }
    }
    for (const a of DEMO.appointments) {
      const when = new Date();
      when.setDate(when.getDate() + a.inDays);
      when.setHours(a.hour, 30, 0, 0);
      await put("appointments", { id: uid(), title: a.title, appointmentAt: when.toISOString(),
        location: a.location, preparationNote: null, outcomeNote: null, rescheduledFrom: null,
        builderData: { questions: [], bringList: [], documentsReceived: [], followUps: [],
          travelNote: null, accessibilityNeeds: null, communicationPreferences: null,
          privateNotes: null, medicationChangesNote: null, completedAt: null },
        reminderMinutesBefore: null, createdAt: now, updatedAt: now });
    }

    for (const m of DEMO.milestones) {
      await put("milestones", { id: uid(), title: m.title, templateKey: null, category: m.category,
        eventDate: iso(m.d).slice(0, 10), datePrecision: "exact", note: null, createdAt: iso(m.d), updatedAt: now });
    }
    for (const g of DEMO.goals) {
      await put("goals", { id: uid(), title: g.title, category: g.category, target: null, status: g.status,
        convertedToMilestoneId: null, createdAt: iso(90), updatedAt: now,
        completedAt: g.status === "done" ? iso(20) : null });
    }
    db.close();
  }, DEMO);
}

// Chosen to show breadth first, then the privacy story, which is the thing that
// actually differentiates Blossom from every other tracker.
const SHOTS = [
  { name: "01-home", path: "/" },
  { name: "02-journal", path: "/track/journal" },
  { name: "03-medication", path: "/track/medication" },
  { name: "04-journey", path: "/journey" },
  { name: "05-track", path: "/track" },
  { name: "06-appearance", path: "/settings/appearance" },
  { name: "07-what-syncs", path: "/account/what-syncs" },
  { name: "08-settings", path: "/settings" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: CSS,
  deviceScaleFactor: SCALE,
  isMobile: true,
  hasTouch: true,
  colorScheme: process.env.THEME === "dark" ? "dark" : "light",
  locale: "en-GB",
});
const page = await ctx.newPage();

// A fixed Thursday morning. Without this the output depends on the hour the
// script happens to run, which is how a late-night run produced a Home screen
// full of overdue doses. setFixedTime only fakes the clock, not timers, so the
// app's own loading and animation timing still behaves normally.
const SHOOT_TIME = new Date("2026-08-13T09:40:00");
await page.clock.setFixedTime(SHOOT_TIME);

// Hide the closed-beta banner. It's accurate today but it won't be by the time
// this is on Play, and a store listing that opens with "expect some bugs" is
// both off-putting and out of date the moment it ships.
await ctx.addInitScript(() => {
  const style = document.createElement("style");
  style.textContent = '[class*="appNotice"], [class*="AppNotice"] { display: none !important; }';
  document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
});

await page.goto(BASE, { waitUntil: "networkidle" });
await seed(page);
await page.reload({ waitUntil: "networkidle" });
await settle(page);
await page.waitForTimeout(1200);

for (const shot of SHOTS) {
  try {
    await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
    await settle(page);
    await page.waitForTimeout(1400);
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file });
    const txt = (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 60);
    console.log(`${shot.name.padEnd(16)} ${shot.path.padEnd(24)} ${txt}`);
  } catch (e) {
    console.log(`${shot.name.padEnd(16)} FAILED: ${String(e).slice(0, 90)}`);
  }
}

await browser.close();
console.log(`\n${SHOTS.length} shots at 1080x1920 in ${path.resolve(OUT)}`);
