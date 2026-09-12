create table public.hidden_doctrine_checks (
 user_id uuid not null references auth.users(id) on delete cascade,
 check_id uuid not null references public.theology_checks(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (user_id, check_id)
);
alter table public.hidden_doctrine_checks enable row level security;
revoke all on public.hidden_doctrine_checks from anon, authenticated;
grant all on public.hidden_doctrine_checks to service_role;
create index hidden_doctrine_checks_check_id_idx on public.hidden_doctrine_checks(check_id);
