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
- **Innovative technology**, when this was drafted, in that an AI assistant could
  be given the person's own health context. That feature was removed on 25 August
  2026 and this indicator no longer applies. The first two still do, and either
  alone is enough.

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
- Aurora AI conversations (the feature has since been removed entirely; any history left on a device is cleared by "delete all data")
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

- **Nothing leaves the UK or EU.** This entry used to describe Aurora AI, which
  sent conversations to Anthropic and was the only routine transfer out of
  Europe. It was removed on 25 August 2026. See R3.
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

### R3. The transfer to Anthropic — CLOSED, 25 August 2026

Health and identity data used to leave the UK and EU when the Aurora AI chat was
used, and the safeguards for that transfer had never been reviewed. The privacy
policy said so openly rather than hiding it.

**The feature has been removed**, along with the beta programme it was gated
behind. Blossom now makes no transfer of personal data outside the UK and EU at
all. The chat screen, its API route, its safety layer and the `aurora_ai_usage`
table are gone.

**Residual: NONE.** This risk is closed by deletion rather than by mitigation,
which is the strongest way to close one. Recorded here rather than removed,
because a DPIA is a dated record of what was true and when.

Two notes for whoever reviews this. First, "Aurora" still exists in Blossom and
is a completely different thing: a local suggestion engine that reads data on
the device and makes no network request. Do not confuse the two. Second, anyone
who used the old chat still has its history in `localStorage` on their own
device; it is not on any server, and "delete all data" clears it.

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
- Export and local deletion available to the user, with the significant
  limitations set out in section 6a, which must be read alongside this list
- No cookies at all unless signed in, and then only the session
- A published privacy policy in plain English that states known limitations
  rather than hiding them
- ICO registration (25 August 2026)

## 6a. Known defects found while writing this

An audit on 25 August 2026 checked the privacy policy line by line against the
code, and checked whether each right the policy offers actually works. It did
not go well, and the results are recorded here rather than quietly fixed,
because the gap between what was promised and what the software did is itself
the finding.

**Rights that do not work as described.** These are the serious ones.

| What is promised | What actually happens |
|---|---|
| Request deletion of a synced account from Settings (privacy policy and terms) | **No account deletion route exists anywhere in the app** |
| "Delete all data" | Clears the device only. No server call. It also clears the pending-changes queue, destroying deletions that were waiting to be sent |
| Deletion | On the server it is a soft delete. A timestamp is set and the content columns are kept indefinitely |
| Turning sync off | Everything already uploaded stays. Only the per-category route offers a real hard delete |
| Export your data | Photos and voice recordings are excluded entirely and there is no other way to get them out. Safety check-ins are silently dropped. Self-directed care records cannot be exported at all |
| Delete an entry | Medications and goals can never be deleted, only deactivated or archived. Safety check-ins and self-directed settings have no delete path |

**Statements in the privacy policy that are false.**

- "Blossom's own code never reads or records your IP address or anything about
  your device." Both halves are wrong. Rate limiting reads the forwarded-for
  header, and error reports carry a browser and platform token derived from the
  user agent.
- The support access section describes a system that has been retired and
  replaced.
- Staff support access is described as being able to "see". It is in fact read
  **and write, including delete**, across nine tables, and the person who
  granted it cannot revoke it. Only staff can.
- "If you use Blossom without signing in, or sign in but leave sync off, none of
  your data is sent to Blossom's servers at all", which the support ticket
  section then contradicts.
- "You control this category by category" while the profile row is deliberately
  outside the category system and always syncs.

**Things that happen and are not disclosed at all:** waiting list referrals and
self-directed care records both sync; Trusted Circle stores a third party's
email address; a persistent browser identifier is created for idea voting
without an account; the server keeps a record of which reminders were sent to
whom; deleted beta chat messages survive in a staff-readable audit log; push
subscriptions survive every deletion path, and deleted medications keep
generating reminders.

**What was verified as genuinely true**, and is worth keeping: photos and voice
recordings never sync under any setting; euphoria entries, Time Capsules, Aurora
conversations and Travel Mode trips never reach a server; Aurora is gated and
consent-first and sends only the conversation; there is no date of birth, legal
name, sex-assigned-at-birth or diagnosis field anywhere; category-level sync
control does what it says, including a real hard purge.

## 6. Outstanding actions

| # | Action | Owner | Status |
|---|---|---|---|
| 1 | Determine whether the strength converter engages UK MDR | Solicitor | Open, highest priority |
| 2 | Record the Article 9 condition and evidence of consent | Solicitor then policy update | Open |
| 3 | Resolve the Anthropic transfer safeguards | Solicitor | CLOSED 25 Aug 2026: the feature was removed, so there is no transfer left to safeguard |
| 4 | Set and publish retention periods | Grey Studios | Open, policy says "before wider release" |
| 5 | Decide whether the Online Safety Act applies to beta chat | Solicitor | Open |
| 6 | Publish or provide a postal address | Grey Studios | Provided on request today |
| 7 | Write down a breach response procedure | Grey Studios | Not started |
| 8 | Correct stale comments in the code that misdescribe what syncs | Grey Studios | Blood tests, theme hue and app lock fixed 25 Aug; full sweep running |
| 9 | Build an account deletion route | Grey Studios | Open. Promised in two legal documents, does not exist |
| 10 | Make "delete all data" reach the server, and stop it destroying queued deletions | Grey Studios | Open |
| 11 | Decide whether server deletion should erase content or keep the soft-delete tombstone | Grey Studios, then solicitor | Open |
| 12 | Offer a purge when sync is switched off, not only per category | Grey Studios | Open |
| 13 | Correct the false statements in the privacy policy listed in 6a | Grey Studios | Open, highest priority of these |
| 14 | Disclose staff support access as read and write, and let the user revoke it | Grey Studios | Open |
| 15 | Include photos, voice recordings, safety check-ins and self-directed records in the export | Grey Studios | Open |
| 16 | Remove push subscriptions on deletion, and stop reminders for deleted records | Grey Studios | Open |

## 7. Sign-off

Not yet signed off. To be reviewed by Grey Studios and then by a data protection
solicitor. Review annually, or whenever a new category of data, a new processor
or a new sharing route is added.

| Role | Name | Date |
|---|---|---|
| Controller sign-off | Grey Studios | |
| Legal review | | |
