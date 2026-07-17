-- Roadmap expansion requested by the product owner. This only adds future
-- entries: existing roadmap rows are left exactly as they are.
--
-- Research-first entries are intentionally phrased as exploration. They must
-- not be implemented without separate privacy, security and safety review.

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent)
values
  ('gentle-mode', 'Gentle Mode', 'An optional calmer experience for people who find tracking stressful: less pressure, fewer numbers and only the essentials.', 'next', 30, false),
  ('expanded-local-first-storage', 'Expanded local-first storage choices', 'Clear per-module choices for device-only storage, optional sync, encrypted backups and manual control of what leaves a device.', 'next', 40, false),
  ('appointment-builder', 'Appointment Builder', 'A guided, private space to prepare questions, notes, documents and follow-ups before and after an appointment.', 'next', 50, false),
  ('resource-trust-system', 'Resource Trust System', 'Clear source, verification, language and last-reviewed information for regional resources, with urgent information reviewed first.', 'next', 60, false),
  ('medication-supply-planner', 'Medication supply planner', 'Organisation for stock, renewals and supplies, without ever advising someone to change a dose.', 'next', 70, false),
  ('accessibility-profiles', 'Accessibility profiles', 'Optional presets for low vision, reduced motion, large touch targets, low cognitive load and more, while keeping every setting adjustable.', 'next', 80, false),
  ('low-energy-mode', 'Low-Energy Mode', 'A quieter view for hard days: essential reminders, the next appointment and a couple of one-tap actions.', 'next', 90, false),
  ('crisis-resource-quick-access', 'Crisis-resource quick access', 'A discreet shortcut to verified, region-aware support before or after onboarding, without asking for sensitive account details.', 'next', 100, false),
  ('modular-home-screen', 'Modular home screen', 'Personal control over what the dashboard shows, hides, pins and prioritises on different devices.', 'next', 110, false),
  ('data-import-escape-hatch', 'Data import and escape hatch', 'Broader import, export and human-readable archive options, so leaving Blossom never means leaving your information behind.', 'next', 120, false),
  ('what-do-i-need-today', 'What do I need today?', 'A calmer starting point based on an intention like organise, reflect, find support or prepare for an appointment.', 'next', 130, false),

  ('blossom-passport', 'Blossom Passport', 'A user-chosen transition summary for appointments or personal use, exportable as a clean PDF or structured data and never shared automatically.', 'later', 30, false),
  ('discreet-mode', 'Discreet Mode', 'Extra privacy controls such as neutral presentation, quick lock and optional decoy views, designed to supplement rather than replace device security.', 'later', 40, false),
  ('travel-mode', 'Travel Mode', 'Temporary travel checklists, destination resources and time-zone-aware reminders that explain any change instead of silently moving a schedule.', 'later', 50, false),
  ('surgery-recovery-planner', 'Surgery and recovery planner', 'Optional private planning for procedures, practical preparation and recovery notes, without predicting recovery or replacing clinical advice.', 'later', 60, false),
  ('social-transition-planner', 'Social transition planner', 'Private help to organise coming out, safety considerations, name changes and administrative tasks at a person''s own pace.', 'later', 70, false),
  ('voice-studio', 'Voice Studio', 'Privacy-conscious recording, practice and goal tools, with clear reminders that pitch alone does not define gender.', 'later', 80, false),
  ('gender-euphoria-journal', 'Gender euphoria journal', 'A positive private journal for affirming moments, celebrations and optional time capsules for entries someone chooses to revisit later.', 'later', 90, false),
  ('personal-baseline-tracking', 'Personal baseline tracking', 'Progress viewed against a person''s own starting point and goals, never public comparisons, rankings or generic transition timelines.', 'later', 100, false),
  ('fertility-family-planning', 'Fertility and family planning organiser', 'Neutral, optional planning for preservation questions, providers, costs and future family goals without assuming anyone wants children.', 'later', 110, false),
  ('trusted-circle', 'Trusted Circle', 'Research-first, granular and revocable sharing with trusted people. Nothing would ever share a whole account by default.', 'later', 120, false),
  ('safety-check-ins', 'Safety check-ins', 'Optional check-ins around stressful events that can prompt the user to contact someone they trust, without claiming emergency monitoring.', 'later', 130, false),
  ('privacy-receipt', 'Privacy Receipt', 'A plain-English dashboard of what data exists, where it is stored, active access and connected services.', 'later', 140, false),
  ('public-trust-centre', 'Public Trust Centre', 'A transparency area for security practices, data flows, incidents, policies, processors and responsible disclosure.', 'later', 150, false),
  ('feature-request-voting', 'Feature request voting', 'A privacy-respecting way to suggest and follow feature ideas without asking anyone to expose personal medical stories.', 'later', 160, false),
  ('blossom-bridge', 'Blossom Bridge', 'Research-first temporary, read-only links containing only chosen information, with expiry, revocation and access history.', 'later', 170, false),
  ('on-device-voice-analysis', 'On-device voice analysis', 'Optional device-only exploration of practice patterns such as pitch range and consistency, with no gender scoring.', 'later', 180, false),
  ('regional-transition-navigator', 'Regional transition navigator', 'Verified regional guidance for documents, healthcare, rights, housing and support, with sources and report-an-error options.', 'later', 190, false),
  ('personal-support-map', 'Personal support map', 'A private map of people, places, organisations and clinics, with personal labels that never become public ratings.', 'later', 200, false),
  ('community-language-glossary', 'Community-reviewed language glossary', 'A regional, reviewable glossary for sensitive terminology, translation notes and context.', 'later', 210, false)
on conflict (slug) do nothing;
