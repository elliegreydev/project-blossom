-- Two independent daily check-in reminders (morning / before bed) plus a
-- period tag on check-ins themselves, per stakeholder feedback (Sarah,
-- 28 Jul 2026) that most people use check-ins at roughly the same two
-- moments in a day. Synced via profiles (unlike weight/food tracking, which
-- stays device-local) since the server-side reminder cron needs these to
-- fire push notifications for a closed app.
alter table public.profiles
  add column if not exists check_in_morning_reminder_enabled boolean not null default false,
  add column if not exists check_in_morning_reminder_time text not null default '09:00',
  add column if not exists check_in_evening_reminder_enabled boolean not null default false,
  add column if not exists check_in_evening_reminder_time text not null default '21:00';

alter table public.check_ins
  add column if not exists period text check (period in ('morning', 'evening'));
