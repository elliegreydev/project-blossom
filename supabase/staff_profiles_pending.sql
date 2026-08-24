-- Staff IDs were only ever assigned on first sign-in, because a profile
-- row needed a real auth.users id to attach to. That meant someone freshly
-- added to the roster had no staff ID and didn't show up in People at all
-- until they'd actually logged in once - not what "assigned the moment
-- they join the team" meant. Fix: profiles can now exist "pending" (no
-- user_id yet, keyed by email instead), get their staff ID immediately
-- when added to staff_emails, and get linked to a real user_id the first
-- time they actually sign in.

alter table public.staff_profiles add column if not exists email text;
-- user_id was the primary key, which forces NOT NULL - drop it in favor of
-- a plain unique constraint (allows the single NULL a pending row needs)
-- plus the new email unique constraint as the real natural key.
alter table public.staff_profiles drop constraint if exists staff_profiles_pkey;
alter table public.staff_profiles alter column user_id drop not null;
alter table public.staff_profiles drop constraint if exists staff_profiles_user_id_key;
alter table public.staff_profiles add constraint staff_profiles_user_id_key unique (user_id);
alter table public.staff_profiles drop constraint if exists staff_profiles_email_key;
alter table public.staff_profiles add constraint staff_profiles_email_key unique (email);

-- Backfill email on the two rows that already exist (linked via user_id).
update public.staff_profiles sp
set email = u.email
from auth.users u
where u.id = sp.user_id and sp.email is null;

alter table public.staff_profiles alter column email set not null;

-- The existing lock trigger unconditionally reset user_id back to its old
-- value on every update, which would silently undo the pending -> linked
-- transition below. Allow that one transition (null -> real id), still
-- lock it solid once it's actually set.
create or replace function public.lock_staff_profile_identity()
returns trigger
language plpgsql
as $$
begin
  if old.user_id is not null then
    new.user_id := old.user_id;
  end if;
  new.staff_id := old.staff_id;
  new.updated_at := now();
  return new;
end;
$$;

-- Replaces ensure_staff_profile(user_id, email): now handles three cases -
-- brand new (create, pending or linked depending on whether user_id is
-- known yet), already pending and now signing in for the first time (link
-- it), or already linked (no-op).
create or replace function public.ensure_staff_profile(p_email text, p_user_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num integer;
  existing_user_id uuid;
begin
  select user_id into existing_user_id from public.staff_profiles where email = p_email;

  if existing_user_id is not null then
    return; -- already linked, nothing to do
  end if;

  if found then
    -- pending row exists - link it now that we have a real user_id
    if p_user_id is not null then
      update public.staff_profiles set user_id = p_user_id where email = p_email;
    end if;
    return;
  end if;

  select coalesce(max(substring(staff_id from 4)::integer), 0) + 1 into next_num
  from public.staff_profiles;
  insert into public.staff_profiles (user_id, staff_id, display_name, email)
  values (p_user_id, 'BS-' || lpad(next_num::text, 3, '0'), split_part(p_email, '@', 1), p_email)
  on conflict (email) do nothing;
end;
$$;

-- New auth user signs in - link (or create, as a fallback) their profile.
create or replace function public.handle_new_auth_user_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.staff_emails where email = new.email) then
    perform public.ensure_staff_profile(new.email, new.id);
  end if;
  return new;
end;
$$;

-- Added to staff_emails - create their profile (and staff ID) right away,
-- pending until they actually sign in. If an auth account already exists
-- for that email, link it immediately instead.
create or replace function public.handle_new_staff_email_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_user_id uuid;
begin
  select id into existing_user_id from auth.users where email = new.email limit 1;
  perform public.ensure_staff_profile(new.email, existing_user_id);
  return new;
end;
$$;

-- Backfill: assign staff IDs (pending) to anyone already on the roster
-- without one, added before this fix.
do $$
declare
  r record;
begin
  for r in
    select se.email, u.id as user_id
    from public.staff_emails se
    left join auth.users u on u.email = se.email
    where not exists (select 1 from public.staff_profiles sp where sp.email = se.email)
  loop
    perform public.ensure_staff_profile(r.email, r.user_id);
  end loop;
end $$;

-- Directory now sources role/join-date from staff_emails by email directly
-- (no longer requires a linked auth.users row), so pending members show up
-- too. "joined" tells the client whether they've actually signed in yet.
drop function if exists public.staff_directory();
create or replace function public.staff_directory()
returns table (
  user_id uuid,
  staff_id text,
  display_name text,
  avatar_url text,
  role text,
  added_at timestamptz,
  email text,
  joined boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.user_id, sp.staff_id, sp.display_name, sp.avatar_url, se.role, se.added_at, sp.email, sp.user_id is not null
  from public.staff_profiles sp
  join public.staff_emails se on se.email = sp.email
  where public.is_staff()
  order by se.added_at;
$$;
revoke all on function public.staff_directory() from public;
grant execute on function public.staff_directory() to authenticated;

-- Every other SECURITY DEFINER function here is revoked; this one was missed,
-- so Postgres' default EXECUTE-to-PUBLIC stood and PostgREST exposed it to
-- anon. That let a stranger write rows into staff_profiles: junk staff ids,
-- spoofed display names in HQ's team view, and a real staff member's first
-- sign-in silently short-circuiting. The triggers that call it are themselves
-- SECURITY DEFINER owned by postgres, so onboarding is unaffected.
revoke all on function public.ensure_staff_profile(text, uuid) from public, anon;
