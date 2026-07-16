-- Foundation for real (server-triggered) push notifications. Only reaches
-- signed-in, sync-enabled accounts - local-only users keep the foreground-only
-- reminders in src/lib/reminders.ts / LocalReminderService.
-- Run after schema.sql and sync.sql. Idempotent and safe to re-run.

alter table public.profiles
  add column if not exists timezone text;

-- One row per subscribed browser/device. A user can have several (phone,
-- laptop); each gets its own push. Endpoint is the whole identity of a
-- subscription, so it's the natural unique key for upserts.
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_owner_all" on public.push_subscriptions;
create policy "push_subscriptions_owner_all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Server-side dedup for the reminder cron (src/app/api/cron/send-reminders),
-- mirroring the client's notifiedReminders table. No RLS policy is granted -
-- only the service-role key (used exclusively by the cron route) touches
-- this table, so it's deliberately locked to everyone else including owners.
create table if not exists public.push_notified_reminders (
  user_id       uuid not null references auth.users(id) on delete cascade,
  reminder_key  text not null,
  sent_at       timestamptz not null default now(),
  primary key (user_id, reminder_key)
);
alter table public.push_notified_reminders enable row level security;
