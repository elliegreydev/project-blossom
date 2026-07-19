-- Fresh ideas from a brainstorm session (19 Jul 2026), not yet scoped or
-- built - just captured on the roadmap for later. Dark/light theme override
-- was deliberately left out at Ellie's request.

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent) values
  ('global-search', 'Global search', 'A single search across everything you''ve added - journal, milestones, medications, goals, blood tests and more - all found locally on your device.', 'later', 430, false),
  ('budget-tracker', 'Transition cost & budget tracker', 'Private tracking for transition-related costs and savings goals, like HRT or surgery funds, without turning money into another thing to be judged about.', 'later', 440, false),
  ('document-vault', 'Document vault', 'Secure, local-only storage for documents you already have, like ID, insurance letters or legal paperwork - separate from Blossom Passport, which generates a new document rather than storing existing ones.', 'later', 450, false),
  ('reminder-centre', 'Unified reminder centre', 'One place to see everything coming up - medication doses, appointments, an open safety check-in, or a Time Capsule ready to open - instead of checking each separately.', 'later', 460, false),
  ('sharing-tools-discoverability', 'Make Trusted Circle, Bridge & Safety check-ins easier to find', 'A discoverability pass on features that already exist but are easy to miss - the same fix the beta program needed before people actually found it.', 'later', 470, false),
  ('notification-quiet-hours', 'Quiet hours for notifications', 'A do-not-disturb schedule for push notifications, so reminders never arrive at a time that isn''t safe or welcome.', 'later', 480, false),
  ('backup-reminder-nudge', 'Backup reminder nudge', 'A gentle nudge if it''s been a long time since your last data export, so a backup never gets forgotten about entirely.', 'later', 490, false),
  ('duplicate-entries', 'Duplicate appointments & medications', 'A quick way to duplicate an appointment or medication entry as a starting point for a similar new one, instead of re-entering everything from scratch.', 'later', 500, false),
  ('journey-anniversary-view', 'Journey anniversary view', 'A view of your Journey grouped by time of year across every year, so you can see what tends to happen around now, not just a straight timeline.', 'later', 510, false)
on conflict (slug) do nothing;
