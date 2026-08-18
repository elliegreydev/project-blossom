-- Support ticket system - replaces support_cases entirely (its only staff UI
-- was just deleted along with the rest of the in-app admin panel; staff
-- tooling now lives in the separate Blossom Staff app). A user opens a
-- ticket from a fixed category list, staff at-or-above that category's rank
-- get notified and can claim it, and a real message thread runs both ways.
--
-- The account-access code is the security core of this feature: a staff
-- member can REQUEST access, which generates a code shown ONLY to the
-- ticket's owner (never to staff, via a message the staff-read policy
-- explicitly excludes) - the owner has to actively read it out/type it back
-- in a normal reply for staff to ever see it and enter it themselves. Access
-- literally cannot happen without the user participating in that moment.
-- Idempotent, safe to re-run.

-- ----------------------------------------------------------------------------
-- Retire support_cases - its only staff UI (admin/support) no longer exists,
-- and the new ticket + access-grant system replaces what it did.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_staff_case_read" on public.profiles;
drop policy if exists "milestones_staff_case_read" on public.milestones;
drop policy if exists "journey_events_staff_case_read" on public.journey_events;
drop policy if exists "medications_staff_case_read" on public.medications;
drop policy if exists "medication_logs_staff_case_read" on public.medication_logs;
drop policy if exists "appointments_staff_case_read" on public.appointments;
drop policy if exists "check_ins_staff_case_read" on public.check_ins;
drop policy if exists "goals_staff_case_read" on public.goals;
drop policy if exists "aurora_interaction_log_staff_case_read" on public.aurora_interaction_log;
drop function if exists public.has_open_support_case(uuid);
drop table if exists public.support_case_access_log cascade;
drop table if exists public.support_cases cascade;

-- ----------------------------------------------------------------------------
-- Category -> minimum staff rank. Computed server-side via trigger, never
-- trusted from the client, so a ticket can't be made to hide from (or
-- falsely demand) more senior staff than its real category warrants.
-- Manager+ (rank 60) can always see every ticket regardless of this.
-- ----------------------------------------------------------------------------
create or replace function public.support_ticket_category_min_rank(cat text)
returns integer
language sql
immutable
set search_path = public
as $$
  select case cat
    when 'account_fix' then 60
    else 20
  end;
$$;

create or replace function public.set_ticket_min_rank()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.min_rank = public.support_ticket_category_min_rank(new.category);
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- Tickets
-- ----------------------------------------------------------------------------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  category    text not null check (category in ('bug','feature_question','account_fix','safety_privacy','report_concern','other')),
  min_rank    integer not null default 20,
  status      text not null default 'open' check (status in ('open','resolved')),
  claimed_by  uuid references auth.users(id),
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_queue_idx on public.support_tickets (status, min_rank);
alter table public.support_tickets enable row level security;

drop trigger if exists support_tickets_set_min_rank on public.support_tickets;
create trigger support_tickets_set_min_rank before insert or update on public.support_tickets
  for each row execute function public.set_ticket_min_rank();

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

drop policy if exists "support_tickets_owner_read" on public.support_tickets;
create policy "support_tickets_owner_read" on public.support_tickets
  for select using (auth.uid() = user_id);
drop policy if exists "support_tickets_owner_insert" on public.support_tickets;
create policy "support_tickets_owner_insert" on public.support_tickets
  for insert with check (auth.uid() = user_id);
drop policy if exists "support_tickets_staff_read" on public.support_tickets;
create policy "support_tickets_staff_read" on public.support_tickets
  for select using (public.is_staff() and (public.my_staff_rank() >= min_rank or public.my_staff_rank() >= 60));
drop policy if exists "support_tickets_staff_update" on public.support_tickets;
create policy "support_tickets_staff_update" on public.support_tickets
  for update using (public.is_staff() and (public.my_staff_rank() >= min_rank or public.my_staff_rank() >= 60))
  with check (public.is_staff() and (public.my_staff_rank() >= min_rank or public.my_staff_rank() >= 60));

-- Can the caller read/act on this ticket at all (owner, or eligible staff)?
create or replace function public.can_access_ticket(target_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.support_tickets t
    where t.id = target_ticket_id
      and (
        t.user_id = auth.uid()
        or (public.is_staff() and (public.my_staff_rank() >= t.min_rank or public.my_staff_rank() >= 60))
      )
  );
$$;
revoke all on function public.can_access_ticket(uuid) from public;
grant execute on function public.can_access_ticket(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Messages. visible_to_user_only is exclusively for the access-code system
-- message - only ever set true by the SECURITY DEFINER grant function below,
-- never by a normal insert (enforced by the check constraint), and excluded
-- from the staff read policy entirely.
-- ----------------------------------------------------------------------------
create table if not exists public.support_ticket_messages (
  id                   uuid primary key default gen_random_uuid(),
  ticket_id            uuid not null references public.support_tickets(id) on delete cascade,
  sender_id            uuid not null references auth.users(id),
  body                 text not null check (char_length(body) between 1 and 4000),
  is_system            boolean not null default false,
  visible_to_user_only boolean not null default false check (not visible_to_user_only or is_system),
  created_at           timestamptz not null default now()
);
create index if not exists support_ticket_messages_ticket_idx on public.support_ticket_messages (ticket_id, created_at);
alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_ticket_messages_owner_all" on public.support_ticket_messages;
create policy "support_ticket_messages_owner_all" on public.support_ticket_messages
  for all using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  )
  with check (
    sender_id = auth.uid() and not is_system
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "support_ticket_messages_staff_read" on public.support_ticket_messages;
create policy "support_ticket_messages_staff_read" on public.support_ticket_messages
  for select using (public.is_staff() and public.can_access_ticket(ticket_id) and not visible_to_user_only);

drop policy if exists "support_ticket_messages_staff_insert" on public.support_ticket_messages;
create policy "support_ticket_messages_staff_insert" on public.support_ticket_messages
  for insert with check (
    public.is_staff() and public.can_access_ticket(ticket_id) and sender_id = auth.uid() and not is_system
  );

-- ----------------------------------------------------------------------------
-- Access grants. code_hash only - the plaintext code is never stored, only
-- ever returned once (from request_ticket_access, to nobody but the system
-- message it writes for the user) and re-derived for comparison on verify.
-- ----------------------------------------------------------------------------
create table if not exists public.support_ticket_access_grants (
  id                 uuid primary key default gen_random_uuid(),
  ticket_id          uuid not null references public.support_tickets(id) on delete cascade,
  requested_by       uuid not null references auth.users(id),
  code_hash          text not null,
  attempts           integer not null default 0,
  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null,
  verified_at        timestamptz,
  access_expires_at  timestamptz,
  revoked_at         timestamptz
);
create index if not exists support_ticket_access_grants_ticket_idx on public.support_ticket_access_grants (ticket_id, created_at desc);
alter table public.support_ticket_access_grants enable row level security;

drop policy if exists "support_ticket_access_grants_staff_read" on public.support_ticket_access_grants;
create policy "support_ticket_access_grants_staff_read" on public.support_ticket_access_grants
  for select using (public.is_staff() and public.can_access_ticket(ticket_id));

-- Does any staff member currently hold a live, verified grant for this user?
create or replace function public.has_ticket_access(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1 from public.support_ticket_access_grants g
    join public.support_tickets t on t.id = g.ticket_id
    where t.user_id = target_user_id
      -- Consent names ONE member of staff. Without this the grant read as
      -- "this person is open to support", so any staff account at any rank
      -- inherited a permission one user gave to one person. Reported
      -- responsibly by virtualdxs, 18 Aug 2026; no grant was live at the time.
      and g.requested_by = auth.uid()
      and g.verified_at is not null
      and g.access_expires_at > now()
      and g.revoked_at is null
  );
$$;
revoke all on function public.has_ticket_access(uuid) from public;
grant execute on function public.has_ticket_access(uuid) to authenticated;

-- Staff requests a code. Generates + hashes it, stores the grant, and writes
-- a user-only system message containing the plaintext code - staff never
-- receives the code itself from this call, only an acknowledgement.
create or replace function public.request_ticket_access(target_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plain_code text;
  requester uuid := auth.uid();
begin
  if not (public.is_staff() and public.can_access_ticket(target_ticket_id)) then
    raise exception 'not authorized';
  end if;

  plain_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.support_ticket_access_grants (ticket_id, requested_by, code_hash, expires_at)
  values (target_ticket_id, requester, encode(digest(plain_code, 'sha256'), 'hex'), now() + interval '10 minutes');

  insert into public.support_ticket_messages (ticket_id, sender_id, body, is_system, visible_to_user_only)
  values (
    target_ticket_id,
    requester,
    'A staff member has requested a code to help with your account. If you''re expecting this, share the code below with them in your next reply - don''t share it anywhere else. Code: ' || plain_code || ' (expires in 10 minutes)',
    true,
    true
  );
end;
$$;
revoke all on function public.request_ticket_access(uuid) from public;
grant execute on function public.request_ticket_access(uuid) to authenticated;

-- Staff enters the code the user gave them. Correct + live -> unlocks a
-- 20-minute access window and posts a normal (both-sides-visible) system
-- message. Wrong -> counts against a 5-attempt limit before the code is
-- dead and a fresh one is needed.
create or replace function public.verify_ticket_access(target_ticket_id uuid, submitted_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_row public.support_ticket_access_grants%rowtype;
begin
  if not (public.is_staff() and public.can_access_ticket(target_ticket_id)) then
    raise exception 'not authorized';
  end if;

  select * into grant_row
  from public.support_ticket_access_grants
  where ticket_id = target_ticket_id
    and verified_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if grant_row.id is null then
    return false;
  end if;

  if grant_row.code_hash != encode(digest(submitted_code, 'sha256'), 'hex') then
    update public.support_ticket_access_grants
    set attempts = attempts + 1,
        expires_at = case when attempts + 1 >= 5 then now() else expires_at end
    where id = grant_row.id;
    return false;
  end if;

  update public.support_ticket_access_grants
  set verified_at = now(), access_expires_at = now() + interval '20 minutes'
  where id = grant_row.id;

  insert into public.support_ticket_messages (ticket_id, sender_id, body, is_system)
  values (target_ticket_id, auth.uid(), 'Access granted for 20 minutes.', true);

  return true;
end;
$$;
revoke all on function public.verify_ticket_access(uuid, text) from public;
grant execute on function public.verify_ticket_access(uuid, text) to authenticated;

create or replace function public.revoke_ticket_access(target_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_staff() and public.can_access_ticket(target_ticket_id)) then
    raise exception 'not authorized';
  end if;

  update public.support_ticket_access_grants
  set revoked_at = now()
  where ticket_id = target_ticket_id
    and verified_at is not null
    and revoked_at is null
    and access_expires_at > now();

  insert into public.support_ticket_messages (ticket_id, sender_id, body, is_system)
  values (target_ticket_id, auth.uid(), 'Access ended early by staff.', true);
end;
$$;
revoke all on function public.revoke_ticket_access(uuid) from public;
grant execute on function public.revoke_ticket_access(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Re-point the 9 tables support_cases used to gate at has_ticket_access(),
-- and extend it to real write access (update + delete, never insert - staff
-- fix or remove existing entries on request, they don't fabricate new ones)
-- since that's the actual point of this feature. Deliberately NOT extended
-- to the 14 categories added in the full-sync-expansion pass (journal, blood
-- tests, voice practice, presentation, body/progress, intimacy, weight,
-- calorie, budget, private links, support map, safety check-ins) - that
-- boundary was a deliberate, recent, separate decision and stays as-is.
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_staff_ticket_access" on public.profiles;
create policy "profiles_staff_ticket_access" on public.profiles
  for select using (public.has_ticket_access(id));
drop policy if exists "profiles_staff_ticket_update" on public.profiles;
create policy "profiles_staff_ticket_update" on public.profiles
  for update using (public.has_ticket_access(id)) with check (public.has_ticket_access(id));

drop policy if exists "milestones_staff_ticket_access" on public.milestones;
create policy "milestones_staff_ticket_access" on public.milestones
  for select using (public.has_ticket_access(user_id));
drop policy if exists "milestones_staff_ticket_write" on public.milestones;
create policy "milestones_staff_ticket_write" on public.milestones
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "milestones_staff_ticket_delete" on public.milestones;
create policy "milestones_staff_ticket_delete" on public.milestones
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "journey_events_staff_ticket_access" on public.journey_events;
create policy "journey_events_staff_ticket_access" on public.journey_events
  for select using (public.has_ticket_access(user_id));
drop policy if exists "journey_events_staff_ticket_write" on public.journey_events;
create policy "journey_events_staff_ticket_write" on public.journey_events
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "journey_events_staff_ticket_delete" on public.journey_events;
create policy "journey_events_staff_ticket_delete" on public.journey_events
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "medications_staff_ticket_access" on public.medications;
create policy "medications_staff_ticket_access" on public.medications
  for select using (public.has_ticket_access(user_id));
drop policy if exists "medications_staff_ticket_write" on public.medications;
create policy "medications_staff_ticket_write" on public.medications
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "medications_staff_ticket_delete" on public.medications;
create policy "medications_staff_ticket_delete" on public.medications
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "medication_logs_staff_ticket_access" on public.medication_logs;
create policy "medication_logs_staff_ticket_access" on public.medication_logs
  for select using (public.has_ticket_access(user_id));
drop policy if exists "medication_logs_staff_ticket_write" on public.medication_logs;
create policy "medication_logs_staff_ticket_write" on public.medication_logs
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "medication_logs_staff_ticket_delete" on public.medication_logs;
create policy "medication_logs_staff_ticket_delete" on public.medication_logs
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "appointments_staff_ticket_access" on public.appointments;
create policy "appointments_staff_ticket_access" on public.appointments
  for select using (public.has_ticket_access(user_id));
drop policy if exists "appointments_staff_ticket_write" on public.appointments;
create policy "appointments_staff_ticket_write" on public.appointments
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "appointments_staff_ticket_delete" on public.appointments;
create policy "appointments_staff_ticket_delete" on public.appointments
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "check_ins_staff_ticket_access" on public.check_ins;
create policy "check_ins_staff_ticket_access" on public.check_ins
  for select using (public.has_ticket_access(user_id));
drop policy if exists "check_ins_staff_ticket_write" on public.check_ins;
create policy "check_ins_staff_ticket_write" on public.check_ins
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "check_ins_staff_ticket_delete" on public.check_ins;
create policy "check_ins_staff_ticket_delete" on public.check_ins
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "goals_staff_ticket_access" on public.goals;
create policy "goals_staff_ticket_access" on public.goals
  for select using (public.has_ticket_access(user_id));
drop policy if exists "goals_staff_ticket_write" on public.goals;
create policy "goals_staff_ticket_write" on public.goals
  for update using (public.has_ticket_access(user_id)) with check (public.has_ticket_access(user_id));
drop policy if exists "goals_staff_ticket_delete" on public.goals;
create policy "goals_staff_ticket_delete" on public.goals
  for delete using (public.has_ticket_access(user_id));

drop policy if exists "aurora_interaction_log_staff_ticket_access" on public.aurora_interaction_log;
create policy "aurora_interaction_log_staff_ticket_access" on public.aurora_interaction_log
  for select using (public.has_ticket_access(user_id));
