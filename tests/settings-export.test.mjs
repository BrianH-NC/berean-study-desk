import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const source=(await readFile(new URL('../src/lib/settingsData.js',import.meta.url),'utf8')).replace("import {supabase} from './supabase'",'const {supabase,checksList}=globalThis.__settingsExportTest').replace("import {checksList} from './theologyCheck'",'')
test('export paginates owned records and checks, failing instead of downloading partial data',async()=>{
 let fail=false;const calls=[]
 globalThis.__settingsExportTest={supabase:{from(table){let owner;const q={select(){return q},eq(k,v){assert.equal(k,'user_id');owner=v;return q},order(){return q},async range(start,end){calls.push({table,owner,start,end});return fail?{error:{message:'unavailable'}}:{data:Array.from({length:Math.max(0,Math.min(end-start+1,(table==='books'?501:0)-start))},(_,i)=>({id:start+i})),error:null}}};return q}},async checksList(hidden,offset){return {data:Array.from({length:Math.max(0,Math.min(200,(hidden?1:201)-offset))},(_,i)=>({id:offset+i}))}}}
 try{const {exportStudyData}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const result=await exportStudyData({id:'owner'});assert.equal(result.data.books.length,501);assert.equal(result.data.doctrineChecks.length,201);assert.equal(result.data.hiddenDoctrineChecks.length,1);assert.ok(calls.every(c=>c.owner==='owner'));fail=true;await assert.rejects(()=>exportStudyData({id:'owner'}),/No partial export/)}finally{delete globalThis.__settingsExportTest}
})
