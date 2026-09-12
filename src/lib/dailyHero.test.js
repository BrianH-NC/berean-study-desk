import test from 'node:test'
import assert from 'node:assert/strict'
import { dailyHero, HERO_IMAGES } from './dailyHero.js'
test('hero is stable throughout a local calendar day',()=>{
  assert.equal(dailyHero(new Date(2026,8,11,0,0)),dailyHero(new Date(2026,8,11,23,59)))
})
test('consecutive days rotate through all scenes and repeat',()=>{
  const days=Array.from({length:4},(_,i)=>dailyHero(new Date(2026,8,11+i)))
  assert.equal(new Set(days.slice(0,3)).size,HERO_IMAGES.length)
  assert.equal(days[0],days[3])
})
