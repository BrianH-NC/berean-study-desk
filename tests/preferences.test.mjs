import {test} from 'node:test'
import assert from 'node:assert/strict'
import {normalizePreferences,orderedTranslations,parseSettingsFile,DEFAULT_PREFERENCES} from '../src/lib/preferences.js'
test('invalid or stale settings cannot remove the default translation',()=>{
 const known=normalizePreferences({}).knownTranslations
 const p=normalizePreferences({translation:'NIV',enabled:['stale','NIV','NIV'],compare:['NIV','stale'],fontSize:100,confession:'unknown',knownTranslations:known})
 assert.deepEqual(p.enabled,['NIV']);assert.deepEqual(p.compare,[]);assert.equal(p.fontSize,21);assert.equal(p.confession,'1689')
 assert.deepEqual(normalizePreferences({enabled:[],knownTranslations:known}).enabled,['ESV'])
})
test('favorites precede the chosen order and disabled translations stay hidden',()=>{
 const p=normalizePreferences({order:['NIV','BSB','ESV'],favorites:['ESV'],enabled:['BSB','NIV','ESV']})
 assert.deepEqual(orderedTranslations(['BSB','ESV','NIV'].map(id=>({id})),p).map(t=>t.id),['ESV','NIV','BSB'])
})
test('settings import round trips preferences and rejects unrelated exports',()=>{
 assert.deepEqual(parseSettingsFile(JSON.stringify({format:'bsd-settings',version:1,preferences:DEFAULT_PREFERENCES})),normalizePreferences(DEFAULT_PREFERENCES))
 for(const value of [{format:'bsd-data-export',version:1,preferences:{}},{format:'bsd-settings',version:2,preferences:{}},{format:'bsd-settings',version:1,preferences:[]}])assert.throws(()=>parseSettingsFile(JSON.stringify(value)))
})
test('new installs open ESV in a single column',()=>{
 assert.equal(normalizePreferences({}).translation,'ESV');assert.equal(normalizePreferences({}).parallel,false)
})
test('translations added after settings were saved are switched on once, then respect the reader’s choice',()=>{
 const legacy=normalizePreferences({translation:'BSB',enabled:['BSB','eng_kjv']})
 assert.deepEqual(legacy.enabled,['BSB','eng_kjv','eng_gnv','eng_wbs','eng_rv5','eng_bbe','eng_fbv','eng_t4t'])
 const turnedOff=normalizePreferences({...legacy,enabled:['BSB','eng_kjv']})
 assert.deepEqual(turnedOff.enabled,['BSB','eng_kjv'])
})
