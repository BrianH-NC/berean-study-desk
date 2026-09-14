# Topics workspace

The `/topics` catalog provides 18 curated, read-only built-in topics plus personal topics and topics derived from existing content tags. The old Scripture/tag index remains at `/topics/index`. Topic detail routes provide Overview, Scripture, Library, Notes, Resources, and Doctrine Check tabs.

Search covers names, descriptions, aliases, tags, and linked content titles. Category/source/tag/content/date filters, collections, favorites, five sort modes, grid/list views, recent viewing history, and incremental loading are supported. Trending uses visits from the last 30 days; popularity uses the current account's view counts with curated starting points. No global activity is exposed.

Notes, library books, and visible Doctrine Checks are matched by existing tags or explicit private links. Counts deduplicate those relationships. A new note from a topic receives its tag and an explicit link. A check started from a topic preserves the normal assessment, including creation/origins, and adds a focused follow-up through the existing assessment service. Resources are saved article/video/website/tool URLs, rather than copies of external content.

## Database

Applied to the existing holy-shelf project:

- `topics_workspace`: `topics`, `topic_links`, `topic_preferences`, and `record_topic_view(text)`.
- `topics_delete_cleanup`: `delete_personal_topic(uuid)` atomically removes a personal topic's links/preferences and references from other personal topics. Underlying notes, books, and assessments are preserved.

SQL is checked in under `supabase/topics-workspace.sql` and `supabase/topics-delete-cleanup.sql`. All tables enforce owner-only RLS. Both functions use invoker security and a fixed search path; anonymous execution is revoked. Built-ins are bundled catalog data and cannot be edited/deleted through personal topic controls.

## Validation

- Production build succeeds; lint exits successfully with React effect warnings, including the catalog's initial data load.
- All 41 Node tests pass, including alias reconciliation, deduplicated counts, linked-title search, and related-topic keys.
- Database tests in rolled-back transactions verify cross-account isolation, ownership checks, atomic view increments, and deletion cleanup.
- Browser fixture checks: personal topic creation, favorites, collection saving, note/resource linking, new linked notes, topic-focused Doctrine Check entry, mobile filters, and desktop/tablet/phone layouts. No paid live assessment was generated during QA.
- Security advisors report no findings for the added tables/functions. Existing unrelated project advisories remain unchanged.

No Topic Detail tabs are deferred. Topic merging, social analytics, and a new study-session model are intentionally outside this specification's required scope. Existing global navigation is preserved, including Topics through the phone's More menu.
