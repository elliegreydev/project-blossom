-- Staff lookup: presence (last_seen_at, updated by a client heartbeat) and
-- a unified activity feed pulled from everywhere a staff member's own
-- actions are already recorded. Deliberately excludes:
--   - support_case_access_log (which cases a staff member opened) - the
--     Audit page already keeps that anonymous on purpose, this doesn't
--     reverse that
--   - staff_dm_messages - private is private, no exceptions
-- Gating for who can use this is left entirely to the page-permission
-- matrix ("/staff-lookup"), same as every other tool - the RPCs below only
-- enforce the baseline is_staff() check, consistent with every other
-- staff RPC in this app.

alter table public.staff_profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_staff_presence()
returns void
language sql
security definer
set search_path = public
as $$
  update public.staff_profiles set last_seen_at = now() where user_id = auth.uid();
$$;
revoke all on function public.touch_staff_presence() from public;
grant execute on function public.touch_staff_presence() to authenticated;

create or replace function public.staff_activity_for(target_user_id uuid)
returns table (
  kind text,
  summary text,
  happened_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  -- Tables below have their own dedicated, more specific branch further
  -- down - excluded here so the same event doesn't show twice.
  select 'Activity' as kind,
         initcap(al.action) || ' ' || coalesce(
           case al.table_name
             when 'region_resources' then 'a support resource'
             when 'legal_context_notes' then 'a legal context note'
             when 'product_roadmap' then 'a roadmap item'
             when 'app_notices' then 'a notice'
             when 'staff_emails' then 'the team roster'
             else al.table_name
           end, al.table_name) as summary,
         al.created_at as happened_at
  from public.staff_activity_log al
  where public.is_staff() and al.staff_user_id = target_user_id
    and al.table_name not in ('staff_issues', 'staff_incidents', 'staff_docs', 'staff_handoff_notes')

  union all
  select 'Known issue', 'Reported "' || si.title || '"', si.created_at
  from public.staff_issues si
  where public.is_staff() and si.reported_by = target_user_id

  union all
  select 'Incident', 'Logged "' || sic.title || '"', sic.created_at
  from public.staff_incidents sic
  where public.is_staff() and sic.created_by = target_user_id

  union all
  select 'Knowledge base', 'Updated "' || sd.title || '"', sd.updated_at
  from public.staff_docs sd
  where public.is_staff() and sd.updated_by = target_user_id

  union all
  select 'Handoff note', left(shn.body, 80), shn.created_at
  from public.staff_handoff_notes shn
  where public.is_staff() and shn.created_by = target_user_id

  union all
  select 'Staff chat', left(scm.body, 80), scm.created_at
  from public.staff_chat_messages scm
  where public.is_staff() and scm.user_id = target_user_id

  order by happened_at desc
  limit 100;
$$;
revoke all on function public.staff_activity_for(uuid) from public;
grant execute on function public.staff_activity_for(uuid) to authenticated;

-- "/staff-lookup" joins the per-page permission matrix like every other
-- tool. Not open by default - Ellie assigns access herself via /permissions.
insert into public.staff_page_permissions (role, page, can_access)
select role, '/staff-lookup', (role in ('administrator', 'owner'))
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
on conflict (role, page) do nothing;

-- SECURITY DEFINER, staff-only in practice, but left executable by the
-- default PUBLIC grant. Restrict to authenticated. August red-team pass.
revoke all on function public.touch_staff_presence() from public, anon;
grant execute on function public.touch_staff_presence() to authenticated;
