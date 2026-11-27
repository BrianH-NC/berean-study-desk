import test from 'node:test'
import assert from 'node:assert/strict'
import {parsePrimaryText,primaryRefSegments,primaryRefLabel} from './primaryText.js'
import {sermonPassageMatch,sermonBibleUrl} from './sermonModel.js'
import {passageLabel} from './dgroup.js'
const fake=t=>{const m=t.match(/^(.+?) (\d+)(?::(\d+)(?:-(\d+))?)?$/);if(!m)return null;const vs=m[3]?+m[3]:null;return {book:m[1],chapter:+m[2],verseStart:vs,verseEnd:m[4]?+m[4]:vs}}
test('cross-chapter ranges parse, single-chapter ones are unchanged',()=>{
 assert.deepEqual(parsePrimaryText('1 Peter 1:22–2:3',fake),{book:'1 Peter',chapter:1,verseStart:22,verseEnd:3,chapterEnd:2})
 assert.deepEqual(parsePrimaryText('Romans 8:28-39',fake),{book:'Romans',chapter:8,verseStart:28,verseEnd:39})
 assert.deepEqual(parsePrimaryText('Romans 8:28-8:39',fake),{book:'Romans',chapter:8,verseStart:28,verseEnd:39})
 assert.equal(parsePrimaryText('1 Peter 2:3-1:22',fake),null)
})
test('segments, matching, links and labels handle the span',()=>{
 const ref=parsePrimaryText('1 Peter 1:22-2:3',fake)
 assert.equal(primaryRefSegments(ref).length,2)
 const s={primary_ref:ref,detected_refs:[]}
 assert.ok(sermonPassageMatch(s,{book:'1 Peter',chapter:2,verseStart:2,verseEnd:2}))
 assert.ok(sermonPassageMatch(s,{book:'1 Peter',chapter:1,verseStart:25,verseEnd:25}))
 assert.ok(!sermonPassageMatch(s,{book:'1 Peter',chapter:2,verseStart:4,verseEnd:4}))
 assert.ok(!sermonPassageMatch(s,{book:'1 Peter',chapter:1,verseStart:21,verseEnd:21}))
 assert.ok(!sermonBibleUrl(ref,'x').includes('verseEnd'))
 assert.equal(primaryRefLabel(ref),'1 Peter 1:22–2:3');assert.equal(passageLabel(ref),'1 Peter 1:22–2:3')
})
