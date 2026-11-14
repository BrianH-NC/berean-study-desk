#!/usr/bin/env node
// Turns the text of Daniel L. Akin's "Building a Theological Library" (revised
// 2019, Southeastern Baptist Theological Seminary) into seed data for the
// reading_lists / reading_list_items tables.
//
//   pdftotext BuildingTheoLibrary_Akin_2019.pdf akin.txt     (reading order, no -layout)
//   node scripts/parse-akin-library.mjs akin.txt supabase/seeds/akin-library.json
//
// Prints a report of every entry it could not parse cleanly so they can be
// checked by hand. A few entries in the PDF itself omit a year or publisher;
// those show up in the report and are expected.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const [, , input, output] = process.argv
if (!input || !output) { console.error('usage: parse-akin-library.mjs <pdftotext.txt> <out.json>'); process.exit(2) }

const bytes = readFileSync(input)
let text
try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { text = new TextDecoder('windows-1252').decode(bytes) }

// ---- Reference data from the PDF's "Guide to Abbreviations" ----------------
const SERIES = {
  AB: 'Anchor Bible', AOTC: 'Apollos Old Testament Commentary', BCOTWP: 'Baker Commentary on the Old Testament: Wisdom and Psalms',
  BECNT: 'Baker Exegetical Commentary on the New Testament', BNTC: "Black's New Testament Commentary", BSC: 'Bible Study Commentary',
  BST: 'The Bible Speaks Today', BTC: 'Brazos Theological Commentary on the Bible', BTCP: 'Biblical Theology for Christian Proclamation',
  CBC: 'Cornerstone Biblical Commentary', CCE: 'Christ-Centered Exposition Commentary Series', DBT: 'Discovering the Biblical Text',
  EBC: "Expositor's Bible Commentary", EBS: 'Encountering Biblical Studies', EBT: 'Explorations in Biblical Theology',
  GWFY: "God's Word for You Commentary Series", HOTC: 'Holman Old Testament Commentary', HNTC: 'Holman New Testament Commentary',
  ICC: 'International Critical Commentary', INT: 'Interpretation', ITC: 'International Theological Commentary',
  IVPNTC: 'IVP New Testament Commentary', NAC: 'New American Commentary', NCBC: 'New Century Bible Commentary',
  NIBC: 'New International Biblical Commentary', NICNT: 'New International Commentary on the New Testament',
  NICOT: 'New International Commentary on the Old Testament', NIGTC: 'New International Greek Testament Commentary',
  NIVAC: 'NIV Application Commentary', NTC: 'New Testament Commentary', OTL: 'Old Testament Library',
  PNTC: 'Pillar New Testament Commentary', PTW: 'Preaching the Word', REC: 'Reformed Expository Commentary',
  SAEC: "St. Andrew's Expositional Commentary", SGBC: 'The Story of God Bible Commentary', THOTC: 'Two Horizons Old Testament Commentary',
  TNTC: 'Tyndale New Testament Commentary', TOTC: 'Tyndale Old Testament Commentary', TPC: "The Preacher's Commentary",
  TTT: 'Teach the Text Commentary Series', WBC: 'Word Biblical Commentary', WCS: 'Welwyn Commentary Series',
  WEC: 'Wycliffe Exegetical Commentary', ZEC: 'Zondervan Exegetical Commentary',
  RCS: 'Reformation Commentary on Scripture',   // used in the entries but missing from the PDF's own abbreviation guide
}
// Series the PDF names in full rather than abbreviating.
const PROSE_SERIES = ['Contours of Christian Theology', 'The Master Reference Collection', 'New Studies in Biblical Theology', 'The Five Solas Series', 'Theology in Community Series', 'Library of Leadership Development', 'Colección Teológica Contemporánea']

const OT = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
const MINOR = ['Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi']
// heading text -> canonical Bible books it covers; scope says whether it is
// about one book (or one tightly-joined set) or a whole group of books.
const BIBLE_TOPICS = {
  Pentateuch: [OT, 'group'], Genesis: [['Genesis']], Exodus: [['Exodus']], Leviticus: [['Leviticus']], Numbers: [['Numbers']], Deuteronomy: [['Deuteronomy']],
  Joshua: [['Joshua']], 'Judges-Ruth': [['Judges', 'Ruth']], '1 & 2 Samuel': [['1 Samuel', '2 Samuel']], '1 & 2 Kings': [['1 Kings', '2 Kings']],
  '1 & 2 Chronicles': [['1 Chronicles', '2 Chronicles']], 'Ezra-Nehemiah-Esther': [['Ezra', 'Nehemiah', 'Esther']], Job: [['Job']], Psalms: [['Psalms']],
  Proverbs: [['Proverbs']], Ecclesiastes: [['Ecclesiastes']], 'Song of Solomon': [['Song of Solomon']], Isaiah: [['Isaiah']],
  'Jeremiah-Lamentations': [['Jeremiah', 'Lamentations']], Ezekiel: [['Ezekiel']], Daniel: [['Daniel']], 'The Minor Prophets': [MINOR, 'group'],
  ...Object.fromEntries(MINOR.map((b) => [b, [[b]]])),
  Matthew: [['Matthew']], 'The Sermon on the Mount': [['Matthew']], Mark: [['Mark']], Luke: [['Luke']], John: [['John']], Acts: [['Acts']], Romans: [['Romans']],
  '1 Corinthians': [['1 Corinthians']], '2 Corinthians': [['2 Corinthians']], Galatians: [['Galatians']], Ephesians: [['Ephesians']], Philippians: [['Philippians']],
  'Colossians-Philemon': [['Colossians', 'Philemon']], '1 & 2 Thessalonians': [['1 Thessalonians', '2 Thessalonians']],
  'Pastoral Epistles': [['1 Timothy', '2 Timothy', 'Titus']], Hebrews: [['Hebrews']], James: [['James']], '1 Peter': [['1 Peter']],
  '2 Peter and Jude': [['2 Peter', 'Jude']], '1, 2, 3 John': [['1 John', '2 John', '3 John']], Revelation: [['Revelation']],
}

const TOP = {
  'GENERAL REFERENCES TO THE BIBLE': 'General References to the Bible', 'OLD TESTAMENT': 'Old Testament', 'NEW TESTAMENT': 'New Testament',
  'BIBLICAL LANGUAGES': 'Biblical Languages', THEOLOGY: 'Theology', 'CHURCH HISTORY AND HISTORICAL THEOLOGY': 'Church History and Historical Theology',
  ETHICS: 'Ethics', 'MISSIONS AND CHURCH PLANTING': 'Missions and Church Planting', 'EVANGELISM AND DISCIPLE-MAKING': 'Evangelism and Disciple-Making',
  PREACHING: 'Preaching', COUNSELING: 'Counseling', 'MARRIAGE AND HOME': 'Marriage and Home', 'PASTORAL MINISTRY': 'Pastoral Ministry',
  'CHRISTIAN EDUCATION AND LEADERSHIP': 'Christian Education and Leadership', WORSHIP: 'Worship', 'SPANISH RESOURCES': 'Spanish Resources',
}
const SUBS = {
  'Old Testament': { 'Introductions and Surveys': 0, 'History and Background': 0, Archaeology: 0, 'Old Testament Theology': 0, 'Special Studies': 0, 'BOOKS OF THE OLD TESTAMENT': 'Books of the Old Testament' },
  'New Testament': { 'Introduction and Surveys': 'Introductions and Surveys', 'History and Background': 0, Archaeology: 0, 'New Testament Theology': 0, 'Special Studies': 0, 'BOOKS OF THE NEW TESTAMENT': 'Books of the New Testament' },
  'Biblical Languages': Object.fromEntries(['Hebrew', 'Introductory Hebrew Grammars', 'Syntax/Advanced Hebrew Grammars', 'Greek', 'Introductory Greek Grammars', 'Syntax/Advanced Greek Grammars', 'Textual Criticism'].map((s) => [s, 0])),
  Theology: Object.fromEntries(['Surveys, Dictionaries, and Encyclopedias', 'Systematic Theology', 'Biblical Theology', 'Philosophical Theology/Philosophy of Religion', 'Contemporary Theology', 'Prolegomena', 'Revelation and Scripture', 'Apologetics', 'Hermeneutics', 'Theology Proper', 'Creation', 'Angelology', 'Humanity and Sin', 'Gender and Sexuality', 'Christology', 'Pneumatology', 'Soteriology', 'Prayer', 'The Christian Life', 'Ecclesiology', 'Eschatology', 'Theology and Culture', 'Race and Diversity'].map((s) => [s, 0])),
  'Church History and Historical Theology': Object.fromEntries(['American Christianity', 'World Christianity', 'Baptist History', 'Reformation', 'Biography'].map((s) => [s, 0])),
  'Missions and Church Planting': { Cults: 0 },
  'Christian Education and Leadership': { 'Leadership and Management': 0, 'Education and Teaching': 0 },
  'Spanish Resources': Object.fromEntries(['Old Testament', 'New Testament', 'Hermeneutics', 'Church History', 'Theology', 'Christian Missions & Evangelism', 'Other Resources'].map((s) => [s, 0])),
}

// ---- Entry parsing ----------------------------------------------------------
const SUFFIX = /^(?:Jr\.?|Sr\.?|II|III|IV)$/
// Edition and volume remarks that sit between the title and the publisher.
const NOTE = /^(?:(?:rev|repr|vols?|exp|upd|trans|enlarged|revised|expanded|updated|abridged|annotated|new ed|critical ed|combined ed|new edition|edici[oó]n)\b.*|eds?|and(?: (?:exp|upd|trans|enl).*)?|in one|edited by .+|\d+ of .+|\d+|\d+(?:st|nd|rd|th|d)?\s+(?:ed|vols?|anniversary).*)$/i
// Where a translator or editor credit starts, everything from there to the publisher is a note.
const CREDIT = /^(?:trans(?:lated)?\b|eds?$|edited by\b|rev(?:ised)?$)/i
const YEAR = '(?:1[5-9]|20)\\d\\d(?:\\s*[-–]\\s*\\d{2,4})?'
const TERMINATED = new RegExp(`(?:${YEAR}\\s?\\.?(?:\\s*\\([^)]*\\)\\.?)?(?:,?\\s+[TPDtpd]{1,2})?|\\.\\s*[TPDtpd]{1,2})$`)
// Two entries that the PDF's column flow glued onto one line: a finished entry
// (year, optional level) directly followed by "Surname, Given".
const MERGED = new RegExp(`(${YEAR}\\s?\\.?(?:,?\\s+[TPDtpd]{1,2}\\b\\.?)?)\\s*(?=\\*?[A-ZÀ-Ý][\\p{L}'’\\-]+,\\s+[A-ZÀ-Ý])`, 'gu')
// Typos in the PDF itself.
// The last three are series abbreviations that aren't in the PDF's own guide and are
// clearly slips for NIBC (Mounce, Matthew), TNTC (Cole, Mark) and SAEC (Sproul).
const TYPOS = [['B&H, 20016.', 'B&H, 2016.'], ['E. J. Brill, 19942000.', 'E. J. Brill, 1994–2000.'], [' NIBCNT.', ' NIBC.'], [' TCNT.', ' TNTC.'], [' SAET.', ' SAEC.']]
// Entries whose punctuation defeats the general rules.
const OVERRIDES = [
  [/^Calvin, John\. Institutes/, { title: 'Institutes of the Christian Religion', author: 'John Calvin', author_surname: 'Calvin', edition_note: '2 vols. ed. J. T. McNeil', publisher: 'Westminster', pub_year: 1960 }],
  [/^Jensen, Peter\. La Revelación de Dios/, { title: 'La Revelación de Dios', author: 'Peter Jensen', author_surname: 'Jensen', series_name: 'Biblioteca José M. Martinez', publisher: 'Publicaciones Andamio' }],
  [/^MacLeod, Donald\. La Persona de Cristo/, { title: 'La Persona de Cristo', author: 'Donald MacLeod', author_surname: 'MacLeod', series_name: 'Biblioteca José M. Martinez', publisher: 'Publicaciones Andamio' }],
  [/^Martin, Walter R\., and Hank Hanegraaff/, { title: 'The Kingdom of the Cults', author: 'Walter R. Martin and Hank Hanegraaff', author_surname: 'Martin', edition_note: 'gen. ed. rev. and upd.', publisher: 'Bethany', pub_year: 1997 }],
  [/^Corbett, Steve, and Brian Fikkert\. When Helping Hurts/, { title: 'When Helping Hurts: How to Alleviate Poverty Without Hurting the Poor ... and Yourself', author: 'Steve Corbett and Brian Fikkert', author_surname: 'Corbett', edition_note: 'New Edition', publisher: 'Moody', pub_year: 2014 }],
  [/^Platt, David\. Follow Me/, { title: 'Follow Me: A Call to Die. A Call to Live', author: 'David Platt', author_surname: 'Platt' }],
  [/^Rhodes Jr\., Ray\. Susie/, { title: 'Susie: The Life and Legacy of Susannah Spurgeon, Wife of Charles H. Spurgeon', author: 'Ray Rhodes Jr.', author_surname: 'Rhodes' }],
  [/^Blass, F\. and A\. Debrunner/, { title: 'A Greek Grammar of the New Testament and other Early Christian Literature', author: 'F. Blass and A. Debrunner', author_surname: 'Blass', edition_note: 'rev. and trans. Robert W. Funk', publisher: 'University of Chicago Press', pub_year: 1961 }],
  [/^Wright, N\.T\. The Resurrection of the Son of God/, { title: 'The Resurrection of the Son of God', author: 'N. T. Wright', author_surname: 'Wright', series_name: 'Christian Origins and the Question of God', edition_note: 'Vol. 3', publisher: 'Fortress', pub_year: 2003 }],
  [/^McGrath, Alister\. C\. S\. Lewis/, { title: 'C. S. Lewis: A Life: Eccentric Genius, Reluctant Prophet', author: 'Alister McGrath', author_surname: 'McGrath' }],
  [/^Ryken, Leland\. J\. I\. Packer/, { title: 'J. I. Packer: An Evangelical Life', author: 'Leland Ryken', author_surname: 'Ryken' }],
  [/^Evans, Craig, The Bible Knowledge/, { author: 'Craig Evans', author_surname: 'Evans' }],
  [/^Akin, Daniel L\., David Lewis Allen/, { author: 'Daniel L. Akin, David Lewis Allen, and Ned Lee Mathews', author_surname: 'Akin', edition_note: 'eds.' }],
  [/^Loritts, Bryan, ed\. Letters to a Birmingham Jail/, { title: 'Letters to a Birmingham Jail: A Response to the Words and Dreams of Dr. Martin Luther King, Jr.', author: 'Bryan Loritts', author_surname: 'Loritts', publisher: 'Moody Publishers', pub_year: 2014 }],
  [/^Charles, Jr\., H\. B\., et al\./, { author: 'H. B. Charles Jr. et al.', author_surname: 'Charles', title: 'A Biblical Answer for Racial Unity', publisher: 'Kress Christian Publications' }],
]

function naturalAuthor(raw) {
  let a = raw.replace(/,?\s+eds?\.?$/i, '').replace(/\s+/g, ' ').trim().replace(/(?<=[a-z]{2})\.\s+(Jr|Sr)\b\.?$/, ' $1.')   // "MacArthur, John. Jr." (but not "Walter C. Jr.")
  if (/(?:^|[\s.])(?:[A-Z]|Jr|Sr)$/.test(a)) a += '.'   // the trailing period of a final initial was a sentence break
  const m = a.match(/^([^,]+),\s*(.+)$/)
  if (!m) {
    const first = a.split(/\s+(?:and|y|with|&)\s+/)[0]
    return { author: a, surname: lastName(first) }
  }
  const last = m[1].trim()
  const rest = m[2].replace(/,\s*(Jr\.?|Sr\.?|II|III|IV)(?=,|\s|$)/g, ' $1')
  const sp = rest.match(/^(.*?)(?:(,\s+(?:and\s+)?)|(\s+(?:and|y)\s+)|(\s+with\s+))(.+)$/)
  let given = sp ? sp[1].replace(/(?<![A-Z])\.$/, '') : rest   // "Bill. and John Choi"
  const others = sp ? sp[5] : ''
  const tail = given.match(/^(.*\S)\s+(Jr\.?|Sr\.?|II|III|IV)$/)
  let suffix = ''
  if (tail) { given = tail[1]; suffix = ` ${tail[2]}` }
  const head = `${given} ${last}${suffix}`.replace(/\s+/g, ' ')
  const joiner = !sp ? '' : sp[4] ? ' with ' : others.includes(',') ? ', ' : ' and '
  return { author: sp ? `${head}${joiner}${others}` : head, surname: lastName(last) }
}
function lastName(name) {
  const tokens = name.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean).filter((t) => !SUFFIX.test(t))
  return tokens.length ? tokens[tokens.length - 1] : name
}

function parseEntry(raw, prevAuthor) {
  let s = raw.replace(/\s+/g, ' ').trim()
  const problems = []
  const first = s.startsWith('*')
  if (first) s = s.slice(1).trim()
  let codes = ''
  const lm = s.match(/(?<=[.,\d"”])\s+([TPDtpd]{1,2})$/)
  if (lm) { codes = lm[1]; s = s.slice(0, lm.index).trim().replace(/,$/, '') }

  let sameAuthor = false
  if (/^-{3,}[.,]?\s*/.test(s)) { sameAuthor = true; s = s.replace(/^-{3,}[.,]?\s*/, '') }

  s = s.replace(/(\b(?:1[5-9]|20)\d\d)\.?\s*\([^)]*\)\.?$/, '$1')
  let year = null
  const ym = s.match(/[\s,.]*\b((?:1[5-9]|20)\d\d)(?:\s*[-–]\s*\d{2,4})?\s*\.?$/)
  if (ym) { year = Number(ym[1]); s = s.slice(0, ym.index).trim().replace(/,$/, '') }
  else problems.push('no year')

  s = s.replace(/\b([A-Z][a-z]+)\.\s+(\d+(?:[-–:]\d+)+)(?=\.|$)/g, '$1 $2')   // "Job. 21-37." is one title
  s = s.replace(/ in ([A-Z]{2,7}) (?=Vol)/, ' in $1. ').replace(/(\bvol\.? \d+) (?=rev\b)/i, '$1. ')   // "in EBC Vol. 5." / "vol. 10 rev."
  const notes = []
  let segs, publisher
  // A chapter of a larger work: "Amos." in The Minor Prophets, ed. T. McComiskey. Baker
  const cm = s.match(/^(.+?)\.\s+["“]([^"”]+?)\.?["”]\s+in\s+(.+?),\s*eds?\.\s*(.+?)\.\s+([^.]+?)$/)
  if (cm) {
    segs = [cm[1], cm[2]]; publisher = cm[5]; notes.push(`in ${cm[3]}, ed. ${cm[4]}`)
  } else {
    // "St." / "Dr." / "Mt." inside a title is not a sentence break.
    segs = s.replace(/\b(St|Dr|Mt)\.\s/g, '$1\u0001 ').split(/\.\s+/).map((x) => x.replace(/\u0001/g, '.'))
    while (segs.length > 2 && NOTE.test(segs[segs.length - 1])) notes.unshift(segs.pop())   // "Zondervan. 2nd ed. 2009."
    publisher = (segs.pop() || '').trim()
    // "Title? Publisher", "Title (Series) Publisher" and "Title, Publisher" have no period to split on.
    const pm = publisher.match(/^(.*[?!)])\s+([A-Z0-9][^?!]*)$/) || (publisher.length > 40 ? publisher.match(/^(.*),\s+([^,]+)$/) : null)
    if (pm && pm[2].length <= 40) { segs.push(pm[1]); publisher = pm[2] }
  }
  publisher = publisher.replace(/\.$/, '').trim()
  let series = null, seriesName = null
  const lead = publisher.match(/^([A-Z]{2,7})\s+(\S.*)$/)   // "TNTC Eerdmans"
  if (lead && SERIES[lead[1]]) { series = lead[1]; publisher = lead[2] }
  while (segs.length > 2 && /(?:^|\s)[A-Z]$/.test(segs[segs.length - 1])) publisher = `${segs.pop()}. ${publisher}`   // "E. J. Brill", "David C. Cook"
  if (SERIES[publisher]) { series = publisher; publisher = '' }   // entry gives a series but no publisher
  if (!publisher && !series) problems.push('no publisher')
  // Peel series names and edition remarks off the end, then translator/editor credits, then any series before those.
  const peel = () => {
    while (segs.length > 1) {
      const seg = segs[segs.length - 1].trim()
      const numbered = seg.match(/^([A-Z]{2,7}) (\d+)$/)   // "NAC 17"
      if (SERIES[seg]) { series = seg; segs.pop() }
      else if (numbered && SERIES[numbered[1]]) { series = numbered[1]; notes.unshift(`vol. ${numbered[2]}`); segs.pop() }
      else if (PROSE_SERIES.includes(seg)) { seriesName = seg; segs.pop() }
      else if (NOTE.test(seg)) { notes.unshift(/^(?:rev|repr|vols?|eds?)$/i.test(seg) ? `${seg}.` : seg); segs.pop() }
      else { if (/^[A-Z]{2,7}$/.test(seg) && !SUFFIX.test(seg)) problems.push(`unknown abbreviation ${seg}`); break }
    }
  }
  peel()
  for (let k = segs.length - 1; k >= 1; k--) if (CREDIT.test(segs[k])) { notes.unshift(segs.splice(k).join('. ')); break }
  peel()
  let title = (segs.pop() || '').replace(/\.$/, '').trim()
  // A title that ends "…of Annie W. Armstrong" was split at the initial.
  const before = segs[segs.length - 1] || ''
  if (title && !title.includes(' ') && /(?:^|\s)[A-Z]$/.test(before) && before.split(/\s+/).length >= 4 && !/^\S+(?:\s\S+)?,\s/.test(before)) title = `${segs.pop()}. ${title}`
  const glued = title.match(/^(.*[?!])\s+((?:\d+(?:st|nd|rd|th|d)?\s+ed|revised.*|new edition))$/i)   // "…or Ours? 6th ed"
  if (glued) { title = glued[1]; notes.unshift(glued[2]) }
  let authorRaw = segs.join('. ')
  const edTitle = title.match(/^(eds?)\.?,\s+(.+)$/i)   // "Stump, J. B. ed., Four Views…"
  if (edTitle) { authorRaw += `, ${edTitle[1]}`; title = edTitle[2] }
  if (/(?:^|\s)[A-Z]$/.test(authorRaw) || /(?:^|\s)(?:Jr|Sr)$/.test(authorRaw)) authorRaw += '.'

  const chapter = title.match(/^["“](.+?)["”]\s+in\s+([A-Z]{2,7})$/)
  if (chapter) { title = chapter[1]; if (SERIES[chapter[2]]) series = chapter[2] }
  const trailing = title.match(/^(.*\S)\s+([A-Z]{2,7})$/)
  if (trailing && SERIES[trailing[2]] && !series) { title = trailing[1].replace(/:$/, ''); series = trailing[2] }

  let author = null, surname = null
  if (sameAuthor) ({ author, surname } = prevAuthor || {})
  else if (authorRaw) ({ author, surname } = naturalAuthor(authorRaw))
  if (!title || title.length < 3) problems.push('no title')
  if (/^[a-z]/.test(title)) problems.push('title starts lowercase')
  if (author && /\d/.test(author)) problems.push('digit in author')
  if (author && /[a-z]{3,}\.\s+[A-Z]/.test(author)) problems.push('sentence in author')   // a title leaked into the author
  if (publisher.length > 40) problems.push('long publisher')
  return {
    problems,
    item: {
      title, author, author_surname: surname, publisher: publisher || null, pub_year: year, edition_note: notes.join(' ') || null,
      series, series_name: series ? SERIES[series] : seriesName, is_first_pick: first, level_codes: codes || null,
      levels: [...new Set(codes.toUpperCase().split(''))],
    },
  }
}

// ---- Walk the document ------------------------------------------------------
for (const [from, to] of TYPOS) text = text.replaceAll(from, to)
const lines = text.replace(/\f/g, '\n').split(/\r?\n/).flatMap((l) => l.replace(MERGED, '$1\n').split('\n')).map((l) => l.trim())
const start = lines.indexOf('GENERAL REFERENCES TO THE BIBLE')
if (start < 0) { console.error('Could not find the body of the document'); process.exit(1) }

const items = []
const report = []
let section = null, subsection = null, topic = null, buffer = [], prevAuthor = null

function flush(reason) {
  if (!buffer.length) return
  const raw = buffer.join(' ')
  buffer = []
  if (reason) report.push({ line: raw.slice(0, 120), problems: [reason] })
  const { item, problems } = parseEntry(raw, prevAuthor)
  for (const [re, set] of OVERRIDES) if (re.test(raw.replace(/^\*/, ''))) { Object.assign(item, set); problems.length = 0 }
  if (problems.length) report.push({ line: raw.slice(0, 140), problems })
  if (item.author) prevAuthor = { author: item.author, surname: item.author_surname }
  const bible = topic && BIBLE_TOPICS[topic]
  items.push({
    position: items.length + 1, ...item, section, subsection, topic,
    bible_books: bible ? bible[0] : [], bible_scope: bible ? bible[1] || 'book' : null,
    language: section === 'Spanish Resources' ? 'es' : 'en', source_text: raw,
  })
}

for (let i = start; i < lines.length; i++) {
  const line = lines[i]
  if (/^Updated: /.test(line)) break
  if (!line || /^\d{1,3}$/.test(line) || /^_{5,}$/.test(line) || line.startsWith('My preferred Bible translations')) continue
  if (TOP[line]) { flush('unterminated entry before heading'); section = TOP[line]; subsection = null; topic = null; continue }
  const subs = SUBS[section]
  if (subs && Object.hasOwn(subs, line)) { flush('unterminated entry before heading'); subsection = subs[line] || line; topic = null; continue }
  if (Object.hasOwn(BIBLE_TOPICS, line) && /Books of the/.test(subsection || '')) { flush('unterminated entry before heading'); topic = line; continue }
  if (buffer.length && (line.startsWith('*') || line.startsWith('---'))) flush('unterminated entry')
  buffer.push(line)
  if (TERMINATED.test(buffer.join(' '))) flush()
}
flush('unterminated entry at end')

const counts = {}
for (const it of items) counts[it.section] = (counts[it.section] || 0) + 1
console.log(`${items.length} entries, ${items.filter((i) => i.is_first_pick).length} first picks, ${items.filter((i) => i.series).length} with a series`)
console.table(counts)
if (report.length) {
  console.log(`\n${report.length} entries need a look:`)
  for (const r of report) console.log(`  [${r.problems.join(', ')}] ${r.line}`)
}

const list = {
  slug: 'akin-library',
  name: 'Akin Library',
  curator: 'Daniel L. Akin',
  description: 'Over 1,000 suggested titles for a biblical and theological library, grouped by Bible book and subject, from Dr. Akin’s “Building a Theological Library” (Southeastern Baptist Theological Seminary, revised edition 2019).',
  source_title: 'Building a Theological Library (Revised Edition 2019)',
  source_year: 2019,
  legend: {
    T: { label: 'Technical', description: 'Primarily for readers with advanced or intermediate knowledge of Hebrew, Aramaic and Greek.' },
    P: { label: 'Pastoral', description: 'Primarily for pastors, teachers and serious Bible students; the original languages are helpful but not necessary.' },
    D: { label: 'Devotional', description: 'Primarily for personal Bible study and edification, focused on meaning and practical application.' },
  },
  first_pick_label: 'First suggested selection',
}
if (process.argv.includes('--check')) process.exit(0)
mkdirSync(dirname(output), { recursive: true })
writeFileSync(output, JSON.stringify({ list, items: items.map(({ source_text, ...item }) => item) }))   // source_text is for the report only
console.log(`\nWrote ${output}`)
