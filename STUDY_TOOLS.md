# Study tools

Available on the daily-study-tools branch at `/study-tools` (Review),
`/study-tools?tool=reminders`, and `/study-tools?tool=packets`.

- Review: saved quotation snapshots or local BSB passages, including note-reference suggestions. Reveal, rate, pause, resume, remove. Calendar-day scheduling at 1/3/7/14/30/60/120 days. A duplicate source cannot be added twice per account.
- Reminders: private one-time/daily/weekly schedules, destination link, done, snooze, edit, pause and delete. Due banner throughout the signed-in app. Floating local times; calendar download includes a ten-minute alert. Calendar copies do not sync with BSD. No email, push service, or background browser notification permission is used.
- Packets: choose notes (plain text), sermon descriptions/notes/saved guides, quotations/reflections, and BSB passages. Reorder, preview, download Markdown or escaped standalone HTML, or print/save PDF through the browser. Drafts are page-local, not persisted. No AI call is made during packet assembly.

Migration `20261018012209_study_review_reminders.sql` was applied to holy-shelf. New tables have owner-only RLS, authenticated CRUD grants, and no anonymous grants. Account exports include both tables. Writes use optimistic updated_at checks.

Validation: build/lint complete (existing React effect/fast-refresh warnings remain); 105 automated tests pass. `supabase/tests/study_tools_rls.sql` verifies owner access, cross-account isolation and anonymous grants in a rolled-back transaction. Browser preview loads all three screens and correctly fetches and previews a BSB range with an en-dash input. Security advisors report only pre-existing findings outside these tables.
