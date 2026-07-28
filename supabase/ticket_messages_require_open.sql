-- Messages could still be sent on a resolved/closed ticket - the RLS insert
-- checks never looked at status. Reading old messages on a resolved ticket
-- should still work (left the SELECT-facing USING clauses alone), but new
-- messages now require the ticket to actually be open.
drop policy if exists "support_ticket_messages_owner_all" on public.support_ticket_messages;
create policy "support_ticket_messages_owner_all" on public.support_ticket_messages
  for all using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
  )
  with check (
    sender_id = auth.uid() and not is_system
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid() and t.status = 'open')
  );

drop policy if exists "support_ticket_messages_staff_insert" on public.support_ticket_messages;
create policy "support_ticket_messages_staff_insert" on public.support_ticket_messages
  for insert with check (
    public.is_staff() and public.can_access_ticket(ticket_id) and sender_id = auth.uid() and not is_system
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.status = 'open')
  );
