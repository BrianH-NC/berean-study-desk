create table public.study_review_cards (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null check(length(source_key) between 1 and 200),
 kind text not null check(kind in ('verse','quotation')),
 title text not null check(length(title) between 1 and 500),
 body text not null check(length(body) between 1 and 30000), citation text not null default '',
 due_date date not null default current_date, stage integer not null default 0 check(stage between 0 and 6),
 reviews integer not null default 0 check(reviews>=0), paused boolean not null default false,
 last_reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,source_key)
);
create table public.study_reminders (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(title) between 1 and 200),
 destination text not null check(destination in ('/bible','/reading-plans','/prayer','/quotations','/study-sessions','/study-tools')),
 due_local timestamp without time zone not null,
 interval_days integer not null default 0 check(interval_days in (0,1,7)),
 paused boolean not null default false, completed boolean not null default false, last_completed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.study_review_cards enable row level security;
alter table public.study_reminders enable row level security;
revoke all on public.study_review_cards, public.study_reminders from anon;
grant select,insert,update,delete on public.study_review_cards, public.study_reminders to authenticated;
create policy review_owner on public.study_review_cards for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy reminder_owner on public.study_reminders for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create index study_reminders_user_due on public.study_reminders(user_id,due_local);
