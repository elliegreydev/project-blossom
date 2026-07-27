-- Replaces the section-level permission matrix (staff_section_permissions)
-- with real per-page granularity - every individual staff tool gets its own
-- togglable row per role, not just a whole group at once. Seeded to match
-- exactly what already worked (everything open, except the four
-- Administrator+ tools), so shipping this changes no one's access on day one.
--
-- Pages: /support, /ideas, /search, /issues, /notes, /docs, /incidents,
-- /onboarding, /analytics, /operations, /infra, /audit, /notices, /roadmap,
-- /resources, /team, /applications, /beta
-- ("/permissions" itself is deliberately excluded - it's hardcoded
-- Owner-only in the page component regardless of this table, so a row for
-- it would be a no-op toggle at best and a confusing trap at worst.)

drop policy if exists "staff_section_permissions_read" on public.staff_section_permissions;
drop policy if exists "staff_section_permissions_write" on public.staff_section_permissions;
drop table if exists public.staff_section_permissions;
drop function if exists public.has_section_access(text);
drop function if exists public.my_accessible_sections();

create table if not exists public.staff_page_permissions (
  role       text not null,
  page       text not null,
  can_access boolean not null default true,
  primary key (role, page)
);
alter table public.staff_page_permissions enable row level security;

drop policy if exists "staff_page_permissions_read" on public.staff_page_permissions;
create policy "staff_page_permissions_read" on public.staff_page_permissions
  for select using (public.is_staff());

-- Only an Owner can edit the matrix - same protection level as the Team
-- roster, since this table controls who can see what.
drop policy if exists "staff_page_permissions_write" on public.staff_page_permissions;
create policy "staff_page_permissions_write" on public.staff_page_permissions
  for all using (public.my_staff_rank() >= 100)
  with check (public.my_staff_rank() >= 100);

insert into public.staff_page_permissions (role, page, can_access)
select role, page, (page not in ('/team', '/applications', '/beta') or role in ('administrator', 'owner'))
from unnest(array['trial_moderator', 'moderator', 'manager', 'administrator', 'owner']) as role
cross join unnest(array[
  '/support', '/ideas', '/search',
  '/issues', '/notes', '/docs', '/incidents', '/onboarding',
  '/analytics', '/operations', '/infra', '/audit',
  '/notices', '/roadmap', '/resources',
  '/team', '/applications', '/beta'
]) as page
on conflict (role, page) do nothing;

-- Owner always has every page regardless of what's in the table - a safety
-- floor so a mis-click on the matrix can never lock the owner out.
create or replace function public.has_page_access(page_path text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.my_staff_rank() >= 100
    or coalesce(
      (select can_access from public.staff_page_permissions
       where role = public.my_staff_role() and page = page_path),
      false
    );
$$;

revoke all on function public.has_page_access(text) from public;
grant execute on function public.has_page_access(text) to authenticated;

-- One round trip for the nav/tile pages to build themselves from, instead
-- of one call per page.
create or replace function public.my_accessible_pages()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.my_staff_rank() >= 100 then
      array['/support', '/ideas', '/search',
            '/issues', '/notes', '/docs', '/incidents', '/onboarding',
            '/analytics', '/operations', '/infra', '/audit',
            '/notices', '/roadmap', '/resources',
            '/team', '/applications', '/beta']
    else
      coalesce(
        (select array_agg(page) from public.staff_page_permissions
         where role = public.my_staff_role() and can_access = true),
        array[]::text[]
      )
  end;
$$;

revoke all on function public.my_accessible_pages() from public;
grant execute on function public.my_accessible_pages() to authenticated;
