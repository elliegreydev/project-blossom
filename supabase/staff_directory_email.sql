-- Extend staff_directory() with email, so client pages that only have a
-- raw email on hand (the audit log, roster change history - both stamped
-- before staff_profiles existed) can resolve it to a staff ID/display name
-- without a separate lookup.

drop function if exists public.staff_directory();
create or replace function public.staff_directory()
returns table (
  user_id uuid,
  staff_id text,
  display_name text,
  avatar_url text,
  role text,
  added_at timestamptz,
  email text
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.user_id, sp.staff_id, sp.display_name, sp.avatar_url, se.role, se.added_at, u.email
  from public.staff_profiles sp
  join auth.users u on u.id = sp.user_id
  join public.staff_emails se on se.email = u.email
  where public.is_staff()
  order by se.added_at;
$$;
revoke all on function public.staff_directory() from public;
grant execute on function public.staff_directory() to authenticated;
