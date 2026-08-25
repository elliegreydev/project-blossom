-- support_cases was dropped in support_tickets.sql; point the infra usage
-- counter at its replacement instead of a table that no longer exists.
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
    'supportTickets', (select count(*) from public.support_tickets),
    'feedbackItems', (select count(*) from public.feedback_items),
    'staffIssues', (select count(*) from public.staff_issues)
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_infra_usage_counts() from public, anon;
grant execute on function public.get_infra_usage_counts() to authenticated;
