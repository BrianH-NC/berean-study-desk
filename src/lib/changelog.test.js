import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CHANGELOG, APP_VERSION, KIND_LABELS, hasUnseenUpdate, markUpdateSeen } from './changelog.js'

const parse = (v) => v.split('.').map(Number)
const newer = (a, b) => { const [x, y] = [parse(a), parse(b)]; for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false }

test('releases are listed newest first with unique semantic versions and known kinds', () => {
  for (const r of CHANGELOG) {
    assert.match(r.version, /^\d+\.\d+\.\d+$/)
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/)
    assert.ok(r.changes.length > 0)
    for (const c of r.changes) assert.ok(KIND_LABELS[c.kind], `unknown kind ${c.kind}`)
  }
  for (let i = 1; i < CHANGELOG.length; i++) {
    assert.ok(newer(CHANGELOG[i - 1].version, CHANGELOG[i].version), `${CHANGELOG[i - 1].version} should be newer than ${CHANGELOG[i].version}`)
    assert.ok(CHANGELOG[i - 1].date >= CHANGELOG[i].date)
  }
})

test('package.json version matches the latest release', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)))
  assert.equal(pkg.version, APP_VERSION)
})

test('the update dot shows until the current version is viewed, per account', () => {
  const values = new Map(), store = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) }
  assert.equal(hasUnseenUpdate(store, 'one'), true)
  markUpdateSeen(store, 'one')
  assert.equal(hasUnseenUpdate(store, 'one'), false)
  assert.equal(hasUnseenUpdate(store, 'two'), true)
  assert.equal(hasUnseenUpdate(store, 'one', '9.9.9'), true)
  assert.equal(hasUnseenUpdate({ getItem() { throw new Error('blocked') } }, 'one'), false)
})
