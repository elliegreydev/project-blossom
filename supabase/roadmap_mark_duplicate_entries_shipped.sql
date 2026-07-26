-- Duplicate appointments & medications warning is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'duplicate-entries';
