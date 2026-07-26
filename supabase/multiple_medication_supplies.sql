-- Multiple medication supplies and an explicitly chosen current supply.
-- Run after medication_supply.sql and sync.sql.
-- Existing supply rows are preserved; the app selects the earliest existing
-- supply as current until the user chooses another one.

alter table public.medication_supplies
  drop constraint if exists medication_supplies_medication_id_key;

alter table public.medication_supplies
  add column if not exists label text;

alter table public.medications
  add column if not exists active_supply_id uuid references public.medication_supplies(id) on delete set null;

create index if not exists medication_supplies_user_medication_idx
  on public.medication_supplies (user_id, medication_id, updated_at);
