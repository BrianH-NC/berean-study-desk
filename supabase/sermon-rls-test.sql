-- Disposable fixtures; all writes roll back, including synthetic auth users.
begin;
insert into auth.users(id) values ('a1000000-0000-4000-8000-000000000001'),('a1000000-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
insert into public.sermons(id,user_id,title,detected_refs) values ('b1000000-0000-4000-8000-000000000001',auth.uid(),'Sermon RLS fixture','[{"book":"John","chapter":3,"verseStart":16,"verseEnd":18,"raw":"John 3:16-18"}]');
insert into public.entries(id,user_id,number,title,sermon_id) values ('c1000000-0000-4000-8000-000000000001',auth.uid(),1,'Fixture note','b1000000-0000-4000-8000-000000000001');
update public.sermons set notebook_entry_id='c1000000-0000-4000-8000-000000000001' where id='b1000000-0000-4000-8000-000000000001';
do $$begin
 if (select count(*) from public.sermon_scripture_refs where sermon_id='b1000000-0000-4000-8000-000000000001')<>1 then raise exception 'Reference index failed';end if;
 begin
  update public.sermons set detected_refs='[{"book":"John","chapter":0}]' where id='b1000000-0000-4000-8000-000000000001';
  raise exception 'Invalid reference unexpectedly accepted';
 exception when check_violation then null;end;
 if (select count(*) from public.sermon_scripture_refs where sermon_id='b1000000-0000-4000-8000-000000000001')<>1 then raise exception 'Failed update lost old references';end if;
end;$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$begin
 if exists(select 1 from public.sermons where id='b1000000-0000-4000-8000-000000000001') then raise exception 'Cross-account read allowed';end if;
 if exists(select 1 from public.sermon_scripture_refs where sermon_id='b1000000-0000-4000-8000-000000000001') then raise exception 'Cross-account references visible';end if;
 update public.sermons set title='Wrong owner' where id='b1000000-0000-4000-8000-000000000001';
 if found then raise exception 'Cross-account update allowed';end if;
 begin
  insert into public.entries(user_id,number,sermon_id) values(auth.uid(),1,'b1000000-0000-4000-8000-000000000001');
  raise exception 'Cross-account note linked';
 exception when raise_exception then if sqlerrm<>'Sermon unavailable' then raise;end if;end;
 if public.save_sermon_guide('b1000000-0000-4000-8000-000000000001',now(),null,'{}','test') then raise exception 'Cross-account guide allowed';end if;
end;$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
update public.sermons set detected_refs='[{"book":"Romans","chapter":8,"verseStart":28,"verseEnd":28,"raw":"Romans 8:28"}]' where id='b1000000-0000-4000-8000-000000000001';
insert into public.topic_links(user_id,topic_key,entity_type,entity_id) values(auth.uid(),'system:grace','sermon','b1000000-0000-4000-8000-000000000001');
delete from public.sermons where id='b1000000-0000-4000-8000-000000000001';
do $$begin
 if exists(select 1 from public.sermon_scripture_refs where sermon_id='b1000000-0000-4000-8000-000000000001') then raise exception 'Reference cleanup failed';end if;
 if exists(select 1 from public.topic_links where entity_id='b1000000-0000-4000-8000-000000000001') then raise exception 'Topic cleanup failed';end if;
 if not exists(select 1 from public.entries where id='c1000000-0000-4000-8000-000000000001' and sermon_id is null) then raise exception 'Linked note was lost';end if;
end;$$;
select 'PASS: owner CRUD, reference rollback, cross-account isolation, note ownership, deletion preserves notes and removes reference/topic links' as result;
rollback;
