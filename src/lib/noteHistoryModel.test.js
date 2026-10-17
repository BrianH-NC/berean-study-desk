import test from 'node:test'
import assert from 'node:assert/strict'
import { revisionFields } from './noteHistoryModel.js'
import { sameSessionState } from './studySessionModel.js'
test('restoring preserves formatting and source details without restoring identity or trash state',()=>{
  const rich_doc={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Original',marks:[{type:'highlight'}]}]}]}
  const fields=revisionFields({id:'old',user_id:'other',number:42,created_at:'old',updated_at:'old',deleted_at:'old',title:'Original',body:'Original',rich_doc,tags:['Grace'],ref:'John 3:16',page:'12',photos:['photo'],sermon_id:'sermon'})
  assert.deepEqual(fields,{title:'Original',body:'Original',rich_doc,ref:'John 3:16',tags:['Grace'],page:'12',photos:['photo'],sermon_id:'sermon'})
})
test('session change detection ignores JSONB key order, but detects changed ranges and translation order',()=>{
  const a={book:'John',chapter:3,verseRange:{start:16,end:18},compare:['KJV','WEB']}
  assert.equal(sameSessionState(a,{compare:['KJV','WEB'],chapter:3,book:'John',verseRange:{end:18,start:16}}),true)
  assert.equal(sameSessionState(a,{...a,verseRange:{start:16,end:17}}),false)
  assert.equal(sameSessionState(a,{...a,compare:['WEB','KJV']}),false)
})
