// Fills blank sermon fields from an uploaded or pasted transcript.
// Pure helpers live here so they can be tested with node:test; the network call is in sermons.js.
import {resolveSermonTopics} from './topicCatalog.js'

export const DEFAULT_CHURCH='Parkside Baptist Church'
export const DEFAULT_SPEAKER='Pastor Chase'
export const AUTOFILL_FIELDS=['title','speaker','series','church','primary_text','description']
export const MIN_AUTOFILL_LENGTH=200

const blank=v=>!(typeof v==='string'?v.trim():v)

// True when at least one field the AI could fill is still empty, so we never pay for a call that changes nothing.
export function needsAutofill(form,tagText=''){
 return ['title','speaker','series','primary_text','description'].some(k=>blank(form[k]))||blank(tagText)
}

// Values that need no AI: the default church and preacher for transcripts Brian uploads.
export function localDefaults(form){
 const out={}
 if(blank(form.church))out.church=DEFAULT_CHURCH
 return out
}

// Resolve AI topic names against the user's Topics catalog so tags reuse existing names and aliases.
export function resolveAutofillTopics(topics,catalog){
 return resolveSermonTopics(topics||[],catalog||[],[]).map(({key,name,reason})=>({key,name,reason}))
}

// Merge AI details into the current form, filling only blank fields. Returns the new form plus the list of filled fields.
export function mergeAutofill(form,details={},topics=[],tagText=''){
 const next={...form},filled=[]
 const set=(k,v)=>{if(blank(next[k])&&!blank(v)){next[k]=v.trim();filled.push(k)}}
 set('title',details.title)
 set('speaker',details.speaker||DEFAULT_SPEAKER)
 set('series',details.series)
 set('church',DEFAULT_CHURCH)
 set('primary_text',details.primary_text)
 set('description',details.description)
 let nextTags=tagText
 if(blank(tagText)&&topics.length){nextTags=topics.map(t=>t.name).join(', ');filled.push('tags')}
 return {form:next,tagText:nextTags,filled}
}

export const FIELD_LABELS={title:'title',speaker:'speaker',series:'series',church:'church',primary_text:'Primary Text',description:'description',tags:'topics'}
export function filledSummary(filled){
 const names=filled.map(f=>FIELD_LABELS[f]||f)
 if(!names.length)return 'Nothing to fill; every field already has a value.'
 const list=names.length>1?`${names.slice(0,-1).join(', ')} and ${names.at(-1)}`:names[0]
 return `Filled ${list} from the transcript. Review before saving.`
}

// After saving, link only the suggested topics that are still in the final tag list.
export function topicsToLink(suggested,tags){
 const norm=s=>s.trim().toLocaleLowerCase()
 const set=new Set(tags.map(norm))
 return suggested.filter(t=>set.has(norm(t.name)))
}
