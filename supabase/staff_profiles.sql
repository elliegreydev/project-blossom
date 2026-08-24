-- Staff profiles: a permanent staff ID assigned the moment someone joins
-- the team (BS-001, BS-002, ...), plus an editable display name and
-- avatar. Backs the new People directory and DMs. staff_id and user_id are
-- locked from ever being edited via the update policy below - only
-- display_name/avatar_url can change.

create table if not exists public.staff_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  staff_id     text not null unique,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.staff_profiles enable row level security;

drop policy if exists "staff_profiles_read" on public.staff_profiles;
create policy "staff_profiles_read" on public.staff_profiles
  for select using (public.is_staff());

drop policy if exists "staff_profiles_update_own" on public.staff_profiles;
create policy "staff_profiles_update_own" on public.staff_profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.lock_staff_profile_identity()
returns trigger
language plpgsql
as $$
begin
  new.staff_id := old.staff_id;
  new.user_id := old.user_id;
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists staff_profiles_lock_identity on public.staff_profiles;
create trigger staff_profiles_lock_identity
  before update on public.staff_profiles
  for each row execute function public.lock_staff_profile_identity();

-- Shared assignment logic - the next sequential BS-### number, keyed off
-- whatever's already been handed out.
create or replace function public.ensure_staff_profile(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_num integer;
begin
  if not exists (select 1 from public.staff_profiles where user_id = p_user_id) then
    select coalesce(max(substring(staff_id from 4)::integer), 0) + 1 into next_num
    from public.staff_profiles;
    insert into public.staff_profiles (user_id, staff_id, display_name)
    values (p_user_id, 'BS-' || lpad(next_num::text, 3, '0'), split_part(p_email, '@', 1))
    on conflict (user_id) do nothing;
  end if;
end;
$$;

-- Covers someone signing in for the first time whose email is already on
-- the roster.
create or replace function public.handle_new_auth_user_staff_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.staff_emails where email = new.email) then
    perform public.ensure_staff_profile(new.id, new.email);
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created_staff_profile on auth.users;
create trigger on_auth_user_created_staff_profile
  after insert on auth.users
  for each row execute function public.handle_new_auth_user_staff_profile();

-- Covers being added to staff_emails when an auth account for that email
-- already exists.
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
  if existing_user_id is not null then
    perform public.ensure_staff_profile(existing_user_id, new.email);
  end if;
  return new;
end;
$$;
drop trigger if exists on_staff_email_added_profile on public.staff_emails;
create trigger on_staff_email_added_profile
  after insert on public.staff_emails
  for each row execute function public.handle_new_staff_email_profile();

-- One-time backfill for whoever's already staff with an existing account.
do $$
declare
  r record;
begin
  for r in
    select u.id as user_id, u.email
    from auth.users u
    join public.staff_emails se on se.email = u.email
    where not exists (select 1 from public.staff_profiles sp where sp.user_id = u.id)
  loop
    perform public.ensure_staff_profile(r.user_id, r.email);
  end loop;
end $$;

-- One call for the People directory: profile + role + join date, joined
-- server-side since clients can't query auth.users directly.
create or replace function public.staff_directory()
returns table (
  user_id uuid,
  staff_id text,
  display_name text,
  avatar_url text,
  role text,
  added_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.user_id, sp.staff_id, sp.display_name, sp.avatar_url, se.role, se.added_at
  from public.staff_profiles sp
  join auth.users u on u.id = sp.user_id
  join public.staff_emails se on se.email = u.email
  where public.is_staff()
  order by se.added_at;
$$;
revoke all on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;

-- Avatar storage: public read (so <img> tags just work), write restricted
-- to the caller's own folder (staff-avatars/<user_id>/...).
insert into storage.buckets (id, name, public)
values ('staff-avatars', 'staff-avatars', true)
on conflict (id) do nothing;

-- Capped and restricted. Without these the bucket accepted any file of any
-- size, which combined with the missing is_staff() check above meant any
-- account holder could use Blossom's storage as public file hosting.
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif']
 where id = 'staff-avatars';

drop policy if exists "staff_avatars_insert_own" on storage.objects;
create policy "staff_avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff_avatars_update_own" on storage.objects;
create policy "staff_avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "staff_avatars_delete_own" on storage.objects;
create policy "staff_avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );

-- "/people" joins the per-page permission matrix like every other tool.
insert into public.staff_page_permissions (role, page, can_access)
select role, '/people', true
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
on conflict (role, page) do nothing;

-- Every other SECURITY DEFINER function here is revoked; this one was missed,
-- so Postgres' default EXECUTE-to-PUBLIC stood and PostgREST exposed it to
-- anon. That let a stranger write rows into staff_profiles: junk staff ids,
-- spoofed display names in HQ's team view, and a real staff member's first
-- sign-in silently short-circuiting. The triggers that call it are themselves
-- SECURITY DEFINER owned by postgres, so onboarding is unaffected.
revoke all on function public.ensure_staff_profile(uuid, text) from public, anon;
