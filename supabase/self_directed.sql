-- Self-directed care settings. Run after schema.sql and sync.sql.
--
-- One row per user, keyed on user_id rather than a generated id, because there
-- is only ever one of these per account.
--
-- This is the most sensitive thing Blossom stores. It is its own table, and so
-- its own sync category, specifically so it CAN be excluded - the profile
-- cannot be, by design, since excluding it would strand somebody's settings on
-- one device. Blossom's setup flow adds this category to the excluded list by
-- default, so nothing here leaves the phone unless the person turns syncing on
-- for it deliberately.
--
-- Nothing clinical is stored: no doses, no sources, no interpretation. A
-- status, a start date, and how often somebody asked to be reminded.

create table if not exists public.self_directed_settings (
  id                        uuid primary key references auth.users(id) on delete cascade,
  user_id                   uuid not null references auth.users(id) on delete cascade,
  label                     text,
  prescriber_status         text check (prescriber_status is null or prescriber_status in ('monitored','bloods-only','self','declined')),
  hrt_started_on            date,
  blood_check_interval_days integer check (blood_check_interval_days is null or blood_check_interval_days > 0),
  setup_completed_at        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  client_updated_at         timestamptz not null default now(),
  deleted_at                timestamptz
);

create index if not exists self_directed_settings_user_updated_idx on public.self_directed_settings (user_id, updated_at);
alter table public.self_directed_settings enable row level security;
drop policy if exists "self_directed_settings_owner_all" on public.self_directed_settings;
create policy "self_directed_settings_owner_all" on public.self_directed_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists self_directed_settings_set_updated_at on public.self_directed_settings;
create trigger self_directed_settings_set_updated_at before update on public.self_directed_settings for each row execute function public.set_updated_at();
drop trigger if exists self_directed_settings_sync_guard on public.self_directed_settings;
create trigger self_directed_settings_sync_guard before update on public.self_directed_settings for each row execute function public.keep_newest_blossom_change();
