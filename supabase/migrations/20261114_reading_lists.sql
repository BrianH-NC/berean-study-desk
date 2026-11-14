-- Curated reading lists (for example the "Akin Library", a suggested theological
-- library). This is reference data shared by every signed-in user: the app works
-- out Owned / On wishlist for each entry by matching against the user's own books
-- and wishlist, so no per-user state is stored here. Rows are only written by
-- migrations and seed scripts (service role); signed-in users can read.

create table public.reading_lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 200),
  curator text,
  description text,
  source_title text,
  source_year integer check (source_year between 1000 and 2100),
  -- {"T": {"label": "Technical", "description": "..."}, ...} for the list's own level codes
  legend jsonb not null default '{}'::jsonb,
  first_pick_label text,
  created_at timestamptz not null default now()
);

create table public.reading_list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.reading_lists(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (length(title) between 1 and 500),
  author text,
  author_surname text,
  publisher text,
  pub_year integer check (pub_year between 1000 and 2100),
  edition_note text,
  series text,
  series_name text,
  -- where the list files the entry: section > subsection > topic
  section text not null,
  subsection text,
  topic text,
  -- canonical Bible book names the entry is about ('Genesis', '1 Peter', ...)
  bible_books text[] not null default '{}',
  -- 'book' = about those specific books, 'group' = a whole group (Pentateuch, Minor Prophets)
  bible_scope text check (bible_scope in ('book', 'group')),
  is_first_pick boolean not null default false,
  level_codes text,
  levels text[] not null default '{}',
  language text not null default 'en',
  unique (list_id, position)
);

create index reading_list_items_section on public.reading_list_items (list_id, section, subsection);
create index reading_list_items_bible_books on public.reading_list_items using gin (bible_books);

alter table public.reading_lists enable row level security;
alter table public.reading_list_items enable row level security;
revoke all on public.reading_lists, public.reading_list_items from anon, authenticated;
grant select on public.reading_lists, public.reading_list_items to authenticated;
create policy reading_lists_read on public.reading_lists for select to authenticated using (true);
create policy reading_list_items_read on public.reading_list_items for select to authenticated using (true);
