# Free-book catalogs

The `free-books` Edge Function is deployed to production (version 1). Live checks confirm preflight succeeds and missing/invalid user tokens receive 401. Frontend deployment follows the feature merge.

Find Free Books is available beside Upload PDF or EPUB on Home and Reading Now, at `/reading/free-books`. Search either Project Gutenberg or CCEL, open Details & formats, then Add & Read an available format. Imported files use the existing private `book-files` bucket and reader. Title, author, cover, description, and the source link are retained; the link is stored in Library notes. Re-importing an unchanged source entry with an attached file reopens that copy.

## Sources

- Project Gutenberg: official OPDS search and per-book metadata, explicitly intended for reading applications: https://www.gutenberg.org/ebooks/offline_catalogs.html . Search defaults to theology; user searches are passed to the official catalog. Search uses 25-result pages. Only editions marked “Public domain in the USA” expose an EPUB import. Downloads and cover images use Gutenberg's listed `gutenberg.pglaf.org` mirror instead of scraping/deep-linking bulk downloads from its main website. Original EPUB bytes, including license information, are preserved.
- CCEL: public author/title index (`https://www.ccel.org/index/author`), filtered by title and author with 24-result pages. The index currently contains 1,299 unique works. Details and actual advertised PDF/EPUB links come from the selected work's page. No format is invented for missing downloads. CCEL permits personal, educational and nonprofit use: https://www.ccel.org/about/copyright.html . Rights and the source link remain visible; editions requiring sign-in or lacking usable files must be opened at the source. CCEL requests are spaced ten seconds apart per Edge isolate, with cached metadata and coalesced identical requests. This app does not mirror CCEL's files publicly.

Both sources may change their catalogs, terms or markup; parsing errors are visible and source links remain available. Gutenberg's OPDS1 feed is expected to change in 2027; monitor its official offline-catalog documentation before then. No third-party Gutendex dependency, new AI API key, database migration, or scheduled crawling is required.

## Server and deployment

Deploy `supabase/functions/free-books/index.ts` and its relative `catalog.js` dependency to project `dswwzziwtbyzxojrnxvg` before merging the frontend. The function validates the caller with `auth.getUser(token)` on every GET/POST. Gateway JWT verification may be disabled because the handler performs real user authentication itself. It uses the existing environment's Supabase URL and anon key; it never reads/writes user data with a service key.

Search and details are cached in memory for one hour, bounded to 100 entries per isolate. Download requests accept a source ID and format, never a caller-supplied URL. Downloads resolve from source metadata; every redirect is checked against HTTPS host allowlists, timeouts and a 50 MB streamed limit apply, and PDF/ZIP signatures are checked before returning bytes. Source HTML is parsed only into text/links and is never injected into the app.

Frontend imports use the signed-in user's normal RLS-protected writes. No Library entry is created until a download succeeds. Existing upload rollback handles later failures. Storage/bandwidth quotas still apply.

## Validation

- `node --test tests/freeBooks.test.js tests/freeBooksHandler.test.js tests/readerState.test.js` (Node 24): parsing, public-domain gating, hostile URLs/IDs, download size/signature validation, handler authentication, source-ID download resolution, and reader-state tests.
- `npx deno check supabase/functions/free-books/index.ts`.
- Production Vite build with placeholder environment values; targeted lint (state-in-effect warnings); production dependency audit: zero vulnerabilities.
- Real source responses parsed locally: Gutenberg search returned 25 books with pagination; CCEL index returned 1,299; Gutenberg EPUB/EPUB3 and CCEL PDF signatures verified.
- Headless Edge/React StrictMode with mocked signed-in backend responses: tabs, title/author search, pagination, details/formats, failed download and retry, private import metadata, reader navigation, desktop and 390px layout. Full signed-in production imports remain a user-session check after rollout.
