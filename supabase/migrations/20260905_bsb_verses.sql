-- Berean Standard Bible (BSB) verse text, for the Bible Study tab's reader
-- and full-text search. BSB was placed in the public domain on 2023-04-30
-- (https://berean.bible), so unlike the ESV integration elsewhere in this
-- app, the entire text can be stored and searched locally -- no per-request
-- API call, no license restriction on bulk copying.
--
-- Reference data only: readable by anyone (including the public anon key),
-- writable by no one except the service role that seeds it. There is
-- deliberately no INSERT/UPDATE/DELETE policy -- RLS enabled with a
-- SELECT-only policy means the table is otherwise locked down by default.

create table if not exists public.bsb_verses (
  id bigint generated always as identity primary key,
  book_number int not null check (book_number between 1 and 66),
  book_name text not null,
  testament text not null check (testament in ('OT', 'NT')),
  chapter int not null check (chapter > 0),
  verse int not null check (verse > 0),
  text text not null,
  fts_tokens tsvector generated always as (
    to_tsvector('english', coalesce(book_name, '') || ' ' || coalesce(text, ''))
  ) stored
);

create unique index if not exists bsb_verses_ref_idx
  on public.bsb_verses (book_number, chapter, verse);

create index if not exists bsb_verses_fts_idx
  on public.bsb_verses using gin (fts_tokens);

alter table public.bsb_verses enable row level security;

create policy "BSB verses are publicly readable"
  on public.bsb_verses
  for select
  using (true);
