-- Practical care supplies, run after schema.sql and sync.sql.
-- This is private, optional organisation for items such as needles, wipes and
-- sharps containers. It has no dose calculation or treatment advice logic.

create table if not exists public.care_supplies (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null check (char_length(trim(name)) > 0),
  category          text not null check (category in ('injection','care','other')),
  quantity          numeric not null check (quantity >= 0),
  supply_unit       text not null check (char_length(trim(supply_unit)) > 0),
  low_quantity      numeric check (low_quantity is null or low_quantity >= 0),
  renewal_date      date,
  delivery_date     date,
  expiry_date       date,
  provider          text,
  batch_number      text,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists care_supplies_user_updated_idx on public.care_supplies (user_id, updated_at);
alter table public.care_supplies enable row level security;
drop policy if exists "care_supplies_owner_all" on public.care_supplies;
create policy "care_supplies_owner_all" on public.care_supplies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists care_supplies_set_updated_at on public.care_supplies;
create trigger care_supplies_set_updated_at before update on public.care_supplies for each row execute function public.set_updated_at();
drop trigger if exists care_supplies_sync_guard on public.care_supplies;
create trigger care_supplies_sync_guard before update on public.care_supplies for each row execute function public.keep_newest_blossom_change();

create table if not exists public.care_supply_adjustments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  supply_id         uuid not null references public.care_supplies(id) on delete cascade,
  kind              text not null check (kind in ('initial','restock','correction','discarded')),
  quantity_change   numeric not null,
  quantity_after    numeric not null check (quantity_after >= 0),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists care_supply_adjustments_user_updated_idx on public.care_supply_adjustments (user_id, updated_at);
create index if not exists care_supply_adjustments_supply_created_idx on public.care_supply_adjustments (supply_id, created_at desc);
alter table public.care_supply_adjustments enable row level security;
drop policy if exists "care_supply_adjustments_owner_all" on public.care_supply_adjustments;
create policy "care_supply_adjustments_owner_all" on public.care_supply_adjustments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop trigger if exists care_supply_adjustments_set_updated_at on public.care_supply_adjustments;
create trigger care_supply_adjustments_set_updated_at before update on public.care_supply_adjustments for each row execute function public.set_updated_at();
drop trigger if exists care_supply_adjustments_sync_guard on public.care_supply_adjustments;
create trigger care_supply_adjustments_sync_guard before update on public.care_supply_adjustments for each row execute function public.keep_newest_blossom_change();
