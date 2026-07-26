-- A running comment thread per Known Issue - status alone loses context
-- once you step away and come back later.

create table if not exists public.staff_issue_comments (
  id           uuid primary key default gen_random_uuid(),
  issue_id     uuid not null references public.staff_issues(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

create index if not exists staff_issue_comments_issue_idx on public.staff_issue_comments (issue_id, created_at);
alter table public.staff_issue_comments enable row level security;

drop policy if exists "staff_issue_comments_staff_all" on public.staff_issue_comments;
create policy "staff_issue_comments_staff_all" on public.staff_issue_comments
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists staff_issue_comments_log_activity on public.staff_issue_comments;
create trigger staff_issue_comments_log_activity
  after insert or update or delete on public.staff_issue_comments
  for each row execute function public.log_staff_activity();
