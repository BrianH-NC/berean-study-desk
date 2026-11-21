// Turns API.Bible's chapter JSON (the USX-derived content tree behind the NIV, NLT,
// CSB and the other licensed translations) into verses. Kept separate from the
// fetching code in bibleplus.js so it can be tested without a network or a key.
//
// The tree is a list of paragraph blocks. Each holds `tag` nodes (verse labels,
// character runs such as the LORD or the words of Jesus) and `text` nodes, and a text
// node's attrs.verseId says which verse it belongs to. Poetry is one block per line,
// so a single verse's text is usually scattered across several blocks and nodes --
// and the source does not put whitespace between those pieces.

const LETTER_OR_OPENER = /[\p{L}\p{N}“‘"'(\[]/u
const SENTENCE_END = /[.,;:!?)”\]]$/
// A closing apostrophe is also the apostrophe of "God’s" and "brothers’", so only a
// capitalised word or an opening quote after it counts as a new sentence.
const AFTER_APOSTROPHE = /^[\p{Lu}“‘]/u
const OPENING_QUOTE = /^[“‘(\[]/

// Pieces of one verse, in reading order: [{ text, block }].
// Appends the next piece, adding a space only where two pieces would otherwise
// collide: across a paragraph or poetry line, after sentence punctuation, or
// before an opening quote. Two pieces of one word (a run split mid-word) stay joined.
export function joinPieces(pieces) {
  let out = ''
  let lastBlock = null
  for (const { text, block } of pieces) {
    if (!text) continue
    if (out) {
      const prev = out[out.length - 1]
      const next = text[0]
      const bothSolid = !/\s/.test(prev) && !/\s/.test(next)
      const needsSpace = bothSolid && (
        block !== lastBlock ||
        (SENTENCE_END.test(out) && LETTER_OR_OPENER.test(next)) ||
        (/’$/.test(out) && AFTER_APOSTROPHE.test(text)) ||
        (OPENING_QUOTE.test(next) && /[\p{L}\p{N}.,;:!?]$/u.test(out))
      )
      if (needsSpace) out += ' '
    }
    out += text
    lastBlock = block
  }
  return out
}

// "#" is how API.Bible marks some paragraph/line starts in the text it returns.
// Before punctuation it leaves nothing behind; anywhere else it is a word break.
export function cleanVerseText(raw) {
  return raw
    .replace(/\s*#+\s*(?=[,.;:!?)”’])/g, '')
    .replace(/\s*#+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function collect(node, block, byVerse) {
  if (node.type === 'text') {
    // Only nodes with a verseId are body text; the bare digit of a verse label has none.
    if (node.attrs?.verseId) {
      const number = parseInt(node.attrs.verseId.split('.').pop(), 10)
      ;(byVerse[number] ||= []).push({ text: node.text, block })
    }
    return
  }
  if (node.type === 'tag' && Array.isArray(node.items)) node.items.forEach((child) => collect(child, block, byVerse))
}

// The first verseId inside a block: which verse a paragraph begins with.
function firstVerseIdIn(node) {
  if (node.type === 'text') return node.attrs?.verseId || null
  if (node.type === 'tag' && Array.isArray(node.items)) {
    for (const child of node.items) {
      const found = firstVerseIdIn(child)
      if (found) return found
    }
  }
  return null
}

// [{ number, text, paragraphStart }] for a whole chapter. paragraphStart marks the
// verses that begin one of the source's own paragraphs, so the reader can show real
// paragraph breaks.
export function versesFromContent(content) {
  const byVerse = {}
  const paragraphStarts = new Set()
  content.forEach((block, index) => {
    collect(block, index, byVerse)
    const firstId = firstVerseIdIn(block)
    if (firstId) paragraphStarts.add(parseInt(firstId.split('.').pop(), 10))
  })
  return Object.entries(byVerse)
    .map(([number, pieces]) => ({
      number: parseInt(number, 10),
      text: cleanVerseText(joinPieces(pieces)),
      paragraphStart: paragraphStarts.has(parseInt(number, 10)),
    }))
    .sort((a, b) => a.number - b.number)
}
