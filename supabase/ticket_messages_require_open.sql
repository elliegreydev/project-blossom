-- Messages could still be sent on a resolved/closed ticket - the RLS insert
-- checks never looked at status. Reading old messages on a resolved ticket
-- should still work (left the SELECT-facing USING clauses alone), but new
-- messages now require the ticket to actually be open.
-- A ticket owner could rewrite the staff replies on their own ticket.
--
-- This was FOR ALL with USING "this ticket is mine", so UPDATE and DELETE
-- reached every message on it, staff answers and system notes included.
-- Somebody could edit what support had told them, or delete the record of it,
-- and the audit trail would agree with them afterwards.
--
-- Nothing in the app ever updates or deletes a ticket message, so owners get
-- read and write-new only. Staff keep their own policies.
drop policy if exists "support_ticket_messages_owner_all" on public.support_ticket_messages;

create policy "support_ticket_messages_owner_read" on public.support_ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t
            where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid())
  );

create policy "support_ticket_messages_owner_insert" on public.support_ticket_messages
  for insert with check (
    exists (select 1 from public.support_tickets t
            where t.id = support_ticket_messages.ticket_id and t.user_id = auth.uid())
  );

drop policy if exists "support_ticket_messages_staff_insert" on public.support_ticket_messages;
create policy "support_ticket_messages_staff_insert" on public.support_ticket_messages
  for insert with check (
    public.is_staff() and public.can_access_ticket(ticket_id) and sender_id = auth.uid() and not is_system
    and exists (select 1 from public.support_tickets t where t.id = ticket_id and t.status = 'open')
  );
