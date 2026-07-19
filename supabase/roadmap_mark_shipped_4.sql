-- Trusted Circle is built and live now.
update public.product_roadmap set stage = 'available'
  where slug = 'trusted-circle';
