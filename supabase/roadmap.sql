-- Product roadmap: deliberately limited to product updates. This stores no
-- member data and exposes only active, plain-language roadmap entries.

create table if not exists public.product_roadmap (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 320),
  stage text not null default 'next' check (stage in ('available', 'next', 'later')),
  status text not null default 'active' check (status in ('active', 'hidden')),
  sort_order integer not null default 100 check (sort_order >= 0),
  is_recent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_roadmap enable row level security;

grant select on public.product_roadmap to anon, authenticated;
grant insert, update, delete on public.product_roadmap to authenticated;

drop policy if exists "product_roadmap_active_read" on public.product_roadmap;
create policy "product_roadmap_active_read" on public.product_roadmap
  for select using (status = 'active');

drop policy if exists "product_roadmap_staff_all" on public.product_roadmap;
create policy "product_roadmap_staff_all" on public.product_roadmap
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop trigger if exists product_roadmap_set_updated_at on public.product_roadmap;
create trigger product_roadmap_set_updated_at before update on public.product_roadmap
  for each row execute function public.set_updated_at();

insert into public.product_roadmap (slug, title, description, stage, sort_order, is_recent)
values
  ('journey-and-tracking', 'Journey, tracking and calendar', 'A calm place for milestones, medication, journal notes, goals and appointments.', 'available', 10, true),
  ('privacy-controls', 'Privacy and your data', 'Local-first choices, app lock options, accessibility settings and data controls that keep you in charge.', 'available', 20, false),
  ('account-sync', 'Optional sign-in and sync', 'Email sign-in and safer cross-device sync for core records, without changing the local-first heart of Blossom.', 'available', 30, false),
  ('aurora-guidance', 'Aurora guidance', 'Thoughtful, rule-based guidance that stays gentle and never pretends to be a clinician.', 'available', 40, false),
  ('medication-reminders', 'Medication and appointment reminders', 'Device reminders for schedules you choose, with discreet wording when you want it.', 'available', 50, false),
  ('progress-tracking', 'Body and progress tracking', 'Private body and progress notes, including photos that stay on your device.', 'available', 60, false),
  ('deeper-tools', 'Blood tests, voice and presentation', 'Private, descriptive tools for blood test notes, voice practice, presentation logs and want-to-try ideas.', 'available', 70, false),
  ('wider-tracker-sync', 'Optional sync for more trackers', 'Exploring whether additional private trackers can sync without weakening Blossom''s privacy-first approach.', 'next', 10, false),
  ('background-reminders', 'Closed-app reminder delivery', 'The secure reminder feature is built; the final timed delivery setup is the remaining piece.', 'next', 20, false),
  ('advanced-charts', 'Advanced charts', 'A future option for clearer personal patterns, only if it remains useful and never judgemental.', 'later', 10, false),
  ('calendar-sync', 'Calendar sync', 'A future option to connect appointments where that feels useful and safe.', 'later', 20, false)
on conflict (slug) do nothing;
