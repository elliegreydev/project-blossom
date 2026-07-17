-- Makes the "research-first, not yet reviewed" framing consistent across
-- every "later"-stage entry added in roadmap_expansion.sql, not just the 2
-- that happened to already say it. That file's own header comment says this
-- framing should cover the whole batch ("must not be implemented without
-- separate privacy, security and safety review") - the live page wasn't
-- actually saying so for most of them. Only touches these 19 rows by slug;
-- everything else (available/next items, the original roadmap.sql later
-- items like advanced-charts/calendar-sync) is untouched.

update public.product_roadmap set description = 'Research-first idea for a user-chosen transition summary for appointments or personal use, exportable as a clean PDF or structured data and never shared automatically.' where slug = 'blossom-passport';
update public.product_roadmap set description = 'Research-first idea for extra privacy controls such as neutral presentation, quick lock and optional decoy views, designed to supplement rather than replace device security.' where slug = 'discreet-mode';
update public.product_roadmap set description = 'Research-first idea for granular and revocable sharing with trusted people. Nothing would ever share a whole account by default.' where slug = 'trusted-circle';
update public.product_roadmap set description = 'Research-first idea for temporary travel checklists, destination resources and time-zone-aware reminders that explain any change instead of silently moving a schedule.' where slug = 'travel-mode';
update public.product_roadmap set description = 'Research-first idea for optional private planning around procedures, practical preparation and recovery notes, without predicting recovery or replacing clinical advice.' where slug = 'surgery-recovery-planner';
update public.product_roadmap set description = 'Research-first idea for private help to organise coming out, safety considerations, name changes and administrative tasks at a person''s own pace.' where slug = 'social-transition-planner';
update public.product_roadmap set description = 'Research-first idea for privacy-conscious recording, practice and goal tools, with clear reminders that pitch alone does not define gender.' where slug = 'voice-studio';
update public.product_roadmap set description = 'Research-first idea for a positive private journal for affirming moments and celebrations, with optional time capsules for entries someone chooses to revisit later.' where slug = 'gender-euphoria-journal';
update public.product_roadmap set description = 'Research-first idea to view progress against a person''s own starting point and goals, never public comparisons, rankings or generic transition timelines.' where slug = 'personal-baseline-tracking';
update public.product_roadmap set description = 'Research-first idea for neutral, optional planning around preservation questions, providers, costs and future family goals, without assuming anyone wants children.' where slug = 'fertility-family-planning';
update public.product_roadmap set description = 'Research-first idea for optional check-ins around stressful events that could prompt someone to contact a person they trust, without claiming emergency monitoring.' where slug = 'safety-check-ins';
update public.product_roadmap set description = 'Research-first idea for a plain-English dashboard of what data exists, where it''s stored, active access and connected services.' where slug = 'privacy-receipt';
update public.product_roadmap set description = 'Research-first idea for a transparency area covering security practices, data flows, incidents, policies, processors and responsible disclosure.' where slug = 'public-trust-centre';
update public.product_roadmap set description = 'Research-first idea for a privacy-respecting way to suggest and follow feature ideas without asking anyone to expose personal medical stories.' where slug = 'feature-request-voting';
update public.product_roadmap set description = 'Research-first idea for temporary, read-only links containing only chosen information, with expiry, revocation and access history.' where slug = 'blossom-bridge';
update public.product_roadmap set description = 'Research-first idea for optional device-only exploration of practice patterns such as pitch range and consistency, with no gender scoring.' where slug = 'on-device-voice-analysis';
update public.product_roadmap set description = 'Research-first idea for verified regional guidance on documents, healthcare, rights, housing and support, with sources and report-an-error options.' where slug = 'regional-transition-navigator';
update public.product_roadmap set description = 'Research-first idea for a private map of people, places, organisations and clinics, with personal labels that never become public ratings.' where slug = 'personal-support-map';
update public.product_roadmap set description = 'Research-first idea for a regional, reviewable glossary for sensitive terminology, translation notes and context.' where slug = 'community-language-glossary';
