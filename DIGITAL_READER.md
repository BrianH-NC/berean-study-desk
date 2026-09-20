# PDF and EPUB reader

Status: production migration applied on 2026-09-19 to `dswwzziwtbyzxojrnxvg` and verified (private bucket, RLS, explicit grants, six policies). User approved production deployment; frontend publishes when this branch merges to main.

Use Upload PDF or EPUB on Home or the main Reading Now page to create a Library entry from the filename and open the reader directly. No pre-existing Library book is required. The title can be edited in book details. Alternatively, open an existing Library book and choose Start reading / Continue to attach a copy there. The reader above the existing notes accepts private PDF and DRM-free EPUB attachments (50 MB each). It supports multiple files per book, PDF pages/zoom/extractable page text, EPUB chapters/text size/spacing, saved positions, and bookmarks. Position and bookmarks are specific to each attachment and stored in the signed-in account. An internet connection is required for uploads, downloads and saving; failed saves offer Retry. This release does not add a public-domain catalog, DRM handling, offline caching or text highlighting.

## Deployment

1. Apply `supabase/migrations/20260920004152_digital_book_reader.sql` to the existing holy-shelf Supabase project, `dswwzziwtbyzxojrnxvg`, before deploying the frontend. It creates three RLS-protected tables and a private `book-files` bucket with per-user path policies. No existing tables or buckets are changed.
2. Deploy the frontend through the normal Vercel/main workflow. Existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` suffice. No AI key or API usage is involved. Supabase storage/bandwidth quotas still apply.
3. Verify signed-in upload, reopen, bookmark, and removal on production. Local browser tests use mocked backend requests; they do not certify the production migration or OAuth flow.

Do not deploy the frontend before the migration: the reader and Library deletion now depend on `book_files`. Roll back the frontend first if needed; leave the new private tables and bucket in place to preserve user uploads.

## Design and security

- `src/lib/bookFiles.js` handles authenticated Storage/database operations. Removing an attachment deletes its Storage object before its metadata. Both existing Library delete actions remove attachments first; partial failures are reported and can be retried. Direct database/admin deletions bypass that application cleanup and can leave private Storage objects requiring administrative removal.
- `DigitalBookReader` restores state before mounting a viewer. Position writes are serialized and pending rapid changes coalesced to avoid out-of-order requests within a session. Concurrent devices use the last completed write. Allow “Place saved” before closing a tab; offline writes are not persisted locally.
- Viewers load lazily. PDF.js runs with eval disabled. EPUB content is sanitized after archive asset replacement, scripts/popups are disabled in its iframe, and a chapter CSP blocks network resources. Internal links are resolved within the book. External links/assets are intentionally unavailable.
- EPUB.js's XML dependency is pinned to patched `@xmldom/xmldom` 0.9.12 through a scoped override. Recheck the override when upgrading EPUB.js.

## Validation performed

- `node --test tests/readerState.test.js`: file validation, invalid positions, concurrent save ordering, failure/retry.
- Production build with placeholder Supabase environment values; `npm run lint` succeeds with warnings (including effects that synchronize reader state); `npm audit --omit=dev` reports zero vulnerabilities.
- Headless Edge, React StrictMode, generated three-page PDF and two-chapter EPUB: both formats render; PDF page/zoom and EPUB chapter/text controls work; uploads, bookmarks, reopen at saved position, failed-save retry and attachment removal pass against mocked backend responses. Mobile layout checked at 390 px. Embedded script/event-handler and remote-image test content is blocked.
- Migration executed against isolated PGlite with auth/storage schema stubs: owner CRUD, cross-account read/write denial, cross-book ownership, storage path isolation, cascade cleanup, and denied table truncation/attachment mutation pass. Existing production Storage policies were read and are scoped to other buckets.
