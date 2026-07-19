-- Global search is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'global-search';
