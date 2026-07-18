-- Staff role hierarchy: trial_moderator < moderator < manager <
-- administrator < owner. Purely additive on top of the existing flat
-- staff_emails/is_staff() gate - is_staff() is untouched and keeps meaning
-- "any tier is staff", so every RLS policy written before this file keeps
-- working exactly as it did. New, more sensitive surfaces (team management,
-- applications, resource/comms edits) gate on rank instead of a flat
-- boolean.
--
-- No staff emails are committed here (the repo is public) - the one-time
-- backfill promoting the existing row to 'owner' is run as a direct,
-- uncommitted DB statement, same convention as staff.sql.

alter table public.staff_emails
  add column if not exists role text not null default 'trial_moderator';

alter table public.staff_emails
  drop constraint if exists staff_emails_role_check;
alter table public.staff_emails
  add constraint staff_emails_role_check
  check (role in ('trial_moderator', 'moderator', 'manager', 'administrator', 'owner'));

create or replace function public.staff_role_rank(target_role text)
returns integer
language sql
immutable
as $$
  select case target_role
    when 'owner' then 100
    when 'administrator' then 80
    when 'manager' then 60
    when 'moderator' then 40
    when 'trial_moderator' then 20
    else 0
  end;
$$;

create or replace function public.my_staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select se.role from public.staff_emails se
  join auth.users u on u.email = se.email
  where u.id = auth.uid()
  limit 1;
$$;

revoke all on function public.my_staff_role() from public;
grant execute on function public.my_staff_role() to authenticated;

create or replace function public.my_staff_rank()
returns integer
language sql
stable
as $$
  select coalesce(public.staff_role_rank(public.my_staff_role()), 0);
$$;

grant execute on function public.staff_role_rank(text) to authenticated;
grant execute on function public.my_staff_rank() to authenticated;

-- Roster is readable by any staff tier, but only Administrator+ can change
-- it, and only Owner can create/edit/remove an Administrator or Owner row -
-- an Administrator can't promote themselves or a peer to the top, and can't
-- touch anyone already at Administrator or Owner.
drop policy if exists "staff_emails_read" on public.staff_emails;
create policy "staff_emails_read" on public.staff_emails
  for select using (public.is_staff());

drop policy if exists "staff_emails_insert" on public.staff_emails;
create policy "staff_emails_insert" on public.staff_emails
  for insert with check (
    public.my_staff_rank() >= 80
    and public.staff_role_rank(role) <= (case when public.my_staff_rank() >= 100 then 100 else 60 end)
  );

drop policy if exists "staff_emails_update" on public.staff_emails;
create policy "staff_emails_update" on public.staff_emails
  for update using (
    public.my_staff_rank() >= 80
    and (public.staff_role_rank(role) < 80 or public.my_staff_rank() >= 100)
  )
  with check (
    public.my_staff_rank() >= 80
    and public.staff_role_rank(role) <= (case when public.my_staff_rank() >= 100 then 100 else 60 end)
  );

drop policy if exists "staff_emails_delete" on public.staff_emails;
create policy "staff_emails_delete" on public.staff_emails
  for delete using (
    public.my_staff_rank() >= 80
    and (public.staff_role_rank(role) < 80 or public.my_staff_rank() >= 100)
  );
