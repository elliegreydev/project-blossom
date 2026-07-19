-- Budget tracker module is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'budget-tracker';
