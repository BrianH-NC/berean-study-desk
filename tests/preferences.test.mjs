import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizePreferences,orderedTranslations,parseSettingsFile,DEFAULT_PREFERENCES} from '../src/lib/preferences.js'
test('invalid or stale settings cannot remove the default translation',()=>{
 const p=normalizePreferences({translation:'NIV',enabled:['stale','NIV','NIV'],compare:['NIV','stale'],fontSize:100,confession:'unknown'})
 assert.deepEqual(p.enabled,['NIV']);assert.deepEqual(p.compare,[]);assert.equal(p.fontSize,21);assert.equal(p.confession,'1689')
 assert.deepEqual(normalizePreferences({enabled:[]}).enabled,['BSB'])
})
test('favorites precede the chosen order and disabled translations stay hidden',()=>{
 const p=normalizePreferences({order:['NIV','BSB','ESV'],favorites:['ESV'],enabled:['BSB','NIV','ESV']})
 assert.deepEqual(orderedTranslations(['BSB','ESV','NIV'].map(id=>({id})),p).map(t=>t.id),['ESV','NIV','BSB'])
})
test('settings import round trips preferences and rejects unrelated exports',()=>{
 assert.deepEqual(parseSettingsFile(JSON.stringify({format:'bsd-settings',version:1,preferences:DEFAULT_PREFERENCES})),normalizePreferences(DEFAULT_PREFERENCES))
 for(const value of [{format:'bsd-data-export',version:1,preferences:{}},{format:'bsd-settings',version:2,preferences:{}},{format:'bsd-settings',version:1,preferences:[]}])assert.throws(()=>parseSettingsFile(JSON.stringify(value)))
})
