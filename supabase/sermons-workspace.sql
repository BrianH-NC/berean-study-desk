create table public.sermons (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 title text not null default '', speaker text not null default '', series text not null default '', church text not null default '', sermon_date date,
 source_url text, source_type text not null default 'text' check(source_type in ('youtube','podcast','audio','video','text','other')),
 transcript_text text not null default '' check(length(transcript_text)<=1000000), transcript_path text, transcript_filename text,
 transcript_cues jsonb not null default '[]', transcript_imported_at timestamptz,
 detected_refs jsonb not null default '[]', refs_extracted_at timestamptz,
 study_guide jsonb, study_guide_generated_at timestamptz, study_guide_source_hash text,
 notebook_entry_id uuid references public.entries(id) on delete set null,
 tags text[] not null default '{}', notes text not null default '', description text not null default '',
 image_url text, favorite boolean not null default false, featured boolean not null default false,
 view_count integer not null default 0, last_viewed timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 fts_tokens tsvector generated always as (to_tsvector('english',title||' '||speaker||' '||series||' '||church||' '||notes||' '||description||' '||transcript_text)) stored
);
create index sermons_user_date on public.sermons(user_id,sermon_date desc);
create index sermons_fts on public.sermons using gin(fts_tokens);
alter table public.sermons enable row level security;
revoke all on public.sermons from anon;
grant select,insert,update,delete on public.sermons to authenticated;
create policy sermons_owner on public.sermons for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table public.sermon_scripture_refs (
 id uuid primary key default gen_random_uuid(),sermon_id uuid not null references public.sermons(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,book text not null,chapter integer not null check(chapter>0),
 verse_start integer,verse_end integer,raw_ref text
);
create index sermon_refs_passage on public.sermon_scripture_refs(user_id,book,chapter);
create index sermon_refs_sermon on public.sermon_scripture_refs(sermon_id);
alter table public.sermon_scripture_refs enable row level security;
revoke all on public.sermon_scripture_refs from anon;
grant select,insert,update,delete on public.sermon_scripture_refs to authenticated;
create policy sermon_refs_owner on public.sermon_scripture_refs for all to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()) and exists(select 1 from public.sermons s where s.id=sermon_id and s.user_id=(select auth.uid())));

create function public.sync_sermon_refs() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 delete from public.sermon_scripture_refs where sermon_id=new.id;
 insert into public.sermon_scripture_refs(sermon_id,user_id,book,chapter,verse_start,verse_end,raw_ref)
 select distinct new.id,new.user_id,r->>'book',(r->>'chapter')::integer,(r->>'verseStart')::integer,(r->>'verseEnd')::integer,r->>'raw'
 from jsonb_array_elements(new.detected_refs) r;
 return new;
end; $$;
create trigger sync_sermon_refs after insert or update of detected_refs on public.sermons for each row execute function public.sync_sermon_refs();
create function public.sermon_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$ begin new.updated_at=now();return new;end;$$;
create trigger sermon_updated_at before update on public.sermons for each row execute function public.sermon_updated_at();
create function public.record_sermon_view(p_sermon_id uuid) returns void language sql security invoker set search_path=public as $$
 update public.sermons set view_count=view_count+1,last_viewed=now() where id=p_sermon_id and user_id=auth.uid(); $$;
revoke all on function public.record_sermon_view(uuid) from public,anon;
grant execute on function public.record_sermon_view(uuid) to authenticated;

alter table public.entries add column sermon_id uuid references public.sermons(id) on delete set null;
create index entries_sermon on public.entries(sermon_id);
create function public.validate_sermon_note_owner() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.sermon_id is not null and not exists(select 1 from public.sermons where id=new.sermon_id and user_id=new.user_id) then raise exception 'Sermon unavailable';end if;
 return new;
end;$$;
create trigger validate_sermon_note_owner before insert or update of sermon_id,user_id on public.entries for each row execute function public.validate_sermon_note_owner();
alter table public.topic_links drop constraint topic_links_entity_type_check;
alter table public.topic_links add constraint topic_links_entity_type_check check(entity_type in ('scripture','book','note','resource','doctrine_check','topic','sermon'));
insert into storage.buckets(id,name,public,file_size_limit) values('sermon-transcripts','sermon-transcripts',false,20971520);
create policy sermon_transcripts_owner on storage.objects for all to authenticated
using(bucket_id='sermon-transcripts' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check(bucket_id='sermon-transcripts' and (storage.foldername(name))[1]=(select auth.uid())::text);
