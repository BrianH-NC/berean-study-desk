import test from 'node:test'
import assert from 'node:assert/strict'
import { splitPrayerText,prayerMatches,prayerImportValues } from './prayerImportModel.js'
test('prayer splitting preserves wrapped text and separates paragraphs and bullets',()=>{
 const rows=splitPrayerText('Mary: recovery\r\nPlease pray for strength.\r\n\r\n• John: travel\n• Group: wisdom')
 assert.equal(rows.length,3);assert.equal(rows[0].body,'Mary: recovery\nPlease pray for strength.')
 assert.equal(rows[1].body,'John: travel')
 assert.equal(splitPrayerText('one\ntwo','single').length,1)
 assert.equal(splitPrayerText('one\ntwo','lines').length,2)
 assert.throws(()=>splitPrayerText('x'.repeat(100001)),/100,000/)
 assert.throws(()=>splitPrayerText(Array(101).fill('request').join('\n'),'lines'),/100 requests/)
})
test('duplicate detection includes prior updates and tolerates punctuation and case',()=>{
 const rows=[{id:'a',title:'Family',body:'Other request',updates:[{text:'PRAY for healing!'}]},{id:'b',title:'Unrelated',body:'Travel tomorrow'}]
 assert.equal(prayerMatches({title:'Update',body:'Pray for healing.'},rows)[0].exact,true)
 assert.equal(prayerMatches({title:'',body:''},rows).length,0)
})
test('import values validate text and real dates while defaulting to shared requests',()=>{
 const input={title:' Request ',body:' Text ',ref:'Psalm 23',source:'BSF',request_date:'2026-10-17'}
 assert.equal(prayerImportValues(input).category,'shared')
 assert.equal(prayerImportValues(input).title,'Request')
 assert.throws(()=>prayerImportValues({...input,request_date:'2026-02-30'}),/valid request date/)
 assert.throws(()=>prayerImportValues({...input,title:' '}),/title/)
})
