// Every way the app's commentaries write the name of a book of the Bible, mapped to its number
// (1-66). Compiled from the citations actually used in the commentaries: some write full names
// (Calvin, Gill, Scofield), some SWORD-style three-letter forms (Henry, Clarke, JFB: "Psa", "Joh"),
// some a mixture (Barnes: "Jn", "Mt", "1Cor"), and some put the number after the name ("Co1", "Sa1").
// A few spellings are the sources' own typos ("Gall", "Hoss", "1Timm"), kept because they recur.
// Names are matched with their capital letter, and only when a chapter and verse follow; an
// abbreviation that is also an ordinary word and could precede a number in prose ("So") is left out.

const PLAIN = {
  1: ['Genesis', 'Gen', 'Ge', 'Gn', 'Genn'],
  2: ['Exodus', 'Exod', 'Exo', 'Ex'],
  3: ['Leviticus', 'Lev', 'Le', 'Lv'],
  4: ['Numbers', 'Num', 'Nu', 'Nm'],
  5: ['Deuteronomy', 'Deut', 'Deu', 'De', 'Dt'],
  6: ['Joshua', 'Josh', 'Jos'],
  7: ['Judges', 'Judg', 'Jdg', 'Jud', 'Jg'],
  8: ['Ruth', 'Rut', 'Ru'],
  15: ['Ezra', 'Ezr'],
  16: ['Nehemiah', 'Neh', 'Ne'],
  17: ['Esther', 'Esth', 'Est', 'Es'],
  18: ['Job'],
  19: ['Psalms', 'Psalm', 'Psal', 'Pss', 'Psa', 'Ps'],
  20: ['Proverbs', 'Prov', 'Pro', 'Pr'],
  21: ['Ecclesiastes', 'Eccles', 'Eccl', 'Ecc', 'Ec'],
  22: ['Song of Solomon', 'Song of Songs', 'Song', 'Canticles', 'Cant', 'Sol'],
  23: ['Isaiah', 'Isa', 'Is'],   // Barnes: "Is 9:6". Only before chapter:verse, where it is never the English word.
  24: ['Jeremiah', 'Jer'],
  25: ['Lamentations', 'Lam', 'La'],
  26: ['Ezekiel', 'Ezek', 'Eze', 'Ezk'],
  27: ['Daniel', 'Dan', 'Da'],
  28: ['Hosea', 'Hos', 'Ho', 'Hoss', 'Hosa'],
  29: ['Joel', 'Joe'],
  30: ['Amos', 'Amo', 'Am'],
  31: ['Obadiah', 'Obad', 'Oba', 'Ob'],
  32: ['Jonah', 'Jon'],
  33: ['Micah', 'Mic', 'Mi'],
  34: ['Nahum', 'Nah', 'Na'],
  35: ['Habakkuk', 'Hab'],
  36: ['Zephaniah', 'Zeph', 'Zep'],
  37: ['Haggai', 'Hag'],
  38: ['Zechariah', 'Zech', 'Zec', 'Zac'],
  39: ['Malachi', 'Mal'],
  40: ['Matthew', 'Matt', 'Mat', 'Mt'],
  41: ['Mark', 'Mar', 'Mk', 'Mr'],
  42: ['Luke', 'Luk', 'Lu', 'Lk', 'Lkke'],
  43: ['John', 'Joh', 'Jn', 'Jno'],
  44: ['Acts', 'Act', 'Ac'],
  45: ['Romans', 'Rom', 'Ro', 'Rm', 'Romm'],
  48: ['Galatians', 'Gal', 'Ga', 'Gall'],
  49: ['Ephesians', 'Eph', 'Ep'],
  50: ['Philippians', 'Phil', 'Phi', 'Php'],
  51: ['Colossians', 'Col', 'Co'],   // "Co 3:5" is Colossians; the numbered "1Co" is Corinthians
  56: ['Titus', 'Tit'],
  57: ['Philemon', 'Philem', 'Phm', 'Plm', 'Phile'],
  58: ['Hebrews', 'Heb', 'He'],
  59: ['James', 'Jas', 'Jam'],
  65: ['Jude', 'Jde'],
  66: ['Revelation', 'Rev', 'Re'],
}

// Books that come as "1 ..." and "2 ..." (and "3 John"): the number of the first of them, how many
// there are, and the ways the rest of the name is written.
const NUMBERED = [
  { first: 9, count: 2, stems: ['Samuel', 'Sam', 'Sa'] },
  { first: 11, count: 2, stems: ['Kings', 'Kgs', 'Kg', 'Ki'] },
  { first: 13, count: 2, stems: ['Chronicles', 'Chron', 'Chr', 'Ch'] },
  { first: 46, count: 2, stems: ['Corinthians', 'Cor', 'Co'] },
  { first: 52, count: 2, stems: ['Thessalonians', 'Thess', 'Thes', 'Th'] },
  { first: 54, count: 2, stems: ['Timothy', 'Tim', 'Timm', 'Ti'] },
  { first: 60, count: 2, stems: ['Peter', 'Pet', 'Pe'] },
  { first: 62, count: 3, stems: ['John', 'Jn', 'Jo', 'Joh'] },
]
// The two-letter forms that also come number-last: "Co1" for 1 Corinthians, "Sa2" for 2 Samuel.
const NUMBER_LAST = new Set(['Sa', 'Kg', 'Ki', 'Ch', 'Co', 'Th', 'Ti', 'Pe', 'Jo'])

// "Rom" -> 45, "1 Cor" -> 46, "Co1" -> 46, "1Jn" -> 62: every accepted spelling, exactly as written.
export const BOOK_ALIASES = new Map()
for (const [book, names] of Object.entries(PLAIN)) for (const name of names) BOOK_ALIASES.set(name, Number(book))
for (const { first, count, stems } of NUMBERED) {
  for (let n = 1; n <= count; n++) {
    for (const stem of stems) {
      BOOK_ALIASES.set(`${n} ${stem}`, first + n - 1)
      BOOK_ALIASES.set(`${n}${stem}`, first + n - 1)
      if (NUMBER_LAST.has(stem)) BOOK_ALIASES.set(`${stem}${n}`, first + n - 1)
    }
  }
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// A regular-expression alternation of every spelling, longest first so "1 John" beats "1 Jo".
export const BOOK_ALTERNATION = [...BOOK_ALIASES.keys()].sort((a, b) => b.length - a.length).map(escape).join('|')

export const bookFor = (name) => BOOK_ALIASES.get(name) || 0
