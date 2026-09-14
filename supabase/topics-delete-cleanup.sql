create or replace function public.delete_personal_topic(p_topic_id uuid) returns void language plpgsql security invoker set search_path = public as $$
declare topic_key_to_remove text := 'personal:' || p_topic_id::text;
begin
  if not exists(select 1 from public.topics where id=p_topic_id and user_id=auth.uid()) then raise exception 'Topic unavailable'; end if;
  delete from public.topic_links where user_id=auth.uid() and (topic_key=topic_key_to_remove or (entity_type='topic' and entity_id=topic_key_to_remove));
  delete from public.topic_preferences where user_id=auth.uid() and topic_key=topic_key_to_remove;
  update public.topics set related_topics=array_remove(related_topics,topic_key_to_remove) where user_id=auth.uid() and topic_key_to_remove=any(related_topics);
  delete from public.topics where id=p_topic_id and user_id=auth.uid();
end; $$;
revoke all on function public.delete_personal_topic(uuid) from public, anon;
grant execute on function public.delete_personal_topic(uuid) to authenticated;
