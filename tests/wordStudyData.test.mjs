import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {strongsId,unpackVerse,apparatusReadings,changedWords,variants,occurrences,studyJson} from '../src/lib/wordStudyData.js'
const data=async path=>JSON.parse(await readFile(new URL('../public/data/word-study/'+path,import.meta.url),'utf8'))
test('Strong’s lookup normalizes numbers without permitting paths',()=>{
 assert.equal(strongsId(' g00025 '),'G25');assert.equal(strongsId('H07225'),'H7225')
 for(const invalid of ['G0','25','../G25','G25/1'])assert.throws(()=>strongsId(invalid))
 assert.deepEqual(unpackVerse(43003016),{bookNumber:43,chapter:3,verse:16})
})
test('Real apparatus preserves Greek and separates NBSP-delimited readings',async()=>{
 const source=await data('variants/43/3.json')
 const readings=apparatusReadings(source['16'][0])
 assert.equal(readings.length,2);assert.match(readings[0],/υἱὸν/);assert.match(readings[1],/αὐτοῦ/)
 assert.equal(apparatusReadings('• α WH ] β RP; γ Treg').length,3)
 assert.deepEqual(changedWords('α β','α').filter(p=>p.changed).map(p=>p.word),['β'])
})
test('Imported lexicon and grammar agree for John 3:16; repeated forms stay separate',async()=>{
 const lex=await data('lexicon/G/0.json'),chapter=await data('grammar/43/3.json'),morph=await data('morphology.json')
 assert.equal(lex.G25[0].lemma,'ἀγαπάω')
 const love=chapter['16'].filter(r=>r.ids.includes('G25'))
 assert.equal(love.length,1);assert.ok(love[0].codes.includes('V-AAI-3S'))
 assert.match(morph['V-AAI-3S'].description,/Tense=Aorist/)
 assert.ok(chapter['16'].filter(r=>r.ids.includes('G3588')).length>1)
})
test('OT unsupported, missing chapter entries, retries, and concordance deduplication',async()=>{
 const original=globalThis.fetch;let count=0
 globalThis.fetch=async url=>{count++;if(url.includes('retry')&&count===1)return {ok:false};return {ok:true,json:async()=>url.includes('index/strongs')?{G25:[43003016,43003016,40005044]}:url.includes('index.json')?['1']:[]}}
 try{
  assert.equal(await variants(1,1),null);assert.equal(count,0)
  await assert.rejects(studyJson('/retry-test'),/could not load/);await studyJson('/retry-test')
  assert.deepEqual(await variants(43,99),{})
  const rows=await occurrences('G25');assert.equal(rows.length,2);assert.equal(rows[0].bookNumber,40)
 }finally{globalThis.fetch=original}
})
test('Hebrew alternate numbering retains the English Psalm reference',async()=>{
 const chapter=await data('grammar/19/3.json')
 assert.equal(chapter['1'][0].gloss,'O Yahweh')
 assert.ok(chapter['1'][0].ids.includes('H3068'))
 assert.match(chapter['1'][0].editions,/TAHOT/)
})
