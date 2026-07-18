-- Staff activity log: who changed what, on the tables staff can write to.
-- Written by a trigger (not a client-side call after each mutation) so it
-- can't be skipped by forgetting to wire up logging on some new form -
-- every insert/update/delete on a covered table is caught automatically.
-- Readable by every staff tier; nobody writes to it directly.

create table if not exists public.staff_activity_log (
  id             uuid primary key default gen_random_uuid(),
  staff_user_id  uuid references auth.users(id),
  staff_email    text,
  action         text not null,
  table_name     text not null,
  record_id      text,
  detail         jsonb,
  created_at     timestamptz not null default now()
);
alter table public.staff_activity_log add column if not exists staff_email text;
create index if not exists staff_activity_log_created_idx on public.staff_activity_log (created_at desc);
alter table public.staff_activity_log enable row level security;

drop policy if exists "staff_activity_log_staff_read" on public.staff_activity_log;
create policy "staff_activity_log_staff_read" on public.staff_activity_log
  for select using (public.is_staff());
-- Deliberately no insert/update/delete policy for staff - only the
-- security-definer trigger function below writes here.

create or replace function public.log_staff_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_id text;
  row_detail jsonb;
  actor_email text;
begin
  if TG_OP = 'DELETE' then
    row_detail := to_jsonb(OLD);
  else
    row_detail := to_jsonb(NEW);
  end if;
  row_id := coalesce(row_detail->>'id', row_detail->>'email');
  select email into actor_email from auth.users where id = auth.uid();

  insert into public.staff_activity_log (staff_user_id, staff_email, action, table_name, record_id, detail)
  values (auth.uid(), actor_email, TG_OP, TG_TABLE_NAME, row_id, row_detail);

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists region_resources_log_activity on public.region_resources;
create trigger region_resources_log_activity
  after insert or update or delete on public.region_resources
  for each row execute function public.log_staff_activity();

drop trigger if exists legal_context_notes_log_activity on public.legal_context_notes;
create trigger legal_context_notes_log_activity
  after insert or update or delete on public.legal_context_notes
  for each row execute function public.log_staff_activity();

drop trigger if exists product_roadmap_log_activity on public.product_roadmap;
create trigger product_roadmap_log_activity
  after insert or update or delete on public.product_roadmap
  for each row execute function public.log_staff_activity();

drop trigger if exists app_notices_log_activity on public.app_notices;
create trigger app_notices_log_activity
  after insert or update or delete on public.app_notices
  for each row execute function public.log_staff_activity();

drop trigger if exists staff_emails_log_activity on public.staff_emails;
create trigger staff_emails_log_activity
  after insert or update or delete on public.staff_emails
  for each row execute function public.log_staff_activity();
