-- Two roadmap items were already fully built by the time this was written -
-- push notifications (this session's earlier Tier 3 work) and medication
-- supply tracking (ChatGPT's parallel work) - the roadmap just didn't know
-- it yet. Flips both to "available" with a temporary "Recently added" badge.

update public.product_roadmap
set stage = 'available', is_recent = true, sort_order = 15
where slug = 'background-reminders';

update public.product_roadmap
set stage = 'available', is_recent = true, sort_order = 16
where slug = 'medication-supply-planner';
