-- Quiet hours for notifications is live now.
update public.product_roadmap set stage = 'available', is_recent = true
  where slug = 'notification-quiet-hours';
