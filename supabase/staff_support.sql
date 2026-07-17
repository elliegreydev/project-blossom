-- Support case system: staff can only see a user's synced account data
-- while a case is explicitly open for that user, and every open case is
-- itself staff-only visible + logged. This does NOT reach journal entries,
-- check-in notes, or any v1.5 module data (blood tests, voice practice,
-- presentation, body/progress) - those are never synced at all, so they
-- never leave the user's device regardless of what staff can see here.

create or replace function public.find_user_by_email(lookup_email text)
returns table(user_id uuid, email text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.email from auth.users u
  where public.is_staff() and u.email = lookup_email;
$$;
revoke all on function public.find_user_by_email(text) from public;
grant execute on function public.find_user_by_email(text) to authenticated;

create table if not exists public.support_cases (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  subject     text not null,
  status      text not null default 'open' check (status in ('open', 'closed')),
  opened_by   uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  closed_at   timestamptz,
  access_expires_at timestamptz not null default (now() + interval '72 hours')
);
alter table public.support_cases
  add column if not exists access_expires_at timestamptz;
update public.support_cases
  set access_expires_at = created_at + interval '72 hours'
  where status = 'open' and access_expires_at is null;
alter table public.support_cases
  alter column access_expires_at set default (now() + interval '72 hours');
create index if not exists support_cases_user_idx on public.support_cases (user_id, status);
alter table public.support_cases enable row level security;

drop policy if exists "support_cases_staff_all" on public.support_cases;
create policy "support_cases_staff_all" on public.support_cases
  for all using (public.is_staff()) with check (public.is_staff());

-- Every time a staff member views an account's data for a case, the client
-- writes a row here - not tamper-proof against a staff member going around
-- the app entirely, but a real audit trail for the normal path.
create table if not exists public.support_case_access_log (
  id             uuid primary key default gen_random_uuid(),
  case_id        uuid not null references public.support_cases(id) on delete cascade,
  staff_user_id  uuid not null references auth.users(id),
  accessed_at    timestamptz not null default now()
);
create index if not exists support_case_access_log_case_idx on public.support_case_access_log (case_id);
alter table public.support_case_access_log enable row level security;

drop policy if exists "support_case_access_log_staff_all" on public.support_case_access_log;
create policy "support_case_access_log_staff_all" on public.support_case_access_log
  for all using (public.is_staff()) with check (public.is_staff());

create or replace function public.has_open_support_case(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1 from public.support_cases
    where user_id = target_user_id
      and status = 'open'
      and access_expires_at > now()
  );
$$;
revoke all on function public.has_open_support_case(uuid) from public;
grant execute on function public.has_open_support_case(uuid) to authenticated;

-- Additional SELECT-only policies, layered on top of each table's existing
-- owner policy - staff never get write access to a user's data this way,
-- and read access only exists while a case for that user is open.
drop policy if exists "profiles_staff_case_read" on public.profiles;
create policy "profiles_staff_case_read" on public.profiles
  for select using (public.has_open_support_case(id));

drop policy if exists "milestones_staff_case_read" on public.milestones;
create policy "milestones_staff_case_read" on public.milestones
  for select using (public.has_open_support_case(user_id));

drop policy if exists "journey_events_staff_case_read" on public.journey_events;
create policy "journey_events_staff_case_read" on public.journey_events
  for select using (public.has_open_support_case(user_id));

drop policy if exists "medications_staff_case_read" on public.medications;
create policy "medications_staff_case_read" on public.medications
  for select using (public.has_open_support_case(user_id));

drop policy if exists "medication_logs_staff_case_read" on public.medication_logs;
create policy "medication_logs_staff_case_read" on public.medication_logs
  for select using (public.has_open_support_case(user_id));

drop policy if exists "appointments_staff_case_read" on public.appointments;
create policy "appointments_staff_case_read" on public.appointments
  for select using (public.has_open_support_case(user_id));

drop policy if exists "check_ins_staff_case_read" on public.check_ins;
create policy "check_ins_staff_case_read" on public.check_ins
  for select using (public.has_open_support_case(user_id));

drop policy if exists "goals_staff_case_read" on public.goals;
create policy "goals_staff_case_read" on public.goals
  for select using (public.has_open_support_case(user_id));

drop policy if exists "aurora_interaction_log_staff_case_read" on public.aurora_interaction_log;
create policy "aurora_interaction_log_staff_case_read" on public.aurora_interaction_log
  for select using (public.has_open_support_case(user_id));
