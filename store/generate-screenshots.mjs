// Play Store screenshots for Blossom.
//
// Everything shown is INVENTED. Play listings are public and permanent, so
// real entries (HRT details, journal text) must never end up in one. This
// seeds a throwaway browser profile's IndexedDB directly, screenshots, then
// throws the profile away. Nothing touches Ellie's account or the live site.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
import path from "path";

const BASE = "http://localhost:5181";
const OUT = process.argv[2] || "./screenshots";
mkdirSync(OUT, { recursive: true });

// Play phone screenshots: 16:9 portrait, 1080x1920 is the safe standard.
const VIEWPORT = { width: 1080, height: 1920 };
const SCALE = 3; // render at a phone-like DPR so type isn't hairline-thin
const CSS = { width: VIEWPORT.width / SCALE, height: VIEWPORT.height / SCALE };

const iso = (daysAgo, hour = 9) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 12, 0, 0);
  return d.toISOString();
};
const dateOnly = (daysAgo) => iso(daysAgo).slice(0, 10);

// A believable but entirely fictional person.
const DEMO = {
  profile: {
    displayName: "Robin",
    pronouns: "they/them",
    region: "GB",
    hrtStatus: "on_hrt",
    onboardingCompletedAt: iso(120),
    ageConfirmedAt: iso(120),
    onboardingStep: 99,
    enabledModules: ["medication", "appointments", "journal", "goals", "journey"],
  },
  checkIns: [
    { mood: 4, energy: 3, confidence: 4, note: "Wore the green jacket out. Felt like me.", period: "morning", d: 0 },
    { mood: 3, energy: 3, confidence: 3, note: "Quiet day. That's allowed.", period: "evening", d: 1 },
    { mood: 5, energy: 4, confidence: 4, note: "Voice practice actually clicked today.", period: "morning", d: 2 },
    { mood: 3, energy: 2, confidence: 3, note: null, period: "evening", d: 3 },
    { mood: 4, energy: 4, confidence: 5, note: "Coffee with Sam. Easy the whole time.", period: "morning", d: 5 },
    { mood: 4, energy: 3, confidence: 4, note: null, period: "evening", d: 6 },
  ],
  medications: [
    { name: "Estradiol", route: "gel", unit: "pump", times: ["08:00", "20:00"] },
    { name: "Finasteride", route: "oral", unit: "tablet", times: ["08:00"] },
  ],
  milestones: [
    { title: "First appointment booked", category: "medical", d: 300 },
    { title: "Started HRT", category: "medical", d: 240 },
    { title: "Came out to Sam", category: "social", d: 180 },
    { title: "New name on my bank card", category: "legal", d: 60 },
  ],
  journal: [
    { d: 0, text: "Wore the green jacket to the shop and nobody looked twice. I keep waiting to be clocked and it just... didn't happen. Small thing. Massive thing." },
    { d: 2, text: "Voice practice actually clicked today. Held the pitch through a whole phone call without thinking about it once." },
    { d: 4, text: "Rough one. Didn't want to be perceived at all, so I stayed in. That's allowed. Tomorrow can be different." },
    { d: 7, text: "Sam used my name three times in one conversation without making a thing of it. I don't think they know what that did for me." },
  ],
  goals: [
    { title: "Book a voice therapy consult", category: "medical", status: "active" },
    { title: "Update my passport", category: "legal", status: "active" },
    { title: "Tell my sister", category: "social", status: "done" },
  ],
};

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

    // Open the DB the app already created, without guessing its version.
    const db = await new Promise((res, rej) => {
      const r = indexedDB.open("blossom");
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });

    const put = (store, value) =>
      new Promise((res, rej) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value);
        tx.oncomplete = res;
        tx.onerror = () => rej(tx.error);
      });

    // The app writes its own DEFAULT_PROFILE on first load, and that record
    // has required fields (layouts, aurora mode, lock settings) this script
    // has no business reinventing. Wait for it, then patch only what the
    // screenshots need - writing a partial profile hangs the app on its
    // loading screen.
    const readProfile = () =>
      new Promise((res) => {
        const tx = db.transaction("profiles", "readonly");
        const rq = tx.objectStore("profiles").get("local");
        rq.onsuccess = () => res(rq.result);
        rq.onerror = () => res(null);
      });

    let existing = null;
    for (let i = 0; i < 40 && !existing; i++) {
      existing = await readProfile();
      if (!existing) await new Promise((r) => setTimeout(r, 250));
    }
    if (!existing) throw new Error("app never created its default profile");

    await put("profiles", { ...existing, ...DEMO.profile, id: "local", updatedAt: now });

    for (const c of DEMO.checkIns) {
      await put("checkIns", {
        id: uid(),
        mood: c.mood, energy: c.energy, confidence: c.confidence,
        stress: null, comfort: null,
        note: c.note, period: c.period,
        createdAt: iso(c.d, c.period === "morning" ? 8 : 21),
        updatedAt: now,
      });
    }

    for (const j of DEMO.journal) {
      await put("journalEntries", {
        id: uid(), bodyText: j.text,
        createdAt: iso(j.d, 20), updatedAt: now,
      });
    }

    for (const m of DEMO.medications) {
      await put("medications", {
        id: uid(), name: m.name, route: m.route, unit: m.unit,
        frequency: { times: m.times, days: null, intervalDays: null, anchorDate: null },
        activeSupplyId: null, active: true, createdAt: iso(200), updatedAt: now,
      });
    }

    for (const m of DEMO.milestones) {
      await put("milestones", {
        id: uid(), title: m.title, templateKey: null, category: m.category,
        eventDate: iso(m.d).slice(0, 10), datePrecision: "exact", note: null,
        createdAt: iso(m.d), updatedAt: now,
      });
    }

    for (const g of DEMO.goals) {
      await put("goals", {
        id: uid(), title: g.title, category: g.category, target: null,
        status: g.status, convertedToMilestoneId: null,
        createdAt: iso(90), updatedAt: now,
        completedAt: g.status === "done" ? iso(20) : null,
      });
    }
    db.close();
  }, DEMO);
}

const SHOTS = [
  { name: "01-home", path: "/" },
  { name: "02-journal", path: "/track/journal" },
  { name: "03-medication", path: "/track/medication" },
  { name: "04-journey", path: "/journey" },
  { name: "05-goals", path: "/track/goals" },
  { name: "06-privacy", path: "/settings/privacy" },
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

await page.goto(BASE, { waitUntil: "networkidle" });
await seed(page);
await page.reload({ waitUntil: "networkidle" });
await page.waitForFunction(() => !document.body.innerText.includes('Opening your space'), { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);

for (const shot of SHOTS) {
  try {
    await page.goto(BASE + shot.path, { waitUntil: "networkidle" });
    await page.waitForFunction(() => !document.body.innerText.includes('Opening your space'), { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1200);
    // The staff 'Closed Beta' notice is temporary ops comms, not part of the
    // product - a store listing shouldn't advertise bugs. Hidden, not faked:
    // everything else on screen is the real app.
    await page.evaluate(() => {
      document.querySelectorAll('[class*="AppNotice"]').forEach((el) => { el.style.display = 'none'; });
    });
    const file = path.join(OUT, `${shot.name}.png`);
    await page.screenshot({ path: file });
    const txt = (await page.innerText("body")).replace(/\s+/g, " ").slice(0, 70);
    console.log(`${shot.name.padEnd(14)} ${shot.path.padEnd(20)} ${txt}`);
  } catch (e) {
    console.log(`${shot.name.padEnd(14)} FAILED: ${String(e).slice(0, 90)}`);
  }
}

await browser.close();
console.log(`\nWritten to ${path.resolve(OUT)}`);
