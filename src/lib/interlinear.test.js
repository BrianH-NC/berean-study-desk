import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { interlinearRows, isLexicalId, plainGrammar, splitForm } from './wordStudyData.js'

const codes = JSON.parse(readFileSync('public/data/word-study/morphology.json', 'utf8'))
const chapter = (b, c) => JSON.parse(readFileSync(`public/data/word-study/grammar/${b}/${c}.json`, 'utf8'))

test('Greek words read with accents, transliteration and the gloss for this verse', () => {
  const [peter, apostle] = interlinearRows(chapter(60, 1)['1'], codes)
  assert.equal(peter.original, 'Πέτρος'.normalize('NFC')); assert.equal(peter.transliteration, 'Petros'); assert.equal(peter.gloss, 'Peter')
  assert.deepEqual(peter.ids, ['G4074']); assert.equal(peter.partial, false)
  assert.equal(apostle.grammar[0], 'Noun · Nominative · Singular · Masculine')
})

test('Hebrew prefixes are joined into the word and their tags are not treated as dictionary words', () => {
  const [first] = interlinearRows(chapter(1, 1)['1'], codes)
  assert.equal(first.original, 'בְּרֵאשִׁ֖ית'.normalize('NFC')); assert.equal(first.transliteration, 'be.re.Shit'); assert.equal(first.gloss, 'in beginning')
  assert.deepEqual(first.ids.filter(isLexicalId), ['H7225'])
  assert.equal(first.grammar.length, 2)
})

test('grammar descriptions drop STEP’s "hence" asides', () => {
  assert.equal(plainGrammar('Function=Verb ; Stem=Qal (hence Action=Simple; Voice=Active); Person=Third'), 'Verb · Qal · Third')
  assert.deepEqual(splitForm('και'), { original: 'και', transliteration: '' })
  const last = interlinearRows(chapter(19, 23)['1'], codes).at(-1)
  assert.ok(!/[/\\]/.test(last.original + last.transliteration), last.original)
})

test('words missing from some Greek editions are flagged', () => {
  const rows = interlinearRows([{ form: 'x (x)', gloss: 'x', ids: ['G1'], codes: ['N-NSM'], editions: 'TR+Byz' }], codes)
  assert.equal(rows[0].partial, true)
})
