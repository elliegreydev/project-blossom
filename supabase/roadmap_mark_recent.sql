-- These were marked stage='available' as they shipped this session (and
-- Privacy Receipt the session before), but is_recent was never set, so none
-- of them were showing the "Recently added" badge on the public roadmap
-- page - and the new beta hub's "What's new" list reads this same flag.
update public.product_roadmap set is_recent = true
  where slug in (
    'privacy-receipt',
    'safety-check-ins',
    'blossom-passport',
    'trusted-circle',
    'advanced-charts'
  );
