-- Expose last_seen_at through staff_directory() so /staff-lookup can show
-- presence without a second round trip.
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
  joined boolean,
  last_seen_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.user_id, sp.staff_id, sp.display_name, sp.avatar_url, se.role, se.added_at, sp.email,
         sp.user_id is not null, sp.last_seen_at
  from public.staff_profiles sp
  join public.staff_emails se on se.email = sp.email
  where public.is_staff()
  order by se.added_at;
$$;
revoke all on function public.staff_directory() from public, anon;
grant execute on function public.staff_directory() to authenticated;
