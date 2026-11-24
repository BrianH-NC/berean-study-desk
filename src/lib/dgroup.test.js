import test from 'node:test'
import assert from 'node:assert/strict'
import { docStatus, exerciseMix, fieldLabel, guideExercises, nextFriday, timingTotal } from './dgroup.js'
import { markdownToHtml } from './markdown.js'

test('next Friday from a Monday, and a Friday stays put', () => {
  assert.equal(nextFriday('2026-11-23'), '2026-11-27')
  assert.equal(nextFriday('2026-11-27'), '2026-11-27')
})

test('guide status reflects generation locks and drafts', () => {
  const now = Date.parse('2026-11-23T12:00:00Z')
  assert.equal(docStatus({}, 'discussion', now), 'empty')
  assert.equal(docStatus({ docs: { discussion: { markdown: 'old five-document format' } } }, 'discussion', now), 'empty')
  assert.equal(docStatus({ generating: { leader: '2026-11-23T11:58:00Z' } }, 'leader', now), 'generating')
  assert.equal(docStatus({ generating: { leader: '2026-11-23T11:00:00Z' }, docs: { leader: { data: {} } } }, 'leader', now), 'draft')
  assert.equal(docStatus({ docs: { leader: { data: {}, status: 'ready' } } }, 'leader', now), 'ready')
})

test('exercises are collected from Dig In and Make It Personal', () => {
  const data = { sections: [
    { kind: 'warmup', questions: ['a'] },
    { kind: 'interpret', movements: [{ exercise: { type: 'road' } }, { exercise: null }, { exercise: { type: 'rating' } }] },
    { kind: 'personal', exercises: [{ type: 'rating' }, { type: 'booths' }, { type: 'made-up' }] },
  ] }
  assert.equal(guideExercises(data).length, 5)
  assert.deepEqual(exerciseMix(data), ['road', 'rating', 'booths'])
})

test('timing total adds the minute ranges', () => {
  assert.equal(timingTotal([{ minutes: '0-5' }, { minutes: '5–20' }, { minutes: '20-60' }, { minutes: 'flex' }]), 60)
})

test('field labels read as words', () => {
  assert.equal(fieldLabel('running_short'), 'Running short')
})

test('markdown renders headings, lists and emphasis, and escapes HTML', () => {
  const html = markdownToHtml('# Title\n- **bold** and *it*\n<script>x</script>')
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.doesNotMatch(html, /<script>/)
})

test('passageLabel formats stored references', async () => {
  const { passageLabel } = await import('./dgroup.js')
  assert.equal(passageLabel('{"book":"1 Peter","chapter":2,"verseEnd":17,"verseStart":15}'), '1 Peter 2:15–17')
  assert.equal(passageLabel({ book: 'Psalm', chapter: 23 }), 'Psalm 23')
  assert.equal(passageLabel('1 Peter 2:13-17'), '1 Peter 2:13-17')
  assert.equal(passageLabel(null), '')
})
