import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanVerseText, joinPieces, versesFromContent } from './bibleplusParse.js'

// Shaped like API.Bible's content-type=json for a chapter: paragraph blocks of tag and text nodes.
const text = (verse, s) => ({ type: 'text', text: s, attrs: { verseId: `PSA.136.${verse}`, verseOrgIds: [`PSA.136.${verse}`] } })
const verseLabel = (n) => ({ name: 'verse', type: 'tag', attrs: { number: String(n), style: 'v' }, items: [{ type: 'text', text: String(n) }] })
const para = (style, ...items) => ({ name: 'para', type: 'tag', attrs: { style }, items })
const char = (style, ...items) => ({ name: 'char', type: 'tag', attrs: { style }, items })

test('poetry lines of one verse are separated, not run together', () => {
  const verses = versesFromContent([
    para('q1', verseLabel(1), text(1, 'Give thanks to the '), char('nd', text(1, 'LORD')), text(1, ', for he is good.')),
    para('q2', text(1, 'His love endures forever.')),
    para('q1', verseLabel(2), text(2, 'Give thanks to the God of gods.')),
    para('q2', text(2, 'His love endures forever.')),
  ])
  assert.deepEqual(verses.map((v) => v.text), [
    'Give thanks to the LORD, for he is good. His love endures forever.',
    'Give thanks to the God of gods. His love endures forever.',
  ])
  assert.deepEqual(verses.map((v) => v.number), [1, 2])
})

test('lines that already carry a space are not given a second one', () => {
  assert.equal(joinPieces([{ text: 'The LORD is my shepherd; ', block: 0 }, { text: 'I shall not want.', block: 1 }]), 'The LORD is my shepherd; I shall not want.')
  assert.equal(joinPieces([{ text: 'The LORD is my shepherd;', block: 0 }, { text: ' I shall not want.', block: 1 }]), 'The LORD is my shepherd; I shall not want.')
})

test('a gap inside one paragraph is filled only where words would collide', () => {
  const one = (...parts) => joinPieces(parts.map((t) => ({ text: t, block: 0 })))
  assert.equal(one('He said,', '“Let there be light.”', 'And there was light.'), 'He said, “Let there be light.” And there was light.')
  assert.equal(one('God', '’s Spirit'), 'God’s Spirit', 'a possessive is not split')
  assert.equal(one('their brothers’', 'houses'), 'their brothers’houses', 'an apostrophe before a lowercase word is left alone')
  assert.equal(one('“Is it you?’', 'Jesus asked'), '“Is it you?’ Jesus asked', 'a closing quote before a capital starts a new sentence')
  assert.equal(one('Jeru', 'salem'), 'Jerusalem', 'a word split across two runs stays one word')
  assert.equal(one('see Genesis 1:1', '(and v. 2)'), 'see Genesis 1:1 (and v. 2)')
  assert.equal(one('the LORD', 'is good'), 'the LORDis good', 'two bare letters are not guessed at inside a paragraph')
})

test('# is a word break, and vanishes before punctuation', () => {
  assert.equal(cleanVerseText('His love endures#For he is good'), 'His love endures For he is good')
  assert.equal(cleanVerseText('the LORD#, for he is good'), 'the LORD, for he is good')
  assert.equal(cleanVerseText('  a   b  '), 'a b')
})

test('verse labels are not part of the text, and paragraph starts are recorded', () => {
  const verses = versesFromContent([
    para('p', verseLabel(1), text(1, 'First.'), verseLabel(2), text(2, 'Second.')),
    para('p', verseLabel(3), text(3, 'Third.')),
  ])
  assert.deepEqual(verses, [
    { number: 1, text: 'First.', paragraphStart: true },
    { number: 2, text: 'Second.', paragraphStart: false },
    { number: 3, text: 'Third.', paragraphStart: true },
  ])
})

test('a verse that continues into the next paragraph is joined across the break', () => {
  const verses = versesFromContent([
    para('p', verseLabel(5), text(5, 'He went up the mountain and sat down')),
    para('p', text(5, 'and his disciples came to him.')),
  ])
  assert.equal(verses[0].text, 'He went up the mountain and sat down and his disciples came to him.')
})
