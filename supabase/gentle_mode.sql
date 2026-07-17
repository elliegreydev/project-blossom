-- Gentle Mode. Run after schema.sql and sync.sql.
-- This changes presentation preferences only; it never changes a person's
-- medication, reminders, appointments or private records.

alter table public.profiles
  add column if not exists gentle_mode boolean not null default false;
