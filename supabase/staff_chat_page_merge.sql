-- Chat rooms merged into the combined Messages page ("/messages"), so the
-- standalone "/chat" page-permission rows are now orphaned - nothing
-- references that path anymore. Access to rooms is still governed by role
-- tier directly (unchanged), this just removes the dead matrix row.
delete from public.staff_page_permissions where page = '/chat';
