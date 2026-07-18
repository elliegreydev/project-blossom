-- Feature requests and bug reports. Feature requests are public (a small
-- board people can browse and upvote without an account); bug reports are
-- staff-only, since a bug description can end up containing sensitive
-- personal context that a feature idea shouldn't need to. Voting is
-- deduplicated by a random per-browser token (no account required), enforced
-- with a real unique constraint rather than a client-side check.

create table if not exists public.feedback_items (
  id             uuid primary key default gen_random_uuid(),
  type           text not null check (type in ('feature', 'bug')),
  title          text not null check (char_length(title) between 1 and 200),
  description    text not null check (char_length(description) between 1 and 4000),
  contact_email  text check (contact_email is null or char_length(contact_email) <= 320),
  status         text not null default 'submitted',
  vote_count     integer not null default 0,
  reviewed_by    uuid references auth.users(id),
  reviewed_at    timestamptz,
  review_note    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint feedback_items_status_check check (
    (type = 'feature' and status in ('submitted', 'planned', 'in_progress', 'shipped', 'declined'))
    or (type = 'bug' and status in ('submitted', 'investigating', 'fixed', 'wont_fix'))
  )
);
create index if not exists feedback_items_type_idx on public.feedback_items (type, status, created_at desc);
alter table public.feedback_items enable row level security;

drop policy if exists "feedback_items_public_insert" on public.feedback_items;
create policy "feedback_items_public_insert" on public.feedback_items
  for insert with check (
    status = 'submitted' and reviewed_by is null and reviewed_at is null and vote_count = 0
  );

drop policy if exists "feedback_items_read" on public.feedback_items;
create policy "feedback_items_read" on public.feedback_items
  for select using (type = 'feature' or public.is_staff());

drop policy if exists "feedback_items_staff_update" on public.feedback_items;
create policy "feedback_items_staff_update" on public.feedback_items
  for update using (public.is_staff()) with check (public.is_staff());

drop trigger if exists feedback_items_set_updated_at on public.feedback_items;
create trigger feedback_items_set_updated_at before update on public.feedback_items
  for each row execute function public.set_updated_at();

-- Only status changes made by staff are worth an activity-log entry -
-- public submissions (insert) aren't staff activity.
drop trigger if exists feedback_items_log_activity on public.feedback_items;
create trigger feedback_items_log_activity
  after update on public.feedback_items
  for each row execute function public.log_staff_activity();

create table if not exists public.feedback_votes (
  feedback_id  uuid not null references public.feedback_items(id) on delete cascade,
  voter_token  text not null check (char_length(voter_token) between 8 and 100),
  created_at   timestamptz not null default now(),
  primary key (feedback_id, voter_token)
);
alter table public.feedback_votes enable row level security;

drop policy if exists "feedback_votes_public_insert" on public.feedback_votes;
create policy "feedback_votes_public_insert" on public.feedback_votes
  for insert with check (
    exists (select 1 from public.feedback_items fi where fi.id = feedback_id and fi.type = 'feature')
  );

drop policy if exists "feedback_votes_public_delete" on public.feedback_votes;
create policy "feedback_votes_public_delete" on public.feedback_votes
  for delete using (true);
-- Deliberately no select policy - vote rows carry no identity beyond a
-- random token, and nobody (not even staff) needs to read them directly;
-- feedback_items.vote_count is the public-facing aggregate.

create or replace function public.sync_feedback_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.feedback_items set vote_count = vote_count + 1 where id = NEW.feedback_id;
    return NEW;
  elsif TG_OP = 'DELETE' then
    update public.feedback_items set vote_count = greatest(0, vote_count - 1) where id = OLD.feedback_id;
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists feedback_votes_sync_count on public.feedback_votes;
create trigger feedback_votes_sync_count
  after insert or delete on public.feedback_votes
  for each row execute function public.sync_feedback_vote_count();
