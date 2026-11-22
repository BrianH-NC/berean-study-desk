// Study highlights for the reading pane: names of God, the Holy Spirit, and the words a chapter repeats.
// Everything here is worked out from the text itself; no per-chapter data or AI is involved.
//
// The BSB (like the NKJV and NASB) capitalizes pronouns that refer to God -- "He who called you is holy" -- so for
// those translations a capitalized He / His / Me / You in the middle of a sentence is marked too. At the start of a
// sentence a capital tells us nothing, so pronouns there are left alone. This is a reading aid, not an analysis.
import { wordParts } from './strongs.js'

export const DEITY_PRONOUN_TRANSLATIONS = new Set(['BSB', 'NKJV', 'NASB2020'])

const NAMES = new Set(['God', 'GOD', 'LORD', 'Lord', 'Jesus', 'Christ', 'Messiah', 'Yahweh', 'Jehovah', 'Almighty', 'Immanuel', 'Emmanuel', 'Savior', 'Saviour', 'Redeemer', 'Creator'])
// Titles that are also ordinary words: marked only mid-sentence, where the capital is the translator's choice.
const TITLES = new Set(['Father', 'Son', 'Lamb', 'Shepherd', 'Holy', 'Mighty', 'High', 'One'])
const PRONOUNS = new Set(['He', 'Him', 'His', 'Himself', 'Me', 'My', 'Mine', 'Myself', 'You', 'Your', 'Yours', 'Yourself', 'Thee', 'Thou', 'Thy', 'Thine'])
const SPIRIT = new Set(['Spirit', 'Ghost'])

const STOP = new Set(('a an and the of to in into on for from with by as at or nor but not no so than then that this these those there their them they '
  + 'he him his himself she her hers it its i me my mine we us our ours you your yours ye thee thou thy thine who whom whose which what when where why how '
  + 'is am are was were be been being have has had having do does did shall will would should could can may might must also even very '
  + 'all any each every some such own same other others one two out up down over under again more most only just now yet unto upon '
  + 'said say says saying let made make like because if though through about after before while until among against both either neither '
  + 'come came go went day days things thing man men way lord god jesus christ spirit father son').split(' '))

// The word without surrounding punctuation or a possessive ending: "“Be" -> "Be", "God’s," -> "God".
export function coreWord(part) {
  return String(part).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').replace(/['’]s$/u, '')
}

// ['“', 'Christ', '!”'] -- so a highlight covers the word and not the punctuation around it.
export function splitPunctuation(part) {
  const m = String(part).match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/su)
  return m && m[2] ? [m[1], m[2], m[3]] : ['', String(part), '']
}

const endsSentence = (part) => /[.?!:;]["'”’)\]]*$/u.test(part)
const opensQuote = (part) => /^[“‘"'([]/u.test(part)

// True when the verse's first word begins a sentence (no previous verse, or the previous one ended one).
export function verseStartsSentence(previousText) {
  return !previousText || endsSentence(String(previousText).trim())
}

// One entry per item of wordParts(text): null, or 'deity' | 'spirit' | 'repeat'.
// options: { deity, spirit, pronouns, repeated: Set of lower-case words, startsSentence }
export function classifyParts(text, options = {}) {
  const parts = wordParts(text)
  const words = parts.map((p, i) => (p.trim() ? i : -1)).filter((i) => i >= 0)
  const kinds = parts.map(() => null)
  words.forEach((index, n) => {
    const part = parts[index]
    const word = coreWord(part)
    if (!word) return
    const previous = n > 0 ? parts[words[n - 1]] : null
    const next = n + 1 < words.length ? coreWord(parts[words[n + 1]]) : ''
    const atStart = (n === 0 ? options.startsSentence !== false : endsSentence(previous)) || opensQuote(part)
    if (options.spirit && (SPIRIT.has(word) || (word === 'Holy' && SPIRIT.has(next)))) kinds[index] = 'spirit'
    else if (options.deity && (NAMES.has(word) || (!atStart && TITLES.has(word) && word !== 'Holy' && word !== 'One' && word !== 'High') || (word === 'Most' && next === 'High') || (word === 'High' && coreWord(previous || '') === 'Most') || (word === 'Holy' && next === 'One') || (word === 'One' && coreWord(previous || '') === 'Holy') || (options.pronouns && !atStart && PRONOUNS.has(word)))) kinds[index] = 'deity'
    else if (options.repeated?.has(word.toLowerCase())) kinds[index] = 'repeat'
  })
  return kinds
}

// The words a passage leans on: at least `min` uses, common words left out, most-used first.
export function repeatedWords(verses, { min = 3, limit = 8 } = {}) {
  const counts = new Map()
  for (const v of verses || []) {
    for (const part of wordParts(v.text)) {
      const word = coreWord(part).toLowerCase()
      if (word.length < 3 || STOP.has(word) || /\d/.test(word)) continue
      counts.set(word, (counts.get(word) || 0) + 1)
    }
  }
  return [...counts].filter(([, n]) => n >= min).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([word, count]) => ({ word, count }))
}

export const HIGHLIGHT_KEY = 'bsd.studyHighlights'
export function loadHighlightSettings(storage = globalThis.localStorage) {
  try {
    const v = JSON.parse(storage?.getItem(HIGHLIGHT_KEY) || '{}')
    return { deity: v.deity === true, spirit: v.spirit === true, repeat: v.repeat === true }
  } catch {
    return { deity: false, spirit: false, repeat: false }
  }
}
export function saveHighlightSettings(value, storage = globalThis.localStorage) {
  try { storage?.setItem(HIGHLIGHT_KEY, JSON.stringify(value)) } catch { /* private window or blocked storage: settings last for this visit */ }
}
