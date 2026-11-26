import test from 'node:test'
import assert from 'node:assert/strict'
import { effectiveVerdict, ruleFor, ruleMatches, verdictBarColor } from './verdictRules.js'

const beeke = { author: 'Beeke', verdict: 'Baptism/Polity Distinctive' }
const mpv = { author: 'Michael P.V. Barrett', verdict: 'Sound' }

test('a surname rule matches the filing name or the first credited author', () => {
  assert.ok(ruleMatches(beeke, { author: 'Joel R. Beeke | Paul M. Smalley' }))
  assert.ok(ruleMatches(beeke, { author: 'Someone Else', shelf_author: 'BEEKE' }))
  assert.ok(!ruleMatches(beeke, { author: 'Paul M. Smalley | Joel R. Beeke' }))
})

test('a full-name rule keeps two Barretts apart', () => {
  assert.ok(ruleMatches(mpv, { author: 'Michael P.V. Barrett' }))
  assert.ok(!ruleMatches(mpv, { author: 'C.K. Barrett | Charles Kingsley Barrett', shelf_author: 'BARRETT' }))
})

test('the more specific rule wins and a rule beats an AI check', () => {
  const rules = [{ author: 'Barrett', verdict: 'Caution' }, mpv]
  assert.equal(ruleFor({ author: 'Michael P.V. Barrett' }, rules).verdict, 'Sound')
  const v = effectiveVerdict({ author: 'Joel R. Beeke' }, [beeke], { verdict: 'Sound' })
  assert.equal(v.verdict, 'Baptism/Polity Distinctive'); assert.equal(v.source, 'rule')
  assert.equal(effectiveVerdict({ author: 'X Y' }, [beeke], { verdict: 'Caution' }).source, 'check')
  assert.equal(effectiveVerdict({ author: 'X Y' }, [beeke], null).verdict, null)
})

test('each verdict has its own bar color and no verdict has none', () => {
  const colors = ['Sound', 'Caution', 'Concern', 'Baptism/Polity Distinctive', 'Unable to Assess'].map(verdictBarColor)
  assert.equal(new Set(colors).size, 5)
  assert.equal(verdictBarColor(null), null)
})
