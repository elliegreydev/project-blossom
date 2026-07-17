-- Crisis-resource quick access shipped (src/app/crisis-support) - flips it
-- from "next" to "available" now that it's live.

update public.product_roadmap
set stage = 'available', is_recent = true, sort_order = 17
where slug = 'crisis-resource-quick-access';
