-- Removing a voice practice goal must not destroy the sessions under it.
--
-- Those sessions can carry a recording. The recording itself never reaches
-- this database (it is a local-only Blob, stripped before push and absent
-- from every export), so the row here is only metadata. But if the server
-- cascade-deletes the session row, the next pull deletes the local row too,
-- and the local row is where the audio lives. Tidying up a stale goal would
-- quietly destroy the only copy of the first time somebody heard their own
-- voice change.
--
-- The client now orphans sessions instead of deleting them (deleteVoiceGoal
-- in src/lib/db.ts, which also pushes the goal_id -> null upserts BEFORE the
-- goal delete so an un-migrated server has nothing left to cascade into).
-- This makes the database agree with that rather than relying on ordering.
--
-- Apply to BOTH projects: prod tpbqqlbtwykfuimqgfwn and dev yqxpwxjmpyuqcwucjwqk.

alter table public.voice_practice_sessions
  drop constraint if exists voice_practice_sessions_goal_id_fkey;

alter table public.voice_practice_sessions
  add constraint voice_practice_sessions_goal_id_fkey
  foreign key (goal_id)
  references public.voice_practice_goals(id)
  on delete set null;
