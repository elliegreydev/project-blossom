-- When a roadmap item last moved stage, kept by the database itself.
--
-- The roadmap's "Recently added" and "Recently shipped" labels used to come
-- from is_recent, a box ticked by hand and never unticked. By 18 Sep 2026, 53
-- of 86 items carried it, including everything in Up next and a batch added
-- two months earlier, so the label had come to mean "this exists".
--
-- The page now works both labels out from dates:
--   Recently added   = created_at in the last three weeks
--   Recently shipped = moved into "available" in the last three weeks
--
-- updated_at cannot answer the second one: it moves on any edit, including a
-- reworded description or a sort_order reshuffle, so a typo fix would have
-- announced something as freshly shipped. This column moves only when stage
-- does, and a trigger does it, so nobody has to remember.
--
-- Existing rows are backfilled from created_at, which is the conservative
-- choice: nothing is claimed as recently shipped without evidence of it.
--
-- Apply to BOTH projects by hand: prod tpbqqlbtwykfuimqgfwn and dev
-- yqxpwxjmpyuqcwucjwqk. Apply BEFORE deploying the page that reads it, or the
-- roadmap query asks for a column that does not exist and the page is empty.

alter table public.product_roadmap
  add column if not exists stage_changed_at timestamptz;

update public.product_roadmap
  set stage_changed_at = created_at
  where stage_changed_at is null;

alter table public.product_roadmap
  alter column stage_changed_at set default now(),
  alter column stage_changed_at set not null;

create or replace function public.product_roadmap_touch_stage_changed_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stage is distinct from old.stage then
    new.stage_changed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists product_roadmap_stage_changed_at on public.product_roadmap;
create trigger product_roadmap_stage_changed_at
  before update on public.product_roadmap
  for each row execute function public.product_roadmap_touch_stage_changed_at();
