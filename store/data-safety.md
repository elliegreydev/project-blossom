# Google Play Data Safety, drafted from the code

Every answer below is what Blossom actually does as of v0.5.0, checked against
the source rather than assumed. Google cross-checks this against the privacy
policy, so the two have to agree: the policy was updated on 7 Aug to match.

Where something needs your judgement rather than a fact, it says so.

---

## The three things that shape every answer

**1. Nothing is collected unless someone turns sync on.** Blossom works fully
signed out. Play's definition of "collected" is data transmitted off the device,
so for a signed-out user the honest answer to almost everything is "not
collected". Because some users do sync, you still declare the categories, and
mark them **optional** rather than required.

**2. Photos and voice recordings are never collected.** Not "encrypted", not
"deleted later". They never leave the device at all, enforced in `sync.ts`.
That's the strongest answer on the whole form and it's genuinely true.

**3. No advertising or analytics SDKs.** Nothing third-party collects anything.
Supabase and Vercel are processors running the service, which is not "sharing"
under Play's definition.

---

## Data types to declare

### Personal info > Name
- Collected: **Yes** (only with sync on) · Shared: **No** · Optional
- Purpose: **App functionality**
- Encrypted in transit: **Yes** · Deletion available: **Yes**
- Note: this is a chosen display name, not a legal name. Blossom never asks for
  a legal name.

### Personal info > Email address
- Collected: **Yes** (only if signing in) · Shared: **No** · Optional
- Purpose: **App functionality**, **Account management**
- Encrypted in transit: **Yes** · Deletion available: **Yes**

### Personal info > Other info
- Collected: **Yes** (only with sync on) · Shared: **No** · Optional
- Purpose: **App functionality**
- Covers pronouns, region, and the fact of using a transition-tracking app.
  **Declare this one properly.** Gender identity is sensitive and Play treats
  under-declaring it as a policy violation.

### Health and fitness > Health info
- Collected: **Yes** (only with sync on) · Shared: **No** · Optional
- Purpose: **App functionality**
- Encrypted in transit: **Yes** · Deletion available: **Yes**
- Covers medications, doses, appointments, blood tests, body measurements,
  mood check-ins, journal entries, voice practice notes.

### App info and performance > Crash logs and Diagnostics
- Collected: **Yes** · Shared: **No** · Optional
- Purpose: **App functionality** (fixing failures)
- Encrypted in transit: **Yes**
- This is the error reporting to Grey Studios HQ. It carries the operation, an
  error class, the environment, and for signed-in users an account reference.
  It never carries anything anyone wrote. **It is linked to identity**, because
  the account reference is the same id the account uses, so answer that honestly.

### Device or other IDs
- Collected: **Yes**, only if notifications are enabled · Shared: **No** · Optional
- Purpose: **App functionality**
- The push subscription endpoint for that device.

---

## Data types to declare as NOT collected

Answering these confidently is the whole point of building it local-first.

- **Photos and videos** — never leave the device
- **Audio files / voice recordings** — never leave the device
- **Location** — Blossom never reads device location. A person may type a place
  name into their support map, but that is text they wrote, not location data
  the app collected from the device.
- **Financial info** — donations happen entirely on Stripe's own page. Blossom
  never sees a card and keeps no record of who donated.
- **Contacts** — never read from the device. Trusted Circle contacts are typed
  in by hand.
- **Messages, Calendar, Files, Web browsing** — none read.
- **Purchase history, Advertising ID, Analytics** — none.

---

## The standard questions

- **Is all data encrypted in transit?** Yes. Everything goes over HTTPS.
- **Can users request deletion?** Yes. Settings has both local wipe and account
  deletion, and the form should point at the in-app route.
- **Have you committed to Play Families policy?** No, this is an adults-only app.
- **Independent security review?** No. Answer honestly; it is not required.

---

## Content rating, which is a separate questionnaire

Blossom's own Terms already say 18 and over, and setup asks people to confirm
their age, so the rating should match that rather than aiming low.

Two questions need your call rather than mine:

**The intimacy module.** It's a private space for someone's own notes about
their wellbeing. The app displays no sexual content and provides none; the
person writes their own and only they can read it. I'd answer "no sexual
content" on what the app *provides*, and answer yes to any question about users
being able to create private content. Worth reading the exact wording, because
IARC asks about what the app enables as well as what it shows.

**User-to-user communication.** The public ideas board exists and anything
posted to it can be read by any visitor, so answer **yes** to sharing
user-generated content publicly. That alone tends to raise the rating, and it's
the honest answer. Beta chat used to be the other half of this, and it has been
removed, so there is no longer any private messaging between users anywhere in
Blossom. Read the user-interaction question again with that in mind, because the
honest answer to it may now be narrower than it was.

---

## Two things to do in the right order

1. Fill this in **before** the first upload if you can, since Play blocks
   releases without it.
2. After the first upload, add Google's Play App Signing SHA-256 to
   `public/.well-known/assetlinks.json` alongside the upload key. The installed
   app is signed by Google's key, not yours, and the TWA will show a browser
   address bar until this is done. It's the single most common thing to forget.
