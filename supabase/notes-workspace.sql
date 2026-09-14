alter table public.entries
 add column note_type text not null default 'standalone' check (note_type in ('scripture','book','doctrine_check','bible_study','resource','standalone')),
 add column rich_doc jsonb,
 add column doctrine_check_id uuid references public.theology_checks(id) on delete set null,
 add column resource_title text,
 add column resource_url text;
update public.entries set note_type=case when shelf_book_id is not null then 'book' when nullif(ref,'') is not null then 'scripture' else 'standalone' end;
create index entries_doctrine_check_idx on public.entries(doctrine_check_id) where doctrine_check_id is not null;
