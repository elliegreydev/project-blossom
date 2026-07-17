-- Adds the state/province/nation field alongside the existing region
-- (country) column, for the real country/subregion picker. Idempotent.

alter table public.profiles
  add column if not exists subregion text;
