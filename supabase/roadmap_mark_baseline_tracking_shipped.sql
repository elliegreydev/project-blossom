-- Personal baseline tracking (weight baseline snapshot) is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'personal-baseline-tracking';
