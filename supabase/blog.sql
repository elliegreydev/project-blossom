-- Blog: staff-authored posts, public once published. Same lifecycle shape
-- as app_notices (draft/published/archived), but deliberately no separate
-- admin page - editing controls live directly on the public /blog pages
-- themselves for staff, per Ellie's preference.

create table if not exists public.blog_posts (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title        text not null check (char_length(title) between 1 and 120),
  body         text not null check (char_length(body) between 1 and 20000),
  status       text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by   uuid not null references auth.users(id),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists blog_posts_status_idx on public.blog_posts (status, published_at desc);
alter table public.blog_posts enable row level security;

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

drop policy if exists "blog_posts_public_read" on public.blog_posts;
create policy "blog_posts_public_read" on public.blog_posts
  for select using (status = 'published');

drop policy if exists "blog_posts_staff_all" on public.blog_posts;
create policy "blog_posts_staff_all" on public.blog_posts
  for all using (public.is_staff()) with check (public.is_staff());

-- Same activity-log treatment as the other staff-only-write tables added
-- this session.
drop trigger if exists blog_posts_log_activity on public.blog_posts;
create trigger blog_posts_log_activity
  after insert or update or delete on public.blog_posts
  for each row execute function public.log_staff_activity();
