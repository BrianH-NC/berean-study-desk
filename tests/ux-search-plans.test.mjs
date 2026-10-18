import test from 'node:test'
import assert from 'node:assert/strict'
import {readSearchView,saveSearchView,searchMatches} from '../src/lib/searchView.js'
import {READING_PRESETS,readingPlanStatus} from '../src/lib/readingPresets.js'
test('search return state preserves expanded results and isolates account/query keys',()=>{
 const store=new Map();globalThis.sessionStorage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)}
 saveSearchView('user:a:grace',{selectedId:'note:4',visible:90,bibleLimit:120,previewOpen:true,scroll:840})
 assert.deepEqual(readSearchView('user:a:grace'),{selectedId:'note:4',visible:90,bibleLimit:120,previewOpen:true,scroll:840})
 assert.deepEqual(readSearchView('user:b:grace'),{})
 store.set('broken','{');assert.deepEqual(readSearchView('broken'),{})
 store.set('old',JSON.stringify({savedAt:0}));assert.deepEqual(readSearchView('old'),{})
 globalThis.sessionStorage={getItem(){throw Error('unavailable')},setItem(){throw Error('unavailable')}}
 assert.deepEqual(readSearchView('blocked'),{});assert.doesNotThrow(()=>saveSearchView('blocked',{}))
})
test('matching highlights literal punctuation safely and preserves original text',()=>{
 const text='Grace, GRACE and (faith). <script>text</script>'
 const parts=searchMatches(text,'grace (faith)')
 assert.equal(parts.map(p=>p.text).join(''),text)
 assert.deepEqual(parts.filter(p=>p.match).map(p=>p.text),['Grace','GRACE','(faith)'])
 assert.deepEqual(searchMatches('anything',''),[{text:'anything',match:false}])
})
test('reading presets and statuses distinguish completion, pause and upcoming work',()=>{
 assert.equal(READING_PRESETS[0].readings.length,21);assert.equal(READING_PRESETS[0].readings.at(-1),'John 21')
 assert.equal(READING_PRESETS[1].readings.length,16);assert.equal(READING_PRESETS[2].readings.length,7)
 const p={items:['a','b'],completed:{},paused:false,start_date:'2026-10-20'}
 assert.equal(readingPlanStatus(p,'2026-10-17'),'Upcoming')
 assert.equal(readingPlanStatus({...p,paused:true},'2026-10-17'),'Paused')
 assert.equal(readingPlanStatus({...p,completed:{0:'date',1:'date'}},'2026-10-17'),'Completed')
 assert.equal(readingPlanStatus(p,'2026-10-21'),'In progress')
})
