import test from 'node:test'
import assert from 'node:assert/strict'
import {scriptureDocument,scriptureUrl} from './noteScripture.js'
test('Scripture insertion retains verse numbers, literal text, attribution and a place to continue writing',()=>{
 const doc=scriptureDocument('John 3:16–17',[{verse:16,text:'Text <not markup>'},{verse:17,text:'Next verse'}])
 assert.equal(doc[0].attrs.reference,'John 3:16–17 · BSB')
 assert.equal(doc[0].content[0].content[0].text,'16 Text <not markup>')
 assert.equal(doc[0].content.length,2)
 assert.deepEqual(doc[1],{type:'paragraph'})
})
test('attached passages open the complete verse range',()=>{
 const q=new URL(scriptureUrl({book:'Romans',chapter:8,verseStart:28,verseEnd:30}),'https://example.com').searchParams
 assert.equal(q.get('verse'),'28');assert.equal(q.get('verseEnd'),'30')
})
