-- The reminder cron used to read "who's already been notified" once at the
-- start, decide what's pending, send everything, then batch-write all the
-- "notified" markers back at the very end. If a run takes a while (a slow
-- push provider, many subscribers) or two runs ever overlap, a later run can
-- read stale state before an earlier one has written anything back, and
-- re-send a reminder that's already gone out - confirmed live for a
-- check-in reminder sent twice 10 minutes apart, well inside the 45-minute
-- re-nag gate, with notify_count resetting to 1 instead of incrementing.
--
-- This makes the "am I allowed to send this, and did I just claim it" check
-- a single atomic statement, so it can't be fooled by timing regardless of
-- what's actually causing the overlap.
create or replace function public.claim_reminder_notification(
  p_user_id uuid,
  p_reminder_key text,
  p_max_notifications int default 3,
  p_renag_interval_seconds int default 2700
)
returns boolean
language sql
security definer
set search_path = public
as $$
  with attempt as (
    insert into push_notified_reminders (user_id, reminder_key, sent_at, notify_count, snoozed_until)
    values (p_user_id, p_reminder_key, now(), 1, null)
    on conflict (user_id, reminder_key) do update
      set sent_at = now(),
          notify_count = push_notified_reminders.notify_count + 1,
          snoozed_until = null
    where
      (
        push_notified_reminders.snoozed_until is not null
        and push_notified_reminders.snoozed_until <= now()
        and push_notified_reminders.notify_count < p_max_notifications
      )
      or
      (
        push_notified_reminders.snoozed_until is null
        and push_notified_reminders.notify_count < p_max_notifications
        and push_notified_reminders.sent_at <= now() - make_interval(secs => p_renag_interval_seconds)
      )
    returning 1
  )
  select exists(select 1 from attempt);
$$;

revoke all on function public.claim_reminder_notification(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.claim_reminder_notification(uuid, text, int, int) to service_role;
