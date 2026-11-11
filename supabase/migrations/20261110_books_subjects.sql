-- Free-form subject labels imported from CLZ Books (BISAC-style). Kept
-- separate from `tags`, which are the curated categories the Library's
-- Category view groups by. Already applied to the live project.
alter table public.books add column if not exists subjects text[] not null default '{}';
