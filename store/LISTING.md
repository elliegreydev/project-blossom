# Google Play listing — Project Blossom

Draft copy for the Play Console listing. Screenshots live in `screenshots/`,
regenerate them with `node store/generate-screenshots.mjs <out-dir>` (needs the
production build running on :5181 — see the header comment in that file).

---

## App name (30 char max)

```
Blossom: Transition Companion
```
*29 characters.* "Project Blossom" alone doesn't say what it does, and Play
search leans heavily on the title. "Transition" is the word people actually
search for.

**Alternative if you'd rather stay neutral on the app icon/home screen:**
```
Blossom — Personal Journal
```
Worth a thought: the app name shows on the home screen and in Play purchase
history. Some people don't want an obviously trans-related app name visible.
The first option is far better for discovery; the second is more discreet.
Your call, and it's a real trade-off rather than a stylistic one.

## Short description (80 char max)

```
A gentle, private companion for your transition. Your data stays on your phone.
```
*78 characters.* Leads with tone ("gentle"), then the differentiator (privacy).

## Full description (4000 char max)

```
Blossom is a quiet, private place to keep track of your transition — at your own pace, on your own terms.

No feeds. No streaks. No one watching.

WHAT YOU CAN TRACK
• Journal and daily check-ins — write when you feel like it, or don't
• Medication and doses, with gentle reminders you can set to whatever times suit you
• Appointments, with prep notes so you walk in ready
• Your journey — a timeline of the moments that mattered, from first appointment to new name on the card
• Goals, in your own words
• Voice practice, blood tests, body notes, and more if you want them

BUILT PRIVATE, NOT "PRIVACY-FRIENDLY"
Everything you write lives on your device by default. Not on a server, not in an
analytics pipeline, not in an ad profile. If you never make an account, your
entries never leave your phone.

You can turn on syncing if you want your notes on more than one device — that's
your choice to make, and you can change your mind.

• App lock with a PIN or your fingerprint
• Discreet notifications that never say what they're about on your lock screen
• Turn off any section you don't want to see
• Export everything, or delete everything, whenever you like

GENTLE BY DESIGN
Blossom won't nag you for missing a day. There's no streak to break and nothing
to keep up with. Some weeks you'll write every day. Some weeks you won't open it
at all. Both are fine.

Reminders are optional, and you choose the wording — a quiet nudge that says
nothing, or a plain one that names what it's for.

WHO IT'S FOR
Trans, nonbinary, and questioning people. Wherever you are with it — years in,
just wondering, or somewhere in between. You don't have to have it figured out
to use this.

Blossom is not a medical app and doesn't give medical advice. It's somewhere to
keep your own notes, so you have them when you need them.

Made by a small team who needed this to exist.
```

## Category & tags

- **Category:** Health & Fitness *(Lifestyle is the alternative — Health &
  Fitness matches what it does, but see the Data Safety note below, as the
  health category invites more scrutiny)*
- **Tags:** journal, wellbeing, personal tracker, reminders

## Contact & links

- **Privacy policy:** https://projectblossom.net/legal/privacy
- **Website:** https://projectblossom.net
- **Support email:** *(needs one of the new IONOS addresses — support@ or hello@)*

---

## Still needed before submitting

Updated 13 Aug 2026.

- [x] ~~**Feature graphic, 1024×500 PNG**~~ — `store/feature-graphic.png`,
      generated from `store/feature-graphic.html`. Brand gradient, wordmark and
      the app's own existing tagline, with everything readable kept inside a
      safe margin because Play crops the edges.
- [x] ~~**Screenshots**~~ — eight at 1080×1920 in `store/screenshots/`.
      Regenerate with `store/generate-screenshots.mjs` against a **production**
      build; a dev server renders the Next devtools badge into every shot.
- [ ] **App icon 512×512** — `public/icon-512.png` should work as-is.
- [x] ~~**Data Safety form**~~ — drafted in `store/data-safety.md`, every answer
      taken from the code. Still needs entering into the Play console by hand.
- [ ] **Content rating questionnaire** — `store/data-safety.md` has the two
      questions that need a judgement call, on the intimacy module and on
      user-to-user content.
- [ ] **12 testers running the app for 14 consecutive days** — required before
      any production release. The clock cannot start until a build is uploaded,
      so this follows the assets rather than running alongside them.
- [ ] **After the first upload:** add Google's Play App Signing SHA-256 to
      `public/.well-known/assetlinks.json` alongside the upload key. Until this
      is done the TWA shows a browser address bar.
