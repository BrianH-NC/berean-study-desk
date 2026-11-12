import test from 'node:test'
import assert from 'node:assert/strict'
import { restoreBibleSelection, saveBibleSelection, restoreBiblePassage, saveBiblePassage, DEFAULT_PASSAGE } from './bibleSelection.js'
const prefs = { translation:'BSB', enabled:['BSB','NIV','NLT'], compare:['NIV'], parallel:true }
function storage() { const values = new Map(); return { getItem:key => values.get(key), setItem:(key,value) => values.set(key,value) } }
test('Bible choices survive remounts, including an empty comparison and single view', () => {
  const store=storage()
  const selection={translation:'NLT',compare:[],parallel:false}
  assert.equal(saveBibleSelection(store,'one',selection),true)
  assert.deepEqual(restoreBibleSelection(store,'one',prefs),selection)
  assert.deepEqual(restoreBibleSelection(store,'two',prefs),{translation:'BSB',compare:['NIV'],parallel:true})
})
test('disabled or stale translations are excluded without restoring the old comparison set', () => {
  const store=storage()
  saveBibleSelection(store,'one',{translation:'removed',compare:['removed','NIV','NIV','BSB'],parallel:true})
  assert.deepEqual(restoreBibleSelection(store,'one',prefs),{translation:'BSB',compare:['NIV'],parallel:true})
})
test('blocked and malformed storage use account defaults without breaking Bible Study', () => {
  assert.equal(saveBibleSelection(undefined,'one',{}),false)
  assert.deepEqual(restoreBibleSelection({getItem:()=>'{bad'},'one',prefs),{translation:'BSB',compare:['NIV'],parallel:true})
})
test('the last open passage, including a narrowed verse range, is restored per account', () => {
  const store=storage(), books=['John','Romans']
  assert.deepEqual(restoreBiblePassage(store,'one',books),DEFAULT_PASSAGE)
  saveBiblePassage(store,'one',{book:'Romans',chapter:8,verseRange:{start:28,end:30}})
  assert.deepEqual(restoreBiblePassage(store,'one',books),{book:'Romans',chapter:8,verseRange:{start:28,end:30}})
  assert.deepEqual(restoreBiblePassage(store,'two',books),DEFAULT_PASSAGE)
  saveBiblePassage(store,'one',{book:'Romans',chapter:8,verseRange:null})
  assert.deepEqual(restoreBiblePassage(store,'one',books),{book:'Romans',chapter:8,verseRange:null})
})
test('unknown books, bad chapters, and damaged storage fall back to John 3', () => {
  const store=storage(), books=['John','Romans']
  saveBiblePassage(store,'one',{book:'Hezekiah',chapter:2}); assert.deepEqual(restoreBiblePassage(store,'one',books),DEFAULT_PASSAGE)
  saveBiblePassage(store,'one',{book:'Romans',chapter:0}); assert.deepEqual(restoreBiblePassage(store,'one',books),DEFAULT_PASSAGE)
  saveBiblePassage(store,'one',{book:'Romans',chapter:8,verseRange:{start:9,end:2}}); assert.deepEqual(restoreBiblePassage(store,'one',books),{book:'Romans',chapter:8,verseRange:null})
  assert.deepEqual(restoreBiblePassage({getItem:()=>'{bad'},'one',books),DEFAULT_PASSAGE)
  assert.equal(saveBiblePassage(undefined,'one',DEFAULT_PASSAGE),false)
})
