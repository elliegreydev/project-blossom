# Data Protection Impact Assessment: Project Blossom

**Controller:** Grey Studios
**Product:** Project Blossom (projectblossom.net), and the separate staff app
**Drafted:** 25 August 2026
**Status:** DRAFT. Not signed off. Not reviewed by a solicitor.

> Written by Grey Studios with Claude (Anthropic). Facts about what the software
> does were verified against the source code, with file references, rather than
> from memory or assumption. Anything that could not be verified is marked
> UNVERIFIED rather than guessed at. Legal conclusions are not given: where a
> legal judgement is needed this document says so and defers to
> `SOLICITOR_QUESTIONS.md`.

---

## 1. Why a DPIA is needed

Blossom processes special category data (health, and data revealing sex life)
about a group who can face real harm if that data is disclosed. Under the ICO's
screening criteria this meets more than one "likely high risk" indicator:

- **Special category data**, at the core of the product rather than incidentally.
- **Vulnerable data subjects.** Trans, nonbinary and questioning adults, many of
  whom are not out to family, employers or colleagues.
- **Innovative technology**, in that an AI assistant can be given the person's
  own health context.

The consequence of a disclosure here is not ordinarily financial. It is that
somebody is outed, and the follow-on harms are social, physical and sometimes
legal. That asymmetry shapes every judgement in this document.

## 2. What is processed

### 2.1 The default is that nothing leaves the device

Blossom is local-first. No account is required to use it. All data is written to
the browser's IndexedDB on the person's own device via Dexie. `syncEnabled`
defaults to **false** (`src/lib/db.ts`, `DEFAULT_PROFILE`).

For a user who never turns sync on, Grey Studios holds **no personal data about
them at all**. There is no account, no server record, and no analytics. Whether
this places that data outside the scope of our processing entirely is a legal
question we have not answered (see `SOLICITOR_QUESTIONS.md` §3).

### 2.2 If sync is switched on

There are **40 local tables**. **30** can sync to Supabase; **10 never leave the
device** under any circumstance. Sync is additionally **category-granular**: ten
user-facing categories can be individually excluded (`src/lib/syncCategories.ts`).

**Never synced, by design** (`src/lib/syncCategories.ts`, verified against the
sync map in `src/lib/sync.ts`):

- All photos and voice recordings. Six Blob fields exist across six tables and
  **none of them are in the sync map**. A voice recording is a recording of the
  person's own voice.
- Euphoria entries and Time Capsules
- Aurora AI conversations
- Trips planned in Travel Mode
- The app lock PIN

### 2.3 Special category data, specifically

**Health data** across roughly sixteen tables: medications (including route, so
"injection", "patch", "implant", "blocker"), dose logs, medication supplies,
blood test results and reference ranges, clinic appointments, gender clinic
referrals and waiting list positions, body measurements, weight, voice practice
sessions, and self-directed care settings.

**Data concerning sex life:** the intimacy log (date, free-text label, tags,
protection notes, feelings, aftercare and private notes). **This category does
sync** if the person leaves it enabled.

**Data revealing gender identity / trans status** is not confined to one table.
It is inherent in pronouns, HRT status, which modules are enabled, and in
practice the existence of the account at all.

**Two non-obvious ones worth naming**, because they would be missed by a
skim-read:

- **Budget entries.** Categories are HRT, surgery, legal, other, with a free-text
  description. A row reading "surgery" plus a description is health data even
  though the table looks financial.
- **Appointment builder data**, which includes accessibility needs (disability
  data) and medication change notes, uploaded verbatim.

**The single most sensitive row** is the self-directed care record. It records
whether somebody is managing their own HRT with no prescriber. That is health
data that can also carry medical and, depending on jurisdiction, legal
consequences for the person.

**Free text is everywhere.** Roughly 94 free-text fields across 33 of the 40
tables (an approximate hand count; the shape is certain, the number is not).
People can and do write anything about themselves in them, so the sensitivity of
any given field cannot be bounded by its name.

### 2.4 What else leaves the device

- **Aurora AI.** Opt-in, off by default. Conversations are held in
  `localStorage`, not the database, and messages are sent to **Anthropic, which
  processes them outside the UK and EU**. This is the only routine transfer out
  of Europe.
- **Timezone.** Pushed to the server so the reminder cron can work out what is
  due, and deliberately never pulled back. The server therefore holds a coarse
  location signal per account.
- **Push subscriptions**, if notifications are enabled, held so reminders can be
  delivered.
- **Support tickets and their messages**, if somebody contacts support.
- **Provider logs.** Supabase and Vercel keep short-term technical logs that
  include IP addresses, as any host would. Blossom's own code never reads or
  records an IP address or anything about the device.

## 3. Purposes, and whether the processing is necessary

| Purpose | Why it needs data | Could it be done with less? |
|---|---|---|
| Let somebody keep their own records | It is the product | No. This is why the default is device-only |
| Sync between devices | A phone and a laptop must agree | Yes, and it is: opt-in, off by default, category-granular |
| Reminders | The server must know what is due and when | Partly. Local reminders work without an account |
| Sharing with a trusted person or clinician | Explicitly requested each time | Time-limited and revocable |
| Support | Answering a question about someone's own data | Access is granted by the user with an expiring code |
| Aurora AI | Answering questions in context | Opt-in, off by default, and the only transfer abroad |

We hold **no advertising, profiling or analytics purpose at all**. There is no
analytics or advertising code anywhere in the app, verified by inspection.

## 4. Risks

Rated by what actually happens to the person, not by data volume.

### R1. Somebody is outed by their own device — HIGH inherent

The most likely harm by far, and it needs no server breach. A partner, parent,
employer or border officer picks up an unlocked phone.

**Mitigations in place:** an app lock (PIN, with the hash never synced); the
"Low Profile" theme, which renders the whole app in neutral greys so it is
unremarkable to a glance; the self-directed care section is renameable, because
the words "self-directed care" on a screen are themselves a disclosure; Travel
Mode keeps trip data device-local.

**Residual: MEDIUM.** These are good mitigations and they are genuinely unusual.
They cannot fully solve a shoulder-surfing risk.

### R2. Server-side disclosure of synced data — MEDIUM inherent, HIGH impact

**Mitigations:** row-level security on every table, with an automated tripwire
test that fails the build if any table becomes readable by a stranger; data
stored in Ireland with server code running in Ireland since 13 August 2026;
regular adversarial security review, most recently 25 August 2026, which found
and fixed live defects.

**Honest limitation:** synced data is **not end-to-end encrypted**. Authorised
administrators at our providers could in principle access it. The privacy policy
states this plainly rather than burying it.

**Residual: MEDIUM.**

### R3. The transfer to Anthropic — MEDIUM

Health and identity data leaves the UK and EU when Aurora AI is used.

**Mitigations:** opt-in and off by default; conversations never sync; users are
told this in the policy.

**Residual: UNRESOLVED.** The transfer safeguards have not been reviewed. The
privacy policy says so openly. See `SOLICITOR_QUESTIONS.md` §4.

### R4. Data lost because it only ever existed on one device — MEDIUM

The mirror image of the privacy benefit. Browser storage can be evicted, and a
lost phone means lost data, including years of a journal.

**Mitigations:** persistent storage is requested; export exists; sync exists for
those who want it.

**Residual: MEDIUM.** This is an accepted trade-off, made deliberately in the
user's favour on privacy.

### R5. Staff over-access — LOW to MEDIUM

Support staff can be granted temporary access to help.

**Mitigations:** the user grants it with a code, and it expires. A review on
25 August 2026 found and fixed a defect where consent given to one staff member
was inherited by all staff, and another where removed staff kept receiving
internal notifications.

**Residual: LOW.** Depends on the access log retention question being settled.

### R6. Somebody is identified as self-medicating — HIGH impact, LOW likelihood

The self-directed record plus medication data could evidence that a person is
obtaining hormones without a prescription.

**Mitigations:** as R1 and R2, plus the section being renameable.

**Residual: MEDIUM.** Worth explicitly asking whether any retention or disclosure
obligation could ever compel us to produce this. See `SOLICITOR_QUESTIONS.md`.

## 5. Measures already taken

Not aspirations. Each of these is in the shipped product.

- Local-first by default, with no account required
- Sync off by default, and switchable off per category
- Photos, voice recordings, euphoria entries, trips, AI conversations and the app
  lock PIN never sync at all
- App lock, and a deliberately unremarkable "Low Profile" theme
- A renameable section name for self-directed care
- No analytics, no advertising, no third-party tracking scripts
- The app's own code never reads or records IP addresses or device information
- Row-level security, plus an automated test that fails the build if a table
  becomes publicly readable
- Data and server code both in Ireland
- Export and delete available to the user
- No cookies at all unless signed in, and then only the session
- A published privacy policy in plain English that states known limitations
  rather than hiding them
- ICO registration (25 August 2026)

## 6. Outstanding actions

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Determine whether the strength converter engages UK MDR | Solicitor | Open, highest priority |
| 2 | Record the Article 9 condition and evidence of consent | Solicitor then policy update | Open |
| 3 | Resolve the Anthropic transfer safeguards | Solicitor | Open |
| 4 | Set and publish retention periods | Grey Studios | Open, policy says "before wider release" |
| 5 | Decide whether the Online Safety Act applies to beta chat | Solicitor | Open |
| 6 | Publish or provide a postal address | Grey Studios | Provided on request today |
| 7 | Write down a breach response procedure | Grey Studios | Not started |
| 8 | Correct stale comments in the code that misdescribe what syncs | Grey Studios | Identified, not yet fixed |

## 7. Sign-off

Not yet signed off. To be reviewed by Grey Studios and then by a data protection
solicitor. Review annually, or whenever a new category of data, a new processor
or a new sharing route is added.

| Role | Name | Date |
|---|---|---|
| Controller sign-off | Grey Studios | |
| Legal review | | |
