# Blossom

A support app for trans, nonbinary and questioning adults in the UK.

It keeps the admin of transition in one place: medications and what you've got left, appointments, waiting lists and who you last chased, journal entries, voice practice, body measurements, blood test results, and a directory of real services with a note of when each one was last checked.

Live at **[projectblossom.net](https://projectblossom.net)**. It's a web app, so there's nothing to install, but you can add it to your home screen and it works offline.

Free, and it always will be.

## Where your data lives

Blossom is local first. Everything you write stays on your device, in your browser's own storage, and that's the default rather than a setting you have to find.

Syncing to an account is opt in and off until you turn it on. If you do turn it on, you pick what syncs by category, so you can back up your appointments and keep your journal off the server entirely.

**Photos and voice recordings never leave your device at all**, whatever your sync settings say. There is no upload path for them in the code.

There's no analytics, no tracking, and no third party scripts. Not "we don't sell your data", but nothing collecting it in the first place.

You don't have to believe any of that, which is most of the reason this repository is public.

## How this app is built

I use AI to write most of the code here. I'm one person, I'm not a developer by trade, and Blossom would not exist otherwise. That's near the top of this file because it belongs there, not because anyone caught me at it.

People hear "AI wrote it" and picture someone typing "build me a health app" and shipping whatever came back. That isn't how this works, so here's the actual process.

**I decide what goes in, and more often what stays out.** The refusals are the part I care most about. Blossom gives no dosing guidance, tells nobody where to buy anything, and never interprets a blood result. Those aren't gaps waiting to be filled in later. They're written into the code as rules with the reasoning attached, because they're clinical questions and they aren't mine to answer.

**Decisions get argued before they get built, and then written down.** If you want to know whether something here was thought about, read the top of a file. [`src/lib/referrals.ts`](src/lib/referrals.ts) explains why a waiting list has no progress bar, because a bar that fills up would be a lie about a queue that isn't moving. [`src/lib/clinicIndex.ts`](src/lib/clinicIndex.ts) explains why Blossom never stores a waiting time of its own, only what somebody was told and when, because a number typed in August is wrong by Christmas and being wrong about a queue is somebody deciding not to ring. [`src/lib/selfDirected.ts`](src/lib/selfDirected.ts) opens with a section headed WHAT THIS IS NOT, AND WILL NOT BECOME.

Those comments are long on purpose. They're the record of what was decided and why, so that six months from now neither of us quietly undoes it.

**Plenty gets built and then binned.** Photo backup was designed in full and deliberately not built, because passwordless sign in would have meant inventing key management from scratch, and getting that wrong loses somebody their photos permanently. Better nothing than that.

**What I don't do is read every line.** I'm not going to pretend otherwise, because it's checkable and it would be the easiest thing in the world to catch me on. What I do instead is decide the shape of things, say no a lot, test it, use it myself, and fix what turns up. There are twelve test suites in [`package.json`](package.json) covering the logic that would actually hurt someone if it were wrong: sync, reminders, dates, accessibility.

If that's a dealbreaker for you, that's completely fair. Blossom is free and nobody has to use it. I'd honestly rather you used something you trust.

## Running it yourself

You'll need Node 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Blossom runs without a Supabase project. You lose accounts, syncing and reminders, and everything else works, because the app is local first and the database is your browser.

To get the server side going too, fill in `.env.local` from your own Supabase project. `.env.example` says where each value comes from. The schema is in [`supabase/`](supabase/) and `node scripts/migrate.mjs` applies it.

Tests are plain Node scripts, no framework:

```bash
npm run test:sync
```

## Licence

Source available, not open source. See [LICENSE](LICENSE).

The short version: read it, audit it, run it locally, learn from it. Don't host it for other people, redistribute it, sell it, or ship something called Blossom.

That last part isn't about ownership. If somebody stood up a copy under a similar name, people would trust it because they trust this, and I'd have no idea what it did with their data. Being able to check the code only means something if the thing you checked is the thing you're using.

## Found a problem?

Security issues to **support@projectblossom.net**, or open a GitHub issue for anything else.

If it's a security problem, please give me a chance to fix it before posting details publicly. Somebody did exactly that, found two real ones without testing either, and it's the most useful thing anyone has done for this project.

I'm one person, so I might be slow, but I do read everything.
