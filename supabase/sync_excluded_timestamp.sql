-- Give the "what syncs" choice a timestamp of its own.
--
-- Everything about a profile currently resolves as one row, last write wins on
-- client_updated_at. For most fields that is fine. For this one it is a privacy
-- leak, because losing the race silently reverts a decision somebody made about
-- their own journal.
--
-- The sequence, all of it ordinary:
--   1. She excludes "journal" on her phone. The phone pushes the profile.
--   2. Her laptop has been offline since before that, and has its own pending
--      profile edit: any settings change at all, a theme, a reminder time.
--   3. The laptop reconnects. Its pull SKIPS the remote profile, because the
--      pending local edit is newer than the remote row, so it never learns
--      about the exclusion.
--   4. The laptop pushes its own profile, carrying the OLD empty list.
--   5. The phone pulls that and starts uploading journal entries again.
--
-- Nobody did anything wrong and the app quietly undid a privacy choice.
--
-- Fixed by timestamping the field rather than the row, so the newest DECISION
-- wins instead of the newest SAVE. A union would also stop the leak and was the
-- obvious suggestion, but it would mean a category could never be re-enabled:
-- the server's copy would always win and "keep my journal local" would become
-- permanent. This keeps both directions working.

alter table public.profiles
  add column if not exists sync_excluded_categories_at timestamptz;

-- Seeded from the row's own timestamp so existing devices have something to
-- compare against rather than a null that always loses.
update public.profiles
   set sync_excluded_categories_at = coalesce(client_updated_at, updated_at, created_at)
 where sync_excluded_categories_at is null;

comment on column public.profiles.sync_excluded_categories_at is
  'When sync_excluded_categories was last changed, on whichever device changed it. Merged on this rather than on the row, so a stale device cannot revert somebody''s privacy choice by saving an unrelated setting.';
