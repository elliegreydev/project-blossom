-- Internal knowledge base: durable, written playbooks and reference docs,
-- distinct from Handoff notes (which are ephemeral, short-lived context).

create table if not exists public.staff_docs (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 200),
  category      text not null default 'general' check (category in ('support-process', 'moderation', 'onboarding', 'general')),
  body          text not null check (char_length(body) between 1 and 20000),
  updated_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists staff_docs_category_idx on public.staff_docs (category, title);
alter table public.staff_docs enable row level security;

drop policy if exists "staff_docs_staff_all" on public.staff_docs;
create policy "staff_docs_staff_all" on public.staff_docs
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists staff_docs_log_activity on public.staff_docs;
create trigger staff_docs_log_activity
  after insert or update or delete on public.staff_docs
  for each row execute function public.log_staff_activity();
