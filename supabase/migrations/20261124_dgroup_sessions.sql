-- D-Group sessions: one per week, usually built from the sermon the group follows.
-- docs holds the five weekly documents, keyed exegetical | booklet | prep | script | text:
-- { "markdown": "...", "status": "draft" | "ready", "generated_at": ts, "edited_at": ts }
create table public.dgroup_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sermon_id uuid references public.sermons(id) on delete set null,
  title text not null default '' check (length(title) <= 200),
  passage text not null default '' check (length(passage) <= 200),
  meeting_date date,
  notes text not null default '' check (length(notes) <= 20000),
  docs jsonb not null default '{}'::jsonb check (jsonb_typeof(docs) = 'object' and octet_length(docs::text) <= 1500000),
  generating jsonb not null default '{}'::jsonb check (jsonb_typeof(generating) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index dgroup_sessions_user_date on public.dgroup_sessions(user_id, meeting_date desc nulls last);
create index dgroup_sessions_sermon on public.dgroup_sessions(sermon_id);
alter table public.dgroup_sessions enable row level security;
revoke all on public.dgroup_sessions from anon;
grant select, insert, update, delete on public.dgroup_sessions to authenticated;
create policy dgroup_sessions_owner on public.dgroup_sessions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and (sermon_id is null or exists (select 1 from public.sermons s where s.id = sermon_id and s.user_id = (select auth.uid()))));
