-- Aggregate-only analytics. This can only ever reflect signed-in/synced
-- accounts - local-only usage leaves zero server trace by design, which is
-- the whole point of local-first, so there's no "total users" number this
-- can produce. The function returns pre-aggregated JSON only, never raw
-- per-user rows, so it can't be used to enumerate or identify anyone.

create or replace function public.get_staff_analytics()
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
    'totalAccounts', (select count(*) from public.profiles),
    'signupsByWeek', (
      select coalesce(json_agg(json_build_object('week', week_start, 'count', cnt) order by week_start), '[]'::json)
      from (
        select date_trunc('week', created_at)::date as week_start, count(*) as cnt
        from public.profiles
        where created_at > now() - interval '12 weeks'
        group by 1
      ) s
    ),
    'moduleAdoption', (
      select coalesce(json_object_agg(module, cnt), '{}'::json)
      from (
        select unnest(enabled_modules) as module, count(*) as cnt
        from public.profiles
        group by 1
      ) m
    ),
    'regions', (
      select coalesce(json_object_agg(coalesce(region, 'Not set'), cnt), '{}'::json)
      from (
        select region, count(*) as cnt
        from public.profiles
        group by 1
      ) r
    ),
    'auroraModes', (
      select coalesce(json_object_agg(aurora_mode, cnt), '{}'::json)
      from (
        select aurora_mode, count(*) as cnt
        from public.profiles
        group by 1
      ) a
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.get_staff_analytics() from public;
grant execute on function public.get_staff_analytics() to authenticated;
