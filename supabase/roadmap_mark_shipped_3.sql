-- Blossom Passport is built and live now.
update public.product_roadmap set stage = 'available'
  where slug = 'blossom-passport';
