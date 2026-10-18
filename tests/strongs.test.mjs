import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizeTokens,alignedWord,strongsVerse,strongsEntry} from '../src/lib/strongs.js'
test('Mappings require the entire KJV token sequence; never guess across translations',()=>{
  const tokens=normalizeTokens({w:[['God',['G2316']],['loved',['G25']],['the',[]],['world',['G2889']]]})
  assert.equal(alignedWord(tokens,'God loved the world.',1,'eng_kjv'),1)
  assert.equal(alignedWord(tokens,'God loved the world.',1,'BSB'),-1)
  assert.equal(alignedWord(tokens,'God loves the world.',1,'eng_kjv'),-1)
  assert.equal(alignedWord(tokens,'God loved world.',1,'eng_kjv'),-1)
  assert.deepEqual(tokens[2].ids,[])
})
test('Multiple numbers retained, invalid dictionary identifiers rejected',async()=>{
  assert.deepEqual(normalizeTokens({w:[['word',['H123','G25','../bad',null]]]}),[{word:'word',ids:['H123','G25']}])
  assert.throws(()=>normalizeTokens(null),/unavailable/)
  await assert.rejects(strongsEntry('../secret'),/Invalid/)
  await assert.rejects(strongsVerse(0,1,1),/Invalid/)
})
test('Fetch chapter and dictionary buckets, retry failures and cache success',async()=>{
  const original=globalThis.fetch;const urls=[];let fail=true
  globalThis.fetch=async(url)=>{urls.push(url);if(fail){fail=false;return {ok:false}};return {ok:true,json:async()=>url.includes('lexicon')?{H7225:{o:'בְּרֵאשִׁית',str:'beginning'}}:{1:{w:[['beginning',['H7225']]]}}}}
  try {
    await assert.rejects(strongsVerse(1,1,1),/unavailable/)
    assert.equal((await strongsVerse(1,1,1))[0].ids[0],'H7225')
    await strongsVerse(1,1,1)
    assert.equal(urls.length,2)
    assert.equal((await strongsEntry('H7225')).str,'beginning')
    assert.match(urls[2],/lexicon\/H\/72.json$/)
  } finally {globalThis.fetch=original}
})
