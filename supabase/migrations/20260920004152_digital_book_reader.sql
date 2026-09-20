-- Private digital books. Paths are immutable and owned by the signed-in user.
create table public.book_files (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null unique,
  format text not null check (format in ('pdf', 'epub')),
  filename text not null check (length(filename) between 1 and 500),
  bytes bigint not null check (bytes between 1 and 52428800),
  created_at timestamptz not null default now(),
  check (path = user_id::text || '/' || id::text || '.' || format)
);
create index book_files_book_id_idx on public.book_files(book_id);
create index book_files_user_id_idx on public.book_files(user_id);
alter table public.book_files enable row level security;
create policy book_files_owner on public.book_files for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.books b where b.id = book_id and b.user_id = (select auth.uid())
  ));
revoke all on public.book_files from anon, authenticated;
grant select, insert, delete on public.book_files to authenticated;

create table public.book_reading_positions (
  file_id uuid primary key references public.book_files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  location jsonb not null check (jsonb_typeof(location) = 'object' and length(location::text) < 5000),
  updated_at timestamptz not null default now()
);
create table public.book_bookmarks (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.book_files(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  location jsonb not null check (jsonb_typeof(location) = 'object' and length(location::text) < 5000),
  label text not null check (length(label) between 1 and 200),
  created_at timestamptz not null default now()
);
create index book_bookmarks_file_id_idx on public.book_bookmarks(file_id);
create index book_bookmarks_user_id_idx on public.book_bookmarks(user_id);
create index book_reading_positions_user_id_idx on public.book_reading_positions(user_id);
alter table public.book_reading_positions enable row level security;
alter table public.book_bookmarks enable row level security;
create policy reading_positions_owner on public.book_reading_positions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.book_files f where f.id = file_id and f.user_id = (select auth.uid())
  ));
create policy bookmarks_owner on public.book_bookmarks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.book_files f where f.id = file_id and f.user_id = (select auth.uid())
  ));
revoke all on public.book_reading_positions, public.book_bookmarks from anon, authenticated;
grant select, insert, update, delete on public.book_reading_positions to authenticated;
grant select, insert, delete on public.book_bookmarks to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('book-files', 'book-files', false, 52428800, array['application/pdf', 'application/epub+zip']);
create policy book_file_download on storage.objects for select to authenticated
  using (bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy book_file_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy book_file_delete on storage.objects for delete to authenticated
  using (bucket_id = 'book-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
