# Sermons workspace

Implemented on `feature/sermons-workspace`, 2026-09-14. The user's approved Modern Heritage mockup and subsequent decisions supersede the older Organic/embedded-playback instructions in the supplied plan.

## User workflow

- Open Sermons in the sidebar (More on phones), then New Sermon.
- Save a source URL and optional title, speaker, series, church, date, description, image, tags and personal notes.
- Set **Primary Text** to the main passage (for example Romans 8:28–39). The prominent Bible Study button opens it with the sermon alongside. Study-guide links retain that same sermon context. `supabase/sermon-primary-text.sql` adds the saved text and parsed passage; Search matches it even if it is not in the transcript.
- Paste a transcript or import TXT, searchable PDF, DOCX, SRT or VTT. Uploaded originals are private. Files are limited to 20 MB, PDFs to 500 pages, extracted text to one million characters. Image-only scanned PDFs need a text transcript; OCR is not included.
- Transcript imports detect and deduplicate explicit Scripture references using the existing BSD tagger. Editing a transcript replaces its Scripture index transactionally. SRT/VTT timestamps are displayed; manually changing extracted text clears the timing alignment.
- Source audio/video opens externally. There is no embedded player, synchronization, automatic transcription, or YouTube caption retrieval, per the user's choices.
- List/grid, favorites, recently viewed, series/topic grouping, source/speaker/church/date/transcript filters, sort, pagination and featured sermon selection use actual saved data.
- Scripture previews use local BSB. Open in Bible Study retains the sermon panel with transcript, references and saved guide. Reference previews support copy and linked notes.
- Generate Study Guide is an explicit individual AI action. Guides are saved and editable, including summary, outline, theological points, discussion, application and cross-references. Export creates a normal numbered Notebook entry. The saved export remains independently editable; regenerating a guide does not overwrite that note.
- Link existing notes or create new ones; Notes show the sermon backlink. Topic links and sermon tags contribute to Topics counts and its Sermons section. Search includes sermon metadata and full transcript text, plus Scripture-range overlap results.
- Deleting a sermon removes its uploaded original and Scripture/topic links while retaining linked notes with their sermon association cleared.

## Implementation and deployment

Existing React/Vite/Tailwind/Supabase stack and singleton are retained. New UI uses plain JSX/JS; the Edge Function uses Deno TypeScript like the existing server functions.

Applied to **holy-shelf**, `dswwzziwtbyzxojrnxvg`, in order:

1. `supabase/sermons-workspace.sql` — owner-scoped sermons and Scripture index, private storage, Notes relationship, topic entity type.
2. `supabase/sermon-generation-lock.sql` — concurrent generation lock.
3. `supabase/sermon-integrity.sql` — export ownership, deletion cleanup, bounded FTS excerpt and atomic guide save.

Deployed `supabase/functions/sermon-study-guide/index.ts`. It validates the caller with `auth.getUser(token)` and performs queries through that caller's RLS-bound client. Gateway JWT verification is disabled only because authentication is explicitly handled in the body, consistent with the project's existing auth setup. The service uses the existing `ANTHROPIC_API_KEY` and `claude-sonnet-4-6`; no new frontend secret.

The plan's proposed `sermon-process` endpoint is implemented as browser extraction (`pdfjs-dist`, Mammoth raw text), the existing shared reference tagger, and a transactional database trigger. This supports every approved format without a second parser or an AI import cost. Study guide generation remains server-side. The database FTS column indexes a bounded excerpt to avoid PostgreSQL limits; current global Search checks the full loaded transcript like the other existing content types.

Guides use at most the first 240,000 transcript characters and disclose truncation in the saved summary. A concurrent generation is rejected; an edited transcript prevents the old generation from being saved. Failed AI responses preserve the previous guide and can be retried explicitly. No automatic paid retry or bulk AI action.

## Validation

- Production build and oxlint completed; pre-existing lint warnings remain.
- 48 Node tests passed, including timestamp parsing, reference deduplication/range overlap, filter combinations, source host checks, Topics integration, and guide export content.
- Browser parser harness passed all five formats with sample files: TXT, PDF, DOCX, SRT and VTT. A PDF cleanup API mismatch found by this check was corrected. The browser file chooser did not deliver its selected test file, so extraction was verified with browser-native File objects in an isolated harness instead.
- Isolated browser fixture verified create/save/pasted transcript, reference normalization/deduplication, guide generation UI with mocked AI, numbered Notes export/backlink, Bible panel, Topics connection, Scripture-overlap Search, and mobile filtering. At desktop 1600px, the three content columns fit without horizontal overflow; phone 390px renders the compact list and filter dialog.
- `supabase/sermon-rls-test.sql` passed live inside a rolled-back transaction with synthetic users: owner CRUD, cross-account isolation, note-link ownership, failed-index-update rollback and deletion cleanup preserving Notes.
- Deployed guide endpoint rejects unauthenticated calls with HTTP 401. No paid AI request was made during automated verification.
- Supabase advisors reported no new security finding for Sermons. Existing unrelated findings: [mutable search path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [RLS without a policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) on the deliberately server-managed hidden checks table, and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Newly created unused indexes are expected before real sermon data is added.

Main is not merged or published by this change. Preview review comes first.

Study-guide generation now suggests 3–6 sermon topics with reasons. On the Study Guide tab, Link Topic / Link All Suggested Topics reuse existing names and aliases or create tag-derived Topics, save explicit sermon links, and preserve existing tags. Older guides remain readable; regenerate explicitly for suggestions. No extra AI call is made for topic linking.
