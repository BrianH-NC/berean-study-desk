import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {prayerImportValues} from '../src/lib/prayerImportModel.js'
const source=(await readFile(new URL('../src/lib/prayerImportData.js',import.meta.url),'utf8')).replace(/^import .*\r?\n/gm,'')
test('import retries do not duplicate new requests or updates, and updates preserve original fields',async()=>{
 let row=null,writes=[],filters=[]
 const candidate={id:'import-1',action:'new',title:'Request',body:'New information',source:'Church',request_date:'2026-10-17',ref:'',targetId:'existing',targetVersion:'v1'}
 globalThis.__prayerTest={prayerImportValues,supabase:{from(table){assert.equal(table,'prayer_requests');const q={select(){return q},eq(k,v){filters.push([k,v]);return q},maybeSingle:async()=>({data:row}),insert(value){writes.push(value);row={...value,updates:[]};return q},single:async()=>({data:row})};return q}},saveOwned:async(table,user,original,values)=>{writes.push(values);return row={...original,...values}}}
 try{
  const {savePrayerImport}=await import('data:text/javascript;base64,'+Buffer.from('const {supabase,saveOwned,prayerImportValues}=globalThis.__prayerTest;\n'+source).toString('base64'))
  await savePrayerImport('owner',candidate);await savePrayerImport('owner',candidate)
  assert.equal(writes.length,1);assert.equal(writes[0].user_id,'owner');assert.ok(filters.some(([k,v])=>k==='user_id'&&v==='owner'))
  row={id:'existing',title:'Original',body:'Original body',answered_at:'2026-01-01',updated_at:'v1',updates:[]};writes=[]
  const result=await savePrayerImport('owner',{...candidate,action:'update'})
  assert.equal(result.body,'Original body');assert.equal(result.answered_at,'2026-01-01');assert.equal(result.updates[0].text,'New information');assert.equal(result.updates[0].source,'Church')
  await savePrayerImport('owner',{...candidate,action:'update'});assert.equal(writes.length,1)
  row={...row,updates:[],updated_at:'newer'}
  await assert.rejects(()=>savePrayerImport('owner',{...candidate,action:'update'}),/changed since review/)
 }finally{delete globalThis.__prayerTest}
})
