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

The user approved the preview and requested promotion to main, including Primary Text and suggested topic linking. The latest validation has 51 passing Node tests, plus browser verification of suggested topic linking and connected sermon counts.

Study-guide generation now suggests 3–6 sermon topics with reasons. On the Study Guide tab, Link Topic / Link All Suggested Topics reuse existing names and aliases or create tag-derived Topics, save explicit sermon links, and preserve existing tags. Older guides remain readable; regenerate explicitly for suggestions. No extra AI call is made for topic linking.

## SermonIndex sermons on the passage card (1.13.0)

- The SermonIndex card in Sermons for this passage lists up to 15 sermons per chapter (5 shown, then "Show more") from `public/data/sermonindex/{1-66}.json`, about 2.7 MB in all. Rebuild with `scripts/snapshot-sermonindex-passages.mjs` from SermonIndex's `sermonindex.db` bulk download; the live per-chapter API files are megabytes each and are never fetched by the app.
- SermonIndex publishes no listen counts, so rows are ordered by fit: the chapter holds the sermon's first reference, how many of its verses it cites, whether it stays within three chapters, membership in SermonIndex's 500 most-listened, and transcript/media. Selected verses move matching sermons to the top.
- **Save to my Sermons** fetches `https://api.sermonindex.net/v2/sermons/{id}` from the browser (no key, CORS open). It stores the timed VTT transcript (or the plain one), the summary, not the machine-written `description`, topics as tags, and the reference in the chapter being read (else the first) as Primary Text. The SermonIndex page is the source URL, and notes record the audio link and that SermonIndex's summary may be machine-generated. A second save of the same sermon opens the existing record instead of duplicating it.
- The bulk download lags the live API (64k vs 70k sermons in November 2026), so the card always links to SermonIndex's full chapter list too.

## Autofill sermon details from the transcript (1.20.0) — 2026-11-26

- Importing a transcript file, or pasting one into an empty Transcript box, calls the new authenticated `sermon-autofill` Edge Function once. The **Fill details from transcript** button runs it again on demand. The call is skipped when no fillable field is empty.
- It fills **blank fields only**: title (the transcript's heading line if it has one), speaker (only when the transcript states who is preaching), series (only when named), Primary Text, a 2–4 sentence catalog description, and 3–6 topics in Tags / Topics. Typed values, and values typed while the request is running, always win.
- Defaults: Church becomes **Parkside Baptist Church** as soon as a transcript arrives (no AI needed); Speaker becomes **Chase Jenkins** when the transcript doesn't name the preacher.
- Topic names are resolved against the Topics catalog (names and aliases, via `resolveSermonTopics`) before they go into Tags, and the catalog names are sent so the model prefers them. On save, suggested topics still present in the final tags get explicit sermon `topic_links`; removed ones are not linked.
- Supersedes the earlier "no AI import cost" decision at the user's request. Uses the existing `ANTHROPIC_API_KEY` and `claude-sonnet-4-6`, the first 120,000 transcript characters, `max_tokens` 1500. No schema change.
- Code: `supabase/functions/sermon-autofill/index.ts` (deployed to `dswwzziwtbyzxojrnxvg`, verify_jwt off, auth checked in the body like `sermon-study-guide`), `src/lib/sermonAutofill.js` (+ tests), `fillSermonDetails` in `src/lib/sermons.js`, `SermonComposer.jsx`.
- Validation: 7 new unit tests pass; the existing `passageLibrary.test.js` failure predates this change. Build and lint clean for the changed files. An isolated browser harness with a mocked AI response verified file upload and paste triggers, blank-only merge (a typed speaker survived), Parkside default, topic alias resolution (Church → The Church), and topic links on save. No paid AI request was made during verification.
- One-time backfill, 2026-11-26: the seven Parkside sermons got catalog descriptions, added topics (merged with existing tags) with sermon `topic_links`, Primary Text where blank (1 Peter 2:11-12, 2:13-14), Speaker where blank, and "Parkside Baptist" normalized to "Parkside Baptist Church". Written directly in SQL from the transcripts; no API calls. Ravenhill and the French Deuteronomy sermon were left alone.

## Cross-chapter Primary Text (1.20.1) — 2026-11-26

- `src/lib/primaryText.js` parses ranges like "1 Peter 1:22-2:3" on top of `parseReference`. `primary_ref` keeps its single-chapter shape and adds `chapterEnd`; `verseEnd` then belongs to `chapterEnd`. Older rows are unchanged.
- `primaryRefSegments` expands a span into per-chapter refs for `sermonPassageMatch` (Search) and Passage Connections; `sermonBibleUrl` opens at the first verse without a `verseEnd`; `passageLabel` prints "1 Peter 1:22–2:3". Composer and SermonIndex import both use the new parser.
- Fixed `dgroup-generate` interpolating the `primary_ref` object ("[object Object]") into its prompt; it now uses `primary_text`. Redeployed as version 3, verify_jwt unchanged (on).
- "Abiding Word, Abiding Love" updated to 1 Peter 1:22-2:3.

## Sermon outline (1.21.0) — 2026-11-26

- New `sermons.sermon_outline jsonb` (`supabase/migrations/20261127_sermon_outline.sql`, applied): `{big_idea, points:[{heading, ref, subpoints[]}]}`. Null when empty.
- `sermon-autofill` (version 2, max_tokens 3000) also returns the preacher's own outline; the composer fills it only when the outline is empty, like the other fields. `src/lib/sermonOutline.js` cleans and checks it; `src/components/SermonOutline.jsx` has the view and the editor.
- Sermon detail has an Outline tab between Overview and Transcript; the composer has a Sermon outline editor (big idea, points with heading, verses and sub-points, reorder/remove/add).
- The seven Parkside sermons had outlines written directly from their transcripts' announced points (no API calls).
