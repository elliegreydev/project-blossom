-- Medication supply tracking. Run after schema.sql and sync.sql.
-- Every table is private to its owner through RLS. Supply tracking is optional:
-- medications with no supply row remain exactly as they were.

create table if not exists public.medication_supplies (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  medication_id     uuid not null references public.medications(id) on delete cascade,
  label             text,
  quantity          numeric not null check (quantity >= 0),
  supply_unit       text not null check (char_length(trim(supply_unit)) > 0),
  amount_per_dose   numeric not null check (amount_per_dose > 0),
  low_supply_days   integer check (low_supply_days is null or low_supply_days >= 0),
  renewal_date      date,
  expiry_date       date,
  pharmacy          text,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists medication_supplies_user_updated_idx
  on public.medication_supplies (user_id, updated_at);
alter table public.medication_supplies enable row level security;

drop policy if exists "medication_supplies_owner_all" on public.medication_supplies;
create policy "medication_supplies_owner_all" on public.medication_supplies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists medication_supplies_set_updated_at on public.medication_supplies;
create trigger medication_supplies_set_updated_at before update on public.medication_supplies
  for each row execute function public.set_updated_at();
drop trigger if exists medication_supplies_sync_guard on public.medication_supplies;
create trigger medication_supplies_sync_guard before update on public.medication_supplies
  for each row execute function public.keep_newest_blossom_change();

create table if not exists public.medication_supply_adjustments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  supply_id         uuid not null references public.medication_supplies(id) on delete cascade,
  medication_id     uuid not null references public.medications(id) on delete cascade,
  kind              text not null check (kind in ('initial','dose','restock','correction','discarded')),
  quantity_change   numeric not null,
  quantity_after    numeric not null check (quantity_after >= 0),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  client_updated_at timestamptz not null default now(),
  deleted_at        timestamptz
);

create index if not exists medication_supply_adjustments_user_updated_idx
  on public.medication_supply_adjustments (user_id, updated_at);
create index if not exists medication_supply_adjustments_supply_created_idx
  on public.medication_supply_adjustments (supply_id, created_at desc);
alter table public.medication_supply_adjustments enable row level security;

drop policy if exists "medication_supply_adjustments_owner_all" on public.medication_supply_adjustments;
create policy "medication_supply_adjustments_owner_all" on public.medication_supply_adjustments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists medication_supply_adjustments_set_updated_at on public.medication_supply_adjustments;
create trigger medication_supply_adjustments_set_updated_at before update on public.medication_supply_adjustments
  for each row execute function public.set_updated_at();
drop trigger if exists medication_supply_adjustments_sync_guard on public.medication_supply_adjustments;
create trigger medication_supply_adjustments_sync_guard before update on public.medication_supply_adjustments
  for each row execute function public.keep_newest_blossom_change();

-- The current supply is chosen on the medication itself. This lets someone
-- keep separate current and backup supplies without Blossom guessing which
-- one should be reduced when they log a dose.
alter table public.medications
  add column if not exists active_supply_id uuid references public.medication_supplies(id) on delete set null;
