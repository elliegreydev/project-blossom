-- Section-level permissions for the standalone Blossom Staff app. Sits on
-- top of the existing role ladder (staff_roles.sql) - a role's rank still
-- decides *seniority*, this table decides *which of the app's 6 nav
-- sections* that role can see. Seeded below to match exactly what already
-- works today (every section open to every role except "admin", which
-- mirrors the existing ADMIN_ONLY_NAV rank>=80 gate) so shipping this
-- migration changes no one's access on day one.
--
-- Sections: home, support, team_knowledge, platform_health, comms_planning, admin

create table if not exists public.staff_section_permissions (
  role       text not null,
  section    text not null,
  can_access boolean not null default true,
  primary key (role, section)
);
alter table public.staff_section_permissions enable row level security;

drop policy if exists "staff_section_permissions_read" on public.staff_section_permissions;
create policy "staff_section_permissions_read" on public.staff_section_permissions
  for select using (public.is_staff());

-- Only an Owner can edit the matrix - this table controls who can see what,
-- so it needs to be at least as protected as the Team roster itself.
drop policy if exists "staff_section_permissions_write" on public.staff_section_permissions;
create policy "staff_section_permissions_write" on public.staff_section_permissions
  for all using (public.my_staff_rank() >= 100)
  with check (public.my_staff_rank() >= 100);

insert into public.staff_section_permissions (role, section, can_access)
select role, section, (section != 'admin' or role in ('administrator', 'owner'))
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
cross join unnest(array['home', 'support', 'team_knowledge', 'platform_health', 'comms_planning', 'admin']) as section
on conflict (role, section) do nothing;

-- Owner always has every section regardless of what's in the table - a
-- safety floor so a mis-click on the matrix can never lock the owner out.
create or replace function public.has_section_access(section_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.my_staff_rank() >= 100
    or coalesce(
      (select can_access from public.staff_section_permissions
       where role = public.my_staff_role() and section = section_name),
      false
    );
$$;

revoke all on function public.has_section_access(text) from public;
grant execute on function public.has_section_access(text) to authenticated;

-- One round trip for the nav to build itself from, instead of one call per
-- section.
create or replace function public.my_accessible_sections()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.my_staff_rank() >= 100 then
      array['home', 'support', 'team_knowledge', 'platform_health', 'comms_planning', 'admin']
    else
      coalesce(
        (select array_agg(section) from public.staff_section_permissions
         where role = public.my_staff_role() and can_access = true),
        array[]::text[]
      )
  end;
$$;

revoke all on function public.my_accessible_sections() from public;
grant execute on function public.my_accessible_sections() to authenticated;
