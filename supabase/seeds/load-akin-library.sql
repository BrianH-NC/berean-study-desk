-- Loads (or reloads) the "Akin Library" reading list from supabase/seeds/akin-library.json,
-- which scripts/parse-akin-library.mjs generates from Daniel Akin's PDF.
--
-- The database fetches the JSON from the public GitHub repo, so nothing has to be pasted
-- into a SQL editor. The `http` extension is only needed while this runs:
--
--   create extension if not exists http with schema extensions;
--   (run this file)
--   drop extension if exists http;

-- 1. the list itself
insert into public.reading_lists (slug, name, curator, description, source_title, source_year, legend, first_pick_label)
select j->'list'->>'slug', j->'list'->>'name', j->'list'->>'curator', j->'list'->>'description',
       j->'list'->>'source_title', (j->'list'->>'source_year')::int, j->'list'->'legend', j->'list'->>'first_pick_label'
from (select content::jsonb as j from extensions.http_get('https://raw.githubusercontent.com/BrianH-NC/berean-study-desk/main/supabase/seeds/akin-library.json')) src
on conflict (slug) do update set
  name = excluded.name, curator = excluded.curator, description = excluded.description,
  source_title = excluded.source_title, source_year = excluded.source_year,
  legend = excluded.legend, first_pick_label = excluded.first_pick_label;

-- 2. clear any earlier load of its entries
delete from public.reading_list_items where list_id = (select id from public.reading_lists where slug = 'akin-library');

-- 3. its entries
insert into public.reading_list_items (list_id, position, title, author, author_surname, publisher, pub_year, edition_note,
  series, series_name, section, subsection, topic, bible_books, bible_scope, is_first_pick, level_codes, levels, language)
select (select id from public.reading_lists where slug = 'akin-library'),
  (i->>'position')::int, i->>'title', i->>'author', i->>'author_surname', i->>'publisher',
  nullif(i->>'pub_year', '')::int, i->>'edition_note', i->>'series', i->>'series_name', i->>'section', i->>'subsection', i->>'topic',
  coalesce(array(select jsonb_array_elements_text(i->'bible_books')), '{}'), i->>'bible_scope',
  coalesce((i->>'is_first_pick')::boolean, false), i->>'level_codes',
  coalesce(array(select jsonb_array_elements_text(i->'levels')), '{}'), coalesce(i->>'language', 'en')
from (select content::jsonb as j from extensions.http_get('https://raw.githubusercontent.com/BrianH-NC/berean-study-desk/main/supabase/seeds/akin-library.json')) src,
     jsonb_array_elements(src.j->'items') as i;
