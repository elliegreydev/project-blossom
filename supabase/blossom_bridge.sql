-- Blossom Bridge: temporary, read-only share links. Architecturally
-- different from Trusted Circle - recipients have no account and no
-- session at all, so access can't go through client-side RLS the way
-- Trusted Circle does. Every recipient-facing read goes through a
-- service-role server route instead (see src/app/api/bridge/[token]).

create table if not exists public.bridge_links (
  id         uuid primary key default gen_random_uuid(), -- doubles as the link token
  owner_id   uuid not null references auth.users(id) on delete cascade,
  categories text[] not null default '{}'
             check (categories <@ array['profile','journey','medications','appointments','checkins','goals']),
  label      text check (label is null or char_length(label) <= 100),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists bridge_links_owner_idx on public.bridge_links (owner_id);
alter table public.bridge_links enable row level security;

-- Owner manages their own links directly - list, create, revoke, delete.
-- Deliberately NO read policy for anyone else: a recipient holding the
-- token has no session at all, so this table is never queried client-side
-- on their behalf - only the service-role route in /api/bridge/[token]
-- reads it for them.
drop policy if exists "bridge_links_owner_all" on public.bridge_links;
create policy "bridge_links_owner_all" on public.bridge_links
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Every time a recipient actually opens a link (taps "View"), the server
-- route writes a row here - the "access history" part of this feature.
create table if not exists public.bridge_access_log (
  id          uuid primary key default gen_random_uuid(),
  link_id     uuid not null references public.bridge_links(id) on delete cascade,
  accessed_at timestamptz not null default now()
);
create index if not exists bridge_access_log_link_idx on public.bridge_access_log (link_id);
alter table public.bridge_access_log enable row level security;

drop policy if exists "bridge_access_log_owner_read" on public.bridge_access_log;
create policy "bridge_access_log_owner_read" on public.bridge_access_log
  for select using (
    exists (select 1 from public.bridge_links l where l.id = link_id and l.owner_id = auth.uid())
  );
-- Deliberately no insert policy for any client role - only the
-- service-role server route ever writes an access log entry.
