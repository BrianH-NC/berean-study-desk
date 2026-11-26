-- Physical shelf label for an owned book: main category, subcategory and the
-- author filing name printed on the spine. Keys are stable taxonomy keys from
-- src/lib/shelfLabels.js; the app validates category/subcategory pairs.
-- The three are all set or all empty. Labels are shared classifications, so
-- nothing here is unique. Existing row-level security on books applies.
alter table public.books
  add column if not exists shelf_category text,
  add column if not exists shelf_subcategory text,
  add column if not exists shelf_author text;

alter table public.books drop constraint if exists books_shelf_label_complete;
alter table public.books add constraint books_shelf_label_complete check (
  (shelf_category is null and shelf_subcategory is null and shelf_author is null)
  or (
    shelf_category ~ '^[a-z0-9_]{1,40}$'
    and shelf_subcategory ~ '^[a-z0-9_]{1,40}$'
    and shelf_author is not null
    and length(btrim(shelf_author)) between 1 and 60
    and shelf_author !~ '[\r\n\t]'
  )
);

create index if not exists books_user_shelf_idx on public.books (user_id, shelf_category, shelf_subcategory);
