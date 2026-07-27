-- Staff chat for Blossom Staff: one "All staff" room everyone on staff can
-- read/post in, plus one private room per role tier (Trial Moderator,
-- Moderator, Manager, Administrator, Owner) visible only to that tier's
-- own members - except the Owner, who can also read/post in every tier's
-- room for oversight, mirroring the "Owner always has everything" rule
-- already used for sections/pages/team management.
--
-- Sender identity is stamped server-side from the real session (email +
-- role looked up at insert time), never trusted from the client - there's
-- no display-name concept in this app, so spoofing isn't even an option.

create table if not exists public.staff_chat_messages (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null check (channel in ('all', 'trial_moderator', 'moderator', 'manager', 'administrator', 'owner')),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sender_name text not null,
  sender_role text not null,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists staff_chat_messages_channel_created_idx on public.staff_chat_messages (channel, created_at);
alter table public.staff_chat_messages enable row level security;

create or replace function public.stamp_staff_chat_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.sender_role := coalesce(public.my_staff_role(), 'trial_moderator');
  select email into new.sender_name from auth.users where id = auth.uid();
  return new;
end;
$$;
drop trigger if exists staff_chat_messages_stamp_sender on public.staff_chat_messages;
create trigger staff_chat_messages_stamp_sender
  before insert on public.staff_chat_messages
  for each row execute function public.stamp_staff_chat_sender();

drop policy if exists "staff_chat_messages_read" on public.staff_chat_messages;
create policy "staff_chat_messages_read" on public.staff_chat_messages
  for select using (
    public.is_staff()
    and (channel = 'all' or channel = public.my_staff_role() or public.my_staff_rank() >= 100)
  );

drop policy if exists "staff_chat_messages_insert" on public.staff_chat_messages;
create policy "staff_chat_messages_insert" on public.staff_chat_messages
  for insert with check (
    public.is_staff()
    and (channel = 'all' or channel = public.my_staff_role() or public.my_staff_rank() >= 100)
  );

-- A sender can remove their own message; Administrator+ can moderate any
-- message in a room they can see.
drop policy if exists "staff_chat_messages_delete" on public.staff_chat_messages;
create policy "staff_chat_messages_delete" on public.staff_chat_messages
  for delete using (
    user_id = auth.uid()
    or (public.my_staff_rank() >= 80 and (channel = 'all' or channel = public.my_staff_role() or public.my_staff_rank() >= 100))
  );

do $$
begin
  alter publication supabase_realtime add table public.staff_chat_messages;
exception when duplicate_object then null;
end $$;

-- "/chat" joins the per-page permission matrix like every other tool, open
-- to every role by default (channel visibility inside the page is what
-- actually keeps each tier's room private, not this page-level gate).
insert into public.staff_page_permissions (role, page, can_access)
select role, '/chat', true
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
on conflict (role, page) do nothing;
