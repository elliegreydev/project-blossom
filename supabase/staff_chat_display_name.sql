-- Staff chat showed raw email as the sender name (that's what the original
-- trigger stamped it with, before staff_profiles/display_name existed).
-- Now that every staff member has a profile, use their display name
-- instead, falling back to email only if they haven't set one yet.

create or replace function public.stamp_staff_chat_sender()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.user_id := auth.uid();
  new.sender_role := coalesce(public.my_staff_role(), 'trial_moderator');
  select coalesce(sp.display_name, u.email)
    into new.sender_name
  from auth.users u
  left join public.staff_profiles sp on sp.user_id = u.id
  where u.id = auth.uid();
  return new;
end;
$$;

-- Backfill existing messages so history matches too.
update public.staff_chat_messages m
set sender_name = coalesce(sp.display_name, u.email)
from auth.users u
left join public.staff_profiles sp on sp.user_id = u.id
where u.id = m.user_id
  and coalesce(sp.display_name, u.email) is distinct from m.sender_name;
