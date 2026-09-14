import {supabase} from './supabase'
import {authHeaders} from './functionAuth'
import {findReferences} from './scriptureTagger'
import {uniqueSermonRefs} from './sermonModel'
export async function listSermons(userId){const rows=[];for(let offset=0;;offset+=200){const {data,error}=await supabase.from('sermons').select('*').eq('user_id',userId).order('id').range(offset,offset+199);if(error)throw error;rows.push(...data);if(data.length<200)return rows}}
export async function getSermon(userId,id){const {data,error}=await supabase.from('sermons').select('*').eq('user_id',userId).eq('id',id).single();if(error)throw error;return data}
export async function saveSermon(userId,id,values){const {data,error}=await supabase.from('sermons').upsert({...values,id,user_id:userId}).select().single();if(error)throw error;window.dispatchEvent(new Event('sermons-changed'));return data}
export function transcriptFields(text,cues=[]){return {transcript_text:text,transcript_cues:cues,detected_refs:uniqueSermonRefs(findReferences(text)),refs_extracted_at:new Date().toISOString(),transcript_imported_at:new Date().toISOString()}}
export async function updateSermon(userId,id,values){const {data,error}=await supabase.from('sermons').update(values).eq('user_id',userId).eq('id',id).select().single();if(error)throw error;window.dispatchEvent(new Event('sermons-changed'));return data}
export async function uploadTranscript(userId,id,file){const path=`${userId}/${id}/${crypto.randomUUID()}.${file.name.split('.').pop().toLowerCase()}`;const {error}=await supabase.storage.from('sermon-transcripts').upload(path,file);if(error)throw error;return path}
export async function removeTranscript(path){if(!path)return;const {error}=await supabase.storage.from('sermon-transcripts').remove([path]);if(error)throw error}
export async function downloadTranscript(path){const {data,error}=await supabase.storage.from('sermon-transcripts').createSignedUrl(path,60,{download:true});if(error)throw error;window.location.assign(data.signedUrl)}
export async function deleteSermon(userId,row){if(row.transcript_path)await removeTranscript(row.transcript_path);const {error}=await supabase.from('sermons').delete().eq('user_id',userId).eq('id',row.id);if(error)throw error;window.dispatchEvent(new Event('sermons-changed'))}
export async function generateStudyGuide(id){const response=await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sermon-study-guide`,{method:'POST',headers:await authHeaders(),body:JSON.stringify({sermonId:id}),signal:AbortSignal.timeout(180000)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Study guide generation failed.');return result}
