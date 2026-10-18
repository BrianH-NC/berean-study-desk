create table public.reading_plans (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200), kind text not null check(kind in ('bible','book')),
 book_id uuid references public.books(id) on delete set null, start_date date not null,
 interval_days integer not null default 1 check(interval_days between 1 and 365),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 1500),
 completed jsonb not null default '{}'::jsonb check(jsonb_typeof(completed)='object'),
 paused boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.prayer_requests (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 200), body text not null default '',
 ref text not null default '', category text not null default 'personal' check(category in ('personal','shared')),
 answered_at timestamptz, updates jsonb not null default '[]'::jsonb check(jsonb_typeof(updates)='array'),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.book_quotations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 book_id uuid not null references public.books(id) on delete cascade,
 quote text not null check(length(trim(quote)) between 1 and 20000), page text not null default '',
 reflection text not null default '', tags text[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.reading_plans enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.book_quotations enable row level security;
create index reading_plans_owner on public.reading_plans(user_id);
create index prayer_requests_owner on public.prayer_requests(user_id);
create index book_quotations_owner on public.book_quotations(user_id,book_id);
create index reading_plans_book on public.reading_plans(book_id);
create index book_quotations_book on public.book_quotations(book_id);
revoke all on public.reading_plans,public.prayer_requests,public.book_quotations from anon;
grant select,insert,update,delete on public.reading_plans,public.prayer_requests,public.book_quotations to authenticated;
create policy owner_access on public.prayer_requests for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy owner_access on public.reading_plans for all to authenticated
 using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id and (book_id is null or exists(select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid()))));
create policy owner_access on public.book_quotations for all to authenticated
 using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id and exists(select 1 from public.books b where b.id=book_id and b.user_id=(select auth.uid())));
