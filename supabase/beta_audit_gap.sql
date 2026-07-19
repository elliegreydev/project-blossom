-- Closes a real gap: this session's staff-writable beta tables were never
-- wired into the existing staff_activity_log trigger, unlike resources,
-- notices, roadmap and the team roster. Run after beta_v3.sql. Idempotent
-- and safe to re-run.
--
-- Deliberately NOT touching trusted_circle_grants - that table is owned and
-- managed by ordinary users (creating/accepting/leaving a share), not staff,
-- and logging it here would misrepresent normal user activity as staff
-- activity, plus expose sharing details to a wider staff audience than the
-- feature was designed to allow. Staff have no special powers over that
-- table at all, so there's nothing staff-privileged to log.

-- A few tables use a natural key other than "id" or "email" (beta_invite_codes
-- uses "code") - widen the existing lookup rather than duplicating the
-- trigger function per table.
create or replace function public.log_staff_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
  row_detail jsonb;
  actor_email text;
begin
  if TG_OP = 'DELETE' then
    row_detail := to_jsonb(OLD);
  else
    row_detail := to_jsonb(NEW);
  end if;
  row_id := coalesce(row_detail->>'id', row_detail->>'email', row_detail->>'code');
  select email into actor_email from auth.users where id = auth.uid();

  insert into public.staff_activity_log (staff_user_id, staff_email, action, table_name, record_id, detail)
  values (auth.uid(), actor_email, TG_OP, TG_TABLE_NAME, row_id, row_detail);

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- beta_invite_codes and beta_known_issues are fully staff-only-write (see
-- their RLS in beta.sql/beta_v2.sql), so every insert/update/delete here is
-- already guaranteed to be a staff action.
drop trigger if exists beta_invite_codes_log_activity on public.beta_invite_codes;
create trigger beta_invite_codes_log_activity
  after insert or update or delete on public.beta_invite_codes
  for each row execute function public.log_staff_activity();

drop trigger if exists beta_known_issues_log_activity on public.beta_known_issues;
create trigger beta_known_issues_log_activity
  after insert or update or delete on public.beta_known_issues
  for each row execute function public.log_staff_activity();

drop trigger if exists beta_focus_note_log_activity on public.beta_focus_note;
create trigger beta_focus_note_log_activity
  after insert or update or delete on public.beta_focus_note
  for each row execute function public.log_staff_activity();

-- beta_chat_messages is different: inserts come from any tester, only
-- deletes are staff-gated (beta_chat_messages_staff_delete). Logging every
-- insert would misattribute ordinary tester messages as staff activity, so
-- this is delete-only.
drop trigger if exists beta_chat_messages_log_activity on public.beta_chat_messages;
create trigger beta_chat_messages_log_activity
  after delete on public.beta_chat_messages
  for each row execute function public.log_staff_activity();

-- profiles is mostly self-managed by every user (not staff activity), so it
-- can't get a blanket trigger. revoke_beta_access is the one place staff
-- write to another user's profile row directly - log it explicitly there
-- instead of via a table-wide trigger.
create or replace function public.revoke_beta_access(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_email text;
begin
  if not public.is_staff() then
    raise exception 'Staff only';
  end if;
  update public.profiles set beta_tester = false where id = target_user_id;

  select email into actor_email from auth.users where id = auth.uid();
  insert into public.staff_activity_log (staff_user_id, staff_email, action, table_name, record_id, detail)
  values (auth.uid(), actor_email, 'UPDATE', 'profiles', target_user_id::text, jsonb_build_object('beta_tester', false));
end;
$$;
revoke all on function public.revoke_beta_access(uuid) from public;
grant execute on function public.revoke_beta_access(uuid) to authenticated;
