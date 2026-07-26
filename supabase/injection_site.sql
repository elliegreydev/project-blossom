-- Injection site rotation tracking - optional memory aid on a dose log,
-- never a rotation schedule or medical instruction.
alter table public.medication_logs add column if not exists injection_site text;
