-- Access list for the dev site (dev.projectblossom.net).
--
-- DEV DATABASE ONLY. Nothing in the app reads this table in production; it
-- exists so testers can be let into the dev build individually rather than
-- everyone sharing one password. Harmless if it ever lands on prod (RLS on,
-- no policies, so only the service role can touch it) but it has no business
-- being there.
--
-- Deliberately separate from Blossom's own Supabase auth: signing testers in
-- with a real account would give them a *synced* profile, and then nobody
-- could test the logged-out, local-only experience that most users have.

create table if not exists public.dev_access (
  email          text primary key,
  password_hash  text not null,
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz
);

alter table public.dev_access enable row level security;
-- No policies on purpose: reachable only via the service role, from the
-- dev-login API route. Never exposed to the browser.

-- pgcrypto lives in the `extensions` schema on Supabase, not public, so every
-- call has to be schema-qualified or it fails with "function crypt does not
-- exist" at runtime.
create or replace function public.dev_access_add(
  p_email text,
  p_password text,
  p_is_admin boolean default false
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.dev_access (email, password_hash, is_admin)
  values (
    lower(trim(p_email)),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    p_is_admin
  )
  on conflict (email) do update
    set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
        is_admin = excluded.is_admin;
$$;

create or replace function public.dev_access_verify(
  p_email text,
  p_password text
)
returns table (email text, is_admin boolean)
language sql
security definer
set search_path = public
as $$
  update public.dev_access d
     set last_seen_at = now()
   where d.email = lower(trim(p_email))
     and d.password_hash = extensions.crypt(p_password, d.password_hash)
  returning d.email, d.is_admin;
$$;

revoke all on function public.dev_access_add(text, text, boolean) from public, anon, authenticated;
revoke all on function public.dev_access_verify(text, text) from public, anon, authenticated;
grant execute on function public.dev_access_add(text, text, boolean) to service_role;
grant execute on function public.dev_access_verify(text, text) to service_role;
