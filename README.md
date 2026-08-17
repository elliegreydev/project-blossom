# Blossom

A support app for trans, nonbinary and questioning adults. It keeps the admin of transitioning in one place: medication, appointments, waiting lists, blood tests, voice practice, journals, goals, and the rest of the paperwork nobody else is holding for you.

**Live at [projectblossom.net](https://projectblossom.net).** It's a PWA, so you install it from the browser and it works offline.

This repo is public so the privacy claims can be checked rather than believed. If you only read one section, read the next one.

---

## Where your data actually lives

Blossom is local-first. Everything you write goes into IndexedDB on your own device first, and most of it never goes anywhere else.

**Syncing is off until you turn it on.** There's no account required to use the app. If you never make one, nothing you write ever leaves your phone.

**If you do turn sync on, you pick what syncs.** It's per category, not one switch: journal, medication, appointments, waiting lists, self-directed care, journey and goals, body and voice. Leave any of them off and they stay on the device.

**Photos and voice recordings never sync at all.** Not even with sync fully on. They're stored as raw Blobs in IndexedDB and there is no code path that uploads them, because there is no file storage in this project.

**There is no analytics, anywhere.** No Google Analytics, no Segment, no PostHog, no Sentry, no session recording, no beacons. Not "anonymised" analytics. None. The whole app has 18 dependencies.

### Check it yourself

Don't take the above on trust. Here's exactly where to look.

| The claim | Where to check |
|---|---|
| Sync is off by default | [`src/lib/db.ts`](src/lib/db.ts), search `syncEnabled`. The default is `false` |
| You choose what syncs | [`src/lib/syncCategories.ts`](src/lib/syncCategories.ts), the full map with the reasoning |
| Photos and voice never sync | [`src/lib/db.ts`](src/lib/db.ts), search `Blob` and read the comments above each one |
| Nothing uploads files | `grep -rn "storage.from\|\.upload(" src/` returns nothing |
| No analytics | [`package.json`](package.json), all 18 dependencies. Read the list |
| No third-party scripts | `grep -rn "googletagmanager\|gtag(\|sendBeacon" src/` returns nothing |
| What the server can see | [`src/app/api/`](src/app/api), every server route in the app |

If any of that doesn't hold up, please say so. That's the point of it being here.

---

## About AI

I use AI heavily to write this code. I'm one person, I'm not a developer by trade, and Blossom wouldn't exist without it.

To be straight rather than let you find out from the source: I don't read every line. What I do is decide what goes in and what stays out, and I've said no to plenty. The parts that matter most are covered by tests you can run yourself (`npm run test:sync` and the rest, listed below), and the privacy architecture above is verifiable regardless of who or what typed it. Rough code can't leak what it never uploads.

If you find something wrong in here, I'd genuinely rather know.

---

## Licence

**Source-available, not open source.** See [LICENSE](LICENSE) for the exact terms.

You can read it, audit it, learn from it, and run it locally. You can't redistribute it, host it as a service for other people, sell it, or use the Blossom name.

That last part isn't about protecting a business, because there isn't one. It's that a copy of a trans health app running under a similar name would be trusted by people who thought it was this one, and neither they nor I would have any idea what it did with their data. Health apps for vulnerable people are a bad thing to be able to fork and rehost quietly.

---

## Running it locally

You need Node 22.6 or newer. The test scripts import TypeScript directly using Node's built-in type stripping, which is where that floor comes from.

```bash
git clone https://github.com/elliegreydev/project-blossom.git
cd project-blossom
npm install
cp .env.example .env.local
npm run dev
```

Then open http://localhost:3000.

The app itself works without any backend, because it's local-first. You only need a Supabase project if you want to try signing in or syncing, and [`.env.example`](.env.example) explains what each variable is for. Nothing in `.env.local` is ever committed.

### Tests

Pure logic is covered by scripts you can run without a database or a browser:

```bash
npm run test:sync
```

| Command | What it covers |
|---|---|
| `test:sync` | Sync conflict policy, and what is allowed to leave the device |
| `test:errors` | Error reporting shape, and that nobody's own words can reach the log |
| `test:referrals` | Waiting list arithmetic, and the clinic index timezone trap |
| `test:selfdirected` | Self-directed care, including what it refuses to say |
| `test:aurora` / `test:aurora-ai` | Aurora's rules and AI safety boundaries |
| `test:reminders` | Reminder scheduling |
| `test:accessibility` | Accessibility presets |
| `test:info` | Search behaviour |
| `test:essentials` / `test:intentions` / `test:costs` | Onboarding, intentions, running costs |

---

## What's in it

Everything below is a module you can switch off in Settings. Switched off means hidden, including from search.

Journey, Medication, Appointments, Waiting lists, Self-directed care, Journal and check-ins, Goals, Blood tests, Voice practice, Presentation, Body and progress, Budget tracker, Intimacy and wellbeing.

Alongside those: a library of guides and regional support services, a passport for showing a clinician a summary, a trusted circle for sharing specific things with specific people, travel mode, and Aurora, which is a gentle nudge system rather than a chatbot.

Some things are deliberately absent and will stay absent. Blossom gives no dosing guidance, no sourcing or vendor information, and never interprets a blood result. Those are clinical and they aren't mine to give.

---

## Where it's going

The live roadmap is in the app under Settings, and it's the honest version rather than a wishlist. The current direction:

- **Regional guides.** Name and gender marker changes, fertility, and getting referred, done properly per region rather than UK-only.
- **Play Store release.** The Android build exists and is signed. Content rating and the Data Safety form are what's left.
- **Retention periods.** The privacy policy needs them stated properly.
- **Photo backup.** Designed and deliberately not built. Passwordless sign-in means key management from scratch, and getting that wrong is worse than not having the feature.

## Helping

The most useful thing is to use it and tell me what's broken.

- **Bugs and ideas:** there's a board in the app under Settings, where you can submit things and vote. That's where I actually pick what to build next, so it beats anywhere else.
- **Auditing:** if you read the code and something looks wrong, especially anything touching privacy, please open an issue.
- **Code:** the licence doesn't set this up as a project that takes patches, so please ask before writing any.

---

## Built with

Next.js 16, React 19, TypeScript, Dexie (IndexedDB), Supabase for optional sync and sign-in, deployed on Vercel.

There's a separate staff app in its own repo for the small team who maintain the resource listings and handle support requests. It's not public, because it's the side that can see support tickets.

---

Blossom is made by [Grey Studios](https://greystudios.xyz), a two-person studio in the UK. Questions, or anything you'd rather not put in an issue: **support@projectblossom.net**
