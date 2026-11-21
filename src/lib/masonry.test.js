import test from 'node:test'
import assert from 'node:assert/strict'
import { rowSpan } from './masonry.js'

test('a card takes as many 1px rows as it is tall, plus the gap after it', () => {
  assert.equal(rowSpan(295, 12), 307)
  assert.equal(rowSpan(295.2, 12), 308, 'a fraction of a pixel rounds up so cards never overlap')
  assert.equal(rowSpan(0, 12), 12)
})

test('a missing or odd height still gives a usable span', () => {
  assert.equal(rowSpan(undefined, 0), 1)
  assert.equal(rowSpan(NaN, 0), 1)
  assert.equal(rowSpan(-5, 0), 1)
})
