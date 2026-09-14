-- Keep note links private and clean up polymorphic topic links on deletion.
create function public.validate_sermon_export_owner() returns trigger language plpgsql security invoker set search_path=public as $$
begin
 if new.notebook_entry_id is not null and not exists(select 1 from public.entries where id=new.notebook_entry_id and user_id=new.user_id and sermon_id=new.id) then raise exception 'Linked note unavailable';end if;
 return new;
end;$$;
create trigger validate_sermon_export_owner before insert or update of notebook_entry_id,user_id on public.sermons for each row execute function public.validate_sermon_export_owner();
create function public.cleanup_sermon_topics() returns trigger language plpgsql security invoker set search_path=public as $$
begin delete from public.topic_links where user_id=old.user_id and entity_type='sermon' and entity_id=old.id::text;return old;end;$$;
create trigger cleanup_sermon_topics before delete on public.sermons for each row execute function public.cleanup_sermon_topics();
create index sermons_notebook_entry on public.sermons(notebook_entry_id);
-- Bound the indexed excerpt. Global search still checks the complete transcript.
alter table public.sermons drop column fts_tokens;
alter table public.sermons add column fts_tokens tsvector generated always as (to_tsvector('english',title||' '||speaker||' '||series||' '||church||' '||left(notes,8000)||' '||left(description,8000)||' '||left(transcript_text,8000))) stored;
create index sermons_fts on public.sermons using gin(fts_tokens);
-- Saving a generated guide must not overwrite a guide for a newer transcript.
create function public.save_sermon_guide(p_id uuid,p_started timestamptz,p_imported timestamptz,p_guide jsonb,p_hash text) returns boolean language plpgsql security invoker set search_path=public as $$
declare saved_count integer;
begin
 update public.sermons set study_guide=p_guide,study_guide_generated_at=now(),study_guide_source_hash=p_hash
 where id=p_id and user_id=auth.uid() and guide_started_at=p_started and transcript_imported_at is not distinct from p_imported;
 get diagnostics saved_count=row_count;return saved_count=1;
end;$$;
revoke all on function public.save_sermon_guide(uuid,timestamptz,timestamptz,jsonb,text) from public,anon;
grant execute on function public.save_sermon_guide(uuid,timestamptz,timestamptz,jsonb,text) to authenticated;
