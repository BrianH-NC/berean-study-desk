-- The owner's own Doctrine Check verdicts for authors they trust, e.g.
-- "Beeke -> Baptism/Polity Distinctive". Private to the owner: these colour
-- the owner's Library and spine labels and never touch the shared
-- theology_checks table. A rule's verdict wins over an AI check.
create table if not exists public.author_verdict_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  author text not null check (length(btrim(author)) between 1 and 120 and author !~ '[\r\n\t]'),
  verdict text not null check (verdict in ('Sound', 'Caution', 'Concern', 'Baptism/Polity Distinctive', 'Unable to Assess')),
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists author_verdict_rules_user_author on public.author_verdict_rules (user_id, lower(btrim(author)));
alter table public.author_verdict_rules enable row level security;
drop policy if exists "Users manage their own author rules" on public.author_verdict_rules;
create policy "Users manage their own author rules" on public.author_verdict_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
