-- Beta program follow-ups: self-serve leave, a staff-curated known-issues
-- list, and the staff notify-on-join push. Run after beta.sql. Idempotent
-- and safe to re-run.

-- Self-serve leave: lets a tester turn their own access off. Deliberately
-- only ever lowers beta_tester to false - raising it back to true still
-- only happens through redeem_beta_code(), so the single-use code stays
-- the one real path in and admin/beta's roster stays an accurate record of
-- who redeemed what.
create or replace function public.leave_beta_program()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set beta_tester = false where id = auth.uid();
$$;
revoke all on function public.leave_beta_program() from public;
grant execute on function public.leave_beta_program() to authenticated;

-- Known issues: a small, staff-curated list so testers can check "is this
-- already known" before filing a duplicate report. Read by testers/staff,
-- written by staff only.
create table if not exists public.beta_known_issues (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 200),
  note       text,
  resolved   boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.beta_known_issues enable row level security;

drop policy if exists "beta_known_issues_staff_all" on public.beta_known_issues;
create policy "beta_known_issues_staff_all" on public.beta_known_issues
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "beta_known_issues_tester_read" on public.beta_known_issues;
create policy "beta_known_issues_tester_read" on public.beta_known_issues
  for select using (public.is_beta_tester());
