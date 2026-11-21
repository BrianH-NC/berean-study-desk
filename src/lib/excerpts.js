// Pure helpers for saving an excerpt (a paragraph of a commentary, or a cross-referenced
// verse) into a note, with its citation. A note's body is a TipTap document: { type: 'doc',
// content: [block, ...] }. The excerpt becomes a block quotation ending in an italic
// citation line, so it reads (and exports to Markdown) the way a quotation should.

import { commentarySource } from './commentarySources.js'

export const MAX_EXCERPT_CHARS = 20000

const paragraph = (text, marks) => ({ type: 'paragraph', content: [{ type: 'text', text, ...(marks ? { marks } : {}) }] })
const emptyParagraph = () => ({ type: 'paragraph' })
const isEmptyParagraph = (node) => node?.type === 'paragraph' && !(node.content || []).some((n) => (n.text || '').trim() || n.type !== 'text')

// The paragraphs of an excerpt: blank-line separated, inner whitespace collapsed.
export function excerptParagraphs(text) {
  return String(text || '').split(/\n{2,}/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean)
}

// "John Gill, Exposition of the Entire Bible, on John 3:16"
export function commentaryCitation({ author, work }, reference) {
  return `${author ? `${author}, ` : ''}${work}, on ${reference}`
}

// "John 3:13–18" for a note that covers verses from..to; `to` is null for a commentary's
// last block, which runs to the end of the chapter ("John 3:22ff").
export function citedReference(book, chapter, from, to) {
  if (to == null) return `${book} ${chapter}:${from}ff`
  return to === from ? `${book} ${chapter}:${from}` : `${book} ${chapter}:${from}–${to}`
}

// The same range in a form the app's reference parser reads (hyphen, never "ff").
export function parseableReference(book, chapter, from, to) {
  return to == null || to === from ? `${book} ${chapter}:${from}` : `${book} ${chapter}:${from}-${to}`
}

// What a commentary excerpt is credited to and filed under, for a note (`span` is one of
// commentaryBlocks' { from, to } ranges). The title drops a parenthetical in the display name,
// "Barnes’ Notes (New Testament)" becoming "Barnes’ Notes".
export function commentarySourceFor(meta, book, chapter, span) {
  const cited = citedReference(book, chapter, span.from, span.to)
  return {
    citation: commentaryCitation(commentarySource(meta.id, meta.name), cited),
    title: `${meta.name.replace(/\s*\(.*\)$/, '')} on ${cited}`,
    refs: [parseableReference(book, chapter, span.from, span.to)],
  }
}

// A commentary excerpt: the quoted paragraphs and the citation, in one block quotation,
// followed by an empty paragraph to keep writing in.
export function commentaryExcerptNodes(text, citation) {
  const paragraphs = excerptParagraphs(text).join('\n\n').slice(0, MAX_EXCERPT_CHARS).split('\n\n')
  return [
    { type: 'blockquote', content: [...paragraphs.map((p) => paragraph(p)), paragraph(`— ${citation}`, [{ type: 'italic' }])] },
    emptyParagraph(),
  ]
}

// Appends blocks to a note's document, dropping the trailing blank paragraphs the editor
// leaves so the note doesn't grow gaps. `base` may be null (a note written before rich text
// existed), in which case `fallbackDoc` is used.
export function appendToDoc(base, nodes, fallbackDoc = null) {
  const doc = base && base.type === 'doc' && Array.isArray(base.content) ? base : fallbackDoc
  const content = [...(doc?.content || [])]
  while (content.length && isEmptyParagraph(content[content.length - 1])) content.pop()
  return { type: 'doc', content: [...content, ...nodes] }
}

// Plain text of a document, for the note's `body` column (search and previews read it).
const BLOCK_CONTAINERS = new Set(['blockquote', 'scriptureQuote', 'bulletList', 'orderedList', 'listItem'])
function textOf(node) {
  if (node.type === 'text') return node.text || ''
  if (node.type === 'hardBreak') return '\n'
  // Blocks are separated by a blank line, as the editor's own getText() does.
  return (node.content || []).map(textOf).join(BLOCK_CONTAINERS.has(node.type) ? '\n\n' : '')
}
export function docPlainText(doc) {
  return (doc?.content || []).map(textOf).join('\n\n').trim()
}

// A note's `ref` field holds passages separated by "; ". Adds the new ones without repeating any.
export function mergeRefs(existing, additions) {
  const refs = String(existing || '').split(';').map((r) => r.trim()).filter(Boolean)
  for (const addition of additions.filter(Boolean)) {
    if (!refs.some((r) => r.toLowerCase() === addition.toLowerCase())) refs.push(addition)
  }
  return refs.length ? refs.join('; ') : null
}

// The first words of an excerpt, for the confirmation a person reads before saving.
export function snippet(text, max = 140) {
  const flat = String(text || '').replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max).replace(/\s+\S*$/, '')}…` : flat
}
