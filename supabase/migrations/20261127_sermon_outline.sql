-- The preacher's own outline, parsed from the transcript and editable:
-- {"big_idea": text, "points": [{"heading": text, "ref": text, "subpoints": [text]}]}
alter table public.sermons add column if not exists sermon_outline jsonb;
