-- Staff onboarding checklist progress. Any staff member can see everyone's
-- row (light accountability - an admin can see who's completed onboarding),
-- but each person can only write their own.

create table if not exists public.staff_onboarding_progress (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  done_steps   text[] not null default '{}',
  updated_at   timestamptz not null default now()
);

alter table public.staff_onboarding_progress enable row level security;

drop policy if exists "staff_onboarding_progress_staff_read" on public.staff_onboarding_progress;
create policy "staff_onboarding_progress_staff_read" on public.staff_onboarding_progress
  for select using (public.is_staff());

drop policy if exists "staff_onboarding_progress_own_write" on public.staff_onboarding_progress;
create policy "staff_onboarding_progress_own_write" on public.staff_onboarding_progress
  for insert with check (public.is_staff() and auth.uid() = user_id);

drop policy if exists "staff_onboarding_progress_own_update" on public.staff_onboarding_progress;
create policy "staff_onboarding_progress_own_update" on public.staff_onboarding_progress
  for update using (public.is_staff() and auth.uid() = user_id) with check (public.is_staff() and auth.uid() = user_id);
