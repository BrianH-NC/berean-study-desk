import test from 'node:test'
import assert from 'node:assert/strict'
import { matchesSearch,sortSearchResults,commentarySections } from './searchModel.js'
test('search matches all words across fields and supports exact phrases',()=>{
 assert.ok(matchesSearch(['Grace','John Smith'],'john grace'))
 assert.ok(!matchesSearch(['Grace','John Smith'],'john grace',true))
 assert.ok(!matchesSearch(['Grace'],'grace missing'))
})
test('relevance ranks exact titles before body matches without mutation',()=>{
 const rows=[{title:'Other',text:'grace'},{title:'Grace'},{title:'Grace and faith'}]
 assert.deepEqual(sortSearchResults(rows,'grace','relevance').map(x=>x.title),['Grace','Grace and faith','Other'])
 assert.equal(rows[0].title,'Other')
})
test('commentary includes a verse covered by an earlier section',()=>{
 const data={chapter:{content:[{type:'heading',content:['Heading']},{type:'verse',number:1,content:['One through four']},{type:'verse',number:5,content:['Five onwards']}]}}
 const rows=commentarySections(data,{book:'Romans',chapter:5,verseStart:3,verseEnd:3},{id:'henry',name:'Henry'})
 assert.equal(rows.length,1)
 assert.equal(rows[0].text,'One through four')
})


test('search excerpts include matches beyond the start of a long report', async()=>{
 const {searchExcerpt}=await import('./searchModel.js')
 const text='Introduction. '.repeat(70)+'Discipleship is discussed here. '+ 'Details. '.repeat(70)
 const excerpt=searchExcerpt(text,'discipleship')
 assert.match(excerpt,/Discipleship/)
 assert.ok(excerpt.startsWith('…'))
 assert.ok(excerpt.length<=242)
})
