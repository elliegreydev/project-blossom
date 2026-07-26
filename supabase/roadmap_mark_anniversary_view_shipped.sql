-- Journey anniversary view is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'journey-anniversary-view';
