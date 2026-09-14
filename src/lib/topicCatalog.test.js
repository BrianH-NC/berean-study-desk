import test from 'node:test'
import assert from 'node:assert/strict'
import {topicCatalog,topicContent,matchesTopic} from './topicCatalog.js'
const data={notes:[{id:'n',title:'Mercy in daily life',tags:['unmerited favor'],ref:'Titus 2:11-14'}],books:[{id:'b',title:'Grace Explained',tags:['Grace']}],checks:[]}
test('aliases reconcile existing tags without duplicating built-in topics',()=>{
 const catalog=topicCatalog([],data.notes,data.books,[])
 assert.equal(catalog.filter(t=>t.name==='Grace').length,1)
 assert.equal(catalog.filter(t=>t.is_derived).length,0)
})
test('explicit and tagged content is counted once; unrelated links are excluded',()=>{
 const topic=topicCatalog([],[],[],[]).find(t=>t.name==='Grace')
 const content=topicContent(topic,data,[{topic_key:topic.key,entity_type:'note',entity_id:'n'},{topic_key:'other',entity_type:'resource',entity_id:'https://example.com'}])
 assert.equal(content.note.length,1);assert.equal(content.book.length,1);assert.equal(content.resource.length,0)
 assert.equal(content.scripture.filter(r=>r==='Titus 2:11-14').length,1)
 assert.ok(content.sources.includes('From My Notes'))
 assert.ok(matchesTopic(topic,content,'mercy daily'))
 assert.ok(!matchesTopic(topic,content,'unrelated query'))
})
test('personal aliases absorb derived tags and keep explicit related topics',()=>{
 const topic=topicCatalog([{id:'p',name:'Service',aliases:['Helping'],tags:[],category:'Christian Living'}],[{tags:['helping']}],[],[]).find(t=>t.is_personal)
 assert.equal(topic.key,'personal:p')
 const content=topicContent(topic,{notes:[],books:[],checks:[]},[{topic_key:topic.key,entity_type:'topic',entity_id:'system:faith'}])
 assert.deepEqual(content.topic,['system:faith'])
})
