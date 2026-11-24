import test from 'node:test'
import assert from 'node:assert/strict'
import { bookletSections, docStatus, nextFriday } from './dgroup.js'
import { markdownToHtml } from './markdown.js'

test('next Friday from a Monday, and a Friday stays put', () => {
  assert.equal(nextFriday('2026-11-23'), '2026-11-27')
  assert.equal(nextFriday('2026-11-27'), '2026-11-27')
})

test('document status reflects generation locks and drafts', () => {
  const now = Date.parse('2026-11-23T12:00:00Z')
  assert.equal(docStatus({}, 'prep', now), 'empty')
  assert.equal(docStatus({ generating: { prep: '2026-11-23T11:58:00Z' } }, 'prep', now), 'generating')
  assert.equal(docStatus({ generating: { prep: '2026-11-23T11:00:00Z' }, docs: { prep: { markdown: 'x' } } }, 'prep', now), 'draft')
  assert.equal(docStatus({ docs: { prep: { markdown: 'x', status: 'ready' } } }, 'prep', now), 'ready')
})

test('booklet splits into passage sections and a wrap-up', () => {
  const s = bookletSections('## 1 Peter 2:11-12\n### Observe\n- Who?\n\n## Wrap-up\n- Tie it together')
  assert.equal(s.length, 2)
  assert.equal(s[0].ref, '1 Peter 2:11-12')
  assert.match(s[0].markdown, /Observe/)
  assert.equal(s[1].ref, null)
  assert.equal(s[1].heading, 'Wrap-up')
})

test('markdown renders headings, lists, emphasis and escapes HTML', () => {
  const html = markdownToHtml('# Title\n\nSome **bold** and *it*.\n\n- one\n- two\n\n1. a\n2. b\n\n> quote\n\n<script>x</script>')
  assert.match(html, /<h1>Title<\/h1>/)
  assert.match(html, /<strong>bold<\/strong>/)
  assert.match(html, /<em>it<\/em>/)
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/)
  assert.match(html, /<ol><li>a<\/li><li>b<\/li><\/ol>/)
  assert.match(html, /<blockquote>/)
  assert.ok(!html.includes('<script>'))
})
