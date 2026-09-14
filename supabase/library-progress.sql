alter table public.books add column current_page integer not null default 0 check (current_page >= 0),
 add column completed_at date,
 add column collections text[] not null default '{}';
create table public.library_goals (
 user_id uuid not null references auth.users(id) on delete cascade,
 year integer not null check (year between 2000 and 2200),
 target integer not null check (target between 1 and 1000),
 primary key(user_id,year)
);
alter table public.library_goals enable row level security;
revoke all on public.library_goals from anon;
grant select,insert,update,delete on public.library_goals to authenticated;
create policy own_goals on public.library_goals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
alter table public.books drop constraint books_reading_status_check;
alter table public.books add constraint books_reading_status_check check (reading_status in ('unread','in-progress','read','paused','reference'));
