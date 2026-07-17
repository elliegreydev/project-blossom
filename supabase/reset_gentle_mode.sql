-- Gentle Mode is being pulled back for rework. gentle_mode stays a column
-- on profiles, but resets to off for everyone so the preference doesn't
-- stay silently on for a feature no longer reachable in Settings.

update public.profiles
set gentle_mode = false
where gentle_mode = true;
