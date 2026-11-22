import test from 'node:test'
import assert from 'node:assert/strict'
import { wordParts } from './strongs.js'
import { classifyParts, coreWord, loadHighlightSettings, repeatedWords, saveHighlightSettings, verseStartsSentence } from './studyHighlights.js'

const marked = (text, options) => {
  const parts = wordParts(text), kinds = classifyParts(text, options)
  return parts.map((p, i) => kinds[i] && `${coreWord(p)}:${kinds[i]}`).filter(Boolean)
}
const all = { deity: true, spirit: true, pronouns: true }

test('names of God and the BSB’s capitalized pronouns are marked mid-sentence only', () => {
  // 1 Peter 1:15 (BSB)
  assert.deepEqual(marked('But just as He who called you is holy, so be holy in all you do,', all), ['He:deity'])
  // A capital at the start of a sentence says nothing, so this "He" is left alone.
  assert.deepEqual(marked('He went up to Jerusalem. Then God spoke.', all), ['God:deity'])
  assert.deepEqual(marked('“Be holy, because I am holy.”', all), [])
  // Without pronoun marking (KJV and others) only names count.
  assert.deepEqual(marked('the God and Father of our Lord Jesus Christ, His mercy', { deity: true }), ['God:deity', 'Father:deity', 'Lord:deity', 'Jesus:deity', 'Christ:deity'])
})

test('possessives and multi-word titles are recognized', () => {
  assert.deepEqual(marked('shielded by God’s power and the Most High and the Holy One', all), ['God:deity', 'Most:deity', 'High:deity', 'Holy:deity', 'One:deity'])
})

test('the Holy Spirit is marked, a person’s spirit is not', () => {
  assert.deepEqual(marked('sanctified by the Spirit, and in the Holy Spirit; but his spirit was troubled', all), ['Spirit:spirit', 'Holy:spirit', 'Spirit:spirit'])
  assert.deepEqual(marked('filled with the Holy Ghost', all), ['Holy:spirit', 'Ghost:spirit'])
})

test('a verse continuing a sentence keeps its pronouns in view', () => {
  assert.equal(verseStartsSentence('chosen'), false)
  assert.equal(verseStartsSentence('in abundance.'), true)
  assert.equal(verseStartsSentence(''), true)
  assert.deepEqual(marked('His great mercy', { ...all, startsSentence: false }), ['His:deity'])
  assert.deepEqual(marked('His great mercy', { ...all, startsSentence: true }), [])
})

test('repeated words skip common words and rank by use', () => {
  const verses = [
    { text: 'a living hope, a living word' },
    { text: 'the hope of glory and the word of the Lord' },
    { text: 'Set your hope fully on grace; the word stands, living.' },
  ]
  assert.deepEqual(repeatedWords(verses), [{ word: 'hope', count: 3 }, { word: 'living', count: 3 }, { word: 'word', count: 3 }])
  assert.deepEqual(marked('living hope of the Lord', { repeated: new Set(['hope']) }), ['hope:repeat'])
})

test('highlight settings survive blocked storage', () => {
  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  assert.deepEqual(loadHighlightSettings(broken), { deity: false, spirit: false, repeat: false })
  assert.doesNotThrow(() => saveHighlightSettings({ deity: true }, broken))
  const store = new Map(), mem = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  saveHighlightSettings({ deity: true, spirit: false, repeat: true }, mem)
  assert.deepEqual(loadHighlightSettings(mem), { deity: true, spirit: false, repeat: true })
})

test('punctuation stays outside the highlight', async () => {
  const { splitPunctuation } = await import('./studyHighlights.js')
  assert.deepEqual(splitPunctuation('“Christ!”'), ['“', 'Christ', '!”'])
  assert.deepEqual(splitPunctuation('God’s,'), ['', 'God’s', ','])
  assert.deepEqual(splitPunctuation('—'), ['', '—', ''])
})
