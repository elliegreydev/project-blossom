-- Gender euphoria journal is restored and live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'gender-euphoria-journal';
