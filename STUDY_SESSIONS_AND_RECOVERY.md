# Note recovery and Study Sessions

## Use

- Notes → select a note → **History — restore a previous version**. Choose a timestamp, preview the text, and restore. Formatting and saved content fields are restored too; the replaced version remains in history.
- **Move to Trash** replaces note deletion. Notes → **Trash** → **Restore note** brings a note back with its original number and links. There is no automatic purge or permanent-delete control.
- Bible Study → **Start a Study Session**, or **Study Sessions** in navigation → **New Study Session**. Choose a passage, translations, commentary, sermon, and an existing or new note. Name it and **Save session**.
- **Study Sessions → Resume study** restores the saved workspace across devices. Notes autosave independently; session choices require Save session. Deleting a saved session leaves its notes and sermon untouched.

## Storage and behavior

Migration `202609190001_note_history_sessions.sql` is applied to holy-shelf (`dswwzziwtbyzxojrnxvg`). It is additive: `entries.deleted_at`, private `entry_revisions`, and private `study_sessions`.

The database trigger captures the previous entry on content/metadata changes, including Trash transitions. Timestamp-only writes do not create revisions. History starts with edits after this migration; older edits and notes already permanently deleted cannot be reconstructed.

History is read-only for authenticated clients. Only the trigger inserts snapshots; it has a fixed empty search path and no callable client grants. Both new tables have owner-scoped RLS. Restoring a version uses the existing optimistic timestamp check. The restorable field allowlist excludes identity, owner, number, creation time, and deletion state. Manual note-to-note links are retained, not versioned. If a historical source no longer exists, a failed restore leaves the current note intact.

Trashed entries reserve their numbers and are excluded from Notes, Bible sidebars, Search, Topics, sermons, and book/home note lists. Photos removed through the advanced editor are retained in storage because earlier versions may reference them. Settings data export includes Trash, revisions, and sessions.

Sessions store only reader choices and IDs, never copies of notes or licensed Bible/commentary text. Missing or trashed notes have recovery guidance. Sermon passage links update the active reader while retaining the session. No AI or paid API generation is triggered by session saving.

## Validation

- Production build and lint; Node test suite (70 tests).
- Transactional database checks (rolled back): edit snapshots, restore preserving replaced content, Trash/restore, session persistence, cross-account read/update/insert isolation, and rejection of fabricated revisions.
- Local browser fixture: edit/history restore, Trash/restore, session save/list/resume, note autosave, commentary persistence, sermon passage navigation, narrowed passage restore, and phone layout without horizontal overflow.
- Supabase security advisor: no new findings; pre-existing notices unchanged.

UI work is on the feature branch; not promoted to main.
