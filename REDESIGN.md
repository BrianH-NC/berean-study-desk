# Modern Heritage redesign

Design authority: **BSD Design and Implementation Specification**, version 1.0,
8 September 2026, supplied by Brian. This branch implements option A: one
Modern Heritage light theme, replacing Organic, alternate themes, and Day/Evening.
The root HANDOFF.md remains useful for existing application behavior; its theme
rules and direct-to-main workflow are superseded on this branch.

## Delivered chunks

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
| `/shelf`, `/shelf/:id` | Library, Book Detail | Shared foundation only; Shelf/Grid/List and seven-column record contract pending |
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
