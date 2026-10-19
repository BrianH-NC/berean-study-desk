# Passage sermon links

`spurgeon-sermons.json` contains link metadata from Spurgeon Gems' Old and New
Testament Scripture indexes, retrieved October 18, 2026:

- https://www.spurgeongems.org/sindex_ot.pdf
- https://www.spurgeongems.org/sindex_nt.pdf
- https://www.spurgeongems.org/spurgeon-sermons/

The catalog includes sermon texts and chapter expositions. Results are matched
by Scripture overlap and deduplicated by destination PDF. It contains no sermon
body text. Some source references have typographical errors or incomplete book
names; unparseable references are omitted from passage results rather than
guessed. This is a snapshot, not a live feed.

To refresh, download both indexes and run `scripts/import-spurgeon.py` with the
two PDF paths, using Python with pdfplumber installed. Then run
`node --test src/lib/passageSermons.test.mjs`.

Two Journeys links follow the chapter index linked from
https://twojourneys.org/scripture/ (for example `/scripture/romans-8/`). These
are chapter browsing links, not individual verse-matched sermon results. Some
chapters may have no teaching available. A separate link opens the full sermon
library. Two Journeys blocks automated catalog requests, so its sermon metadata
is not copied into this catalog.
