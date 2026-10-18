import test from 'node:test'
import assert from 'node:assert/strict'
import { overlaps, addDays, planQueue, pageAssignments } from './dailyStudyModel.js'
test('passage matching respects book, chapter, verse ranges and whole chapters',()=>{
 const p={book:'John',chapter:3,verseStart:16,verseEnd:18}
 assert.equal(overlaps(p,{book:'John',chapter:'3',verseStart:18}),true)
 assert.equal(overlaps(p,{book:'John',chapter:3,verseStart:19}),false)
 assert.equal(overlaps(p,{book:'John',chapter:3}),true)
 assert.equal(overlaps(p,{book:'John',chapter:4}),false)
 assert.equal(overlaps(p,{book:'1 John',chapter:3}),false)
 assert.equal(overlaps(null,p),false)
})
test('daily queue retains missed readings and excludes completed, paused and future items',()=>{
 const plan={id:'a',start_date:'2026-10-01',interval_days:2,items:[{label:'one'},{label:'two'},{label:'three'}],completed:{0:'done'}}
 const queue=planQueue([plan,{...plan,id:'b',paused:true}],'2026-10-04')
 assert.deepEqual(queue.map(r=>[r.index,r.date]),[[1,'2026-10-03']])
 assert.deepEqual(planQueue([{...plan,completed:{}}],'2026-10-04').map(r=>r.index),[0,1])
})
test('calendar scheduling survives month, leap-year and daylight-saving boundaries',()=>{
 assert.equal(addDays('2026-10-31',2),'2026-11-02')
 assert.equal(addDays('2028-02-28',1),'2028-02-29')
 assert.equal(addDays('2026-12-31',1),'2027-01-01')
})
test('page assignments include a short final reading without gaps or overlap',()=>{
 assert.deepEqual(pageAssignments(10,34,10),[{label:'Pages 10–19',start:10,end:19},{label:'Pages 20–29',start:20,end:29},{label:'Pages 30–34',start:30,end:34}])
 for(const args of [[0,10,1],[10,5,1],[1,20,0],[1,20,1.2],[1,2000,1]])assert.throws(()=>pageAssignments(...args))
})
