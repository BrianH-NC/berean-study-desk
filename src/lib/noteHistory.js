import { supabase } from './supabase'
import { revisionFields } from './noteHistoryModel'

export async function listRevisions(id, offset = 0) {
  const {data,error} = await supabase.from('entry_revisions').select('*').eq('entry_id',id).order('saved_at',{ascending:false}).order('id').range(offset,offset+29)
  if(error)throw error
  return data || []
}
export async function restoreRevision(note, revision) {
  let query=supabase.from('entries').update({...revisionFields(revision.snapshot),updated_at:new Date().toISOString()}).eq('id',note.id).is('deleted_at',null)
  query=note.updated_at?query.eq('updated_at',note.updated_at):query.is('updated_at',null)
  const {data,error}=await query.select('*').maybeSingle()
  if(error)throw error
  if(!data)throw new Error('This note changed elsewhere or was moved to Trash. Reload before restoring.')
  return data
}
export async function listTrash(userId) {
  const rows=[]
  for(let offset=0;;offset+=500){
    const {data,error}=await supabase.from('entries').select('*').eq('user_id',userId).not('deleted_at','is',null).order('deleted_at',{ascending:false}).order('id').range(offset,offset+499)
    if(error)throw error
    rows.push(...data);if(data.length<500)return rows
  }
}
export async function restoreTrashedNote(id) {
  const {data,error}=await supabase.from('entries').update({deleted_at:null,updated_at:new Date().toISOString()}).eq('id',id).select('*').single()
  if(error)throw error
  return data
}
