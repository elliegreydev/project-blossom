-- Appointment Builder is live. Keep the public roadmap honest without
-- changing any staff edits beyond this specific entry.

update public.product_roadmap
set stage = 'available', is_recent = true, sort_order = 17
where slug = 'appointment-builder';
