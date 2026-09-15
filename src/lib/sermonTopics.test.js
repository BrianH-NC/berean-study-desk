import test from 'node:test'
import assert from 'node:assert/strict'
import {BUILTIN_TOPICS,resolveSermonTopics,topicCatalog,topicContent} from './topicCatalog.js'
test('suggestions reuse aliases, deduplicate and preserve existing links',()=>{
 const result=resolveSermonTopics([{name:'Church',reason:'Congregation'},{name:'The Church'},{name:'  Prayer '},{name:'New Theme',reason:'Application'}],BUILTIN_TOPICS,['church']);
 assert.equal(result.length,3);assert.equal(result[0].key,'system:the-church');assert.equal(result[0].linked,true);assert.equal(result[1].key,'system:prayer');assert.equal(result[2].key,'tag:new theme');
});
test('personal topics resolve to their existing page and new tags expose sermon content',()=>{
 const sermon={id:'s1',tags:['Endurance']};const catalog=topicCatalog([{id:'p1',name:'Mercy'}],[],[],[],[sermon]);
 assert.equal(resolveSermonTopics([{name:'Mercy'}],catalog)[0].key,'personal:p1');
 const topic=catalog.find(t=>t.key==='tag:endurance');
 assert.deepEqual(topicContent(topic,{notes:[],books:[],checks:[],sermons:[sermon]},[]).sermon,[sermon]);
 assert.deepEqual(resolveSermonTopics(undefined,catalog),[]);
});
