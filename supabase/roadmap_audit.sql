-- One-time correction for the first roadmap seed. It only touches the original
-- untouched wording, so it cannot overwrite a staff member's later edits.

update public.product_roadmap
set title = 'Privacy and your data',
    description = 'Local-first choices, app lock options, accessibility settings and data controls that keep you in charge.',
    stage = 'available',
    sort_order = 20,
    is_recent = false
where slug = 'privacy-controls' and title = 'Privacy controls';

update public.product_roadmap
set title = 'Optional sign-in and sync',
    description = 'Email sign-in and safer cross-device sync for core records, without changing the local-first heart of Blossom.',
    stage = 'available',
    sort_order = 30,
    is_recent = false
where slug = 'account-sync' and title = 'Sign-in and sync';

update public.product_roadmap
set title = 'Aurora guidance',
    description = 'Thoughtful, rule-based guidance that stays gentle and never pretends to be a clinician.',
    stage = 'available',
    sort_order = 40,
    is_recent = false
where slug = 'aurora-guidance' and title = 'A fuller Aurora';

update public.product_roadmap
set title = 'Medication and appointment reminders',
    description = 'Device reminders for schedules you choose, with discreet wording when you want it.',
    stage = 'available',
    sort_order = 50,
    is_recent = false
where slug = 'medication-reminders' and title = 'Medication reminders';

update public.product_roadmap
set title = 'Body and progress tracking',
    description = 'Private body and progress notes, including photos that stay on your device.',
    stage = 'available',
    sort_order = 60,
    is_recent = false
where slug = 'progress-tracking' and title = 'Progress tracking';

update public.product_roadmap
set title = 'Blood tests, voice and presentation',
    description = 'Private, descriptive tools for blood test notes, voice practice, presentation logs and want-to-try ideas.',
    stage = 'available',
    sort_order = 70,
    is_recent = false
where slug = 'deeper-tools' and title = 'Deeper self-guided tools';

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent)
values
  ('wider-tracker-sync', 'Optional sync for more trackers', 'Exploring whether additional private trackers can sync without weakening Blossom''s privacy-first approach.', 'next', 10, false),
  ('background-reminders', 'Closed-app reminder delivery', 'The secure reminder feature is built; the final timed delivery setup is the remaining piece.', 'next', 20, false),
  ('advanced-charts', 'Advanced charts', 'A future option for clearer personal patterns, only if it remains useful and never judgemental.', 'later', 10, false)
on conflict (slug) do nothing;
