import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_COMPARED, blockSpans, chooseCompared, paragraphs, spanLabel, spansForVerses, toggleCompared, uncoveredVerses, verseSummary } from './commentaryBlocks.js'

const block = (number, ...content) => ({ type: 'verse', number, content })
// The real shapes for John 3: Henry by section, Calvin by run, Gill by verse.
const henry = [block(1, 'Section one.'), block(22, 'Section two.')]
const calvin = [block(1, 'a'), block(7, 'b'), block(13, 'c'), block(19, 'd'), block(22, 'e'), block(29, 'f'), block(35, 'g')]
const gill = Array.from({ length: 36 }, (_, i) => block(i + 1, `Gill on ${i + 1}`))

test('a commentary block covers everything up to the next one', () => {
  assert.deepEqual(blockSpans(henry).map((s) => [s.from, s.to]), [[1, 21], [22, null]])
  assert.deepEqual(blockSpans(calvin).map((s) => [s.from, s.to]), [[1, 6], [7, 12], [13, 18], [19, 21], [22, 28], [29, 34], [35, null]])
  assert.equal(blockSpans(gill)[15].from, 16)
  assert.equal(blockSpans(gill)[15].to, 16)
})

test('the same verse finds a different range in each commentary', () => {
  assert.deepEqual(spansForVerses(henry, [16]).map(spanLabel), ['Verses 1–21'])
  assert.deepEqual(spansForVerses(calvin, [16]).map(spanLabel), ['Verses 13–18'])
  assert.deepEqual(spansForVerses(gill, [16]).map(spanLabel), ['Verse 16'])
  assert.deepEqual(spansForVerses(henry, [36]).map(spanLabel), ['Verses 22–end'])
})

test('several selected verses give each covering block once, in order', () => {
  assert.deepEqual(spansForVerses(calvin, [14, 16, 18, 20]).map(spanLabel), ['Verses 13–18', 'Verses 19–21'])
  assert.deepEqual(spansForVerses(gill, [3, 1, 2]).map((s) => s.from), [1, 2, 3])
})

test('a verse before the first block, or no verse, has no note', () => {
  assert.deepEqual(spansForVerses([block(3, 'late start')], [1]), [])
  assert.deepEqual(spansForVerses(gill, []), [])
  assert.deepEqual(spansForVerses(null, [1]), [])
})

test('blank and non-text content is ignored', () => {
  const spans = blockSpans([block(1, 'One.', '  ', { text: 'x' }, 'Two.'), block(2, ''), { number: 'x', content: ['no'] }])
  assert.deepEqual(spans, [{ from: 1, to: 1, text: 'One.\n\nTwo.' }])
  assert.deepEqual(paragraphs('One.\n\nTwo.\n\n\n\nThree.'), ['One.', 'Two.', 'Three.'])
})

test('the saved choice is kept where it still applies, and topped up where it does not', () => {
  const all = ['matthew-henry', 'john-calvin', 'john-gill', 'tsk', 'barnes']
  assert.deepEqual(chooseCompared(all, ['tsk', 'barnes']), ['tsk', 'barnes'])
  assert.deepEqual(chooseCompared(all, []), ['john-gill', 'barnes', 'john-calvin'], 'verse-by-verse commentaries first')
  const genesis = ['matthew-henry', 'john-calvin', 'john-gill', 'tsk']   // Barnes isn't offered on Genesis
  assert.deepEqual(chooseCompared(genesis, ['barnes', 'tsk']), ['tsk', 'john-gill', 'john-calvin'])
  assert.deepEqual(chooseCompared(['catena'], []), ['catena'], 'a lone commentary is still compared alone')
  assert.deepEqual(chooseCompared(all, ['tsk', 'tsk', 'gone']), ['tsk', 'john-gill', 'barnes'], 'duplicates and unknown ids are dropped')
})

test('toggling keeps display order, at least one, and no more than the maximum', () => {
  const all = ['matthew-henry', 'john-calvin', 'john-gill', 'tsk', 'barnes']
  assert.deepEqual(toggleCompared(['matthew-henry', 'tsk'], 'john-calvin', all), ['matthew-henry', 'john-calvin', 'tsk'])
  assert.deepEqual(toggleCompared(['matthew-henry', 'tsk'], 'tsk', all), ['matthew-henry'])
  assert.deepEqual(toggleCompared(['matthew-henry'], 'matthew-henry', all), ['matthew-henry'], 'the last one stays')
  const full = all.slice(0, MAX_COMPARED)
  assert.deepEqual(toggleCompared(full, 'barnes', all), full, 'a fifth is refused')
})

test('selected verses read the way a person would say them', () => {
  assert.equal(verseSummary([16]), '16')
  assert.equal(verseSummary([18, 16, 17]), '16–18')
  assert.equal(verseSummary([14, 16, 20, 21]), '14, 16, 20–21')
  assert.equal(verseSummary([3, 3, 4]), '3–4')
  assert.equal(verseSummary([]), '')
})

test('verses a commentary skips are reported', () => {
  const jfbGenesis1 = [block(2, 'Without form and void.'), block(3, 'Let there be light.')]
  assert.deepEqual(uncoveredVerses(spansForVerses(jfbGenesis1, [1, 2]), [1, 2]), [1])
  assert.deepEqual(uncoveredVerses(spansForVerses(gill, [1, 2]), [1, 2]), [])
  assert.deepEqual(uncoveredVerses([], [2, 1, 1]), [1, 2])
})
