-- feedback_items' RLS is row-level only (type = 'feature' or is_staff()) -
-- it can't hide individual columns, so a raw request could still ask for
-- review_note/reviewed_by on a public feature idea even though the app's
-- own UI never requests them. Now that the public board is getting more
-- prominent (a "recently shipped" section), narrow what's actually
-- reachable at the column level too: this view only ever exposes feature-
-- type rows and only the columns that are meant to be public.

create or replace view public.feedback_items_public as
  select id, title, description, status, vote_count, created_at, reviewed_at
  from public.feedback_items
  where type = 'feature';

grant select on public.feedback_items_public to anon, authenticated;
