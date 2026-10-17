import { supabase } from './supabase'
export async function listStudySessions(userId) {
  const rows=[]
  for(let offset=0;;offset+=500){
    const {data,error}=await supabase.from('study_sessions').select('*').eq('user_id',userId).order('updated_at',{ascending:false}).order('id').range(offset,offset+499)
    if(error)throw error
    rows.push(...data);if(data.length<500)return rows
  }
}
export async function getStudySession(userId,id){
  const {data,error}=await supabase.from('study_sessions').select('*').eq('user_id',userId).eq('id',id).single()
  if(error)throw error
  return data
}
export async function saveStudySession(userId,row,title,state){
  const values={title:title.trim().slice(0,200),state,updated_at:new Date().toISOString()}
  const query=row?supabase.from('study_sessions').update(values).eq('id',row.id).eq('user_id',userId).eq('updated_at',row.updated_at):supabase.from('study_sessions').insert({...values,user_id:userId})
  const {data,error}=await query.select('*').maybeSingle()
  if(error)throw error
  if(!data)throw new Error('This session changed elsewhere. Reopen it before saving; your notes are saved separately.')
  return data
}
export async function deleteStudySession(userId,id){
  const {error}=await supabase.from('study_sessions').delete().eq('user_id',userId).eq('id',id)
  if(error)throw error
}
