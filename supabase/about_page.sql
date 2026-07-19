-- About page content, editable in place. Single row (fixed id), same shape
-- as beta_focus_note - public read, staff write, no separate admin page;
-- editing controls live directly on /about itself.

create table if not exists public.about_page (
  id         text primary key default 'current',
  body       text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
alter table public.about_page enable row level security;

drop policy if exists "about_page_public_read" on public.about_page;
create policy "about_page_public_read" on public.about_page
  for select using (true);

drop policy if exists "about_page_staff_write" on public.about_page;
create policy "about_page_staff_write" on public.about_page
  for all using (public.is_staff()) with check (public.is_staff());

drop trigger if exists about_page_log_activity on public.about_page;
create trigger about_page_log_activity
  after insert or update or delete on public.about_page
  for each row execute function public.log_staff_activity();

-- Seed with the copy already live on the page, so nothing is lost when the
-- page switches from hardcoded text to reading this table.
insert into public.about_page (id, body)
values ('current', $body$I'm trans (male to female), and I'm still learning how to code, Blossom's one of the biggest things I've built so far. This isn't some polished corporate project. It's made by someone who's actually lived through a lot of what this app is trying to help with.

I built Blossom because I wanted something that actually felt like it was on your side. A lot of apps in this space either treat your data like something to sell, or they're built by people who've never really had to think about what it means to track something this personal.

Blossom is local-first by default. Most of what you enter never leaves your device unless you choose to turn sync on yourself. Nothing here scores you, ranks you, or tells you if you're doing it "right." No streaks, no pass or fail, no comparing yourself to anyone else. You move at your own pace, and the app just quietly holds what you give it.

Right now Blossom's in beta, so things might change, break, or get rebuilt if they're not working. If you're testing it with me, thank you, genuinely. Every bit of feedback shapes what this actually becomes.

Want to reach me directly? I'm around on Discord, or you can leave feedback right in the app.

— Ellie$body$)
on conflict (id) do nothing;
