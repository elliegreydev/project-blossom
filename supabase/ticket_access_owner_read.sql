-- The ticket owner needs to see whether they currently have an active
-- access grant (Privacy Receipt page) - missed this when support_tickets.sql
-- only added a staff-read policy on support_ticket_access_grants.
drop policy if exists "support_ticket_access_grants_owner_read" on public.support_ticket_access_grants;
create policy "support_ticket_access_grants_owner_read" on public.support_ticket_access_grants
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  );
