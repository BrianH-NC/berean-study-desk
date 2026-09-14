create table public.topics (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
name text not null check(length(trim(name)) between 1 and 120), description text not null default '',
category text not null default 'Other', tags text[] not null default '{}', aliases text[] not null default '{}',
image_url text, related_topics text[] not null default '{}',
created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create unique index topics_owner_name on public.topics(user_id,lower(name));
create table public.topic_links (
id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
topic_key text not null, entity_type text not null check(entity_type in ('scripture','book','note','resource','doctrine_check','topic')),
entity_id text not null, label text not null default '', resource_kind text not null default 'website',
created_at timestamptz not null default now(), unique(user_id,topic_key,entity_type,entity_id));
create table public.topic_preferences (
user_id uuid not null references auth.users(id) on delete cascade, topic_key text not null,
favorite boolean not null default false, collections text[] not null default '{}',
view_count integer not null default 0 check(view_count>=0), last_viewed timestamptz,
primary key(user_id,topic_key));
alter table public.topics enable row level security;
alter table public.topic_links enable row level security;
alter table public.topic_preferences enable row level security;
revoke all on public.topics,public.topic_links,public.topic_preferences from anon,authenticated;
grant select,insert,update,delete on public.topics,public.topic_links,public.topic_preferences to authenticated;
create policy topics_owner on public.topics for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy topic_links_owner on public.topic_links for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy topic_preferences_owner on public.topic_preferences for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create function public.record_topic_view(p_topic_key text) returns void language sql security invoker set search_path=public as $$
insert into public.topic_preferences(user_id,topic_key,view_count,last_viewed) values(auth.uid(),p_topic_key,1,now())
on conflict(user_id,topic_key) do update set view_count=topic_preferences.view_count+1,last_viewed=now();
$$;
revoke all on function public.record_topic_view(text) from public,anon;
grant execute on function public.record_topic_view(text) to authenticated;
