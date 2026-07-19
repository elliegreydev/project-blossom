-- Safety check-ins (this session) and Privacy Receipt (previous session) are
-- both actually built and live now, but still carried stage='later' from
-- before either was scoped - stale roadmap, the exact failure mode this
-- project checks for. Marking both 'available'.

update public.product_roadmap set stage = 'available'
  where slug = 'safety-check-ins';

update public.product_roadmap set stage = 'available'
  where slug = 'privacy-receipt';
