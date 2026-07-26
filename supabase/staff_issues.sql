-- Internal known-issues board: bugs/tech-debt staff notice themselves,
-- tracked without ever needing to go through the public feedback board.
-- Deliberately a separate table from feedback_items (not a flag on it) so
-- there is no shared RLS surface an internal item could ever leak through.

create table if not exists public.staff_issues (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 200),
  description   text check (description is null or char_length(description) <= 4000),
  severity      text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status        text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  reported_by   uuid references auth.users(id),
  assigned_to   uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists staff_issues_status_idx on public.staff_issues (status, severity, created_at desc);
alter table public.staff_issues enable row level security;

drop policy if exists "staff_issues_staff_all" on public.staff_issues;
create policy "staff_issues_staff_all" on public.staff_issues
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists staff_issues_log_activity on public.staff_issues;
create trigger staff_issues_log_activity
  after insert or update or delete on public.staff_issues
  for each row execute function public.log_staff_activity();
