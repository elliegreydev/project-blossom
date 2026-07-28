-- Brings every remaining local-only data category into account sync (text/data
-- only - photos and the voice recording Blob never sync, by design, and are
-- not represented in any table below). Run after schema.sql + sync.sql.
-- Idempotent, safe to re-run.
--
-- Deliberately NOT given a support-case staff-read policy, unlike the tables
-- covered by admin_operations.sql / the support-case system - these stay
-- invisible to staff until the assisted-editing feature gets its own design
-- pass. Owner-only RLS, same as everywhere else in this file.

-- ----------------------------------------------------------------------------
-- Wire up the two tables that already existed but were never part of sync.
-- ----------------------------------------------------------------------------
alter table public.journal_entries
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;
update public.journal_entries
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
alter table public.journal_entries alter column client_updated_at set default now();
alter table public.journal_entries alter column client_updated_at set not null;

alter table public.private_links
  add column if not exists updated_at timestamptz,
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;
update public.private_links
set updated_at = coalesce(updated_at, created_at),
    client_updated_at = coalesce(client_updated_at, created_at);
alter table public.private_links alter column updated_at set default now();
alter table public.private_links alter column updated_at set not null;
alter table public.private_links alter column client_updated_at set default now();
alter table public.private_links alter column client_updated_at set not null;

drop trigger if exists journal_entries_sync_guard on public.journal_entries;
create trigger journal_entries_sync_guard before update on public.journal_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists journal_entries_sync_idx on public.journal_entries (user_id, updated_at);

drop trigger if exists private_links_set_updated_at on public.private_links;
create trigger private_links_set_updated_at before update on public.private_links
  for each row execute function public.set_updated_at();
drop trigger if exists private_links_sync_guard on public.private_links;
create trigger private_links_sync_guard before update on public.private_links
  for each row execute function public.keep_newest_blossom_change();
create index if not exists private_links_sync_idx on public.private_links (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Blood test entries
-- ----------------------------------------------------------------------------
create table if not exists public.blood_test_entries (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  test_name            text not null,
  date                 date not null,
  value                text not null,
  unit                 text,
  lab_source           text,
  reference_range_raw  text,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  client_updated_at    timestamptz not null default now(),
  deleted_at           timestamptz
);
alter table public.blood_test_entries enable row level security;
drop policy if exists "blood_test_entries_owner_all" on public.blood_test_entries;
create policy "blood_test_entries_owner_all" on public.blood_test_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists blood_test_entries_set_updated_at on public.blood_test_entries;
create trigger blood_test_entries_set_updated_at before update on public.blood_test_entries
  for each row execute function public.set_updated_at();
drop trigger if exists blood_test_entries_sync_guard on public.blood_test_entries;
create trigger blood_test_entries_sync_guard before update on public.blood_test_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists blood_test_entries_sync_idx on public.blood_test_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Voice practice - goals + session metadata. The recording Blob and any
-- future audio storage are NEVER represented here.
-- ----------------------------------------------------------------------------
create table if not exists public.voice_practice_goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  title             text not null,
  category          text not null,
  target_frequency  text,
  target_duration   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.voice_practice_goals enable row level security;
drop policy if exists "voice_practice_goals_owner_all" on public.voice_practice_goals;
create policy "voice_practice_goals_owner_all" on public.voice_practice_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists voice_practice_goals_set_updated_at on public.voice_practice_goals;
create trigger voice_practice_goals_set_updated_at before update on public.voice_practice_goals
  for each row execute function public.set_updated_at();
drop trigger if exists voice_practice_goals_sync_guard on public.voice_practice_goals;
create trigger voice_practice_goals_sync_guard before update on public.voice_practice_goals
  for each row execute function public.keep_newest_blossom_change();
create index if not exists voice_practice_goals_sync_idx on public.voice_practice_goals (user_id, updated_at);

create table if not exists public.voice_practice_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  goal_id           uuid references public.voice_practice_goals(id) on delete cascade,
  session_duration  text,
  comfort_rating    smallint,
  note              text,
  pitch_low_hz      numeric,
  pitch_high_hz     numeric,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.voice_practice_sessions enable row level security;
drop policy if exists "voice_practice_sessions_owner_all" on public.voice_practice_sessions;
create policy "voice_practice_sessions_owner_all" on public.voice_practice_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists voice_practice_sessions_set_updated_at on public.voice_practice_sessions;
create trigger voice_practice_sessions_set_updated_at before update on public.voice_practice_sessions
  for each row execute function public.set_updated_at();
drop trigger if exists voice_practice_sessions_sync_guard on public.voice_practice_sessions;
create trigger voice_practice_sessions_sync_guard before update on public.voice_practice_sessions
  for each row execute function public.keep_newest_blossom_change();
create index if not exists voice_practice_sessions_sync_idx on public.voice_practice_sessions (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Presentation tracking - the photo Blob is never represented here.
-- ----------------------------------------------------------------------------
create table if not exists public.presentation_entries (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  date                date not null,
  category            text not null,
  note                text,
  confidence_rating   smallint,
  want_to_try         boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  client_updated_at   timestamptz not null default now(),
  deleted_at          timestamptz
);
alter table public.presentation_entries enable row level security;
drop policy if exists "presentation_entries_owner_all" on public.presentation_entries;
create policy "presentation_entries_owner_all" on public.presentation_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists presentation_entries_set_updated_at on public.presentation_entries;
create trigger presentation_entries_set_updated_at before update on public.presentation_entries
  for each row execute function public.set_updated_at();
drop trigger if exists presentation_entries_sync_guard on public.presentation_entries;
create trigger presentation_entries_sync_guard before update on public.presentation_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists presentation_entries_sync_idx on public.presentation_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Body & progress tracking - the photo Blob is never represented here.
-- ----------------------------------------------------------------------------
create table if not exists public.body_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  measurements      jsonb not null default '[]'::jsonb,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.body_entries enable row level security;
drop policy if exists "body_entries_owner_all" on public.body_entries;
create policy "body_entries_owner_all" on public.body_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists body_entries_set_updated_at on public.body_entries;
create trigger body_entries_set_updated_at before update on public.body_entries
  for each row execute function public.set_updated_at();
drop trigger if exists body_entries_sync_guard on public.body_entries;
create trigger body_entries_sync_guard before update on public.body_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists body_entries_sync_idx on public.body_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Intimacy & wellbeing log
-- ----------------------------------------------------------------------------
create table if not exists public.intimacy_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  time              text,
  date_precision    text not null default 'exact',
  label             text,
  tags              text[] not null default array[]::text[],
  protection_note   text,
  feeling           text,
  aftercare_note    text,
  private_note      text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.intimacy_entries enable row level security;
drop policy if exists "intimacy_entries_owner_all" on public.intimacy_entries;
create policy "intimacy_entries_owner_all" on public.intimacy_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists intimacy_entries_set_updated_at on public.intimacy_entries;
create trigger intimacy_entries_set_updated_at before update on public.intimacy_entries
  for each row execute function public.set_updated_at();
drop trigger if exists intimacy_entries_sync_guard on public.intimacy_entries;
create trigger intimacy_entries_sync_guard before update on public.intimacy_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists intimacy_entries_sync_idx on public.intimacy_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Weight + calorie entries
-- ----------------------------------------------------------------------------
create table if not exists public.weight_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  weight_grams      integer not null,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.weight_entries enable row level security;
drop policy if exists "weight_entries_owner_all" on public.weight_entries;
create policy "weight_entries_owner_all" on public.weight_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists weight_entries_set_updated_at on public.weight_entries;
create trigger weight_entries_set_updated_at before update on public.weight_entries
  for each row execute function public.set_updated_at();
drop trigger if exists weight_entries_sync_guard on public.weight_entries;
create trigger weight_entries_sync_guard before update on public.weight_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists weight_entries_sync_idx on public.weight_entries (user_id, updated_at);

create table if not exists public.calorie_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  label             text not null,
  calories          integer not null,
  meal              text,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.calorie_entries enable row level security;
drop policy if exists "calorie_entries_owner_all" on public.calorie_entries;
create policy "calorie_entries_owner_all" on public.calorie_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists calorie_entries_set_updated_at on public.calorie_entries;
create trigger calorie_entries_set_updated_at before update on public.calorie_entries
  for each row execute function public.set_updated_at();
drop trigger if exists calorie_entries_sync_guard on public.calorie_entries;
create trigger calorie_entries_sync_guard before update on public.calorie_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists calorie_entries_sync_idx on public.calorie_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Transition cost & budget tracker
-- ----------------------------------------------------------------------------
create table if not exists public.budget_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  category          text not null,
  description       text,
  amount            numeric not null,
  date              date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.budget_entries enable row level security;
drop policy if exists "budget_entries_owner_all" on public.budget_entries;
create policy "budget_entries_owner_all" on public.budget_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists budget_entries_set_updated_at on public.budget_entries;
create trigger budget_entries_set_updated_at before update on public.budget_entries
  for each row execute function public.set_updated_at();
drop trigger if exists budget_entries_sync_guard on public.budget_entries;
create trigger budget_entries_sync_guard before update on public.budget_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists budget_entries_sync_idx on public.budget_entries (user_id, updated_at);

create table if not exists public.budget_goals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  label             text not null,
  target_amount     numeric not null,
  saved_amount      numeric not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.budget_goals enable row level security;
drop policy if exists "budget_goals_owner_all" on public.budget_goals;
create policy "budget_goals_owner_all" on public.budget_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists budget_goals_set_updated_at on public.budget_goals;
create trigger budget_goals_set_updated_at before update on public.budget_goals
  for each row execute function public.set_updated_at();
drop trigger if exists budget_goals_sync_guard on public.budget_goals;
create trigger budget_goals_sync_guard before update on public.budget_goals
  for each row execute function public.keep_newest_blossom_change();
create index if not exists budget_goals_sync_idx on public.budget_goals (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Personal support map - private contacts/locations. Syncing this now per
-- Ellie's explicit call (26-28 Jul 2026 planning) despite the original
-- design comment that argued against it; kept staff-invisible regardless.
-- ----------------------------------------------------------------------------
create table if not exists public.support_map_entries (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  type              text not null,
  labels            text[] not null default array[]::text[],
  contact           text,
  area              text,
  note              text,
  review_on         date,
  is_favourite      boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.support_map_entries enable row level security;
drop policy if exists "support_map_entries_owner_all" on public.support_map_entries;
create policy "support_map_entries_owner_all" on public.support_map_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists support_map_entries_set_updated_at on public.support_map_entries;
create trigger support_map_entries_set_updated_at before update on public.support_map_entries
  for each row execute function public.set_updated_at();
drop trigger if exists support_map_entries_sync_guard on public.support_map_entries;
create trigger support_map_entries_sync_guard before update on public.support_map_entries
  for each row execute function public.keep_newest_blossom_change();
create index if not exists support_map_entries_sync_idx on public.support_map_entries (user_id, updated_at);

-- ----------------------------------------------------------------------------
-- Safety check-ins
-- ----------------------------------------------------------------------------
create table if not exists public.safety_check_ins (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  started_at        timestamptz not null default now(),
  due_at            timestamptz not null,
  status            text not null default 'pending' check (status in ('pending','completed')),
  snoozed_once      boolean not null default false,
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);
alter table public.safety_check_ins enable row level security;
drop policy if exists "safety_check_ins_owner_all" on public.safety_check_ins;
create policy "safety_check_ins_owner_all" on public.safety_check_ins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists safety_check_ins_set_updated_at on public.safety_check_ins;
create trigger safety_check_ins_set_updated_at before update on public.safety_check_ins
  for each row execute function public.set_updated_at();
drop trigger if exists safety_check_ins_sync_guard on public.safety_check_ins;
create trigger safety_check_ins_sync_guard before update on public.safety_check_ins
  for each row execute function public.keep_newest_blossom_change();
create index if not exists safety_check_ins_sync_idx on public.safety_check_ins (user_id, updated_at);
