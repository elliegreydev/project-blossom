# Questions for a data protection solicitor

Prepared 25 August 2026, for Grey Studios, about Project Blossom.

Written so an hour of someone's time is spent answering rather than working out
what to ask. Ordered by what would cost the most to get wrong.

**Context in one paragraph.** Blossom is a local-first PWA for trans, nonbinary
and questioning adults in the UK. By default everything stays in the browser's
own storage on the person's device and no account is needed. If somebody chooses
to, they can create an account and sync some of it to Supabase (Ireland), which
enables sharing features and an AI assistant. The data includes medication,
blood test results, clinic appointments, gender clinic waiting lists, mood
check-ins, body measurements, private journal entries and an optional intimacy
log. Grey Studios is a two-person company. There is a separate staff app used to
answer support tickets. Nobody has been charged for anything; there is a
donations route via Stripe.

---

## 1. Is any part of Blossom a medical device?

The one we would most like to be wrong about, and the reason this list exists.

Blossom now includes a **unit converter**: you type the strength printed on a
vial and an amount, and it does the arithmetic (4mg at 40mg/mL is 0.1mL). It was
deliberately built to have no opinion. It does not suggest a dose, will not say a
figure looks high or low, does not validate anything, stores nothing, and
converts an absurd number if you type one. It shows its working so a slipped
decimal is visible.

- Does that fall within the definition of a medical device under the UK MDR
  2002 as amended, on the basis that it performs a calculation that could inform
  a treatment decision?
- Does the answer change because the app also holds medication schedules,
  reminders and blood test results alongside it, even though nothing interprets
  those results?
- If it is in scope, is the correct response to register, to change the feature,
  or to remove it? We would rather remove it than get this wrong.
- Does the fact that many users are self-medicating without a prescriber change
  the analysis, or our exposure?

## 2. Which Article 9 condition applies, and how do we evidence it?

This is health data, and for many users it also reveals gender identity.

- We assume explicit consent (Art 9(2)(a)). Is that right, or is there a better
  fit given people are recording their own data about themselves?
- What does adequate evidence of explicit consent look like for an app where the
  default is that nothing leaves the device at all?
- Does the Article 9 condition need to be obtained separately for: syncing,
  sharing with a trusted contact, sending data to a clinician via our "Bridge"
  feature, granting temporary support access, and the AI assistant? Or once,
  covering all of it?
- What is the correct Article 6 basis to pair it with?

## 3. Does the local-first design reduce our obligations?

Genuinely unclear to us and it affects almost everything else.

- Where data never leaves the person's device, and we have no technical means to
  access it, are we a controller of that data at all? Or is it outside the scope
  of our processing entirely?
- If it is outside scope, can the privacy policy say so plainly, and does that
  change what we must offer for access and erasure requests?
- Does offering an export feature for device-only data change the answer?

## 4. The AI assistant and the transfer outside the UK

Aurora AI sends what the user types to Anthropic, which processes it outside the
UK and EU. It is opt-in and off by default. Everything else now runs in Ireland.

- What is needed to make that transfer lawful: the IDTA, the Addendum to the
  SCCs, or reliance on an adequacy decision? Does the answer depend on where
  Anthropic actually processes?
- Do we need a transfer risk assessment, and is it proportionate at our size?
- Given the content can include someone's health and gender identity, is opt-in
  consent enough on its own, or do we need the transfer mechanism as well?

## 5. Is a DPIA mandatory, and is ours adequate?

We have drafted one (see DPIA.md in this folder).

- Given special category data plus a group who can face real harm from
  disclosure, do we meet the Article 35 threshold?
- Does our draft cover what it needs to, and does anything in it require prior
  consultation with the ICO?

## 6. ICO registration

**Done.** Grey Studios registered with the ICO on 25 August 2026 (tier 1). Left
in the list only so it is visibly handled rather than forgotten. The one open
question: should the registration number be published in the privacy policy? It
is not required, but it is common and it costs nothing.

## 7. Does the Online Safety Act apply to us?

Blossom has a beta testers' chat and a feedback board where suggestions can be
seen and voted on by other users.

- Do those make Blossom a user-to-user service within scope of the OSA?
- If so, what are the proportionate duties for a service this small, and is
  there a threshold below which they do not bite?
- Would removing the chat take us out of scope, and is that worth doing?

## 8. Support access to user data

Support staff can be granted temporary access to a user's data to help with a
problem. The user provides a code to grant it; it expires.

- Is consent the right basis, and is a six-digit code with an expiry adequate
  evidence that the person agreed?
- What should we log, and how long should we keep those logs?

## 9. Retention periods

Our policy currently says we are still setting these and will publish them
before wider release. We need defensible numbers for: support cases and their
messages, support access grant logs, beta chat, feedback and applications,
error reports, and provider backups.

- What is defensible for each, and what is the risk of publishing a period we
  then fail to enforce technically?

## 10. Practical points

- We do not publish a postal address. The policy says we will provide one on
  request. Is that acceptable, or must it be published?
- Do we need a Data Protection Officer, or a UK/EU representative?
- What does an adequate breach response look like at our size, and what should
  we have written down before we need it?
- Our terms disclaim liability for the information in the app and for anything
  people do with it. Given the audience and the subject, is that disclaimer
  worth anything, and where is it likely to fail?
- Is anything about serving people who may be minors relevant here? The app is
  written for adults but we do not verify age.

---

## What already exists, so you are not asked to assume the worst

- Privacy policy and terms are published and written in plain English.
- Nothing leaves the device unless the person turns sync on.
- No analytics, no advertising, no third-party tracking scripts anywhere.
- The app's own code never reads or records IP addresses or device details.
- Synced data is protected by row-level security, with an automated test that
  fails the build if a table becomes readable by a stranger.
- Data is stored in Ireland, and since 13 August 2026 the server code runs there
  too.
- No cookies are set at all unless somebody signs in, and then only for the
  session. There is no cookie banner because there is nothing optional to
  consent to.
- Users can export everything and delete everything, locally and on the server.
