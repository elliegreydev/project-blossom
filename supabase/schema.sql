-- ============================================================================
-- Project Blossom - initial schema (v1 scope).
-- Local-first app: this is the OPTIONAL sync store, mirroring the local Dexie
-- schema in src/lib/db.ts. A row only exists here for users who opt into sync.
-- All tables are per-user with strict row-level security - every policy is
-- scoped to auth.uid() so one user can never read or write another's data.
-- Idempotent (create ... if not exists), safe to re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Shared updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ----------------------------------------------------------------------------
-- Profiles - one row per authenticated user, mirrors the local Profile.
-- Also folds in privacy/security settings (app_lock_type, export/deletion
-- requests) rather than a separate 1:1 table, since it's always a 1:1 join.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  display_name              text,
  pronouns                  text,
  region                    text,
  date_format               text,
  hrt_status                text check (hrt_status in ('on', 'considering', 'not_tracking')),
  enabled_modules           text[] not null default array['journey','medication','appointments','journal','goals'],
  aurora_mode               text not null default 'gentle' check (aurora_mode in ('quiet','gentle','supportive','disabled')),
  reminder_privacy          text not null default 'discreet' check (reminder_privacy in ('discreet','detailed')),
  sensitive_modules_locked  boolean not null default false,
  app_lock_type             text check (app_lock_type in ('none','pin','biometric')),
  age_confirmed_at          timestamptz,
  onboarding_completed_at   timestamptz,
  export_requested_at       timestamptz,
  deletion_requested_at     timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row on signup.
create or replace function public.handle_new_blossom_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created_blossom on auth.users;
create trigger on_auth_user_created_blossom
  after insert on auth.users
  for each row execute function public.handle_new_blossom_user();

-- ----------------------------------------------------------------------------
-- Journey: milestones (things that happened) + broader timeline events
-- ----------------------------------------------------------------------------
create table if not exists public.milestones (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  title          text not null,
  template_key   text,
  category       text,
  event_date     date,
  date_precision text not null default 'exact' check (date_precision in ('exact','approximate','none')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists milestones_user_idx on public.milestones (user_id, event_date desc);
alter table public.milestones enable row level security;

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at before update on public.milestones
  for each row execute function public.set_updated_at();

drop policy if exists "milestones_owner_all" on public.milestones;
create policy "milestones_owner_all" on public.milestones
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.journey_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  type           text not null,
  title          text not null,
  event_date     date,
  date_precision text not null default 'exact' check (date_precision in ('exact','approximate','none')),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists journey_events_user_idx on public.journey_events (user_id, event_date desc);
alter table public.journey_events enable row level security;

drop trigger if exists journey_events_set_updated_at on public.journey_events;
create trigger journey_events_set_updated_at before update on public.journey_events
  for each row execute function public.set_updated_at();

drop policy if exists "journey_events_owner_all" on public.journey_events;
create policy "journey_events_owner_all" on public.journey_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Medication: medications, their schedules over time, and dose logs.
-- Old schedules are never overwritten, only superseded (effective_to set).
-- ----------------------------------------------------------------------------
create table if not exists public.medications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  route         text,
  unit          text,
  custom_labels text[] not null default array[]::text[],
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists medications_user_idx on public.medications (user_id);
alter table public.medications enable row level security;

drop trigger if exists medications_set_updated_at on public.medications;
create trigger medications_set_updated_at before update on public.medications
  for each row execute function public.set_updated_at();

drop policy if exists "medications_owner_all" on public.medications;
create policy "medications_owner_all" on public.medications
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.medication_schedules (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  frequency      jsonb not null,
  effective_from date not null default current_date,
  effective_to   date,
  created_at     timestamptz not null default now()
);
create index if not exists medication_schedules_med_idx on public.medication_schedules (medication_id, effective_from desc);
alter table public.medication_schedules enable row level security;

drop policy if exists "medication_schedules_owner_all" on public.medication_schedules;
create policy "medication_schedules_owner_all" on public.medication_schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.medication_logs (
  id             uuid primary key default gen_random_uuid(),
  medication_id  uuid not null references public.medications(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  scheduled_time timestamptz,
  status         text not null check (status in ('taken','skipped','delayed','not_logged')),
  logged_at      timestamptz not null default now(),
  note           text
);
create index if not exists medication_logs_med_idx on public.medication_logs (medication_id, logged_at desc);
alter table public.medication_logs enable row level security;

drop policy if exists "medication_logs_owner_all" on public.medication_logs;
create policy "medication_logs_owner_all" on public.medication_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Appointments
-- ----------------------------------------------------------------------------
create table if not exists public.appointments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  appointment_at    timestamptz not null,
  location          text,
  preparation_note  text,
  outcome_note      text,
  reminder_settings jsonb,
  rescheduled_from  uuid references public.appointments(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists appointments_user_idx on public.appointments (user_id, appointment_at);
alter table public.appointments enable row level security;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

drop policy if exists "appointments_owner_all" on public.appointments;
create policy "appointments_owner_all" on public.appointments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Wellbeing: journal entries + lightweight structured check-ins.
-- body_text / note are expected to hold app-level-encrypted ciphertext for
-- sensitive content, not plaintext - encryption happens client-side.
-- ----------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body_text  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_entries_user_idx on public.journal_entries (user_id, created_at desc);
alter table public.journal_entries enable row level security;

drop trigger if exists journal_entries_set_updated_at on public.journal_entries;
create trigger journal_entries_set_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

drop policy if exists "journal_entries_owner_all" on public.journal_entries;
create policy "journal_entries_owner_all" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.check_ins (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  mood       smallint,
  energy     smallint,
  confidence smallint,
  stress     smallint,
  comfort    smallint,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists check_ins_user_idx on public.check_ins (user_id, created_at desc);
alter table public.check_ins enable row level security;

drop policy if exists "check_ins_owner_all" on public.check_ins;
create policy "check_ins_owner_all" on public.check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Goals - a goal is something intended; completing one can convert it into
-- a milestone (something that happened).
-- ----------------------------------------------------------------------------
create table if not exists public.goals (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  title                    text not null,
  category                 text,
  target                   text,
  status                   text not null default 'active' check (status in ('active','completed','archived')),
  converted_to_milestone_id uuid references public.milestones(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  completed_at             timestamptz
);
create index if not exists goals_user_idx on public.goals (user_id, status);
alter table public.goals enable row level security;

drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

drop policy if exists "goals_owner_all" on public.goals;
create policy "goals_owner_all" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Aurora - minimal rule-engine state only, so she never re-nags after a
-- dismissed suggestion. No conversation content is stored (Aurora is
-- rule-based, not LLM-backed, in v1).
-- ----------------------------------------------------------------------------
create table if not exists public.aurora_interaction_log (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  nudge_key        text not null,
  last_shown_at    timestamptz not null default now(),
  dismissed_count  integer not null default 0,
  unique (user_id, nudge_key)
);
alter table public.aurora_interaction_log enable row level security;

drop policy if exists "aurora_interaction_log_owner_all" on public.aurora_interaction_log;
create policy "aurora_interaction_log_owner_all" on public.aurora_interaction_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Private links - a user's own saved resources (not the curated region list).
-- ----------------------------------------------------------------------------
create table if not exists public.private_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  label      text not null,
  url        text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists private_links_user_idx on public.private_links (user_id);
alter table public.private_links enable row level security;

drop policy if exists "private_links_owner_all" on public.private_links;
create policy "private_links_owner_all" on public.private_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Region resources - curated, admin-maintained, NOT per-user. Public read
-- (anon + authenticated, since crisis resources must be reachable even
-- signed out); writes are service-role only (no insert/update/delete policy
-- for normal users).
-- ----------------------------------------------------------------------------
create table if not exists public.region_resources (
  id               uuid primary key default gen_random_uuid(),
  region           text not null,
  org_name         text not null,
  category         text not null check (category in ('emergency','crisis','peer','legal','housing','general')),
  contact_info     text,
  availability     text,
  last_reviewed_at date not null,
  source_url       text,
  created_at       timestamptz not null default now()
);
create index if not exists region_resources_region_idx on public.region_resources (region, category);
alter table public.region_resources enable row level security;

drop policy if exists "region_resources_public_read" on public.region_resources;
create policy "region_resources_public_read" on public.region_resources
  for select using (true);
