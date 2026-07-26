-- Staff handoff notes: a small shared feed for context that doesn't belong
-- to any one existing tool - "keeping an eye on X", "Y needs re-checking
-- soon". Archived (resolved_at set) rather than deleted, so history isn't
-- lost even once a note is no longer active.

create table if not exists public.staff_handoff_notes (
  id            uuid primary key default gen_random_uuid(),
  body          text not null check (char_length(body) between 1 and 2000),
  pinned        boolean not null default false,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz
);

create index if not exists staff_handoff_notes_active_idx on public.staff_handoff_notes (resolved_at, pinned desc, created_at desc);
alter table public.staff_handoff_notes enable row level security;

drop policy if exists "staff_handoff_notes_staff_all" on public.staff_handoff_notes;
create policy "staff_handoff_notes_staff_all" on public.staff_handoff_notes
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists staff_handoff_notes_log_activity on public.staff_handoff_notes;
create trigger staff_handoff_notes_log_activity
  after insert or update or delete on public.staff_handoff_notes
  for each row execute function public.log_staff_activity();
