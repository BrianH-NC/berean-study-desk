alter table public.sermons add column primary_text text not null default '';
alter table public.sermons add column primary_ref jsonb;
