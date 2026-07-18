# Research-first roadmap review

Every item below is currently `later` stage with a "research-first" framing —
meaning the roadmap itself already promises these won't be built without a
separate privacy/safety/legal pass first. This document is that pass: for
each item, what the real risk is, what precedent/best practice actually
applies, concrete design guardrails, and the specific open question(s) that
need Ellie's decision before anything gets built.

**Method note:** this was researched directly (no subagents), grounded in
established, well-documented precedent from privacy engineering, trust &
safety practice, and domestic-violence tech-safety guidance. Live web search
was unavailable for part of this pass (a tool outage, not a skipped step) -
one item specifically (fertility/family planning) needs a fresh legal-
landscape check before any build decision, flagged clearly below, since that
area is genuinely volatile and shouldn't rest on knowledge-cutoff facts.

**Readiness key:** 🟢 ready to scope into `next` once Ellie picks it · 🟡
buildable but needs a specific decision from Ellie first · 🔴 needs outside
expert input beyond what either of us can respons­ibly decide alone.

---

## The one to read first: Discreet Mode 🔴

*"Extra privacy controls such as neutral presentation, quick lock and
optional decoy views, designed to supplement rather than replace device
security."*

This is the highest real-world-stakes item on the whole list, and I want to
be direct about why: it's the one feature where a design mistake doesn't
just cost trust or money, it can increase someone's physical danger. This is
squarely domestic-violence tech-safety territory, and there's decades of
hard-won, well-documented guidance in that field (NNEDV's Safety Net
project, Refuge/Chayn in the UK) that Blossom should lean on rather than
reinvent.

The core, established facts from that field:

- **An app icon on the home screen already tells an abuser Blossom exists**,
  before anyone opens a "decoy view." Decoy/quick-exit features only protect
  someone actively using the phone in the moment - they do nothing against
  someone who later scrolls the app list, checks notification history, or
  looks at browser/app-store history. Any copy that implies otherwise is
  actively dangerous, not just optimistic.
- **A "quick exit" that just closes the tab isn't real protection** - the
  browser back button and history still show it. Real safety guidance
  favors a exit that *navigates somewhere innocuous* (a neutral page, or
  closing to the home screen entirely) rather than just hiding the current
  view.
- **Never log that discreet/decoy mode was used.** An audit trail of "user
  activated safety mode at 9:47pm" is itself a red flag if an abuser ever
  gets access to logs or a synced account - this is a case where Blossom's
  local-first architecture is already a genuine safety advantage, and any
  future sync of this preference would need to think hard about whether it
  should ever leave the device at all.
- **Notification previews are a bigger leak than the app itself.** A lock-
  screen notification that says anything specific (a medication name, a
  reminder title) is discoverable without ever unlocking the phone. Blossom
  already does discreet notification copy by default for reminders - that
  same discipline needs to extend to anything Discreet Mode touches.

**What I'd recommend:** treat this as "buildable, but consult a domain
expert first" rather than something either of us should fully design solo.
NNEDV's Safety Net program (techsafety.org) publishes app-design guidance
specifically for cases like this and, in my experience, will consult with
app builders - that's a stronger foundation than internal design judgment
alone, given what's at stake if it's wrong.

**Open question for Ellie:** do you have (or want to establish) any contact
with a DV-support or tech-safety organization before this one gets designed?
I don't think either of us should be the sole judgment call here.

---

## Personal tracking depth (lower external risk, mostly product judgment)

### Blossom Passport 🟢
*"A user-chosen transition summary for appointments or personal use,
exportable as a clean PDF or structured data, never shared automatically."*

Lowest-risk item in this whole document — it's an extension of the export
feature that already exists and already works well. The one guardrail worth
stating explicitly in the design: this document, once exported, becomes a
physical/digital artifact outside Blossom's control entirely - if printed
and left somewhere, or emailed to the wrong address, it's effectively an
outing document. The mitigation isn't technical (you can't control what
happens after export), it's about the *in-app framing* at export time - a
clear, unskippable reminder of what leaves Blossom's protection once this
exists elsewhere. Ready to scope directly.

### Personal baseline tracking 🟢
*"View progress against a person's own starting point and goals, never
public comparisons, rankings or generic transition timelines."*

This is really a UI layer on data that already exists (goals, milestones,
body/voice tracking) rather than a new data-safety surface. The guardrail is
already well-articulated in the app's own existing design language (no
streaks, no comparison, no generic timeline implying "you should be here by
now") - this is the same discipline already proven in Body/Progress
tracking this project. Ready to scope; the main design work is presentation,
not privacy engineering.

### Surgery and recovery planner 🟢
*"Optional private planning around procedures, practical preparation and
recovery notes, without predicting recovery or replacing clinical advice."*

Same shape as blood tests: descriptive-only, free text, no structured
"expected recovery timeline" field that could read as a clinical prediction
Blossom never made. The one thing worth deciding up front: should this data
ever sync, or should it join journal entries and v1.5 module data as local-
only (the current pattern for the most sensitive freeform content)? Given
how specific and identifying "type of procedure + date + recovery notes"
could be, I'd lean local-only by default, matching journal entries -
flagging as the one real open question here.

### Fertility and family planning organiser 🟡
*"Neutral, optional planning around preservation questions, providers, costs
and future family goals, without assuming anyone wants children."*

Got a real, current legal check on this (WebSearch came back up mid-review,
one query completed before it went down again - the state-shield-law half
below still needs a follow-up closer to build time). Confirmed facts worth
building around:

- **The FTC has actually enforced against exactly this data category
  before** - real settlements against Flo Health, Premom, and GoodRx for
  disclosing reproductive/health data to third parties without proper
  consent, and the FTC has separately started treating precise location
  data as inherently sensitive when it can reveal visits to reproductive
  health clinics. This isn't a hypothetical risk - it's litigated precedent
  in this exact product category.
- **HIPAA does not cover this data.** Reproductive tracking data in an app
  like Blossom sits outside HIPAA entirely unless the app interfaces with a
  clinical EHR system, which Blossom doesn't and shouldn't. That means the
  FTC's Section 5 "unfair or deceptive practices" authority - not HIPAA - is
  the actual enforcement mechanism that would apply, and it's specifically
  triggered by *privacy policies not matching actual data handling*. Blossom
  is already disciplined about this (the privacy policy gets rewritten the
  same day reality changes, per this project's own established practice) -
  that habit needs to extend to whatever this feature ends up doing,
  explicitly.
- **Still needs a follow-up:** current state of state-level reproductive-
  data "shield laws" (protections against out-of-state subpoenas) versus
  hostile-state data-demand exposure - that specific query didn't complete
  before the outage recurred. Worth one more targeted search before this
  feature is actually designed, not before it's merely scoped.

Design-level guardrail, unchanged and now more confidently justified: keep
this in the same descriptive-only, unstructured-text pattern as blood tests
and the recovery planner - never a structured, queryable "trying to
conceive" flag, never a location-tagged provider directory tied to an
identifiable procedure. Given the FTC has specifically gone after apps for
disclosing structured reproductive data and for location data revealing
clinic visits, minimizing this at the *schema* level (free text a breach
can't easily query) isn't just good practice here, it's responding to a
demonstrated, not hypothetical, enforcement pattern.

Sources:
- [FTC Highlights Risks to Data in a Post-Dobbs World | Epstein Becker Green](https://www.healthlawadvisor.com/ftc-highlights-risks-to-data-in-a-post-dobbs-world)
- [A New Era of Privacy Enforcement: Lessons for Digital Health Players](https://www.sheppardhealthlaw.com/2025/09/articles/privacy-and-data-security/a-new-era-of-privacy-enforcement-lessons-for-digital-health-players/)
- [Data Minimization: Bolstering The FTC's Health Data Privacy Authority](https://epic.org/data-minimization-bolstering-the-ftcs-health-data-privacy-authority/)

### Travel Mode 🟢
*"Temporary travel checklists, destination resources and time-zone-aware
reminders that explain any change instead of silently moving a schedule."*

Straightforward extension of the existing region-resource system and the
reminder timezone work already shipped. The one real design question: this
inherently reveals *where someone is traveling to*, which for a restrictive-
jurisdiction context could itself be sensitive information (e.g., "traveling
to a state with active restrictions" is a meaningful signal). Recommend this
stays local-only, same reasoning as the recovery planner - no server-side
record of travel destinations tied to an account.

---

## Privacy & trust infrastructure

### Privacy Receipt 🟡
*"A plain-English dashboard of what data exists, where it's stored, active
access and connected services."*

Lower data-safety risk than most items here (it's read-only, describes
existing state, doesn't create a new sharing surface) but carries a
different risk: if it's ever *wrong* - says "local-only" when a bug actually
synced something - that's a worse trust violation than not having the
feature, because it's a stated factual claim, not a design intent. I'd
recommend building this **last** among the privacy-cluster items, once every
sync/staff-access surface (which is now fairly extensive after this
session's staff-role work) is genuinely stable, rather than building it now
against a still-moving backend and letting it silently drift out of sync
with reality - the same "stale roadmap" failure mode checked for this
session, but with real stakes if it's the privacy page itself that's stale.

**Open question:** is this worth building as a live, queried-on-the-fly
view (always accurate, more engineering) versus a static "here's generally
how Blossom handles your data" page (easier, but can drift)? I'd push for
the live version specifically because the whole point of this feature is
that it's more trustworthy than a policy document - a static page duplicates
what the Privacy Policy already does.

### Public Trust Centre 🟢
*"A transparency area covering security practices, data flows, incidents,
policies, processors and responsible disclosure."*

This one's mostly a content/documentation task rather than an engineering
one - a public page describing practices, not per-user live state. Lower
risk than Privacy Receipt for exactly that reason (nothing to go stale
against a live system). Ready to scope whenever there's writing bandwidth;
doesn't block on anything else here.

### Blossom Bridge 🟢
*"Temporary, read-only links containing only chosen information, with
expiry, revocation and access history."*

This is a well-understood security pattern - the same shape already proven
this session with staff applications and the feedback board (a random,
high-entropy token as the sole access credential, enforced by a real
database constraint, not a client-side check). Established requirements
from similar features elsewhere (patient-portal share links, expiring
location shares): a token needs real entropy (not sequential IDs), a hard
time-based expiry *and* explicit manual revocation, and the link itself
should never render in a way that a link-preview bot (Slack/Discord/iMessage
unfurling a pasted URL) could fetch and leak the content to a third party
without the intended recipient ever clicking it. Ready to scope with that
last point as the one specific technical guardrail to get right.

---

## Safety & support network features

### Safety check-ins 🟡
*"Optional check-ins around stressful events that could prompt someone to
contact a person they trust, without claiming emergency monitoring."*

The roadmap's own framing already gets the hard part right - the risk here
isn't the initial design, it's *scope creep after launch*. If a user ever
comes to believe (correctly or not) that Blossom is actively monitoring
their safety, and a missed check-in doesn't actually reach anyone because a
push notification failed or a trusted contact ignored it, that gap between
perceived and actual capability is where real harm and real liability live.
Established guidance from wellness-check and crisis-adjacent tools: never
use language that implies a guarantee ("we'll alert your emergency
contact"); always frame it as a suggestion that keeps agency with the user
("if you miss a check-in, we'll gently suggest reaching out"). This is
buildable without external expert consultation, but needs Ellie's explicit
sign-off on the exact copy before it ships, since copy drift is the actual
risk, not the architecture.

**Decided (18 Jul 2026):** a missed check-in is visible only to the user
themselves and their chosen trusted contact - never to staff. Blossom never
holds anything that looks like a monitoring log.

### Trusted Circle 🟢
*"Granular and revocable sharing with trusted people. Nothing would ever
share a whole account by default."*

Well-precedented pattern (Google's now-retired Trusted Contacts, modern
granular location-sharing consent screens). Three established requirements:
sharing must be opt-in *per data type*, never one toggle that grants full
account visibility; revocation must take effect immediately and not require
the other person's cooperation; and the person granted access should see
clearly and specifically what they can see, so nobody over-assumes scope
they don't actually have. Given this session already built a real staff
access-log pattern (who viewed what, when), I'd recommend the same shape
here - a trusted person's access should be logged and visible to the
account owner, mirroring the support-case audit trail. Ready to scope.

### Personal support map 🟢
*"A private map of people, places, organisations and clinics, with personal
labels that never become public ratings."*

Same shape as saved private links, just with a location dimension. The only
addition worth flagging: locations are more identifying than a URL - if this
ever synced, a breach exposing "clinics this specific account has bookmarked
near this location" is a meaningfully worse leak than a breach of generic
saved links. Recommend local-only by default, consistent with the other
location-adjacent items above (Travel Mode, recovery planner).

### Regional transition navigator 🟢
### Community-reviewed language glossary 🟢

Grouping these together since both extend infrastructure that already
exists (the 80-region resource research from an earlier session, now backed
by real staff roles and an activity log). The genuinely open question for
both isn't legal or safety research - it's **governance**: who reviews a
community-submitted glossary edit or a "this info is wrong" report before it
goes live, and at what staff rank? Given the role hierarchy shipped this
session, I'd suggest Manager+ for approving glossary/navigator changes
(matches the existing "Manager can edit resources/notices/roadmap" shape),
with a public "suggest an edit" flow reusing the same honeypot-protected
pattern as the feedback board. Both are closer to "extend what's already
built" than "research a new risk."

---

## Blossom Social - all 13 phases

The roadmap's own foundation-phase description already states the right
rule: *"nothing else in this initiative starts until this is ready."* I
want to reinforce that rather than soften it, because it's easy to
rationalize "just the profiles phase, that's harmless" - it isn't. Even a
profile-only feature with zero posts still needs a blocking model, a
reporting mechanism, and staff bandwidth to act on reports, which are
Foundation-phase deliverables, not later add-ons.

### Foundation & safety research 🔴 *(the actual gate for everything below)*

Precedent worth grounding this in: Discord's trust & safety evolution (built
reactively, learned expensively), Reddit's per-community moderator model
(delegated moderation scales, but only with real tooling and vetting),
and - most relevant given Blossom's audience specifically - how LGBTQ+-
focused community spaces (Trevor Project's community programs, various
trans-support Discord communities) handle the combination of a legally
sensitive population, real self-harm risk, and often-thin moderation
capacity. The consistent lesson across all of them: **moderation capacity
has to exist before growth, not scale up after an incident.** Platforms that
get this backwards pay for it in user harm first and reputation second.

Three concrete things Foundation needs to produce before phase two starts:
1. **A real staffing plan**, not just tooling - actual people, actual
   coverage hours, actual escalation path. Given the staff roster right now
   is genuinely small, this is worth saying plainly: Blossom Social
   shouldn't move forward until there's a resourced moderation team, and the
   staff-hiring pipeline shipped this session is arguably the actual
   prerequisite infrastructure for this feature, not a coincidence.
2. **Legal review** specific to hosting user-generated content from a
   legally sensitive population across multiple jurisdictions - Section
   230-shaped liability questions in the US, and mandatory-reporting nuance
   if any content ever suggests active self-harm or abuse.
3. **A tested incident-response runbook**, written and rehearsed *before*
   the first real post goes live, not improvised after the first bad one.

**Decided (18 Jul 2026):** Ellie agrees - Blossom Social is a "once the team
has grown" initiative, not a near-term one. Parked until then; no phase of
it (including "just profiles") should be scoped before Foundation's staffing
and legal-review requirements are actually met.

### The remaining 12 phases, briefly

Each of these inherits its safety posture from Foundation - noting only
what's specific to each, not re-litigating the shared requirements above.

- **Separate social profiles** 🟡 - the one technical guardrail worth
  stating now: private tracking data must never be reachable from the
  social profile even by accident (a shared component, a careless query) -
  worth a specific code-level check once this is scoped, not just a design
  intent.
- **Circles** 🟢 - per-circle moderators/rules is the right shape (matches
  Reddit's delegated model); the open question is whether circle moderators
  are a new staff rank or a separate, lighter-weight role than the
  Trial Moderator→Owner hierarchy already built for app-wide staff.
- **Posts & discussions** 🟡 - content warnings and clear labels separating
  personal experience from official info are good defaults; needs a
  concrete moderation-queue design, not just a posting UI.
- **Celebration Garden** 🟢 - lowest-risk social phase; "no public counts or
  rankings" is the right call and mirrors Body/Progress tracking's own
  no-comparison philosophy already proven elsewhere in the app.
- **Community Q&A** 🟡 - the answer-source labels (personal experience /
  community info / verified professional) are doing real safety work here;
  worth deciding who can grant "verified professional" status before this
  is built, since that's a trust claim staff would be making on someone's
  behalf.
- **Buddy matching** 🟡 - "never using medical records" is the right
  boundary; make sure the matching signal itself (whatever it ends up being)
  can't be reverse-engineered to infer medical status either.
- **Private messaging** 🔴 - direct messages are historically where the
  worst platform harms concentrate (harassment, grooming risk with any
  vulnerable population). This one specifically should not ship until
  Foundation's moderation/reporting tooling has been proven on lower-risk
  surfaces first (Circles, posts) - message content is much harder to
  moderate than public posts by nature.
- **Events** 🟡 - "exact locations never exposed publicly by default" is the
  right default; needs a decision on how much organizer verification exists
  before an in-person event listing goes live, given physical-safety stakes.
- **Trusted contributors** 🟢 - "earned through conduct and review, not
  popularity" is a good principle; straightforward once Foundation defines
  what "conduct review" actually means operationally.
- **Anonymous support posts** 🔴 - explicitly gated behind "once moderation
  systems are mature" in its own description, and I'd hold that line
  strictly - anonymous posting is the single feature on this list most
  likely to be abused the moment it exists, and the description's own
  "moderators could still identify accounts internally" is doing a lot of
  load-bearing safety work that needs to actually be built and tested first.
- **Organisation pages** 🟢 - "verification never for sale" is the right
  call; this is mostly a governance/vetting-process question (who verifies
  an org, what proof is required) rather than a technical risk.
- **Group chats, voice & video** 🔴 - explicitly the last phase in its own
  description ("once text-based Circles are stable and safely moderated"),
  and rightly so - real-time voice/video moderation is an order of magnitude
  harder than async text, and shouldn't be attempted until everything
  earlier in this list has years, not months, of stable operation behind it.

---

## Decisions made (18 Jul 2026)

1. **Discreet Mode** - Ellie will reach out to a DV-safety organization
   (e.g., NNEDV's Safety Net, Chayn) before this gets designed at all.
2. **Fertility/family planning** - grounded in real FTC enforcement
   precedent; schema-level guardrails confirmed by it. One narrow follow-up
   remains (state-level shield-law status) before final design.
3. **Safety check-ins** - decided: visible only to the user themselves and
   their trusted contact, never to staff.
4. **Blossom Social** - decided: a "once the team has grown" initiative, not
   near-term. Parked; no phase starts before Foundation's staffing and legal
   review are actually in place.

Everything else in this document (🟢 items) is ready to scope into a real
build plan whenever it's picked - the research/safety thinking is done, the
guardrails are stated, nothing's blocking on outside input.
