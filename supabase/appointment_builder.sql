-- Appointment Builder. Run after schema.sql and sync.sql.
--
-- This adds one private structured field to an existing appointment. It stays
-- covered by the appointments table's existing owner-only RLS policy and sync
-- guard, so no additional access path is introduced.

alter table public.appointments
  add column if not exists builder_data jsonb not null default '{}'::jsonb;
