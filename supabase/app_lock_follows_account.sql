-- The app lock used to be entirely local: sign in on a second device and
-- everything downloaded with no lock at all, despite the owner having set
-- one. That's a nasty surprise in an app whose whole point is privacy.
--
-- This syncs the *intent* to lock. The PIN hash deliberately stays on the
-- device it was set on and is never uploaded - so a new device knows the
-- account wants a lock, and asks the person to set a PIN for that device
-- before showing anything (see needsLocalPinSetup in src/lib/db.ts).

alter table public.profiles
  add column if not exists app_lock_enabled boolean not null default false;

-- app_lock_type was added at some point but nothing ever read or wrote it.
-- Dropping it so the next person doesn't assume it means something.
alter table public.profiles
  drop column if exists app_lock_type;
