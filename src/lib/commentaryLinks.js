// Which parser finds the Scripture references in which commentary's text.
import { linkTreasuryRefs } from './treasuryRefs.js'
import { linkCitations } from './scriptureCitations.js'

// Commentaries that say "ver. 16" or "verse 14" about the chapter they are on. Gill is left out: his
// footnotes number lines of Homer and the Talmud the same way.
const RELATIVE_VERSES = new Set(['matthew-henry', 'john-calvin', 'keil-delitzsch', 'barnes', 'burkitt'])

// A function from a paragraph of commentary text to [{ text }, { text, ref }] pieces, for the
// commentary `commentaryId` on chapter `chapter` of book number `book` (1-66).
export function commentaryLinker(commentaryId, book, chapter) {
  if (commentaryId === 'tsk') return (text) => linkTreasuryRefs(text, { book, chapter })
  const relative = RELATIVE_VERSES.has(commentaryId)
  return (text) => linkCitations(text, { book, chapter, relative })
}
