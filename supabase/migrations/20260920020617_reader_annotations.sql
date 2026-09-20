-- Private passage highlights; deleting a file retains its Notebook entries.
create table public.book_annotations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 file_id uuid not null references public.book_files(id) on delete cascade,
 location jsonb not null check (jsonb_typeof(location) = 'object' and length(location::text) < 20000),
 quote text not null check (length(quote) between 1 and 10000),
 color text not null default 'yellow' check (color in ('yellow','green','blue','pink')),
 entry_id uuid references public.entries(id) on delete set null,
 created_at timestamptz not null default now()
);
create index book_annotations_file_idx on public.book_annotations(file_id);
create index book_annotations_user_idx on public.book_annotations(user_id);
create index book_annotations_entry_idx on public.book_annotations(entry_id);
alter table public.book_annotations enable row level security;
create policy annotations_owner on public.book_annotations for all to authenticated
 using (user_id = (select auth.uid()))
 with check (user_id = (select auth.uid()) and exists (
  select 1 from public.book_files f where f.id = file_id and f.user_id = (select auth.uid())
   and (entry_id is null or exists (select 1 from public.entries e where e.id = entry_id
    and e.user_id = (select auth.uid()) and e.shelf_book_id = f.book_id))
 ));
revoke all on public.book_annotations from anon, authenticated;
grant select, insert, delete on public.book_annotations to authenticated;

-- Both records commit together, so a failed save cannot leave duplicate notes.
create function public.create_book_passage_note(p_file_id uuid, p_location jsonb,
 p_quote text, p_color text, p_body text, p_number numeric)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare f public.book_files; e public.entries; a public.book_annotations;
begin
 select * into f from public.book_files where id = p_file_id and user_id = auth.uid();
 if f.id is null then raise exception 'Book file unavailable'; end if;
 if p_body is null or length(trim(p_body)) = 0 or length(p_body) > 20000 then
  raise exception 'Write a note of up to 20,000 characters'; end if;
 insert into public.entries(user_id, number, note_type, shelf_book_id, title, body, page)
 values (auth.uid(), p_number, 'book', f.book_id, left(p_quote, 100),
 p_quote || E'\n\n' || p_body, p_location->>'page') returning * into e;
 insert into public.book_annotations(user_id,file_id,location,quote,color,entry_id)
 values(auth.uid(),f.id,p_location,p_quote,p_color,e.id) returning * into a;
 return jsonb_build_object('entry',to_jsonb(e),'annotation',to_jsonb(a));
end $$;
revoke all on function public.create_book_passage_note(uuid,jsonb,text,text,text,numeric) from public, anon;
grant execute on function public.create_book_passage_note(uuid,jsonb,text,text,text,numeric) to authenticated;
