# Modern Heritage redesign

Design authority: **BSD Design and Implementation Specification**, version 1.0,
8 September 2026, supplied by Brian. This branch implements option A: one
Modern Heritage light theme, replacing Organic, alternate themes, and Day/Evening.
The root HANDOFF.md remains useful for existing application behavior; its theme
rules and direct-to-main workflow are superseded on this branch.

## Delivered chunks

### Bible Study detailed reference — September 12, 2026

The reading workspace now follows Brian's desktop/tablet/phone reference: compact passage search, account link and Scripture quote, chapter/translation controls, Single and Parallel reading, tools and insights column, personal notes, related library books, and an image quote. BSB remains the anchor; default comparison uses KJV/ASV/WEB. Existing licensed translations remain opt-in. Passage scopes apply to all columns. Phone comparison scrolls inside the reader, with collapsible study sections.

Commentary, cross-references, copy actions, passage navigation, and unsaved note drafts retain their existing integrations. Personal notes match the current chapter; related books come from those notes' shelf links or a matching Bible-book tag. Word study/interlinear, maps, and timeline open explicitly labeled Bible Hub resources. Textual variants are visibly not connected. Quick Insights provides study questions, and Passage Analysis opens a guided note draft; neither claims to be generated passage analysis. No schema or authentication changes.

Validation: build/lint and all 31 existing tests pass. Isolated browser checks at desktop and phone sizes confirmed real free-translation responses, range lookup, Single mode, selected-text note drafts, personal sidebar fixture data, collapsed phone sections, and no page overflow. Existing bundle-size warning remains. Published on the existing Search preview branch; main is unchanged.

### Foundation

- Central forest, gold, parchment, charcoal, surface, muted, control and verdict
  tokens. Existing color aliases now resolve to this single palette.
- Cinzel display, Lora reading, Inter controls, and EB Garamond Scripture.
  Google Fonts supplies the selected weights with readable fallbacks.
- Shared cards, fields, buttons, focus treatment, reduced motion, and page gutters.
- Forest sidebar: 240 px at 1280+, 72 px rail at 768–1279; explicit rail expansion
  reflows the page. A collapsed desktop rail still supports hover expansion.
- Phone header and Home/Search/Bible Study/Library/More bar. More is a native
  modal dialog with Escape, focus containment, and focus restoration. Bottom
  padding includes the safe area. Skip-to-main link is available.
- Theme picker, mode toggle, theme observer, and dark CSS removed. Initialization
  clears only obsolete theme/mode preferences and tolerates unavailable storage.
- Cinzel wordmark and recolored existing simplified manuscript B SVG. Browser
  identity uses the new palette. Old asset folders are inert historical assets.
- Sign-in and Settings use the new system; Profile reuses the existing account
  form at `/settings/profile`.

### Initial study screens

- Home has a deterministic Acts 17:10–12 focus, four working quick actions,
  existing daily verse and reading modules, and recent activity.
- Scripture typography is applied to Home, Search previews, Bible Study,
  translation comparisons, note quotations, and reference popovers.
- Bible Study tools wrap when a 480 px passage plus secondary pane cannot fit.
  Verse selection supports Enter/Space as well as pointer input.
- Notes retain numbering, composition, attachments and links. The entry context
  column now waits until a wider breakpoint; note body keeps a reading measure.

## Route mapping and remaining screen work

| Existing route | Design destination | Current extent |
| --- | --- | --- |
| `/` | Home | Initial hierarchy; landscape asset and richer resume layout pending |
| `/search` | Search | Shared styling and Scripture excerpt typography; study-panel architecture pending |
| `/bible` | Bible Study | Reading typography, responsive pane widths and keyboard verse selection; full mobile tool sequence pending |
| `/shelf`, `/shelf/:id` | Library, Book Detail | Shelf/Grid/List, seven-column responsive records, filtering and sorting; six Book Detail sections |
| `/shelf/add`, `/shelf/wishlist`, `/shelf/wishlist/add` | Collection utilities | Existing behavior, shared foundation |
| `/notebook`, `/notebook/new`, `/notebook/:id` | Notes | Initial reading pass; full list/editor/context architecture pending |
| `/checks`, `/checks/:id` | Doctrine Check | Shared tokens; full screen pass pending |
| `/topics`, `/reading`, `/reading/:bookId` | Existing study utilities | Preserved and accessible |
| `/settings`, `/settings/profile` | Settings, Profile | Theme removal and existing account form; reading preferences pending |
| No existing route | Resources, Tools | No placeholder routes added; requires a later implementation chunk |

No database, authentication, Edge Function, deployment, or dependency-version
changes are included. Existing stored verdict values, including Distinctive,
remain intact; this styling pass does not reinterpret historic assessments.

## Validation

- Original and updated `npm run build` pass.
- A second `npm run build` with nonproduction placeholder Supabase configuration
  also passes, ensuring the actual app is included rather than tree-shaken behind
  the missing-environment error. It reports a large-bundle warning
  (main bundle approximately 607 kB before gzip).
- `npm run lint` exits successfully: 29 existing warnings, no errors, no new
  warnings from this redesign. Warnings concern existing effects, dependencies,
  static components and App context exports.
- Local headless Edge with intercepted test data: Settings shell at 320, 390,
  768, 1024, 1280 and 1440 px. No horizontal overflow or page errors; verified
  rail widths, light background, obsolete mode removal, and More/Escape focus.
- Nine existing screen paths at 320, 768 and 1280 px: no horizontal page overflow
  or page errors in the empty/sample-data states. Keyboard verse selection works.
  With tools open, passage widths were 288, 648 and 556 px respectively.
- Screenshots reviewed for desktop/phone Settings, Home and phone Scripture.

These are visual smoke checks with test data, not authenticated end-to-end tests.
Populated collections, real saves, OAuth, two-user authorization, long assessments,
200% browser zoom and full release acceptance remain unverified.

## Asset and release limitations

The repository provides a simplified B SVG and themed raster artwork, not the
final Modern Heritage scroll/quill SVG variants, Heritage Filled icon family or
chosen Home landscape. The initial branch preserves the B silhouette and existing
Lucide icons; final asset integration and visual sign-off remain outstanding.
Font files are currently served by Google Fonts, not self-hosted.

Local preview uses test-only configuration; production credentials were not read
or used. Live Google OAuth testing has the limitation described in HANDOFF.md.
This is the beginning of the redesign, not a claim that the full specification or
its privacy/release gates are complete. Do not merge to main without Brian's request.

## Collection chunk

Library now shares a single filtered/sorted result set across Shelf, Grid and List.
The seven List columns are Title, Author, Category, Verdict, Status, Progress and
Actions; narrow layouts turn rows into labeled records. No Rating or Date Added
appears in the primary Library. The existing first tag supplies primary Category,
so multi-tag books no longer appear more than once in the collection.

Search, category, reading status, tradition, verdict, sort direction, view and the
visible-item limit live in URL state. The selected view also persists per user in
browser storage. Book links carry the collection URL back to the Library. Load
more reveals 24 additional records. Data loading still uses the existing full
collection query; server-side pagination remains a later performance task.

AssessmentBadge is shared by Library and Book Detail and links to the newest
existing ISBN-matched assessment. This preserves the current schema's matching
contract; edition-level applicability and assessment history need later backend
work. Failed assessment reads display Unavailable rather than Not Assessed.
BookCover handles missing/failed covers using a typographic fallback without
cropping actual covers.

Book Detail places the verdict under title/author and adds URL-backed sections:
Overview, My Notes, Highlights, Related Scripture, Doctrine Check, Details.
My Notes includes existing book notes and linked Notebook entries. Related
Scripture comes only from those entries' references. Highlights explains the
existing reading-note alternative; no unsupported highlight feature is simulated.
The metadata editor and existing read/status/assessment/removal actions remain.
All editor fields have accessible names; no schema or production data was changed.

Progress is unavailable (—): the existing app has no percentage tracking.
Favorites/collections, richer action menus, recoverable note deletion semantics,
edition-aware assessments, and dedicated highlights are not implemented here.
The Actions column currently opens Book Detail, where management actions reside.

Validation for this chunk: build passes with the bundle-size warning; lint exits
successfully with fewer warnings than the baseline and no warnings in new modules.
All 26 tests pass (22 existing author-sort cases plus 4 collection cases).
Browser checks use 30 isolated sample books: List has seven headers, one search
result remains consistent between List and Grid, the return link restores query
and view, related Scripture opens the expected passage URL, and a sample metadata
save succeeds. Populated List and long-title Book Detail reflow at 320, 390, 768,
1024, 1280 and 1440 px without horizontal page overflow. The phone editor has no
unnamed fields or horizontal overflow. This is not a production save/auth test.
# Homepage reference pass — September 11, 2026

Homepage now follows the supplied desktop/tablet/phone reference: scenic hero, prominent search, seven feature shortcuts, Continue Studying, Recent Items, daily Scripture, reflection, and actual collection counts. Topics and Reading occupy the reference's Resources/Tools positions because those are existing implemented destinations. No fictional weekly targets or notification controls were added. Search forwards the typed query to the existing search screen.

Three generated study scenes rotate by local calendar day, remain stable within the day, and refresh on focus or within 30 seconds after midnight. Optimized assets: `public/images/study-{mountains,lake,olive-grove}.webp`. Built-in image generation prompts requested panoramic photorealistic open-Bible study desks with mountain sunrise, misty forest lake, and olive-grove hills; forest green/parchment/gold palette, space for headline, no logos or text. Original generated PNGs remain outside the repository.

Validation: production build and lint pass; 28 unit tests pass including daily stability and rotation. Browser visual validation could not run because the browser tool timed out twice. Existing bundle-size warning remains. No auth, schema, or production-branch changes.
# Homepage visual refinement

Corrected the live screenshot deviations: compact hero/cards/sidebar, explicit shortcut heading line height, parchment scroll/quill overlay on the vector B, daily-scene verse thumbnail, rounded green progress indicator, and accurate Updated dates. Desktop, 390px phone, and 1024px tablet fixture previews visually checked; no horizontal overflow on phone/tablet. Verse service was unavailable in the isolated fixture, so the live thumbnail remains to verify after deployment. Build and lint pass.
# Search workspace — September 12, 2026

Implemented the supplied Search layout on `feature/search-workspace`: search form, URL-backed categories/filters/sort, BSB keyword and passage lookup, library-only Books, tagged-note Topics, Notes, saved Doctrine Checks, commentary Resources, result previews, context/translation links, and unsaved Add to Notes drafts. Personal books and notes load in ordered pages rather than stopping at the API row cap. External book suggestions use Google Books with Open Library fallback and remain separate from library results. Logos is not connected.

Commentary scope is deliberately disclosed: selected commentary, entered passage or first three BSB-result chapters; this is not an indexed search of every commentary. Result counts are loaded counts; more BSB verses and displayed results can be requested. BSB filters also constrain commentary source passages. No ESV call occurs in Search; translation comparison opens the existing Bible Study feature. Advanced Search offers exact phrase matching. Related topics come from saved tags; external discovery currently covers books.

Validation: build/lint and 31 tests pass. Local fixture browser checks covered real Matthew Henry API response for Romans 5:8, the BSB-to-note draft, library-only category, empty results, radio selection, phone preview focus, desktop four-column layout, and no horizontal overflow at 320/390/768/1024/1440 widths. Open Library suggestions loaded in-browser; shell access was intermittent. Browser fixture uses sample personal data, not production writes. Existing bundle-size warning remains. Main remains unchanged for review.
# Doctrine Check workspace — September 12, 2026

The Doctrine Check index and saved reports now use the Modern Heritage header, responsive workspace, assessment legend, standards rail, overall assessment and a findings table. Existing book/person checks, scanning, saved comparisons, follow-up questions and library links remain available.

Creation & Origins is prominent in saved reports and the Library Doctrine tab. Existing `creation_view` text is displayed unchanged, with an explicit unclear fallback. Future assessments support Young Earth, Old Earth, Intelligent Design, Evolution and Theistic Evolution, including nuanced combined positions. Origins remain informational, separate from the overall verdict. The theology-check Edge Function was deployed as version 14 with JWT verification retained; no saved records were rewritten.

The reference's passage/text evaluation, sourced quotation tabs and per-topic verdict counts are not yet backed by the current assessment model. The UI displays saved alignment/concern findings and actual confidence instead of inventing those details. The existing confession comparison workflow remains the supported comparison mechanism.

Validation: production build, lint, 31 existing tests; isolated browser checks of report, Library Doctrine tab and phone-width new-check form with no horizontal overflow. No paid AI assessments were run solely for testing.
