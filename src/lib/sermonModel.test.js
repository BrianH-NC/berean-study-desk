import test from 'node:test'
import assert from 'node:assert/strict'
import {parseTimedTranscript,uniqueSermonRefs,sermonPassageMatch,filterSermons,sourceType,guideText} from './sermonModel.js'
import {topicCatalog,topicContent} from './topicCatalog.js'
test('SRT and VTT preserve timestamps and readable text without caption markup',()=>{
 const srt=parseTimedTranscript('1\r\n00:00:01,200 --> 00:00:05,000\r\nRead <i>John 3:16</i>.\r\n\r\n2\r\n00:01:00,000 --> 00:01:04,100\r\nGrace &amp; truth.')
 assert.equal(srt.cues[0].start,1.2);assert.equal(srt.cues[1].end,64.1);assert.match(srt.text,/Read John 3:16/);assert.match(srt.text,/Grace & truth/)
 const vtt=parseTimedTranscript('WEBVTT\n\nopening\n01:02.000 --> 01:05.500 align:start\n<v Speaker>Romans 8:28</v>')
 assert.deepEqual(vtt.cues,[{start:62,end:65.5,text:'Romans 8:28'}])
 assert.throws(()=>parseTimedTranscript('Plain text without timestamps'),/No timed/)
 assert.throws(()=>parseTimedTranscript('00:02.000 --> 00:01.000\nInvalid'),/ends before/)
})
test('reference index deduplicates repeats and excludes reversed ranges',()=>{
 const ref={book:'John',chapter:3,verseStart:16,verseEnd:18}
 const refs=uniqueSermonRefs([ref,ref,{...ref,verseEnd:15},{book:'Romans',chapter:8}])
 assert.equal(refs.length,2);assert.equal(refs[0].raw,'John 3:16-18');assert.equal(refs[1].verseStart,null)
})
test('passage search matches overlaps, not merely same book or non-overlapping verse',()=>{
 const s={detected_refs:[{book:'John',chapter:3,verseStart:16,verseEnd:18}]}
 assert.equal(sermonPassageMatch(s,{book:'John',chapter:3,verseStart:17,verseEnd:20}),true)
 assert.equal(sermonPassageMatch(s,{book:'John',chapter:3}),true)
 assert.equal(sermonPassageMatch(s,{book:'John',chapter:3,verseStart:19}),false)
 assert.equal(sermonPassageMatch(s,{book:'John',chapter:4}),false)
})
test('filters combine favorites, source, tags, transcript and dates',()=>{
 const s={title:'Saving Grace',speaker:'Sample',source_type:'youtube',tags:['Grace'],favorite:true,sermon_date:'2026-09-14',transcript_text:'John 3:16'}
 assert.equal(filterSermons([s],{query:'grace sample',tag:'Grace',favorite:true,source:'youtube',transcript:'yes',from:'2026-09-01'}).length,1)
 assert.equal(filterSermons([s],{transcript:'no'}).length,0)
 assert.equal(filterSermons([s],{to:'2026-09-01'}).length,0)
 assert.equal(filterSermons([s],{source:'podcast'}).length,0)
})
test('source classification only recognizes real YouTube hosts',()=>{
 assert.equal(sourceType('https://youtu.be/example'),'youtube')
 assert.equal(sourceType('https://youtube.com.attacker.example/video'),'other')
 assert.equal(sourceType('https://example.org/sermon.mp3?q=1'),'audio')
 assert.equal(sourceType(''),'text')
})
test('sermon tags and explicit links connect topics without duplicate content',()=>{
 const sermons=[{id:'s1',title:'Grace Sermon',tags:['Grace']},{id:'s2',title:'Other',tags:['Custom Sermon Topic']}]
 const catalog=topicCatalog([],[],[],[],sermons),grace=catalog.find(t=>t.name==='Grace')
 assert.ok(catalog.some(t=>t.name==='Custom Sermon Topic'))
 const content=topicContent(grace,{notes:[],books:[],checks:[],sermons},[{topic_key:grace.key,entity_type:'sermon',entity_id:'s1'},{topic_key:grace.key,entity_type:'sermon',entity_id:'s2'}])
 assert.equal(content.sermon.length,2);assert.ok(content.sources.includes('From Sermons'))
})
test('export includes application and additional passages',()=>{
 const text=guideText({study_guide:{summary:'Summary',outline:['Outline point'],application:['Apply today'],cross_refs:[{ref:'John 3:16',note:'Love'}]}})
 assert.match(text,/Apply today/);assert.match(text,/John 3:16: Love/)
})
