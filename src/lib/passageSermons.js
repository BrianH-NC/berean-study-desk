// Index abbreviations are those used by Spurgeon Gems, plus common user forms.
const books = [
  ['Genesis','Gen','Ge'],['Exodus','Exo','Ex'],['Leviticus','Lev'],['Numbers','Num'],['Deuteronomy','Deut','Deu'],
  ['Joshua','Josh','Jos'],['Judges','Judge','Judg','Jdg'],['Ruth'],['1 Samuel','1 Sam','1Sa'],['2 Samuel','2 Sam','2Sa'],
  ['1 Kings','1 King','1 Kgs','1Ki'],['2 Kings','2 King','2 Kgs','2Ki'],['1 Chronicles','1 Chron','1 Chr','1Ch'],['2 Chronicles','2 Chron','2 Chr','2Ch'],
  ['Ezra','Ezr'],['Nehemiah','Neh'],['Esther','Est'],['Job'],['Psalms','Psalm','Psa','Ps'],['Proverbs','Prov','Pro'],
  ['Ecclesiastes','Eccl','Ecc'],['Song of Solomon','Song of Songs','Song','Sol','SOS'],['Isaiah','Isa'],['Jeremiah','Jer'],
  ['Lamentations','Lam'],['Ezekiel','Ezek','Eze'],['Daniel','Dan'],['Hosea','Hos'],['Joel'],['Amos','Amo'],['Obadiah','Oba'],
  ['Jonah','Jon'],['Micah','Mic'],['Nahum','Nah'],['Habakkuk','Hab'],['Zephaniah','Zeph','Zep'],['Haggai','Hag'],
  ['Zechariah','Zech','Zec'],['Malachi','Mal'],['Matthew','Matt','Mat','Mt'],['Mark','Mk'],['Luke','Luk','Lk'],['John','Jn'],
  ['Acts','Act'],['Romans','Rom'],['1 Corinthians','1 Cor','1Co'],['2 Corinthians','2 Cor','2Co'],['Galatians','Gal'],
  ['Ephesians','Eph'],['Philippians','Phil','Php'],['Colossians','Col'],['1 Thessalonians','1 Thess','1Th'],
  ['2 Thessalonians','2 Thess','2Th'],['1 Timothy','1 Tim','1Ti'],['2 Timothy','2 Tim','2Ti'],['Titus','Tit'],
  ['Philemon','Philem','Phile','Phlm','Phm'],['Hebrews','Heb'],['James','Jas','Jam'],['1 Peter','1 Pet','1Pe'],['2 Peter','2 Pet','2Pe'],
  ['1 John','1Jn','1Jo'],['2 John','2Jn','2Jo'],['3 John','3Jn','3Jo'],['Jude'],['Revelation','Rev'],
]
const key = value => value.toLowerCase().replace(/[.\s]/g, '')
const aliases = new Map(books.flatMap(names => names.map(name => [key(name), names[0]])))

export function parseSermonReferences(input) {
  let book, chapter, verseContext = false
  const spans = []
  for (const part of String(input || '').replace(/[–—]/g, '-').replace(/\band\b/g, ',').split(/([;,])/)) {
    if (part === ';') { verseContext = false; continue }
    if (part === ',') continue
    let text = part.trim().replace(/\.$/, '').replace(/([A-Za-z]):/g, '$1 ').replace(/\s*:\s*/g, ':')
    if (!text) continue
    const named = text.match(/^([1-3]?\s*[A-Za-z][A-Za-z. ]*?)\s*(?=\d|$)/)
    if (named) {
      book = aliases.get(key(named[1]))
      chapter = undefined
      verseContext = false
      text = text.slice(named[0].length)
    }
    const match = text.match(/^(\d+)(?::\s*(\d+))?(?:\s*-\s*(\d+)(?::\s*(\d+))?)?$/)
    if (!book || !match) continue
    const [, a, b, c, d] = match
    let startChapter, endChapter, startVerse, endVerse
    if (b) {
      startChapter = Number(a); endChapter = d ? Number(c) : startChapter
      startVerse = Number(b); endVerse = d ? Number(d) : Number(c || b)
      verseContext = true
    } else if (verseContext && chapter) {
      startChapter = endChapter = chapter
      startVerse = Number(a); endVerse = Number(c || a)
    } else {
      startChapter = Number(a); endChapter = Number(c || a)
      startVerse = 1; endVerse = 999
    }
    chapter = startChapter
    if (startChapter < 1 || startVerse < 1 || endChapter < startChapter ||
        (endChapter === startChapter && endVerse < startVerse)) continue
    spans.push({ book, startChapter, endChapter, startVerse, endVerse, wholeChapter: !b && !verseContext })
  }
  return spans
}

export function matchingSermons(sermons, passage, selectedVerses = []) {
  if (!passage) return []
  const verses = selectedVerses.length ? selectedVerses : null
  const start = passage.verseStart || 1, end = passage.verseEnd || passage.verseStart || 999
  const found = new Map()
  for (const sermon of sermons) {
    for (const ref of sermon.spans || parseSermonReferences(sermon.reference)) {
      if (ref.book !== passage.book || passage.chapter < ref.startChapter || passage.chapter > ref.endChapter) continue
      const low = passage.chapter === ref.startChapter ? ref.startVerse : 1
      const high = passage.chapter === ref.endChapter ? ref.endVerse : 999
      if (verses ? !verses.some(v => v >= low && v <= high) : low > end || high < start) continue
      const score = ref.wholeChapter ? 2 : (low === start && high === end ? 0 : 1)
      const prior = found.get(sermon.url)
      if (!prior || score < prior.score) found.set(sermon.url, { ...sermon, score })
    }
  }
  return [...found.values()].sort((a, b) => a.score - b.score || a.title.localeCompare(b.title))
}

export function twoJourneysChapterUrl(book, chapter) {
  const slug = book.toLowerCase().replace(/\s+/g, '-')
  return `https://twojourneys.org/scripture/${slug}-${chapter}/`
}
