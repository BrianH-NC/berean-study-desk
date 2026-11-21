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

`chrysostom-homilies.json` indexes John Chrysostom's verse-by-verse homilies on
Matthew, John, Acts, Romans, 1 and 2 Corinthians, Galatians, Ephesians,
Philippians, Colossians, 1 and 2 Thessalonians, 1 and 2 Timothy, Titus,
Philemon and Hebrews. Each entry holds the Scripture range the homily covers,
its title, and a link to the public-domain translation on New Advent
(https://www.newadvent.org/fathers/). It contains no homily text. The passage
card appears only for books the snapshot covers. Introductions and homilies that
state no passage are left out rather than guessed.

To refresh, run `node scripts/import-chrysostom.mjs public/data/chrysostom-homilies.json`.
Add `--cache <dir>` to keep downloaded pages between runs. The script identifies
itself honestly, pauses between requests, and prints per-book counts plus the
homilies it could not place. Then run `node --test src/lib/chrysostomCatalog.test.js`.

SermonCentral links to a page for every chapter
(`/sermons/sermons-about-{book}-chapter-{n}`, with its own spellings "psalm" and
"song-of-songs"). All 1,189 addresses were checked against the site's own
browse-by-Scripture index. Its sermons are not copied.

Desiring God, Ligonier and Grace to You are link-outs built in
`src/lib/sermonSources.js`, not catalogs. Desiring God links to
`/scripture/{book}/{chapter}/messages`; some chapters have no messages, so the
card also links to its Scripture index, and it is hidden for Esther and Nahum,
which that index does not list. Ligonier and Grace to You are book-level only
because their chapter pages do not exist. Desiring God blocks non-browser
clients, so its sermon metadata is not crawled or copied.

Two Journeys links follow the chapter index linked from
https://twojourneys.org/scripture/ (for example `/scripture/romans-8/`). These
are chapter browsing links, not individual verse-matched sermon results. Some
chapters may have no teaching available. A separate link opens the full sermon
library. Two Journeys blocks automated catalog requests, so its sermon metadata
is not copied into this catalog.
