-- Staff direct messages: plain sender/recipient pairs, no separate
-- "conversation" object needed at this team size. Strictly private - only
-- the two people in a thread can ever read it (unlike the room chat,
-- Owner does NOT get oversight here by design).

create table if not exists public.staff_dm_messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 2000),
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);
create index if not exists staff_dm_messages_pair_idx
  on public.staff_dm_messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at);
alter table public.staff_dm_messages enable row level security;

create or replace function public.stamp_staff_dm_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.sender_id := auth.uid();
  new.read_at := null;
  return new;
end;
$$;
drop trigger if exists staff_dm_messages_stamp_sender on public.staff_dm_messages;
create trigger staff_dm_messages_stamp_sender
  before insert on public.staff_dm_messages
  for each row execute function public.stamp_staff_dm_sender();

-- Recipients can only ever flip read_at - not the sender, body, or
-- timestamps of a message once it's sent.
create or replace function public.lock_dm_message_edits()
returns trigger
language plpgsql
as $$
begin
  new.sender_id := old.sender_id;
  new.recipient_id := old.recipient_id;
  new.body := old.body;
  new.created_at := old.created_at;
  return new;
end;
$$;
drop trigger if exists staff_dm_messages_lock_edits on public.staff_dm_messages;
create trigger staff_dm_messages_lock_edits
  before update on public.staff_dm_messages
  for each row execute function public.lock_dm_message_edits();

drop policy if exists "staff_dm_messages_read" on public.staff_dm_messages;
create policy "staff_dm_messages_read" on public.staff_dm_messages
  for select using (public.is_staff() and (sender_id = auth.uid() or recipient_id = auth.uid()));

drop policy if exists "staff_dm_messages_insert" on public.staff_dm_messages;
create policy "staff_dm_messages_insert" on public.staff_dm_messages
  for insert with check (
    public.is_staff()
    and recipient_id <> auth.uid()
    and exists (
      select 1 from public.staff_emails se
      join auth.users u on u.email = se.email
      where u.id = recipient_id
    )
  );

drop policy if exists "staff_dm_messages_mark_read" on public.staff_dm_messages;
create policy "staff_dm_messages_mark_read" on public.staff_dm_messages
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "staff_dm_messages_delete_own" on public.staff_dm_messages;
create policy "staff_dm_messages_delete_own" on public.staff_dm_messages
  for delete using (sender_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.staff_dm_messages;
exception when duplicate_object then null;
end $$;

-- One round trip for the inbox: every conversation partner, their last
-- message, and how many are unread.
create or replace function public.my_dm_conversations()
returns table (
  other_user_id uuid,
  last_body text,
  last_created_at timestamptz,
  unread_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with pairs as (
    select
      case when sender_id = auth.uid() then recipient_id else sender_id end as other_user_id,
      body, created_at,
      (recipient_id = auth.uid() and read_at is null) as is_unread
    from public.staff_dm_messages
    where sender_id = auth.uid() or recipient_id = auth.uid()
  ),
  latest as (
    select distinct on (other_user_id) other_user_id, body as last_body, created_at as last_created_at
    from pairs
    order by other_user_id, created_at desc
  ),
  unread as (
    select other_user_id, count(*) as unread_count
    from pairs where is_unread
    group by other_user_id
  )
  select l.other_user_id, l.last_body, l.last_created_at, coalesce(u.unread_count, 0)
  from latest l
  left join unread u using (other_user_id)
  order by l.last_created_at desc;
$$;
revoke all on function public.my_dm_conversations() from public, anon;
grant execute on function public.my_dm_conversations() to authenticated;

-- "/messages" and "/people" join the per-page permission matrix like every
-- other tool ("/people" was seeded in staff_profiles.sql already).
insert into public.staff_page_permissions (role, page, can_access)
select role, '/messages', true
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
on conflict (role, page) do nothing;
