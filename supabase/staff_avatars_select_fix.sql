-- No SELECT policy existed for staff-avatars, which upsert's
-- insert-or-update path likely needs to detect an existing object before
-- deciding whether to insert or update. Same ownership scope as the
-- other three policies.
drop policy if exists "staff_avatars_select_own" on storage.objects;
create policy "staff_avatars_select_own" on storage.objects
  for select using (
    bucket_id = 'staff-avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text
  );
