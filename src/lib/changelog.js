// Release notes shown on the What's New page. The newest entry (first in the
// list) is the app's version number, so shipping an update means adding an
// entry here: bump the minor version for new features, the patch version for
// fixes and polish only. Keep wording about what the reader can now do.
export const CHANGELOG = [
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
