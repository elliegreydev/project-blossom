-- Users currently have no way to see whether a support case is open on
-- their own account - support_cases only had a staff-read policy. Needed
-- for the Privacy Receipt (surfacing "active access" honestly), but a
-- genuine gap on its own regardless of that feature: someone should be able
-- to know if staff currently have temporary access to their data.
-- Read-only, additive, no change to the existing staff policy.

drop policy if exists "support_cases_owner_read" on public.support_cases;
create policy "support_cases_owner_read" on public.support_cases
  for select using (auth.uid() = user_id);
