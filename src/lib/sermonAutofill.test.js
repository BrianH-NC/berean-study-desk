import test from 'node:test'
import assert from 'node:assert/strict'
import {mergeAutofill,needsAutofill,localDefaults,resolveAutofillTopics,topicsToLink,filledSummary,DEFAULT_CHURCH,DEFAULT_SPEAKER} from './sermonAutofill.js'
import {BUILTIN_TOPICS} from './topicCatalog.js'
const empty={title:'',speaker:'',series:'',church:'',primary_text:'',description:''}
test('fills blank fields and applies Parkside and Pastor Chase defaults',()=>{
 const r=mergeAutofill(empty,{title:'Living as Servants of God',speaker:'',series:'Elect Exiles',primary_text:'1 Peter 2:16-17',description:'A sermon.'},[{name:'Prayer'}],'')
 assert.equal(r.form.title,'Living as Servants of God');assert.equal(r.form.speaker,DEFAULT_SPEAKER);assert.equal(r.form.church,DEFAULT_CHURCH)
 assert.equal(r.form.series,'Elect Exiles');assert.equal(r.form.primary_text,'1 Peter 2:16-17');assert.equal(r.tagText,'Prayer');assert.ok(r.filled.includes('tags'))
})
test('never overwrites what is already there',()=>{
 const r=mergeAutofill({...empty,title:'Mine',speaker:'Andy Davis',church:'FBC Durham'},{title:'AI title',speaker:'Someone'},[{name:'Prayer'}],'grace')
 assert.equal(r.form.title,'Mine');assert.equal(r.form.speaker,'Andy Davis');assert.equal(r.form.church,'FBC Durham');assert.equal(r.tagText,'grace');assert.ok(!r.filled.includes('tags'))
})
test('a named speaker beats the default',()=>{assert.equal(mergeAutofill(empty,{speaker:'Chase Smith'}).form.speaker,'Chase Smith')})
test('skips the AI call when nothing is blank',()=>{
 const full={title:'a',speaker:'b',series:'c',church:'d',primary_text:'e',description:'f'}
 assert.equal(needsAutofill(full,'x'),false);assert.equal(needsAutofill(full,''),true);assert.equal(needsAutofill({...full,description:' '},'x'),true)
})
test('local default fills church only when blank',()=>{assert.deepEqual(localDefaults(empty),{church:DEFAULT_CHURCH});assert.deepEqual(localDefaults({church:'X'}),{})})
test('topics reuse catalog names and aliases, and only kept tags are linked',()=>{
 const topics=resolveAutofillTopics([{name:'Church',reason:'r'},{name:'Christian Liberty',reason:'r'}],BUILTIN_TOPICS)
 assert.equal(topics[0].key,'system:the-church');assert.equal(topics[1].key,'tag:christian liberty')
 assert.deepEqual(topicsToLink(topics,[topics[1].name]).map(t=>t.name),[topics[1].name])
})
test('summary reads naturally',()=>{assert.equal(filledSummary(['title','tags']),'Filled title and topics from the transcript. Review before saving.')})
