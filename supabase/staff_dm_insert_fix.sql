-- The insert policy queried auth.users directly inside its WITH CHECK,
-- which runs as the plain "authenticated" role (not elevated) - and that
-- role has no SELECT grant on auth.users, so every DM insert failed with
-- "permission denied for table users". Every other place that needs to
-- check auth.users goes through a security-definer function instead
-- (is_staff(), ensure_staff_profile(), etc.) - this policy just missed
-- that pattern.

create or replace function public.is_valid_staff_recipient(candidate_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_emails se
    join auth.users u on u.email = se.email
    where u.id = candidate_user_id
  );
$$;
revoke all on function public.is_valid_staff_recipient(uuid) from public;
grant execute on function public.is_valid_staff_recipient(uuid) to authenticated;

drop policy if exists "staff_dm_messages_insert" on public.staff_dm_messages;
create policy "staff_dm_messages_insert" on public.staff_dm_messages
  for insert with check (
    public.is_staff()
    and recipient_id <> auth.uid()
    and public.is_valid_staff_recipient(recipient_id)
  );
