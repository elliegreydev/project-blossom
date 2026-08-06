-- Theme + appearance are ordinary preferences, so they sync like the others.
-- Existing rows default to Classic, which is the design Blossom has always
-- had: nobody wakes up to a different-looking app.
alter table public.profiles
  add column if not exists theme text not null default 'classic';

alter table public.profiles
  add column if not exists appearance text not null default 'system';
