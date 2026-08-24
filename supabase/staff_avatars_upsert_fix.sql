-- Avatar upload used upsert:true, which Postgres executes as
-- INSERT ... ON CONFLICT DO UPDATE. RLS requires the UPDATE policy to
-- satisfy its own WITH CHECK for that path, not just USING - since the
-- update policy only had USING, the conflict-path check had nothing to
-- pass, and Postgres reported the whole statement as an RLS violation.
drop policy if exists "staff_avatars_update_own" on storage.objects;
create policy "staff_avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );
