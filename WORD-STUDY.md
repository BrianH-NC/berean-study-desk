# Word Study and Textual Variants

Available beside Bible Study and in Study Tools → Word Study / Textual Variants.

- Existing right-click and long-press KJV lookup retained. No alignment is inferred for other translations.
- Strong’s definitions plus STEP brief Greek/Hebrew lexicons.
- Passage grammar matches by Strong’s identifier, showing all matching original forms rather than guessing among repeated words. Source edition labels remain visible. STEP uses extended Strong’s identifiers; an absent match is reported, not substituted.
- Concordance uses the BibleEngine Strong’s verse index, filters by book/testament, and fetches ten verses at a time. Counts are matching verses. English renderings summarize the current KJV page only.
- SBLGNT apparatus compares published NT Greek editions, not manuscript witnesses. Original notation remains available; no automated theological judgment is generated. No entry does not establish manuscript agreement. OT apparatus is not provided.
- Study drafts contain source citations, passage, personal observations, and topic tags. Continue to Notes and explicitly create the note. Saved notes can be chosen through the existing study-session selector. No new database tables or auth changes.

## Sources and reproduction

`scripts/import-word-study.py` converts pinned STEPBible and SBLGNT source revisions into public JSON. Source revisions and original notices are retained under `public/data/word-study`. Data is fetched by chapter/bucket, not bundled into JavaScript. Approximately 65 MB on disk.

STEPBible / Tyndale House: TBESG, TBESH, TAGNT, TAHOT, TEGMC, TEHMC (CC BY 4.0).
https://github.com/STEPBible/STEPBible-Data

SBL Greek New Testament apparatus, edited by Michael W. Holmes. Copyright 2010 Society of Biblical Literature and Logos Bible Software (CC BY 4.0).
https://github.com/Faithlife/SBLGNT

KJV/Strong’s index and dictionary: BibleEngine static API.
https://bibleengine.org/advanced

Conversions simplify lexicon formatting and group source rows into chapter JSON. Morphological labels and original apparatus wording are preserved. Verse numbering can differ between original texts and English editions, especially in the Old Testament; the UI calls this out rather than claiming universal alignment.

## Checks

`npm run build`, `npm run lint`, and `node --test tests/*.test.* src/lib/*.test.js`.
Tests cover real-source John 3:16 grammar and apparatus, identifiers, packed verse references, index deduplication, retries, and unsupported OT apparatus coverage.
