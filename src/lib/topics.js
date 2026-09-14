import { supabase } from './supabase'
import { checksList } from './theologyCheck'
export async function topicRows(table,userId){
  const rows=[]
  for(let offset=0;;offset+=500){const {data,error}=await supabase.from(table).select('*').eq('user_id',userId).order(table==='topic_preferences'?'topic_key':'id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows}
}
export async function loadTopicData(userId){
  const names=['personal','links','preferences','notes','books','checks','sermons']
  const results=await Promise.allSettled(['topics','topic_links','topic_preferences','entries','books'].map(t=>topicRows(t,userId)).concat(checksList().then(r=>r.data||[]),topicRows('sermons',userId)))
  results.forEach((result,i)=>{if(result.status==='rejected')console.warn('Topics request failed',names[i],result.reason?.name,result.reason?.code,result.reason?.message)})
  return Object.fromEntries([...results.map((r,i)=>[names[i],r.status==='fulfilled'?r.value:[]]),['errors',results.flatMap((r,i)=>r.status==='rejected'?[names[i]]:[])]])
}
export async function saveTopic(userId,values,id){
  const request=id?supabase.from('topics').update({...values,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',userId):supabase.from('topics').insert({...values,user_id:userId})
  const {data,error}=await request.select().single();if(error)throw error;return data
}
export async function saveTopicLink(userId,topicKey,type,entityId,label='',resourceKind='website'){
  const {data,error}=await supabase.from('topic_links').upsert({user_id:userId,topic_key:topicKey,entity_type:type,entity_id:entityId,label,resource_kind:resourceKind},{onConflict:'user_id,topic_key,entity_type,entity_id'}).select().single();if(error)throw error;return data
}
export async function setTopicPreference(userId,key,values){const {data,error}=await supabase.from('topic_preferences').upsert({user_id:userId,topic_key:key,...values},{onConflict:'user_id,topic_key'}).select().single();if(error)throw error;return data}
export async function recordTopicView(key){const {error}=await supabase.rpc('record_topic_view',{p_topic_key:key});if(error){console.warn('Topics history failed',error.name,error.code,error.message);throw error}}
export async function deletePersonalTopic(_userId,id){const {error}=await supabase.rpc('delete_personal_topic',{p_topic_id:id});if(error)throw error}
export async function unlinkTopic(userId,id){const {error}=await supabase.from('topic_links').delete().eq('user_id',userId).eq('id',id);if(error)throw error}
