-- Beta program: single-use invite codes (redemption is tracked per-code so
-- a leaked code traces back to exactly one person), a beta_tester flag on
-- profiles, and a small shared chat room for the beta cohort. Run after
-- schema.sql, staff.sql and staff_support.sql. Idempotent and safe to re-run.

alter table public.profiles
  add column if not exists beta_tester boolean not null default false;

create table if not exists public.beta_invite_codes (
  code         text primary key,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  redeemed_by  uuid references auth.users(id),
  redeemed_at  timestamptz
);
alter table public.beta_invite_codes enable row level security;

drop policy if exists "beta_invite_codes_staff_all" on public.beta_invite_codes;
create policy "beta_invite_codes_staff_all" on public.beta_invite_codes
  for all using (public.is_staff()) with check (public.is_staff());
-- Deliberately no policy for ordinary users - a code is only ever redeemed
-- through redeem_beta_code() below, never read or written directly, so an
-- unredeemed code can't be listed or guessed by querying the table.

-- Atomically claims a single-use code for the calling user. Returns true on
-- success, false otherwise - never distinguishes "no such code" from
-- "already redeemed", so a guesser can't tell a used code from a made-up one.
create or replace function public.redeem_beta_code(input_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean;
begin
  update public.beta_invite_codes
  set redeemed_by = auth.uid(), redeemed_at = now()
  where code = input_code and redeemed_by is null
  returning true into claimed;

  if claimed then
    update public.profiles set beta_tester = true where id = auth.uid();
  end if;

  return coalesce(claimed, false);
end;
$$;
revoke all on function public.redeem_beta_code(text) from public;
grant execute on function public.redeem_beta_code(text) to authenticated;

-- Staff-only roster read: pairs each code with the redeemer's email, which
-- otherwise lives in auth.users and isn't reachable from the client at all.
create or replace function public.list_beta_codes()
returns table(code text, created_at timestamptz, redeemed_by uuid, redeemed_email text, redeemed_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.code, c.created_at, c.redeemed_by, u.email, c.redeemed_at
  from public.beta_invite_codes c
  left join auth.users u on u.id = c.redeemed_by
  where public.is_staff()
  order by c.created_at desc;
$$;
revoke all on function public.list_beta_codes() from public;
grant execute on function public.list_beta_codes() to authenticated;

create or replace function public.revoke_beta_access(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  update public.profiles set beta_tester = false where id = target_user_id;
end;
$$;
revoke all on function public.revoke_beta_access(uuid) from public;
grant execute on function public.revoke_beta_access(uuid) to authenticated;

create or replace function public.is_beta_tester()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select beta_tester from public.profiles where id = auth.uid()), false);
$$;
revoke all on function public.is_beta_tester() from public;
grant execute on function public.is_beta_tester() to authenticated;

-- ----------------------------------------------------------------------------
-- Beta chat: one shared room for testers + staff. Deliberately flat (no
-- threads/DMs/circles - that's the larger, parked Social system) since this
-- is a small trusted cohort, not a general community feature.
-- ----------------------------------------------------------------------------
create table if not exists public.beta_chat_messages (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  sender_name     text not null default 'A beta tester',
  is_staff_sender boolean not null default false,
  body            text not null check (char_length(body) between 1 and 2000),
  created_at      timestamptz not null default now()
);
create index if not exists beta_chat_messages_created_idx on public.beta_chat_messages (created_at);
alter table public.beta_chat_messages enable row level security;

-- user_id and the staff badge are stamped here from the real session, not
-- trusted from the client - a tester can't spoof another sender or fake the
-- "Blossom team" badge by shaping the insert payload.
create or replace function public.stamp_beta_chat_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.is_staff_sender := public.is_staff();
  return new;
end;
$$;
drop trigger if exists beta_chat_messages_stamp_sender on public.beta_chat_messages;
create trigger beta_chat_messages_stamp_sender
  before insert on public.beta_chat_messages
  for each row execute function public.stamp_beta_chat_sender();

drop policy if exists "beta_chat_messages_read" on public.beta_chat_messages;
create policy "beta_chat_messages_read" on public.beta_chat_messages
  for select using (public.is_beta_tester() or public.is_staff());

drop policy if exists "beta_chat_messages_insert" on public.beta_chat_messages;
create policy "beta_chat_messages_insert" on public.beta_chat_messages
  for insert with check (public.is_beta_tester() or public.is_staff());

-- Only staff can remove a message (basic moderation); nobody can edit one.
drop policy if exists "beta_chat_messages_staff_delete" on public.beta_chat_messages;
create policy "beta_chat_messages_staff_delete" on public.beta_chat_messages
  for delete using (public.is_staff());

do $$
begin
  alter publication supabase_realtime add table public.beta_chat_messages;
exception when duplicate_object then null;
end $$;
