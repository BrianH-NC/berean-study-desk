begin;
insert into auth.users(id,email) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc01','study-tools-test-1@example.invalid'),('c5288eb0-4acd-4c1e-933a-c6a1d671cc02','study-tools-test-2@example.invalid');
insert into public.study_review_cards(user_id,source_key,kind,title,body) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc02','test-other','verse','Other private card','private');
insert into public.study_reminders(user_id,title,destination,due_local) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc02','Other reminder','/bible','2026-10-18 09:00');
set local role authenticated;
select set_config('request.jwt.claim.sub','c5288eb0-4acd-4c1e-933a-c6a1d671cc01',true);
insert into public.study_review_cards(user_id,source_key,kind,title,body) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc01','test-own','verse','Own card','text');
insert into public.study_reminders(user_id,title,destination,due_local) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc01','Own reminder','/bible','2026-10-18 09:00');
do $$ begin
 if (select count(*) from public.study_review_cards)<>1 or (select count(*) from public.study_reminders)<>1 then raise exception 'Cross-owner read leaked';end if;
 update public.study_review_cards set stage=2 where source_key='test-own';
 if not found then raise exception 'Owner update failed';end if;
 update public.study_reminders set paused=true where title='Own reminder';
 if not found then raise exception 'Owner update failed';end if;
 update public.study_review_cards set stage=5 where source_key='test-other';
 if found then raise exception 'Cross-owner update permitted';end if;
 delete from public.study_reminders where title='Other reminder';
 if found then raise exception 'Cross-owner delete permitted';end if;
 begin
   insert into public.study_reminders(user_id,title,destination,due_local) values ('c5288eb0-4acd-4c1e-933a-c6a1d671cc02','Bad','/bible','2026-10-18');
   raise exception 'Cross-owner insert permitted';
 exception when insufficient_privilege then null; end;
 begin
   update public.study_review_cards set user_id='c5288eb0-4acd-4c1e-933a-c6a1d671cc02' where source_key='test-own';
   raise exception 'Owner reassignment permitted';
 exception when insufficient_privilege then null; end;
 delete from public.study_review_cards where source_key='test-own';
 if not found then raise exception 'Owner delete failed';end if;
 delete from public.study_reminders where title='Own reminder';
 if not found then raise exception 'Owner delete failed';end if;
end $$;
reset role;
do $$ begin
 if has_table_privilege('anon','public.study_review_cards','SELECT') or has_table_privilege('anon','public.study_reminders','SELECT') then raise exception 'Anonymous grant found';end if;
end $$;
rollback;
