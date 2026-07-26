-- "What do I need today?" is satisfied by the Home intention picker's
-- "Check today's tasks" option, built in the same batch as the restored
-- modular Home screen.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'what-do-i-need-today';
