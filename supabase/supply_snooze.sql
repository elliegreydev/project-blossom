-- Lets a low-supply / needs-attention heads-up be dismissed for a while
-- instead of only ever on or off - see snoozeMedicationSupply/
-- snoozeCareSupply in src/lib/db.ts.

alter table public.medication_supplies
  add column if not exists snoozed_until timestamptz;

alter table public.care_supplies
  add column if not exists snoozed_until timestamptz;
