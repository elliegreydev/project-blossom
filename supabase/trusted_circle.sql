-- Trusted Circle: revocable, per-category sharing with specific people the
-- user picks. Only reaches the categories that already sync (see the
-- Privacy Receipt's SYNCED_CATEGORIES) - journal, blood tests, photos, voice
-- practice etc. never leave the device in the first place, so there's
-- nothing to accidentally over-share here. Run after schema.sql, staff.sql
-- and staff_support.sql. Idempotent and safe to re-run.

create table if not exists public.trusted_circle_grants (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  grantee_email text not null,
  grantee_id    uuid references auth.users(id) on delete cascade,
  categories    text[] not null default '{}'
                check (categories <@ array['profile','journey','medications','appointments','checkins','goals']),
  status        text not null default 'pending' check (status in ('pending','active','revoked','declined')),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz
);
create index if not exists trusted_circle_grants_owner_idx on public.trusted_circle_grants (owner_id);
create index if not exists trusted_circle_grants_grantee_idx on public.trusted_circle_grants (grantee_id);
create index if not exists trusted_circle_grants_email_idx on public.trusted_circle_grants (grantee_email);
alter table public.trusted_circle_grants enable row level security;

-- The owner has full control over grants they created - creating, changing
-- categories, and revoking are all the same "manage my own row" policy.
-- Revocation takes effect immediately: the next query against a shared table
-- re-evaluates has_trusted_circle_access() below and simply stops matching.
drop policy if exists "trusted_circle_grants_owner_all" on public.trusted_circle_grants;
create policy "trusted_circle_grants_owner_all" on public.trusted_circle_grants
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- The grantee can see and leave (delete) a grant once they're attached to
-- it. Before acceptance, grantee_id is still null, so a pending invite is
-- deliberately NOT visible here - see pending_trusted_circle_invites() below,
-- which is the only way to discover a pending invite, so an invite can't be
-- enumerated by anyone except the person it's actually addressed to.
drop policy if exists "trusted_circle_grants_grantee_read" on public.trusted_circle_grants;
create policy "trusted_circle_grants_grantee_read" on public.trusted_circle_grants
  for select using (grantee_id = auth.uid());

drop policy if exists "trusted_circle_grants_grantee_leave" on public.trusted_circle_grants;
create policy "trusted_circle_grants_grantee_leave" on public.trusted_circle_grants
  for delete using (grantee_id = auth.uid());

-- Security-definer since matching "pending invites addressed to me" requires
-- reading auth.users.email for the current session, which RLS on a
-- normal policy can't safely express without this.
create or replace function public.pending_trusted_circle_invites()
returns table(id uuid, owner_id uuid, owner_display_name text, categories text[], created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select g.id, g.owner_id, p.display_name, g.categories, g.created_at
  from public.trusted_circle_grants g
  left join public.profiles p on p.id = g.owner_id
  join auth.users u on u.id = auth.uid()
  where g.status = 'pending' and lower(g.grantee_email) = lower(u.email);
$$;
revoke all on function public.pending_trusted_circle_invites() from public;
grant execute on function public.pending_trusted_circle_invites() to authenticated;

-- Accepting/declining goes through this rather than a direct update, since
-- stamping grantee_id has to come from the verified session, never a
-- client-supplied value.
create or replace function public.respond_trusted_circle_invite(target_id uuid, accept boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated boolean;
begin
  update public.trusted_circle_grants g
  set grantee_id = auth.uid(),
      status = case when accept then 'active' else 'declined' end,
      responded_at = now()
  from auth.users u
  where g.id = target_id
    and g.status = 'pending'
    and u.id = auth.uid()
    and lower(g.grantee_email) = lower(u.email)
  returning true into updated;
  return coalesce(updated, false);
end;
$$;
revoke all on function public.respond_trusted_circle_invite(uuid, boolean) from public;
grant execute on function public.respond_trusted_circle_invite(uuid, boolean) to authenticated;

create or replace function public.has_trusted_circle_access(target_owner_id uuid, target_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trusted_circle_grants
    where owner_id = target_owner_id
      and grantee_id = auth.uid()
      and status = 'active'
      and target_category = any(categories)
  );
$$;
revoke all on function public.has_trusted_circle_access(uuid, text) from public;
grant execute on function public.has_trusted_circle_access(uuid, text) to authenticated;

-- Additional SELECT-only policies, layered on top of each table's existing
-- owner policy - a grantee never gets write access this way, and only for
-- the specific category the owner actually checked. Deliberately scoped to
-- the "headline" tables per category for v1 (not medication_logs, supply
-- tracking, or care_supplies) - a simple read-only view, not full parity
-- with the owner's own app.
drop policy if exists "profiles_circle_read" on public.profiles;
create policy "profiles_circle_read" on public.profiles
  for select using (public.has_trusted_circle_access(id, 'profile'));

drop policy if exists "milestones_circle_read" on public.milestones;
create policy "milestones_circle_read" on public.milestones
  for select using (public.has_trusted_circle_access(user_id, 'journey'));

drop policy if exists "journey_events_circle_read" on public.journey_events;
create policy "journey_events_circle_read" on public.journey_events
  for select using (public.has_trusted_circle_access(user_id, 'journey'));

drop policy if exists "medications_circle_read" on public.medications;
create policy "medications_circle_read" on public.medications
  for select using (public.has_trusted_circle_access(user_id, 'medications'));

drop policy if exists "appointments_circle_read" on public.appointments;
create policy "appointments_circle_read" on public.appointments
  for select using (public.has_trusted_circle_access(user_id, 'appointments'));

drop policy if exists "check_ins_circle_read" on public.check_ins;
create policy "check_ins_circle_read" on public.check_ins
  for select using (public.has_trusted_circle_access(user_id, 'checkins'));

drop policy if exists "goals_circle_read" on public.goals;
create policy "goals_circle_read" on public.goals
  for select using (public.has_trusted_circle_access(user_id, 'goals'));

-- Access log: every time a grantee actually opens a shared category, the
-- client writes a row here - a real trail for the normal path, not
-- tamper-proof against someone going around the app entirely. Visible to
-- the owner only, mirroring support_case_access_log.
create table if not exists public.trusted_circle_access_log (
  id          uuid primary key default gen_random_uuid(),
  grant_id    uuid not null references public.trusted_circle_grants(id) on delete cascade,
  viewer_id   uuid not null references auth.users(id),
  category    text not null,
  accessed_at timestamptz not null default now()
);
create index if not exists trusted_circle_access_log_grant_idx on public.trusted_circle_access_log (grant_id);
alter table public.trusted_circle_access_log enable row level security;

create or replace function public.can_log_trusted_circle_view(target_grant_id uuid, target_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trusted_circle_grants
    where id = target_grant_id
      and grantee_id = auth.uid()
      and status = 'active'
      and target_category = any(categories)
  );
$$;
revoke all on function public.can_log_trusted_circle_view(uuid, text) from public;
grant execute on function public.can_log_trusted_circle_view(uuid, text) to authenticated;

drop policy if exists "trusted_circle_access_log_insert" on public.trusted_circle_access_log;
create policy "trusted_circle_access_log_insert" on public.trusted_circle_access_log
  for insert with check (viewer_id = auth.uid() and public.can_log_trusted_circle_view(grant_id, category));

drop policy if exists "trusted_circle_access_log_owner_read" on public.trusted_circle_access_log;
create policy "trusted_circle_access_log_owner_read" on public.trusted_circle_access_log
  for select using (
    exists (select 1 from public.trusted_circle_grants g where g.id = grant_id and g.owner_id = auth.uid())
  );
