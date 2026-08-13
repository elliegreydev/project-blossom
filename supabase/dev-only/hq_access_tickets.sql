-- One-shot nonce store for the Grey Studios HQ dev entry route
-- (src/app/api/hq-enter/route.ts). HQ signs a short lived ticket, this app
-- verifies it and burns the nonce here so the same ticket can never be
-- replayed. The primary key is the whole enforcement: a duplicate insert is
-- the replay signal.
--
-- This table only ever gets rows on a dev deployment. The entry route reads
-- HQ_DEV_ACCESS_SECRET and returns 404 when it is absent, and only dev
-- carries that variable, so production never reaches this table at all.
--
-- It lives in supabase/dev-only/ so it stays out of production by
-- construction, not by remembering. scripts/migrate.mjs --all does a
-- non-recursive readdirSync("supabase") and keeps only names ending in .sql,
-- so it sees "dev-only" as a directory and skips it. That matters because
-- migrate.mjs reads SUPABASE_DB_URL from .env.local, which is the PRODUCTION
-- project: a routine --all run would otherwise create this dev-only table in
-- production and contradict the paragraph above.
--
-- Apply it by hand, against dev only:
--   node scripts/migrate-tolerant.mjs .env.dev.local supabase/dev-only/hq_access_tickets.sql
--
-- No public policies: the route talks to it with the service role, and
-- nothing in the client ever touches it.

create table if not exists public.hq_access_tickets (
  nonce      text primary key,
  email      text,
  used_at    timestamptz not null default now()
);

alter table public.hq_access_tickets enable row level security;

create index if not exists hq_access_tickets_used_at_idx
  on public.hq_access_tickets (used_at);
