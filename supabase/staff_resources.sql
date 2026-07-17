-- Moves region resources from a bundled static file to a staff-editable
-- table. The old region_resources table was unused (0 rows) so this
-- recreates it with the real shape rather than trying to migrate columns.

drop table if exists public.region_resources;

create table public.region_resources (
  id                text primary key,
  country           text not null,
  subregion         text,
  city_name         text,
  org_name          text not null,
  category          text not null check (category in ('emergency','crisis','peer','legal','housing','general')),
  contact_info      text not null,
  availability      text,
  source_url        text not null,
  note              text,
  last_reviewed_at  date not null,
  reviewed_by_staff boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index region_resources_country_idx on public.region_resources (country, subregion);
alter table public.region_resources enable row level security;

create policy "region_resources_public_read" on public.region_resources
  for select using (true);
create policy "region_resources_staff_write" on public.region_resources
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists region_resources_set_updated_at on public.region_resources;
create trigger region_resources_set_updated_at before update on public.region_resources
  for each row execute function public.set_updated_at();

create table if not exists public.legal_context_notes (
  id                uuid primary key default gen_random_uuid(),
  country           text not null,
  subregion         text not null,
  note              text not null,
  source_url        text not null,
  last_reviewed_at  date not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (country, subregion)
);
alter table public.legal_context_notes enable row level security;

create policy "legal_context_notes_public_read" on public.legal_context_notes
  for select using (true);
create policy "legal_context_notes_staff_write" on public.legal_context_notes
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists legal_context_notes_set_updated_at on public.legal_context_notes;
create trigger legal_context_notes_set_updated_at before update on public.legal_context_notes
  for each row execute function public.set_updated_at();
