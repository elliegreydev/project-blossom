-- Staff/admin foundation. No staff emails are committed here (the repo is
-- public) - see the setup note in AGENTS.md or ask Claude to insert an email
-- via a direct DB connection instead of a checked-in migration.

create table if not exists public.staff_emails (
  email      text primary key,
  added_at   timestamptz not null default now()
);
alter table public.staff_emails enable row level security;
-- Deliberately no public select/insert policies - only reachable through the
-- security-definer function below, never queried directly by clients.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff_emails se
    join auth.users u on u.email = se.email
    where u.id = auth.uid()
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;
