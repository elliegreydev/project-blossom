-- Supabase installs pgcrypto into the extensions schema, not public, so
-- digest() needs to be schema-qualified - the bare call in support_tickets.sql
-- failed with "function digest(text, unknown) does not exist" the first time
-- this actually ran (caught live testing the access-code request flow).
create or replace function public.request_ticket_access(target_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  plain_code text;
  requester uuid := auth.uid();
begin
  if not (public.is_staff() and public.can_access_ticket(target_ticket_id)) then
    raise exception 'not authorized';
  end if;

  plain_code := lpad(floor(random() * 1000000)::text, 6, '0');

  insert into public.support_ticket_access_grants (ticket_id, requested_by, code_hash, expires_at)
  values (target_ticket_id, requester, encode(extensions.digest(plain_code, 'sha256'), 'hex'), now() + interval '10 minutes');

  insert into public.support_ticket_messages (ticket_id, sender_id, body, is_system, visible_to_user_only)
  values (
    target_ticket_id,
    requester,
    'A staff member has requested a code to help with your account. If you''re expecting this, share the code below with them in your next reply - don''t share it anywhere else. Code: ' || plain_code || ' (expires in 10 minutes)',
    true,
    true
  );
end;
$$;

create or replace function public.verify_ticket_access(target_ticket_id uuid, submitted_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  grant_row public.support_ticket_access_grants%rowtype;
begin
  if not (public.is_staff() and public.can_access_ticket(target_ticket_id)) then
    raise exception 'not authorized';
  end if;

  select * into grant_row
  from public.support_ticket_access_grants
  where ticket_id = target_ticket_id
    and verified_at is null
    and revoked_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if grant_row.id is null then
    return false;
  end if;

  if grant_row.code_hash != encode(extensions.digest(submitted_code, 'sha256'), 'hex') then
    update public.support_ticket_access_grants
    set attempts = attempts + 1,
        expires_at = case when attempts + 1 >= 5 then now() else expires_at end
    where id = grant_row.id;
    return false;
  end if;

  update public.support_ticket_access_grants
  set verified_at = now(), access_expires_at = now() + interval '20 minutes'
  where id = grant_row.id;

  insert into public.support_ticket_messages (ticket_id, sender_id, body, is_system)
  values (target_ticket_id, auth.uid(), 'Access granted for 20 minutes.', true);

  return true;
end;
$$;
