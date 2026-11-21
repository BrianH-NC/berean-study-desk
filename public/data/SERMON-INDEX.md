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
list shows only for books the snapshots cover. Introductions and homilies that
state no passage are left out rather than guessed.

To refresh, run `node scripts/import-chrysostom.mjs public/data/chrysostom-homilies.json`.
Add `--cache <dir>` to keep downloaded pages between runs. The script identifies
itself honestly, pauses between requests, and prints per-book counts plus the
homilies it could not place. Then run `node --test src/lib/chrysostomCatalog.test.js`.

`augustine-sermons.json` indexes Augustine's sermons and expositions on Scripture
on New Advent, in the same shape and from the same Nicene and Post-Nicene
translations: the Tractates on John (124), the Homilies on 1 John (10), the
Sermon on the Mount (two books), the Expositions on the Psalms (150) and the
Sermons on the New Testament (87 of 97). The first four state their passage in
the work's index; each Sermon on the New Testament opens with its text, so the
first reference on its page is used, and the ten that name none are left out.
Augustine numbers the Psalms as the Septuagint does, so each exposition is
filed under the number a modern Bible uses (his Psalm 22 is Psalm 23), joined or
split where the two numberings do not line up (his 9 is Psalms 9-10, his 114 and
115 together are Psalm 116, his 146 and 147 are Psalm 147). Tractate 94's index
entry reads "John 16:44-47" for John 16:4-7 and is corrected in the script. It
contains no text.

To refresh, run `node scripts/import-augustine.mjs public/data/augustine-sermons.json`
(add `--cache <dir>` to keep the pages), then
`node --test src/lib/augustineCatalog.test.js`.

Both catalogs feed one "Church Fathers" card. Below its list it links to Catena
(https://catenabible.com), which gathers the Fathers' comments verse by verse
across the whole Bible: `/bible/nkjv/{code}/{chapter}/{verse}/patristics` for a
selected verse, or the chapter page. It shows the start of each passage and asks
for a free account to read the rest, which the card says. Catena's robots.txt
turns away AI crawlers, so it is link-out only; its book codes are in
`src/lib/sermonSources.js` and were checked against all 66 books.

`sermon-chapters.json` is a small snapshot behind two chapter-level cards:

- **SermonIndex** sermon counts for each chapter, from its open API
  (https://www.sermonindex.net/api/, no key, caching requested, attribution
  encouraged). The cards link to the chapter page in its Bible, which has a
  sermons section. Only the roughly 2 KB per-book files are read. The
  per-chapter files list every sermon and run to megabytes (John 3 alone is
  2.3 MB compressed), so the app does not fetch them. The snapshot counts a
  sermon once per verse it opens, which can run up to a quarter above the number
  of distinct sermons, so the card says "More than N" with a rounded-down figure.
- **Open the Bible** (Pastor Colin Smith): the chapters that have a page, from its
  "Sermons by Scripture" index (https://openthebible.org/browse-sermons/).
  Chapters not on the list have no page (404), so no card appears for them.

To refresh either, run `node scripts/snapshot-sermon-chapters.mjs`. It makes
about 70 requests to SermonIndex, paced at four a second, and one to Open the
Bible. Then run `node --test src/lib/sermonSources.test.js`.

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
