-- Audit pass (post-usage-reset), first batch of fixes found by re-reading
-- this session's RLS policies against an adversarial "what could a raw REST
-- call do that the app's own UI never asks for" lens.

-- 1. Both public-insert policies checked status/reviewed_by/reviewed_at but
--    not review_note - a raw insert bypassing the app's own API route could
--    plant a fake internal note (e.g. "already approved by Ellie") that
--    would show up in the staff queue as if a reviewer had already left it.
--    Neither app route ever sends review_note on insert, so this only
--    tightens what was already the real intent.
drop policy if exists "staff_applications_public_insert" on public.staff_applications;
create policy "staff_applications_public_insert" on public.staff_applications
  for insert with check (
    status = 'pending' and reviewed_by is null and reviewed_at is null and review_note is null
  );

drop policy if exists "feedback_items_public_insert" on public.feedback_items;
create policy "feedback_items_public_insert" on public.feedback_items
  for insert with check (
    status = 'submitted' and reviewed_by is null and reviewed_at is null
    and vote_count = 0 and review_note is null
  );

-- 2. staff_applications was the only staff-mutable table from this session
--    with no activity-log trigger - accept/reject decisions on who joins the
--    team went untracked while every other staff action did. Insert isn't
--    logged (that's the public submission, not staff activity), only
--    updates - same restriction feedback_items already uses.
drop trigger if exists staff_applications_log_activity on public.staff_applications;
create trigger staff_applications_log_activity
  after update on public.staff_applications
  for each row execute function public.log_staff_activity();
