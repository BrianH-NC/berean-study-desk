alter table public.prayer_requests
  add column source text not null default '' check(length(source)<=100),
  add column request_date date;
