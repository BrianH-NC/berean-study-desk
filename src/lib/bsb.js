// Data access for the Bible Study tab's local Berean Standard Bible copy
// (bsb_verses -- public read-only, seeded by scripts/seed-bsb.js). Unlike
// esv.js, this never calls an Edge Function: BSB is public domain, so the
// whole text lives in Postgres and is queried directly like books/entries.
import { supabase } from './supabase'
import { CANONICAL_BOOKS, resolveBookName } from './entries'

export const OT_BOOKS = CANONICAL_BOOKS.slice(0, 39)
export const NT_BOOKS = CANONICAL_BOOKS.slice(39)

// Parses free text like "Romans 8:28", "Jn 3:16-18", "Ps 23", or "1 cor 13"
// into { book, chapter, verseStart, verseEnd } (verseStart/verseEnd null for
// a whole-chapter reference). Returns null if it can't make sense of it.
export function parseReference(input) {
  const trimmed = (input || '').trim()
  if (!trimmed) return null
  const m = trimmed.match(/^([1-3]?\s*[A-Za-z][A-Za-z. ]*?)\.?\s+(\d+)(?:\s*:\s*(\d+)(?:\s*-\s*(\d+))?)?$/)
  if (!m) return null
  const [, bookRaw, chapterStr, verseStartStr, verseEndStr] = m
  const book = resolveBookName(bookRaw.trim())
  if (!book) return null
  const chapter = parseInt(chapterStr, 10)
  const verseStart = verseStartStr ? parseInt(verseStartStr, 10) : null
  const verseEnd = verseEndStr ? parseInt(verseEndStr, 10) : verseStart
  return { book, chapter, verseStart, verseEnd }
}

// All verses in one chapter, in verse order.
export async function fetchChapter(bookName, chapter) {
  const { data, error } = await supabase
    .from('bsb_verses')
    .select('*')
    .eq('book_name', bookName)
    .eq('chapter', chapter)
    .order('verse')
  if (error) throw new Error(error.message)
  return data || []
}

// How many chapters a book has, for the chapter-picker grid.
export async function fetchChapterCount(bookName) {
  const { data, error } = await supabase
    .from('bsb_verses')
    .select('chapter')
    .eq('book_name', bookName)
    .order('chapter', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  return data?.[0]?.chapter || 0
}

// Full-text keyword search across the whole Bible (or a testament/book
// subset), ordered canonically (book/chapter/verse) rather than by
// relevance -- for a study tool, reading order is generally more useful
// than a relevance score once the match set is manageable.
export async function searchVerses({ query, testament, bookName, limit = 40 }) {
  const trimmed = (query || '').trim()
  if (!trimmed) return []
  let q = supabase
    .from('bsb_verses')
    .select('*')
    .textSearch('fts_tokens', trimmed, { type: 'websearch', config: 'english' })
    .order('book_number')
    .order('chapter')
    .order('verse')
    .limit(limit)
  if (testament) q = q.eq('testament', testament)
  if (bookName) q = q.eq('book_name', bookName)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return data || []
}

export function formatReference(bookName, chapter, verseStart, verseEnd) {
  if (!verseStart) return `${bookName} ${chapter}`
  if (!verseEnd || verseEnd === verseStart) return `${bookName} ${chapter}:${verseStart}`
  return `${bookName} ${chapter}:${verseStart}-${verseEnd}`
}
