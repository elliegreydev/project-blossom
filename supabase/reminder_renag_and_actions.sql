-- Adds re-nag tracking (a missed dose now gets a couple of follow-up
-- reminders instead of firing once and giving up) and support for the
-- "Mark as taken" / "Snooze" push notification action buttons.

alter table public.push_notified_reminders
  add column if not exists notify_count integer not null default 1;

alter table public.push_notified_reminders
  add column if not exists snoozed_until timestamptz;

-- The "Mark as taken" / "Snooze" actions are triggered from a notification
-- click, authenticated as the signed-in user (see
-- src/app/api/reminders/action/route.ts), which writes through the
-- service-role client rather than this table's RLS - so no policy change
-- needed here, this table stays exactly as locked-down as it was.
