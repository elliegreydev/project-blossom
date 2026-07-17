-- Sync foundation for Blossom's optional local-first account sync.
-- Run after schema.sql. This migration is idempotent and safe to re-run.

alter table public.profiles
  add column if not exists client_updated_at timestamptz,
  add column if not exists gentle_mode boolean not null default false;

alter table public.milestones
  add column if not exists approximate_date text,
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.journey_events
  add column if not exists category text,
  add column if not exists approximate_date text,
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.medications
  add column if not exists frequency jsonb,
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.medication_logs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.appointments
  add column if not exists client_updated_at timestamptz,
  add column if not exists builder_data jsonb not null default '{}'::jsonb,
  add column if not exists deleted_at timestamptz;

alter table public.check_ins
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.goals
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.aurora_interaction_log
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists client_updated_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.profiles
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.milestones
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.journey_events
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.medications
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.medication_logs
set client_updated_at = coalesce(client_updated_at, updated_at, logged_at);
update public.appointments
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.check_ins
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.goals
set client_updated_at = coalesce(client_updated_at, updated_at, created_at);
update public.aurora_interaction_log
set client_updated_at = coalesce(client_updated_at, updated_at, last_shown_at);

alter table public.profiles alter column client_updated_at set default now();
alter table public.profiles alter column client_updated_at set not null;
alter table public.milestones alter column client_updated_at set default now();
alter table public.milestones alter column client_updated_at set not null;
alter table public.journey_events alter column client_updated_at set default now();
alter table public.journey_events alter column client_updated_at set not null;
alter table public.medications alter column client_updated_at set default now();
alter table public.medications alter column client_updated_at set not null;
alter table public.medication_logs alter column client_updated_at set default now();
alter table public.medication_logs alter column client_updated_at set not null;
alter table public.appointments alter column client_updated_at set default now();
alter table public.appointments alter column client_updated_at set not null;
alter table public.check_ins alter column client_updated_at set default now();
alter table public.check_ins alter column client_updated_at set not null;
alter table public.goals alter column client_updated_at set default now();
alter table public.goals alter column client_updated_at set not null;
alter table public.aurora_interaction_log alter column client_updated_at set default now();
alter table public.aurora_interaction_log alter column client_updated_at set not null;

-- An older offline device must never overwrite a newer change. Returning OLD
-- makes stale writes harmless; the client then pulls the newer server version.
create or replace function public.keep_newest_blossom_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.client_updated_at < old.client_updated_at then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_guard on public.profiles;
create trigger profiles_sync_guard before update on public.profiles
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists milestones_sync_guard on public.milestones;
create trigger milestones_sync_guard before update on public.milestones
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists journey_events_sync_guard on public.journey_events;
create trigger journey_events_sync_guard before update on public.journey_events
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists medications_sync_guard on public.medications;
create trigger medications_sync_guard before update on public.medications
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists medication_logs_sync_guard on public.medication_logs;
create trigger medication_logs_sync_guard before update on public.medication_logs
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists appointments_sync_guard on public.appointments;
create trigger appointments_sync_guard before update on public.appointments
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists check_ins_sync_guard on public.check_ins;
create trigger check_ins_sync_guard before update on public.check_ins
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists goals_sync_guard on public.goals;
create trigger goals_sync_guard before update on public.goals
  for each row execute function public.keep_newest_blossom_change();
drop trigger if exists aurora_interaction_log_sync_guard on public.aurora_interaction_log;
create trigger aurora_interaction_log_sync_guard before update on public.aurora_interaction_log
  for each row execute function public.keep_newest_blossom_change();

drop trigger if exists medication_logs_set_updated_at on public.medication_logs;
create trigger medication_logs_set_updated_at before update on public.medication_logs
  for each row execute function public.set_updated_at();
drop trigger if exists check_ins_set_updated_at on public.check_ins;
create trigger check_ins_set_updated_at before update on public.check_ins
  for each row execute function public.set_updated_at();
drop trigger if exists aurora_interaction_log_set_updated_at on public.aurora_interaction_log;
create trigger aurora_interaction_log_set_updated_at before update on public.aurora_interaction_log
  for each row execute function public.set_updated_at();

create index if not exists milestones_sync_idx
  on public.milestones (user_id, updated_at);
create index if not exists journey_events_sync_idx
  on public.journey_events (user_id, updated_at);
create index if not exists medications_sync_idx
  on public.medications (user_id, updated_at);
create index if not exists medication_logs_sync_idx
  on public.medication_logs (user_id, updated_at);
create index if not exists appointments_sync_idx
  on public.appointments (user_id, updated_at);
create index if not exists check_ins_sync_idx
  on public.check_ins (user_id, updated_at);
create index if not exists goals_sync_idx
  on public.goals (user_id, updated_at);
create index if not exists aurora_interaction_log_sync_idx
  on public.aurora_interaction_log (user_id, updated_at);

-- The client uses a server timestamp as a stable pull boundary. Changes made
-- after this instant are deliberately picked up by the following sync.
create or replace function public.blossom_sync_clock()
returns timestamptz
language sql
stable
security invoker
set search_path = public
as $$
  select statement_timestamp();
$$;

revoke all on function public.blossom_sync_clock() from public;
grant execute on function public.blossom_sync_clock() to authenticated;
