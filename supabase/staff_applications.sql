-- Public "join the team" applications. Anyone can submit one (no account
-- needed); only Administrator+ can read or act on them. Deliberately no
-- delete policy - rejected/accepted applications stay as a record.

create table if not exists public.staff_applications (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 200),
  email             text not null check (char_length(email) between 3 and 320),
  message           text not null check (char_length(message) between 1 and 4000),
  area_of_interest  text check (area_of_interest is null or char_length(area_of_interest) <= 200),
  status            text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  reviewed_by       uuid references auth.users(id),
  reviewed_at       timestamptz,
  review_note       text,
  created_at        timestamptz not null default now()
);
create index if not exists staff_applications_status_idx on public.staff_applications (status, created_at);
alter table public.staff_applications enable row level security;

drop policy if exists "staff_applications_public_insert" on public.staff_applications;
create policy "staff_applications_public_insert" on public.staff_applications
  for insert with check (status = 'pending' and reviewed_by is null and reviewed_at is null);

drop policy if exists "staff_applications_staff_read" on public.staff_applications;
create policy "staff_applications_staff_read" on public.staff_applications
  for select using (public.my_staff_rank() >= 80);

drop policy if exists "staff_applications_staff_update" on public.staff_applications;
create policy "staff_applications_staff_update" on public.staff_applications
  for update using (public.my_staff_rank() >= 80) with check (public.my_staff_rank() >= 80);
