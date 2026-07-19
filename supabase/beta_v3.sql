-- Beta program round 3: a staff-set "currently focused on" note, and a
-- staff-only aggregate engagement snapshot. Run after beta_v2.sql.
-- Idempotent and safe to re-run.

-- Single current note - fixed id, staff upserts over it rather than a
-- growing history table, since only the latest one is ever shown.
create table if not exists public.beta_focus_note (
  id         text primary key default 'current',
  note       text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.beta_focus_note enable row level security;

drop policy if exists "beta_focus_note_staff_write" on public.beta_focus_note;
create policy "beta_focus_note_staff_write" on public.beta_focus_note
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "beta_focus_note_tester_read" on public.beta_focus_note;
create policy "beta_focus_note_tester_read" on public.beta_focus_note
  for select using (public.is_beta_tester());

-- Aggregate-only, staff-only - mirrors the existing staff_analytics.sql
-- shape (no per-person breakdown, just counts).
create or replace function public.beta_engagement_snapshot()
returns table(active_testers bigint, messages_last_7_days bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  return query select
    (select count(*) from public.profiles where beta_tester = true),
    (select count(*) from public.beta_chat_messages where created_at > now() - interval '7 days');
end;
$$;
revoke all on function public.beta_engagement_snapshot() from public;
grant execute on function public.beta_engagement_snapshot() to authenticated;
