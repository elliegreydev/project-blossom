-- Aurora AI beta usage guard. Run this after schema.sql and sync.sql.
-- It deliberately records only aggregate usage, never message or reply content.

begin;

create table if not exists public.aurora_ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_kind text not null check (request_kind in ('guide', 'research')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  model text not null,
  safety_outcome text not null default 'normal' check (safety_outcome in ('normal', 'crisis', 'dose_change')),
  created_at timestamptz not null default now()
);

create index if not exists aurora_ai_usage_user_created_idx
  on public.aurora_ai_usage (user_id, created_at desc);

alter table public.aurora_ai_usage enable row level security;
revoke all on public.aurora_ai_usage from anon, authenticated;

comment on table public.aurora_ai_usage is
  'Aggregate Aurora AI rate-limit and spend data only. Never stores prompts, replies, sources, or Blossom records.';

commit;
