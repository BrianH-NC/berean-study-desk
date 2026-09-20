alter table public.entries add column if not exists deleted_at timestamptz;

create table public.entry_revisions (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.entries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  saved_at timestamptz not null default clock_timestamp()
);
create index entry_revisions_owner_entry on public.entry_revisions(user_id, entry_id, saved_at desc);
alter table public.entry_revisions enable row level security;
create policy "Owners read note history" on public.entry_revisions for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.entry_revisions from anon, authenticated;
grant select on public.entry_revisions to authenticated;

-- Only this trigger writes history: clients cannot overwrite or fabricate snapshots.
create function public.capture_entry_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Note ownership cannot be changed';
  end if;
  if (to_jsonb(new) - 'updated_at') is distinct from (to_jsonb(old) - 'updated_at') then
    insert into public.entry_revisions(entry_id, user_id, snapshot)
    values (old.id, old.user_id, to_jsonb(old));
  end if;
  return new;
end;
$$;
revoke all on function public.capture_entry_revision() from public, anon, authenticated;
create trigger capture_entry_revision before update on public.entries
for each row execute function public.capture_entry_revision();

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 200),
  state jsonb not null default '{}'::jsonb check (jsonb_typeof(state) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index study_sessions_owner_updated on public.study_sessions(user_id, updated_at desc);
alter table public.study_sessions enable row level security;
create policy "Owners manage study sessions" on public.study_sessions for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.study_sessions from anon;
grant select, insert, update, delete on public.study_sessions to authenticated;
