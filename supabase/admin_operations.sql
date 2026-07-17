-- Admin operations: short, staff-authored app notices. Notices are the only
-- new public content here. They are deliberately bounded by publication and
-- expiry timestamps; no member data is added or read by this feature.

-- Support access is temporary. Existing open cases receive a short window from
-- their original opening time, so an old forgotten case cannot keep access
-- alive indefinitely. Staff can extend a genuinely active case for 72 hours.
alter table public.support_cases
  add column if not exists access_expires_at timestamptz;

update public.support_cases
  set access_expires_at = created_at + interval '72 hours'
  where status = 'open' and access_expires_at is null;

alter table public.support_cases
  alter column access_expires_at set default (now() + interval '72 hours');

create or replace function public.has_open_support_case(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1 from public.support_cases
    where user_id = target_user_id
      and status = 'open'
      and access_expires_at > now()
  );
$$;
revoke all on function public.has_open_support_case(uuid) from public;
grant execute on function public.has_open_support_case(uuid) to authenticated;

create table if not exists public.app_notices (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 90),
  body text not null check (char_length(body) between 1 and 320),
  tone text not null default 'info' check (tone in ('info', 'care')),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid not null references auth.users(id),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create index if not exists app_notices_public_idx on public.app_notices (status, starts_at desc);
alter table public.app_notices enable row level security;

drop policy if exists "app_notices_staff_all" on public.app_notices;
create policy "app_notices_staff_all" on public.app_notices
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "app_notices_published_read" on public.app_notices;
create policy "app_notices_published_read" on public.app_notices
  for select using (
    status = 'published'
    and starts_at <= now()
    and (ends_at is null or ends_at > now())
  );

drop trigger if exists app_notices_set_updated_at on public.app_notices;
create trigger app_notices_set_updated_at before update on public.app_notices
  for each row execute function public.set_updated_at();
