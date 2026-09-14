import test from 'node:test'
import assert from 'node:assert/strict'
import { relatedNotes, noteMarkdown } from './noteModel.js'

test('related notes match real relationships, exclude self and unrelated empty links',()=>{
  const parse=value=>value.startsWith('John 3')?{book:'John',chapter:3}:null
  const current={id:'one',ref:'John 3:16',tags:['Grace'],shelf_book_id:'book-a'}
  const result=relatedNotes(current,[current,{id:'two',ref:'John 3:17',tags:['grace']},{id:'three',shelf_book_id:'book-a'},{id:'unrelated',tags:[]},{id:'empty'}],parse)
  assert.deepEqual(result.map(n=>n.id),['two','three'])
  assert.equal(result[0].reasons.length,2)
})

test('Markdown exports retain quotation citations and ordered-list numbering',()=>{
  const text=noteMarkdown({title:'Study',rich_doc:{type:'doc',content:[
    {type:'scriptureQuote',attrs:{reference:'John 3:16 · BSB'},content:[{type:'paragraph',content:[{type:'text',text:'For God so loved the world'}]}]},
    {type:'orderedList',attrs:{start:3},content:['Observe','Apply'].map(text=>({type:'listItem',content:[{type:'paragraph',content:[{type:'text',text}]}]}))}
  ]}})
  assert.match(text,/> John 3:16 · BSB/)
  assert.match(text,/3\. Observe\n4\. Apply/)
})
