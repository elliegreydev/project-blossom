-- Trusted Circle / Bridge / Safety check-ins discoverability nudge is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'sharing-tools-discoverability';
