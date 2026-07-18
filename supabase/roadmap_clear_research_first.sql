-- The research-first pass is done (see docs/research_first_review.md).
-- Removes the generic "Research-first idea for/to..." hedge from every
-- description now that real review has happened, rewriting each into a
-- confident description of the actual feature. Two exceptions get a
-- specific real caveat instead of a blanket strip, since they're not fully
-- cleared: Discreet Mode still needs outside DV-safety-org input before
-- design starts, and Blossom Social's foundation is parked until the team
-- has grown, not just researched.

update public.product_roadmap set description =
  'A user-chosen transition summary for appointments or personal use, exportable as a clean PDF or structured data and never shared automatically.'
  where slug = 'blossom-passport';

update public.product_roadmap set description =
  'Extra privacy controls such as neutral presentation and quick lock, designed to supplement rather than replace device security. Paused until we can design this alongside a domestic-violence safety organisation, not on our own.'
  where slug = 'discreet-mode';

update public.product_roadmap set description =
  'Temporary travel checklists, destination resources and time-zone-aware reminders that explain any change instead of silently moving a schedule.'
  where slug = 'travel-mode';

update public.product_roadmap set description =
  'Optional private planning around procedures, practical preparation and recovery notes, without predicting recovery or replacing clinical advice.'
  where slug = 'surgery-recovery-planner';

update public.product_roadmap set description =
  'Privacy-conscious recording, practice and goal tools, with clear reminders that pitch alone does not define gender.'
  where slug = 'voice-studio';

update public.product_roadmap set description =
  'A way to view progress against your own starting point and goals - never public comparisons, rankings or generic transition timelines.'
  where slug = 'personal-baseline-tracking';

update public.product_roadmap set description =
  'Neutral, optional planning around preservation questions, providers, costs and future family goals, without assuming anyone wants children.'
  where slug = 'fertility-family-planning';

update public.product_roadmap set description =
  'Granular and revocable sharing with trusted people. Nothing would ever share a whole account by default.'
  where slug = 'trusted-circle';

update public.product_roadmap set description =
  'Optional check-ins around stressful events that can prompt you to contact someone you trust - visible only to you and them, never staff, and never a claim of emergency monitoring.'
  where slug = 'safety-check-ins';

update public.product_roadmap set description =
  'A plain-English dashboard of what data exists, where it''s stored, active access and connected services.'
  where slug = 'privacy-receipt';

update public.product_roadmap set description =
  'A transparency area covering our security practices, data flows, incidents, policies, processors and responsible disclosure.'
  where slug = 'public-trust-centre';

update public.product_roadmap set description =
  'A privacy-respecting way to suggest and follow feature ideas without asking anyone to expose personal medical stories.'
  where slug = 'feature-request-voting';

update public.product_roadmap set description =
  'Temporary, read-only links containing only chosen information, with expiry, revocation and access history.'
  where slug = 'blossom-bridge';

update public.product_roadmap set description =
  'Optional device-only exploration of practice patterns such as pitch range and consistency, with no gender scoring.'
  where slug = 'on-device-voice-analysis';

update public.product_roadmap set description =
  'Verified regional guidance on documents, healthcare, rights, housing and support, with sources and a report-an-error option.'
  where slug = 'regional-transition-navigator';

update public.product_roadmap set description =
  'A private map of people, places, organisations and clinics, with personal labels that never become public ratings.'
  where slug = 'personal-support-map';

update public.product_roadmap set description =
  'A regional, reviewable glossary for sensitive terminology, translation notes and context.'
  where slug = 'community-language-glossary';

update public.product_roadmap set description =
  'An optional community area. Before any social feature is built, this covers moderation policy, safety architecture, legal review and staffing - paused until our team has grown enough to support it properly, not something we''re actively working toward yet.'
  where slug = 'social-foundation-safety';

update public.product_roadmap set description =
  'An optional profile kept separate from your private Blossom profile, with its own name, avatar and visibility controls. Private tracking data would never appear here automatically.'
  where slug = 'social-profiles';

update public.product_roadmap set description =
  'Small, topic-based community spaces (early transition, voice practice, surgery support, and similar) instead of one large public feed, each with its own moderators and rules.'
  where slug = 'social-circles';

update public.product_roadmap set description =
  'Posts within Circles - questions, experiences, celebrations, polls - with content warnings, reply controls and clear labels separating personal experience from official information.'
  where slug = 'social-posts-discussions';

update public.product_roadmap set description =
  'A space to share personal wins, with supportive reactions rather than public counts or rankings - no competitive milestones.'
  where slug = 'social-celebration-garden';

update public.product_roadmap set description =
  'A structured question space with clear answer labels (personal experience, community info, verified professional) - ordinary answers would never be presented as medical advice.'
  where slug = 'social-qa';

update public.product_roadmap set description =
  'Optionally matching people by shared interests or support goals - never using medical records, always opt-in on both sides, with easy blocking.'
  where slug = 'social-buddy-matching';

update public.product_roadmap set description =
  'Request-based direct messages, off by default, with strict controls for new accounts. Not intended as crisis support or professional counselling.'
  where slug = 'social-messaging';

update public.product_roadmap set description =
  'Member and organisation-hosted online and in-person events, with accessibility info and safety details - exact locations never exposed publicly by default.'
  where slug = 'social-events';

update public.product_roadmap set description =
  'Community roles (moderators, resource reviewers, peer volunteers) earned through conduct and review, not popularity or post counts.'
  where slug = 'social-trusted-contributors';

update public.product_roadmap set description =
  'Anonymous posting in select, moderated Circles only, once moderation systems are mature - moderators would still be able to identify accounts internally for safety.'
  where slug = 'social-anonymous-posts';

update public.product_roadmap set description =
  'Verified pages for charities and support organisations, with services, regions and contact info - verification would never be for sale.'
  where slug = 'social-organisation-pages';

update public.product_roadmap set description =
  'Richer community tools (group chats, voice rooms, video events, local meet-up discovery) explored only once text-based Circles are stable and safely moderated.'
  where slug = 'social-advanced-features';
