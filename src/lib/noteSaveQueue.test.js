import test from 'node:test'
import assert from 'node:assert/strict'
import { createNoteSaveQueue } from './noteSaveQueue.js'
import { noteType,plainDocument,noteMarkdown,safeNoteUrl } from './noteModel.js'
test('serializes edits arriving while a previous save is running',async()=>{
  const saved=[];let release
  const gate=new Promise(resolve=>{release=resolve})
  const queue=createNoteSaveQueue(async value=>{if(value===1)await gate;saved.push(value)},()=>{},10000)
  queue.push(1);const first=queue.flush();queue.push(2);queue.push(3);release();await first
  assert.deepEqual(saved,[1,3]);assert.equal(queue.dirty,false);queue.stop()
})
test('failed saves retain their latest draft for explicit retry',async()=>{
  let fail=true;const saved=[]
  const queue=createNoteSaveQueue(async value=>{if(fail)throw Error('offline');saved.push(value)},()=>{},10000)
  queue.push('draft');await assert.rejects(queue.flush());assert.equal(queue.dirty,true)
  fail=false;await queue.flush();assert.deepEqual(saved,['draft']);queue.stop()
})
test('types use explicit relationships, text remains literal, links reject unsafe schemes',()=>{
  assert.equal(noteType({note_type:'standalone',tags:['Scripture']}),'standalone')
  assert.equal(noteType({shelf_book_id:'book'}),'book')
  assert.equal(plainDocument('<script>bad</script>').content[0].content[0].text,'<script>bad</script>')
  assert.equal(safeNoteUrl('javascript:alert(1)'),null)
  assert.match(noteMarkdown({title:'Test',rich_doc:plainDocument('hello')}),/hello/)
})
