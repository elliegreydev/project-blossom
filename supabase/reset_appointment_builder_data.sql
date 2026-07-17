-- Appointment Builder is being pulled back for rework. builder_data stays
-- on the appointments table (appointments themselves aren't going away),
-- but resets to empty for every existing appointment so no prep notes,
-- checklists, or private notes from the builder linger unreachable.

update public.appointments
set builder_data = '{}'::jsonb
where builder_data is not null and builder_data <> '{}'::jsonb;
