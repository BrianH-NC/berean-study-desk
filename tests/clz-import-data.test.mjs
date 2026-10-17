import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {blankPatch} from '../src/lib/clzImport.js'
const source=fs.readFileSync(new URL('../src/lib/clzImportData.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/export /g,'')
const {fillBookBlanks,loadImportBooks}=new Function('blankPatch','supabase',source+';return {fillBookBlanks,loadImportBooks}')(blankPatch,{})
test('import scopes reads and writes to the owner and compares every blank field before updating',async()=>{
 const calls=[];let phase=0
 const client={from(table){calls.push(['from',table]);const q={select(...args){calls.push(['select',...args]);return q},eq(...args){calls.push(['eq',...args]);return q},is(...args){calls.push(['is',...args]);return q},update(p){calls.push(['update',p]);return q},async single(){phase++;return {data:{id:'b',title:'Existing',publisher:null,tags:[],pages:200}}},async maybeSingle(){return {data:{id:'b',publisher:'CLZ',tags:['Theology']}}}};return q}}
 const result=await fillBookBlanks('owner','b',{title:'CLZ title',publisher:'CLZ',tags:['Theology'],pages:100},['publisher','tags','pages'],client)
 assert.deepEqual(result.fields,['publisher','tags']);assert.equal(phase,1)
 assert.equal(calls.filter(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='owner').length,2)
 assert.ok(calls.some(c=>c[0]==='is'&&c[1]==='publisher'&&c[2]===null))
 assert.ok(calls.some(c=>c[0]==='eq'&&c[1]==='tags'&&c[2]==='{}'))
 assert.deepEqual(calls.find(c=>c[0]==='update')[1],{publisher:'CLZ',tags:['Theology']})
})
test('concurrent changes report a conflict instead of an unguarded retry',async()=>{
 let writes=0;const client={from(){const q={select(){return q},eq(){return q},is(){return q},update(){writes++;return q},single:async()=>({data:{publisher:null}}),maybeSingle:async()=>({data:null})};return q}}
 await assert.rejects(fillBookBlanks('owner','b',{publisher:'CLZ'},['publisher'],client),/changed during import/)
 assert.equal(writes,1)
})
test('all library pages are loaded and an error prevents partial matching',async()=>{
 let page=0;const client={from(){const q={select(){return q},eq(){return q},order(){return q},range:async()=>++page===1?{data:Array.from({length:500},(_,id)=>({id}))}:{data:[{id:500}]}};return q}}
 assert.equal((await loadImportBooks('owner',client)).length,501)
 const broken={from(){const q={select(){return q},eq(){return q},order(){return q},range:async()=>({error:Error('offline')})};return q}}
 await assert.rejects(loadImportBooks('owner',broken),/offline/)
})
