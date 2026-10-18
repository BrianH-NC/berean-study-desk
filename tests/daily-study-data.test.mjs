import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
const source=(await readFile(new URL('../src/lib/dailyStudyData.js',import.meta.url),'utf8')).replace("import { supabase } from './supabase'",'const supabase=globalThis.__dailyStudyTest')
test('daily study saves are owner scoped, conflict checked, and cannot reassign identity',async()=>{
 let calls=[],response={data:{id:'one',updated_at:'next'},error:null}
 globalThis.__dailyStudyTest={from(table){calls.push(['from',table]);const q={};for(const method of ['update','insert','select','eq','delete'])q[method]=(...args)=>{calls.push([method,...args]);return q};q.maybeSingle=async()=>response;q.then=resolve=>resolve(response);return q}}
 try{
   const {saveOwned,removeOwned}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))
   await saveOwned('prayer_requests','owner',{id:'one',updated_at:'previous'},{title:'Request',user_id:'intruder',id:'two',created_at:'bad'})
   assert.deepEqual(calls.filter(c=>c[0]==='eq'),[['eq','id','one'],['eq','user_id','owner'],['eq','updated_at','previous']])
   const values=calls.find(c=>c[0]==='update')[1];assert.equal(values.title,'Request');assert.equal(values.user_id,undefined);assert.equal(values.id,undefined)
   response={data:null,error:null};await assert.rejects(()=>saveOwned('prayer_requests','owner',{id:'one',updated_at:'old'},{body:'draft'}),/changed on another device/)
   response={data:[],error:null};await assert.rejects(()=>removeOwned('prayer_requests','owner',{id:'one',updated_at:'old'}),/changed elsewhere/)
   await assert.rejects(()=>saveOwned('books','owner',null,{}),/Unsupported/)
 }finally{delete globalThis.__dailyStudyTest}
})
