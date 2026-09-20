# Reader highlights and notes

Apply `supabase/migrations/20260920020617_reader_annotations.sql` to the holy-shelf project before deploying the frontend. It adds private annotations and a security-invoker function which saves a Notebook entry and its passage link atomically. Existing files, places, bookmarks and notes are unchanged. Reverting the frontend does not require removing the new table.

The reader supports native fullscreen with an expanded-view fallback, selectable PDF text, EPUB CFI highlights, and passage notes in the existing Notebook. PDF highlights use normalized page rectangles so zooming and resizing preserve placement. Image-only PDFs require OCR before their text can be selected; this feature does not perform OCR.

Deleting a highlight or an uploaded file preserves its Notebook notes. Deleting a Notebook entry leaves the highlight and removes its note link. Highlights are private to their owner; a note link must belong to the same owner and book.

## Verification

Checked against actual PDF.js/EPUB.js rendering in headless Edge with mocked Supabase responses: PDF and EPUB selection, highlighting, reload persistence, right-click notes, native fullscreen, fullscreen fallback and Escape, PDF zoom, mobile layout, page turning, saved places, bookmarks, save failure/retry and file removal. Build and reader-state tests pass; lint completes with warnings.

The migration was exercised in an isolated PostgreSQL-compatible PGlite database: owner access, cross-account/anonymous denial, wrong-book note-link rejection, atomic rollback on invalid highlight data, entry deletion unlinking and file deletion preserving notes.

Manual release check: open one PDF and one EPUB; select a passage, highlight, reload, return via Highlights & notes, select another passage and add a note. Confirm the note appears in Reading and Notebook. Toggle fullscreen, resize, change text size/zoom and turn pages. On a phone, long-press text and use the selection toolbar. A failed save should leave the draft available for retry.
