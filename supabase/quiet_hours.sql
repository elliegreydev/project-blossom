-- Quiet hours: a "do not disturb" window that holds reminder push
-- notifications back instead of firing them (see src/lib/reminders.ts's
-- isQuietHours and its use in the reminder cron).
alter table public.profiles add column if not exists quiet_hours_enabled boolean not null default false;
alter table public.profiles add column if not exists quiet_hours_start text;
alter table public.profiles add column if not exists quiet_hours_end text;
