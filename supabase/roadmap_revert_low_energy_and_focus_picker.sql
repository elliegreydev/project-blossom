-- Follow-up to roadmap_revert_pulled_features.sql - Low-Energy Mode and the
-- "What do I need today?" focus picker were also pulled back out of the
-- live app (same rework-not-rejection reasoning), but their roadmap cards
-- were missed in that first pass. Flipping both back to "next" now so the
-- roadmap doesn't claim either is available when it isn't.

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 190,
    description = 'A quieter view for hard days: essential reminders, the next appointment and a couple of one-tap actions.'
where slug = 'low-energy-mode';

update public.product_roadmap
set stage = 'next', is_recent = false, sort_order = 200,
    description = 'A calmer starting point based on an intention like organise, reflect, find support or prepare for an appointment.'
where slug = 'what-do-i-need-today';
