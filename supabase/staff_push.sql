-- Push notification subscriptions for Blossom Staff. Separate table from
-- the main app's push_subscriptions - different app, different service
-- worker/origin, different VAPID identity.

create table if not exists public.staff_push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
create index if not exists staff_push_subscriptions_user_idx on public.staff_push_subscriptions (user_id);
alter table public.staff_push_subscriptions enable row level security;

drop policy if exists "staff_push_subscriptions_own" on public.staff_push_subscriptions;
create policy "staff_push_subscriptions_own" on public.staff_push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
