-- Waiting lists and referrals. Run after schema.sql and sync.sql.
--
-- A referral and a dated log of everything that's happened to it. This is
-- somebody's own paperwork for a wait that routinely runs into years, and the
-- thing they can quote when a service says there's no record of them.
--
-- Two shape notes worth knowing before changing anything here.
--
-- referred_on is a DATE, not a timestamptz, and deliberately nullable. A
-- referral happened on a day; storing a moment would mean a British user's
-- summer referral rendering as the day before somewhere else. And plenty of
-- people genuinely don't know when they were referred - that's the reason to
-- chase, so the schema must not demand it.
--
-- Nothing here caches a waiting time. clinic_index_id is a pointer to a public
-- dataset, never a copy of its figures, because a figure copied into a user's
-- row would be frozen at the moment it was written and never corrected.

create table if not exists public.referrals (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  service_name      text not null check (char_length(trim(service_name)) > 0),
  kind              text not null check (kind in ('gender-clinic','voice','surgery','hair-removal','fertility','mental-health','other')),
  referred_on       date,
  referred_by       text,
  reference_number  text,
  status            text not null check (status in ('waiting','booked','seen','discharged','withdrawn','lost')),
  chase_every_days  integer check (chase_every_days is null or chase_every_days > 0),
  last_chased_on    date,
  clinic_index_id   integer,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists referrals_user_updated_idx on public.referrals (user_id, updated_at);
alter table public.referrals enable row level security;
drop policy if exists "referrals_owner_all" on public.referrals;
create policy "referrals_owner_all" on public.referrals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists referrals_set_updated_at on public.referrals;
create trigger referrals_set_updated_at before update on public.referrals for each row execute function public.set_updated_at();
drop trigger if exists referrals_sync_guard on public.referrals;
create trigger referrals_sync_guard before update on public.referrals for each row execute function public.keep_newest_blossom_change();

create table if not exists public.referral_updates (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  -- No FK to referrals. Sync pushes rows in dependency order, but an outbox
  -- can retry out of order after a failure, and a referral arriving second
  -- must not reject the update that came first. Orphans are cleaned up by
  -- deleteReferral() on the client, which queues a delete per child.
  referral_id       uuid not null,
  happened_on       date not null,
  kind              text not null check (kind in ('chased','heard-back','position','note')),
  contact_method    text check (contact_method is null or contact_method in ('phone','email','letter','portal','in-person')),
  spoke_to          text,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists referral_updates_user_updated_idx on public.referral_updates (user_id, updated_at);
create index if not exists referral_updates_referral_idx on public.referral_updates (referral_id, happened_on desc);
alter table public.referral_updates enable row level security;
drop policy if exists "referral_updates_owner_all" on public.referral_updates;
create policy "referral_updates_owner_all" on public.referral_updates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists referral_updates_set_updated_at on public.referral_updates;
create trigger referral_updates_set_updated_at before update on public.referral_updates for each row execute function public.set_updated_at();
drop trigger if exists referral_updates_sync_guard on public.referral_updates;
create trigger referral_updates_sync_guard before update on public.referral_updates for each row execute function public.keep_newest_blossom_change();
