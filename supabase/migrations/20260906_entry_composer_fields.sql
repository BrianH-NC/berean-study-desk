-- Adds the fields the original digging-deep-notebook composer had that
-- entries never gained here: Photos, Page, Video link. shelf_book_id and
-- stance already existed (see project memory); no separate "Book" field is
-- added since shelf_book_id already links to a real My Library book, unlike
-- the original standalone app which only had a simple local book list.
alter table entries
  add column if not exists photos text[] not null default '{}',
  add column if not exists page text,
  add column if not exists video_url text;

-- Storage bucket for entry photos, uploaded from the composer's Photos
-- field. Public read (so <img src> just works with no signed-URL plumbing,
-- consistent with how book cover_url etc. are already plain public URLs
-- elsewhere in this app) but writes are restricted to the owner, scoped by
-- the first path segment being the uploader's own auth.uid().
insert into storage.buckets (id, name, public)
values ('entry-photos', 'entry-photos', true)
on conflict (id) do nothing;

create policy "entry-photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'entry-photos');

create policy "users can upload their own entry photos"
  on storage.objects for insert
  with check (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users can delete their own entry photos"
  on storage.objects for delete
  using (bucket_id = 'entry-photos' and (storage.foldername(name))[1] = auth.uid()::text);
