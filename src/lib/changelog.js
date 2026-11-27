// Release notes shown on the What's New page. The newest entry (first in the
// list) is the app's version number, so shipping an update means adding an
// entry here: bump the minor version for new features, the patch version for
// fixes and polish only. Keep wording about what the reader can now do.
export const CHANGELOG = [
  {
    version: '1.21.0',
    date: '2026-11-26',
    title: 'Sermon outlines',
    changes: [
      { kind: 'new', text: 'Each sermon has an Outline tab with the preacher’s own big idea and points, each with its verses and a few sub-points. Verse references open in a preview like elsewhere in the app.' },
      { kind: 'new', text: 'Uploading or pasting a transcript fills in the outline along with the other details, when the outline is empty. Edit it from Edit Sermon: add, remove or reorder points.' },
    ],
  },
  {
    version: '1.20.1',
    date: '2026-11-26',
    title: 'Primary Text can span chapters',
    changes: [
      { kind: 'fixed', text: 'Primary Text now accepts ranges that cross chapters, like 1 Peter 1:22–2:3. The sermon opens at the first verse in Bible Study and matches any verse in the range on passage pages and in Search.' },
      { kind: 'fixed', text: 'D-Group guides drafted from a linked sermon now get its Primary Text instead of a garbled passage reference.' },
    ],
  },
  {
    version: '1.20.0',
    date: '2026-11-26',
    title: 'Sermon details fill themselves from the transcript',
    changes: [
      { kind: 'new', text: 'Upload or paste a sermon transcript and the empty fields fill in for you: title, speaker, series, Primary Text, a short description and 3–6 topics. Church defaults to Parkside Baptist Church, and Speaker to Chase Jenkins when the transcript doesn’t name the preacher.' },
      { kind: 'new', text: 'Anything you’ve already typed is never replaced. Topics reuse your existing Topics names, and the ones you keep are linked to their Topics pages when you save.' },
      { kind: 'new', text: 'A Fill details from transcript button runs it again, for example after clearing a field.' },
    ],
  },
  {
    version: '1.19.1',
    date: '2026-11-26',
    title: 'Print spine labels on sideways label stock',
    changes: [
      { kind: 'new', text: 'Print shelf labels has a Stock choice with presets for 56-per-sheet spine labels and for sideways 1½″ × 1″ labels at 32 or 50 per sheet. On sideways stock each label prints turned 90°, so it reads upright once it’s on the spine.' },
    ],
  },
  {
    version: '1.19.0',
    date: '2026-11-26',
    title: 'Doctrine color bar on spine labels, author rules and bulk checks',
    changes: [
      { kind: 'new', text: 'Spine labels print a color bar across the top for the book’s Doctrine Check verdict: green Sound, amber Caution, red Concern, blue Baptism/Polity Distinctive, gray Unable to Assess. Books without a verdict print with no bar until they’re checked.' },
      { kind: 'new', text: 'Author rules give authors you trust a standing verdict, like Beeke as Baptism/Polity Distinctive. Rules are private to your Library, win over an AI check, and show as “your rule” on the book.' },
      { kind: 'new', text: 'The Doctrine verdict filter has a Not assessed choice, so you can find unchecked books and check them together.' },
      { kind: 'new', text: 'Select books in the Library and run Doctrine Check on all of them at once, with a summary of what will run, progress as it goes and a way to stop.' },
    ],
  },
  {
    version: '1.18.0',
    date: '2026-11-26',
    title: 'Shelf labels for your physical library',
    changes: [
      { kind: 'new', text: 'Every book can carry a three-line spine label: main category, subcategory and author filing name, like COMM / 1 PET / ELLIOTT. Set it from the Shelf label card on the book, with a live preview at printed size.' },
      { kind: 'new', text: 'Library has a Shelf order sort beside Category, filters for label category, subcategory and unlabeled books, and the label on every book in each view.' },
      { kind: 'new', text: 'Print shelf labels lays labels out in shelf order on 1″ × 1½″ spine label sheets, 56 to a page, with adjustable sizes, a calibration sheet and a start position for partly used sheets. Long names shrink to fit, and anything that still won’t fit is flagged before you print.' },
      { kind: 'new', text: 'Label review loads a classification file and matches it to your books by ISBN for review before anything is applied, and suggests labels for books that don’t have one.' },
    ],
  },
  {
    version: '1.17.0',
    date: '2026-11-26',
    title: 'A much faster barcode scanner',
    changes: [
      { kind: 'improved', text: 'The ISBN scanner uses a new, much faster decoder and a sharper camera feed, so it locks onto a barcode in a fraction of the time. It loads in the background before you tap Scan.' },
      { kind: 'new', text: 'A box shows where to hold the barcode, and phones that support it get a light button for dim shelves.' },
    ],
  },
  {
    version: '1.16.3',
    date: '2026-11-25',
    title: 'Reading plan moves between passages',
    changes: [
      { kind: 'fixed', text: 'Next in the reading plan bar now opens the next passage in the reader, not only the bar.' },
      { kind: 'improved', text: 'The three markers in the reading plan bar are clickable, so you can jump to any of the day’s readings.' },
      { kind: 'fixed', text: 'The latest sermon on Today shows its passage instead of [object Object].' },
    ],
  },
  {
    version: '1.16.2',
    date: '2026-11-24',
    title: 'Clean passage in D-Group headers',
    changes: [
      { kind: 'fixed', text: 'D-Group sessions show the passage as a plain reference, like 1 Peter 2:15–17, in the session header and on the printed guides.' },
    ],
  },
  {
    version: '1.16.1',
    date: '2026-11-23',
    title: 'Cleaner road and circles exercises in print',
    changes: [
      { kind: 'fixed', text: 'The two-ditches road and the concentric circles exercises no longer print overlapping text. Road labels wrap above the road, and the circles are numbered with a key beside them.' },
    ],
  },
  {
    version: '1.16.0',
    date: '2026-11-23',
    title: 'D-Group: the discussion guide and leader guide',
    changes: [
      { kind: 'new', text: 'Each D-Group session now drafts two guides in the format you use on Fridays. The discussion guide opens with a psalm, then warm-up, Mark the Text beside the ESV passage, observation questions, a Greek word study, Dig In questions tied to the sermon’s own points and quotes, Make It Personal, prayer in pairs and This Week, closing with a benediction psalm.' },
      { kind: 'new', text: 'Every guide includes at least six interactive exercises picked for that week: rating scales, dials, a two-ditches road, market booths, name tags, matching, fill-in tables, put-off and put-on, chains, circles and checklists.' },
      { kind: 'new', text: 'The leader guide is built from the discussion guide: timing that adds to 60 minutes, what to cut when you run short, prep for Friday, background, an answer key, section-by-section notes, guardrails, gentle notes on any sermon slips, and a page of four cut-out scenario cards.' },
      { kind: 'new', text: 'Review each section before you print. Edit its wording, or redraft just that section, then print to PDF in the Parkside colors.' },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-11-23',
    title: 'D-Group sessions, sermons by series, and calmer Library, Notes and Doctrine Check',
    changes: [
      { kind: 'new', text: 'D-Group sessions: from a sermon, choose Build this week’s D-Group session to draft the exegetical study guide, inductive booklet, 4-day prep guide, facilitator script and group text. Edit each one, mark it ready, and print it in the Parkside format; the booklet prints landscape with the ESV text beside the questions.' },
      { kind: 'new', text: 'Today shows the coming D-Group session and how many of its documents are ready.' },
      { kind: 'improved', text: 'Sermons are grouped by series, newest first, and open on the study guide when there is one. Filters sit in one panel.' },
      { kind: 'improved', text: 'Doctrine Check shows the check form first; verdict counts sit in the filter, and the legend opens from How verdicts work.' },
      { kind: 'improved', text: 'Library tabs are All, Reading, Finished and Want to read; filters open from one button above your books.' },
      { kind: 'improved', text: 'Notes shows the list and the note side by side; Details opens on request, and only the note types you use appear as filters.' },
    ],
  },
  {
    version: '1.14.0',
    date: '2026-11-23',
    title: 'A calmer study desk: Today, M’Cheyne and a new look',
    changes: [
      { kind: 'new', text: 'Today is the new start page: your M’Cheyne readings with a checkmark for each, the latest sermon, what you were last reading and writing, the verse of the day, quick capture and recent Doctrine Checks.' },
      { kind: 'new', text: 'The Modified M’Cheyne plan is built in. Start on the day you’re on; earlier days count as read, and a missed day waits as the next unread day.' },
      { kind: 'new', text: 'Open a reading from Today and the Bible shows where you are in the plan, with Mark read and a link to the next reading.' },
      { kind: 'new', text: 'Search everything with Ctrl K: jump to any page, open a passage such as John 3:16, or search Scripture, books and notes.' },
      { kind: 'improved', text: 'Six places in the sidebar: Today, Bible, Notes, Sermons, Library and Doctrine Check. Prayer Journal and the other pages sit under More.' },
      { kind: 'improved', text: 'On your phone, Doctrine Check is the raised button in the middle of the bottom bar and opens the barcode scanner straight away.' },
      { kind: 'improved', text: 'The Bible opens in the ESV, one translation at a time; turn on Parallel to compare. Select verses for Note, Word study, Cross-refs and Copy. Cross-references, commentary, sermons, your notes and study tools sit in one tabbed panel beside the text.' },
      { kind: 'improved', text: 'A new look: lapis blue, Literata for reading, and no banners or page mottos.' },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-11-22',
    title: 'Interlinear, study highlights, every translation and SermonIndex sermons',
    changes: [
      { kind: 'new', text: 'Interlinear in Bible Study: see each verse word by word in Greek (New Testament) or Hebrew (Old Testament, read right to left), with transliteration, the English gloss for that verse and the Strong’s number. Choose a word for its definition, grammar and other occurrences. Step through the chapter verse by verse.' },
      { kind: 'new', text: 'Study highlights: mark the names of God, the Holy Spirit, and the words a passage repeats. In the BSB, NKJV and NASB the pronouns they capitalize for God are marked too. Choose a repeated word to see only that one.' },
      { kind: 'new', text: 'Every Translation: read one verse in all your turned-on translations stacked together, and step verse to verse.' },
      { kind: 'new', text: 'Sermons for this passage now lists SermonIndex’s free sermons on the chapter right in the card: title, preacher, length, and which verses each one opens. Those centred on the chapter come first, and sermons on verses you’ve selected move to the top.' },
      { kind: 'new', text: 'Save to my Sermons: one click adds a SermonIndex sermon to your Sermons library with its summary, topics, main passage and full transcript, timestamps included, ready for Scripture links, a study guide and notes.' },
      { kind: 'new', text: 'Six more free translations to read and compare: the Geneva Bible (1599), Noah Webster’s Bible, the Revised Version (1885), the Bible in Basic English, the Free Bible Version and Translation for Translators.' },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-11-21',
    title: 'Augustine and the Church Fathers on every verse',
    changes: [
      { kind: 'new', text: 'Sermons for this passage now includes Augustine: his 124 tractates on John, his homilies on 1 John, his Sermon on the Mount, his sermons on the Gospels, and his Expositions on all 150 Psalms, so the Church Fathers card now has something for the Psalms too.' },
      { kind: 'new', text: 'Augustine numbers the Psalms the way the Septuagint does, so each exposition is filed under the Psalm number your Bible uses, with his own number beside it.' },
      { kind: 'new', text: 'Every passage now has a Church Fathers card, with a link to Catena’s collection of what the Fathers wrote on each verse of any book of the Bible. Chrysostom and Augustine appear together in it where they preached on the passage.' },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-11-21',
    title: 'SermonIndex and Open the Bible',
    changes: [
      { kind: 'new', text: 'Sermons for this passage now links to SermonIndex’s free audio sermons on the chapter you’re reading, and says roughly how many there are.' },
      { kind: 'new', text: 'It also links to Pastor Colin Smith’s sermons, broadcasts and devotionals on the chapter from Open the Bible, for the chapters he has taught on.' },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-11-21',
    title: 'More sermons for every passage',
    changes: [
      { kind: 'new', text: 'Sermons for this passage now includes John Chrysostom’s verse-by-verse homilies on Matthew, John, Acts and the New Testament letters from Romans to Hebrews. Open a verse in one of those books and the homilies that preach on it appear, with a link to read each one.' },
      { kind: 'new', text: 'New links to John Piper’s messages on the chapter (Desiring God) and to sermons on the chapter from many pastors (SermonCentral), plus R.C. Sproul and Ligonier and John MacArthur (Grace to You) for the whole book.' },
    ],
  },
  {
    version: '1.9.1',
    date: '2026-11-21',
    title: 'Bible Study fills a wide screen',
    changes: [
      { kind: 'improved', text: 'On a PC, the cards under the passage in Bible Study now share the width evenly, two columns on a laptop and three on a wider screen, instead of a long left column beside a short right one. Opening the commentary no longer leaves a blank space beside it.' },
      { kind: 'improved', text: 'Commentary and Cross References now open directly under the Study Tools that opened them, and the sermons are split into a Spurgeon card and an Andy Davis card.' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-11-20',
    title: 'Clickable citations in every commentary',
    changes: [
      { kind: 'new', text: 'Scripture citations in every commentary are now links that open the verse: Matthew Henry, Calvin, Gill, Clarke, Jamieson-Fausset-Brown, Keil & Delitzsch, Tyndale, Barnes, Burkitt, the Geneva Bible Notes, Scofield, the People’s New Testament and Catena Aurea. Lists such as “Jer 4:4, 31:4,33” link each verse, and so do references like “ver. 16” within the chapter.' },
      { kind: 'improved', text: 'Only citations of verses that exist become links. References to the Apocrypha, Josephus and the like are left as plain text.' },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-11-20',
    title: 'Clickable Treasury references',
    changes: [
      { kind: 'improved', text: 'In the Treasury of Scripture Knowledge, every Scripture reference is now a link that opens that verse, including the ones written without a book name, such as the “8:32” in “Ro 5:10; 8:32”.' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-11-20',
    title: 'Save excerpts to notes',
    changes: [
      { kind: 'new', text: 'Save a commentary paragraph, or any text you select in a commentary, to a note with its citation: the author, the work, and the verses the note covers. Choose a new note, an existing note, or your study session’s note.' },
      { kind: 'new', text: 'Add a cross-referenced verse to a note from the Cross References panel, as a Scripture quotation filed under both verses.' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-11-20',
    title: 'Compare commentaries',
    changes: [
      { kind: 'new', text: 'Compare commentaries in Bible Study: choose up to four and read what each says about the verse you selected, side by side, with the range of verses each note covers.' },
      { kind: 'fixed', text: 'In the NIV, NLT, CSB, NKJV, The Message, Amplified, CEV and NASB 2020, words no longer run together where a verse breaks across poetry lines or styled text.' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-11-20',
    title: 'Cross references you can read',
    changes: [
      { kind: 'improved', text: 'Cross references in Bible Study now show the verse text under each reference, strongest links first, and list all of them instead of only six.' },
      { kind: 'new', text: 'Seven more commentaries in Bible Study: the Treasury of Scripture Knowledge, Barnes, Burkitt, the Geneva Bible Notes, the Scofield Reference Notes, the People’s New Testament and Catena Aurea.' },
      { kind: 'improved', text: 'The commentary list shows only the commentaries that cover the book you’re reading, and switches automatically when you move to a book your choice doesn’t cover.' },
    ],
  },
  {
    version: '1.5.1',
    date: '2026-11-14',
    title: 'Akin Library, 2023 edition',
    changes: [
      { kind: 'improved', text: 'The Akin Library now follows Dr. Akin’s 2023 revised edition, adding about 220 titles, most published since 2018, including new commentaries in the Christian Standard, Kregel, Evangelical Biblical Theological and Baker Commentary series.' },
      { kind: 'improved', text: 'About 70 titles from the 2019 edition that the 2023 edition dropped stay in the list. Only the 2019 Spanish-language section is gone.' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-11-14',
    title: 'Reading lists',
    changes: [
      { kind: 'new', text: 'Reading lists, under Library: curated reading recommendations, starting with the Akin Library, a suggested theological library of nearly 1,900 titles from Daniel Akin’s “Building a Theological Library.”' },
      { kind: 'new', text: 'Each entry shows whether the book is already in your library or on your wishlist. Add one to your wishlist, or mark it as owned, in a click.' },
      { kind: 'new', text: 'See where your library is thin: progress by section, and filters for first selections, Technical, Pastoral or Devotional level, and what you don’t have yet.' },
      { kind: 'new', text: 'Bible Study’s passage panel now lists recommended reading on the Bible book you’re in, first selections first, with a link to the full list.' },
    ],
  },
  {
    version: '1.4.2',
    date: '2026-11-11',
    title: 'Study notes stay in their column',
    changes: [
      { kind: 'fixed', text: 'The pinned study note in a study session no longer slides over the “Connected to” section below the study tools.' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-11-11',
    title: 'Roomier study sessions',
    changes: [
      { kind: 'fixed', text: 'In a study session, your note now fills the screen height and stays beside the study tools as you scroll, instead of leaving a large empty space in the right column.' },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-11-11',
    title: 'Your library beside the passage',
    changes: [
      { kind: 'new', text: 'Bible Study’s passage panel lists the books in your library on the Bible book you’re reading, matched by title, subject, or tag, plus broader commentaries and Testament surveys.' },
      { kind: 'new', text: 'Doctrine Checks that cite the passage now appear in the passage panel with their verdict.' },
      { kind: 'new', text: 'Browse the Library by subject, and see similar books on each book’s page.' },
      { kind: 'improved', text: 'Bible Study reopens the last passage you had open instead of always starting at John 3.' },
      { kind: 'improved', text: 'The CLZ import brings in book subjects as their own list, separate from your tags.' },
      { kind: 'improved', text: 'The passage panel also shows prayer requests, quotations, topics, and notes that cite the passage in their text.' },
      { kind: 'new', text: 'This What’s New page and a version number in the sidebar.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-10-18',
    title: 'Word study and passage sermons',
    changes: [
      { kind: 'new', text: 'Strong’s word study in the Bible reader, with a concordance, grammar notes, and a textual variants workspace.' },
      { kind: 'new', text: 'Right-click a tagged KJV word to look it up.' },
      { kind: 'new', text: 'Sermons for the passage from Charles Spurgeon and Andy Davis (Two Journeys).' },
      { kind: 'new', text: 'SermonAudio links with embedded playback.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-10-17',
    title: 'Study sessions and daily practice',
    changes: [
      { kind: 'new', text: 'Saved study sessions that keep your passage, notes, and sermon together.' },
      { kind: 'new', text: 'Passage connections, Reading Plans, Quotations, and a Prayer Journal with request import.' },
      { kind: 'new', text: 'Review & Memorize with spaced repetition, study reminders, and study packets.' },
      { kind: 'new', text: 'Attach Scripture to a note or insert verse text while you write.' },
      { kind: 'new', text: 'Import your library from CLZ, filling only blank fields on existing books.' },
      { kind: 'improved', text: 'Keyboard navigation, mobile note tools, and search that remembers where you were.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-09-19',
    title: 'Reading and richer notes',
    changes: [
      { kind: 'new', text: 'Upload PDF and EPUB books and read them in the app, with highlights and passage notes.' },
      { kind: 'new', text: 'Free book catalogs from Project Gutenberg and CCEL.' },
      { kind: 'new', text: 'Note history you can restore, and photo text capture for notes.' },
      { kind: 'new', text: 'Profile pictures.' },
      { kind: 'improved', text: 'Bible Study remembers your translation and comparison choices.' },
      { kind: 'fixed', text: 'ISBN lookup and cover images when adding library books.' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-09-15',
    title: 'Berean Study Desk',
    changes: [
      { kind: 'new', text: 'My Library, Doctrine Check, and Bible Study with Notes brought together in one app.' },
      { kind: 'new', text: 'Eleven Bible translations, including NIV, NLT, and CSB.' },
      { kind: 'new', text: 'Settings synced to your account, plus public About, Privacy, and Terms pages.' },
    ],
  },
]

export const APP_VERSION = CHANGELOG[0].version
export const KIND_LABELS = { new: 'New', improved: 'Improved', fixed: 'Fixed' }

const seenKey = (userId) => `bsd:whats-new-seen:${userId}`

export function hasUnseenUpdate(storage, userId, version = APP_VERSION) {
  try { return storage.getItem(seenKey(userId)) !== version } catch { return false }
}

export function markUpdateSeen(storage, userId, version = APP_VERSION) {
  try { storage.setItem(seenKey(userId), version); return true } catch { return false }
}
