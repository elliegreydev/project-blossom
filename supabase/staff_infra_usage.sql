-- Aggregate-only data volume counts for the Infra & usage staff page.
-- Several of these tables (profiles, appointments, medications, goals,
-- check_ins, push_subscriptions, aurora_ai_usage) are owner-only RLS or
-- client-inaccessible entirely - a normal staff session querying them
-- directly would only ever see their own rows (or nothing), not the real
-- total. This mirrors get_staff_analytics()'s security-definer pattern to
-- return counts only, never individual rows.

create or replace function public.get_infra_usage_counts()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_staff() then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'profiles', (select count(*) from public.profiles),
    'appointments', (select count(*) from public.appointments),
    'medications', (select count(*) from public.medications),
    'goals', (select count(*) from public.goals),
    'checkIns', (select count(*) from public.check_ins),
    'pushSubscriptions', (select count(*) from public.push_subscriptions),
    'auroraAiUsage', (select count(*) from public.aurora_ai_usage),
    'supportCases', (select count(*) from public.support_cases),
    'feedbackItems', (select count(*) from public.feedback_items),
    'staffIssues', (select count(*) from public.staff_issues)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_infra_usage_counts() from public;
grant execute on function public.get_infra_usage_counts() to authenticated;
