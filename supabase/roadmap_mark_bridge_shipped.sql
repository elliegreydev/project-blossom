-- Blossom Bridge is built and live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'blossom-bridge';
