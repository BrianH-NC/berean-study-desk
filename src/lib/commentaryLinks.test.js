import test from 'node:test'
import assert from 'node:assert/strict'
import { commentaryLinker } from './commentaryLinks.js'

const refs = (linker, text) => linker(text).filter((s) => s.ref).map((s) => `${s.text}:${s.ref.book}.${s.ref.chapter}.${s.ref.verse}`)
const JOHN = 43

test('the Treasury is read by its own rules, every other commentary by its citations', () => {
  const treasury = 'gave. 1:14,18; Ro 5:10; 8:32'   // references written without a book
  assert.deepEqual(refs(commentaryLinker('tsk', JOHN, 3), treasury), ['1:14:43.1.14', '18:43.1.18', 'Ro 5:10:45.5.10', '8:32:45.8.32'])
  // Elsewhere a reference after a book continues that book ("Ro 5:10; 8:32"), but "gave. 1:14,18" names no book, so it is not guessed.
  assert.deepEqual(refs(commentaryLinker('john-gill', JOHN, 3), treasury), ['Ro 5:10:45.5.10', '8:32:45.8.32'])
})

test('"ver. 2" is a verse of the chapter in the commentaries that write it that way, and not in Gill', () => {
  const text = 'the argument in ver. 2, and Iliad. 18. ver. 318'
  assert.deepEqual(refs(commentaryLinker('barnes', JOHN, 3), text), ['ver. 2:43.3.2'])
  assert.deepEqual(refs(commentaryLinker('john-gill', JOHN, 3), text), [])
})

test('the linker is bound to the chapter it was made for', () => {
  assert.deepEqual(refs(commentaryLinker('john-calvin', 40, 5), 'see verse 5'), ['verse 5:40.5.5'])
  assert.deepEqual(refs(commentaryLinker('john-calvin', JOHN, 3), 'see verse 5'), ['verse 5:43.3.5'])
})
