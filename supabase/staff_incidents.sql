-- Incident/postmortem log: a retrospective record of what broke, when, the
-- impact, and what changed as a result - distinct from Known issues (which
-- tracks ongoing/open bugs), filled in after something is resolved.

create table if not exists public.staff_incidents (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 200),
  description       text check (description is null or char_length(description) <= 4000),
  impact            text check (impact is null or char_length(impact) <= 2000),
  resolution        text check (resolution is null or char_length(resolution) <= 2000),
  lessons_learned   text check (lessons_learned is null or char_length(lessons_learned) <= 2000),
  occurred_at       timestamptz,
  discovered_at     timestamptz not null default now(),
  resolved_at       timestamptz,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists staff_incidents_discovered_idx on public.staff_incidents (discovered_at desc);
alter table public.staff_incidents enable row level security;

drop policy if exists "staff_incidents_staff_all" on public.staff_incidents;
create policy "staff_incidents_staff_all" on public.staff_incidents
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists staff_incidents_log_activity on public.staff_incidents;
create trigger staff_incidents_log_activity
  after insert or update or delete on public.staff_incidents
  for each row execute function public.log_staff_activity();
