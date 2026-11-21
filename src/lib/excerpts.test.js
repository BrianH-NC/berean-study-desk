import test from 'node:test'
import assert from 'node:assert/strict'
import { appendToDoc, citedReference, commentaryCitation, commentaryExcerptNodes, commentarySourceFor, docPlainText, excerptParagraphs, mergeRefs, parseableReference, snippet } from './excerpts.js'
import { commentarySource } from './commentarySources.js'
import { noteMarkdown, plainDocument } from './noteModel.js'
import { scriptureDocument } from './noteScripture.js'

const text = (t) => ({ type: 'paragraph', content: [{ type: 'text', text: t }] })

test('a citation names the author, the work and the passage the note is on', () => {
  assert.equal(commentaryCitation(commentarySource('john-gill'), 'John 3:16'), 'John Gill, Exposition of the Entire Bible, on John 3:16')
  assert.equal(commentaryCitation(commentarySource('tsk'), 'John 3:16'), 'Treasury of Scripture Knowledge, on John 3:16', 'no author, no stray comma')
  assert.equal(commentaryCitation(commentarySource('unknown-id', 'Some Commentary'), 'Genesis 1:1'), 'Some Commentary, on Genesis 1:1')
})

test('the cited range is the range the commentary note covers', () => {
  assert.equal(citedReference('John', 3, 16, 16), 'John 3:16')
  assert.equal(citedReference('John', 3, 13, 18), 'John 3:13–18')
  assert.equal(citedReference('John', 3, 22, null), 'John 3:22ff')
  assert.equal(parseableReference('John', 3, 13, 18), 'John 3:13-18', 'the note reference uses a hyphen the parser reads')
  assert.equal(parseableReference('John', 3, 22, null), 'John 3:22')
})

test('an excerpt is a block quotation ending in an italic citation, with room to keep writing', () => {
  const nodes = commentaryExcerptNodes('God so loved.\n\nThe world is mankind.', 'John Gill, Exposition of the Entire Bible, on John 3:16')
  assert.equal(nodes.length, 2)
  assert.equal(nodes[0].type, 'blockquote')
  assert.deepEqual(nodes[0].content.map((p) => p.content[0].text), ['God so loved.', 'The world is mankind.', '— John Gill, Exposition of the Entire Bible, on John 3:16'])
  assert.deepEqual(nodes[0].content[2].content[0].marks, [{ type: 'italic' }])
  assert.deepEqual(nodes[1], { type: 'paragraph' })
})

test('paragraphs are split on blank lines and inner line breaks and runs of space collapse', () => {
  assert.deepEqual(excerptParagraphs('One\n  two   three\n\n\n\nFour.'), ['One two three', 'Four.'])
  assert.deepEqual(excerptParagraphs('  \n\n '), [])
  assert.deepEqual(excerptParagraphs(null), [])
})

test('appending to a note adds after its text and removes only trailing blank paragraphs', () => {
  const base = { type: 'doc', content: [text('My thoughts.'), { type: 'paragraph' }, text('More.'), { type: 'paragraph' }, { type: 'paragraph' }] }
  const doc = appendToDoc(base, commentaryExcerptNodes('Quote.', 'Cite'))
  assert.deepEqual(doc.content.map((n) => n.type), ['paragraph', 'paragraph', 'paragraph', 'blockquote', 'paragraph'])
  assert.equal(doc.content[2].content[0].text, 'More.')
  assert.equal(base.content.length, 5, 'the original document is not changed')
})

test('a note with no rich document starts from its plain text', () => {
  const doc = appendToDoc(null, commentaryExcerptNodes('Quote.', 'Cite'), plainDocument('Old plain note\nsecond line'))
  assert.equal(doc.content[0].content[0].text, 'Old plain note')
  assert.equal(doc.content[1].content[0].text, 'second line')
  assert.equal(doc.content[2].type, 'blockquote')
  assert.equal(appendToDoc(null, [text('x')]).content.length, 1, 'an empty note becomes just the excerpt')
})

test('the plain-text body follows the document, blocks separated by a blank line', () => {
  const doc = appendToDoc({ type: 'doc', content: [text('Intro.')] }, commentaryExcerptNodes('Quote one.\n\nQuote two.', 'Cite'))
  assert.equal(docPlainText(doc), 'Intro.\n\nQuote one.\n\nQuote two.\n\n— Cite')
  assert.equal(docPlainText({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [text('a')] }, { type: 'listItem', content: [text('b')] }] }] }), 'a\n\nb')
  assert.equal(docPlainText(null), '')
})

test('a saved excerpt exports to Markdown as a quotation with its citation', () => {
  const doc = appendToDoc(null, commentaryExcerptNodes('God so loved the world.', 'John Gill, Exposition of the Entire Bible, on John 3:16'))
  const md = noteMarkdown({ title: 'Gill on John 3:16', rich_doc: doc })
  assert.match(md, /> God so loved the world\./)
  assert.match(md, /> \*— John Gill, Exposition of the Entire Bible, on John 3:16\*/)
})

test('a cross-referenced verse reuses the existing Scripture quotation block', () => {
  const doc = appendToDoc(null, scriptureDocument('Romans 5:8', [{ verse: 8, text: 'But God proves His love for us.' }]))
  assert.equal(doc.content[0].type, 'scriptureQuote')
  assert.equal(doc.content[0].attrs.reference, 'Romans 5:8 · BSB')
  assert.equal(docPlainText(doc), '8 But God proves His love for us.')
})

test('passage references merge without repeats', () => {
  assert.equal(mergeRefs(null, ['John 3:16']), 'John 3:16')
  assert.equal(mergeRefs('John 3:16', ['john 3:16', 'Romans 5:8']), 'John 3:16; Romans 5:8')
  assert.equal(mergeRefs('John 3:16; Acts 2:1', [null, 'Acts 2:1']), 'John 3:16; Acts 2:1')
  assert.equal(mergeRefs('', []), null)
})

test('a snippet cuts at a word and says so', () => {
  assert.equal(snippet('Short text.'), 'Short text.')
  const long = snippet('word '.repeat(100), 30)
  assert.ok(long.length <= 31 && long.endsWith('…') && !/\s…$/.test(long))
})

test('a commentary note is credited and filed under the range it covers', () => {
  const gill = { id: 'john-gill', name: 'John Gill' }
  assert.deepEqual(commentarySourceFor(gill, 'John', 3, { from: 16, to: 16 }), {
    citation: 'John Gill, Exposition of the Entire Bible, on John 3:16',
    title: 'John Gill on John 3:16',
    refs: ['John 3:16'],
  })
  const calvin = commentarySourceFor({ id: 'john-calvin', name: 'John Calvin' }, 'John', 3, { from: 13, to: 18 })
  assert.equal(calvin.citation, 'John Calvin, Commentaries, on John 3:13–18')
  assert.deepEqual(calvin.refs, ['John 3:13-18'], 'the reference the app can parse, not the typographic range')
  const barnes = commentarySourceFor({ id: 'barnes', name: 'Barnes’ Notes (New Testament)' }, 'John', 3, { from: 22, to: null })
  assert.equal(barnes.title, 'Barnes’ Notes on John 3:22ff', 'the parenthetical is dropped from the title')
  assert.equal(barnes.citation, 'Albert Barnes, Notes on the New Testament, on John 3:22ff')
})
