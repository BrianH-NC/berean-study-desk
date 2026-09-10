# Berean Study Desk — Handoff

Written 2026-09-09 for continuity when switching AI coding assistants (Claude → Codex). This is a snapshot, not a permanent doc — update or delete it once it's served its purpose.

## What this project is

A personal Bible study / library / doctrine-check app, merging three of Brian's older single-purpose apps into one product:
- `digging-deep-notebook` (vanilla-JS Bible study notebook) → now the **Notebook** screens
- `holy-shelf` (React/Vite/Tailwind/Supabase personal library) → now **My Library** and the base stack
- `theology-checker` (vanilla-JS + Supabase Edge Functions doctrine checker) → now **Doctrine Check**

Live at **bereanstudydesk.app**, deployed on Vercel, auto-deploying from `main` on push. Repo: `https://github.com/BrianH-NC/berean-study-desk` (must stay **public** — see Known Issues).

**Status: not a partial build.** Every one of the ten planned screens is fully implemented and wired to real data (line counts range 99–929, no stub screens remain). The `README.md` still says "Phase 1, everything else is a placeholder" — that's stale; ignore it. There's also a plan file mentioning "Phase 2 — Doctrine Check" as upcoming work — that's also done (index + report + confession comparison + follow-up Q&A, all live against real Claude-generated data).

## Stack

- React 18 (`react-router-dom` v7) + Vite + Tailwind CSS v3, plain JS (no TypeScript), no test runner (one exception: `src/lib/authorSort.test.js` — check how it's actually run before assuming a framework is wired up).
- Supabase: Postgres + Auth (Google OAuth) + Storage + Edge Functions (Deno).
- **Supabase project: `holy-shelf`, project ref `dswwzziwtbyzxojrnxvg`.** This is the one live project with real data. There is also a decoy/unused Supabase project literally named "Berean Study Desk" (ref `uyjbsakajpgssiyykyfa`) that a secret was once mistakenly set in — **do not use it**. If you ever need to set an Edge Function secret, triple-check you're in `dswwzziwtbyzxojrnxvg`.
- Design system: "Organic" — Caprasimo/Figtree fonts, terracotta + sage accents. Tokens are CSS custom properties in `src/index.css`, consumed via `tailwind.config.js` theme extensions.

## Directory map

```
src/
  App.jsx                 — routes, AuthContext, ProtectedLayout (Sidebar + <Routes>)
  components/
    Sidebar.jsx            — collapsible left rail (icon-only + hover-to-peek), Day/Evening toggle, mobile bottom tabs
    Auth.jsx                — Google sign-in gate (renders instead of the router when logged out)
    EntryComposerForm.jsx   — shared Notebook create/edit form (photos, related entries, ref-insert, focus mode)
    ScriptureText.jsx       — renders free text with auto-detected Bible references as click-to-toggle popovers
    BarcodeScanner.jsx, ChangeCoverDialog.jsx, Logo.jsx, Placeholder.jsx
  screens/                 — one file per route, see App.jsx for the mapping
  lib/
    supabase.js             — client singleton
    entries.js               — Notebook data access + entry-numbering algorithm (nextGapNumber/nextSuffixedNumber/formatEntryNum), CANONICAL_BOOKS, resolveBookName
    bsb.js                   — Berean Standard Bible reads (public domain, stored directly in Postgres), parseReference()
    esv.js                   — ESV via Edge Function (licensed API)
    bibleplus.js              — NIV/NLT/CSB via API.Bible (licensed, Edge Function proxy)
    helloao.js                — KJV/ASV/WEB/DBY/YLT/DRA (free public-domain API) + commentary + cross-references
    scriptureTagger.js        — regex-based reference detector for free text (used by ScriptureText.jsx)
    theologyCheck.js           — fetch wrappers for the theology-check / checks-api Edge Functions
    verdict.js, stance.js       — shared badge class/icon mappings
    votd.js                     — Verse of the Day (BibleGateway RSS via Edge Function, localStorage-cached per day)
    entryPhotos.js, bookPhoto.js, shelfPhoto.js, googleBooks.js, functionAuth.js, theme.js, authorSort.js
supabase/functions/         — Deno Edge Functions: esv-passage, bibleplus-chapter, theology-check, checks-api,
                              identify-book-image, identify-shelf-photo, votd
```

## Conventions to follow (don't reinvent these)

1. **Every Edge Function requires real per-user auth.** Pattern: call `supabase.auth.getUser(token)` on the caller's actual access token (not the anon key alone) and 401 otherwise. Follow this exactly for any new function.
2. **CSS theme tokens**: base/mode-only tokens (independent of color theme) live in bare `:root` and `[data-mode='dark']`. Per-theme overrides live in `[data-theme='X']` / `[data-theme='X'][data-mode='dark']`. The `--verdict-*` tokens are deliberately defined ONLY in the mode-level blocks so no theme override can touch them — verdict colors (Sound=green, Caution=yellow, Concern=red, Distinctive=blue, Unable to Assess=grey) must stay consistent across all color themes.
3. **Error handling is deliberately simple**, matching the three source apps: reads swallow errors and fall back to `[]`/`null`; writes use `alert('Error: ' + error.message)`; destructive actions gated with native `confirm()`. No toast/modal library. Don't introduce one without being asked.
4. **Entry numbering** (Notebook): lowest-gap-fill (`nextGapNumber`), lettered suffixes for manual collisions stored as `base + 0.001*n` (`nextSuffixedNumber`), display via `formatEntryNum`. All in `src/lib/entries.js` — reuse, don't reimplement.
5. **Bible translation objects** all carry `{ id, name, short }` — use `.short` (e.g. "ESV", "NIV") for compact UI like dropdowns, `.name` for full attribution text. See `ALL_TRANSLATIONS` in `BibleStudy.jsx`.
6. **Sidebar collapse behavior**: hovering the collapsed icon rail widens it in normal document flow (reflow), not as an absolutely-positioned overlay — a prior overlay approach clipped whatever page content was already sitting in that space. Keep it that way if you touch `Sidebar.jsx`.
7. Commit messages end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>` — swap the tool name if Codex should attribute itself differently; check with Brian first if unsure.

## Known issues / gotchas

- **Local dev Google OAuth redirects to production.** `localhost` isn't in Supabase's Auth → URL Configuration redirect allowlist, so signing in from `npm run dev` bounces to the live site instead of staying local. This has blocked essentially all live click-testing this whole project — verification has mostly been build-only (`npm run build`) plus code review, not actual browser interaction with authenticated screens. Either get that allowlist entry added, or expect to do the same build-and-reason verification Codex should default to.
- **Vercel deploys depend on the repo staying public.** It was briefly set to private, which broke GitHub→Vercel's webhook delivery (unauthenticated GitHub API calls 404 on a private repo, which is how that surfaced). It's public again now and deploys are working. If deploys silently stop again, check repo visibility first, then GitHub Settings → Installed GitHub Apps → Vercel → repository access, then the webhook's Recent Deliveries.
- **`README.md` and the project plan file are stale** — both describe an earlier, partial state of the app. Don't trust them for "what's left to build"; read the actual code.
- Edge Functions currently accept any caller with a valid Supabase session (their own auth check), which is appropriate for a single-tenant app; there's no additional per-resource authorization layer. Fine as-is unless this app is opened up to other users.

## Recent work (most recent session, chronological)

1. Multi-translation Bible reading + comparison (BSB, ESV, NIV, NLT, CSB via API.Bible, plus KJV/ASV/WEB/DBY/YLT/DRA via a free API), paragraph-form rendering, verse-range search fixes.
2. Auto-detected Bible references in free text (Notebook entries) — click-to-open popover previews (`ScriptureText.jsx` / `scriptureTagger.js`).
3. Verse of the Day card on Home.
4. Large UI/UX pass: collapsible icon-only Sidebar with hover-to-peek, sitewide verdict color consistency, bumped base font sizes, My Library rename + layout rework, full Notebook composer rebuild (photos via a new `entry-photos` Storage bucket, related-entries picker, entry-number override, focus mode).
5. Doctrine Check theological-assessment disclaimer copy (index page + report page).
6. Sidebar hover-peek bug fixes (hit-area mismatch, then a redesign from overlay to page-reflow so peeking never clips underlying content; Day/Evening toggle overflow fix for the collapsed rail).
7. Bible Study reading dropdown now shows translation abbreviations (BSB/ESV/NIV/...) instead of full names.
8. Bible Study search bar: a bare book name/abbreviation ("1 Peter", "Job") now opens chapter 1 instead of erroring — `parseReference()` in `src/lib/bsb.js` required a chapter number before this fix.
9. Doctrine Check: "Scan a shelf" button moved up next to "Scan barcode" in the New Check card (was its own separate card below), matching the same pattern already used on the Add to My Library screen.

All of the above is committed directly to `main` and pushed — there is no feature-branch workflow on this repo currently; commits go straight to `main`.

## Suggested next steps (not yet requested by Brian, just visible gaps)

- Live browser verification of everything built since the OAuth-redirect issue first blocked it (essentially this whole session) — once local auth is fixed or you have another way to test, walk through Sidebar collapse/hover, Notebook composer (photos, related entries, number override), Home's VOTD card, and the Doctrine Check shelf-scan reflow.
- `README.md` is stale and should probably be rewritten to reflect actual status before anyone else reads it.
- No automated test runner is wired up beyond one loose test file (`authorSort.test.js`) — worth confirming whether it even runs in CI/locally, since there's no `test` script in `package.json`.

## Commands

```bash
npm install
npm run dev      # localhost dev server — auth will redirect to prod, see Known Issues
npm run build    # this is the actual verification loop used all session; run before committing
npm run lint     # oxlint
```
