import { supabase } from './supabase'
import { saveOwned } from './dailyStudyData'
import { prayerImportValues } from './prayerImportModel'

// Each reviewed item keeps its UUID across retries, including a lost response.
export async function savePrayerImport(userId,candidate){
  const values=prayerImportValues(candidate)
  const id=candidate.action==='update'?candidate.targetId:candidate.id
  if(!id)throw new Error('Choose the existing request to update.')
  const {data:row,error}=await supabase.from('prayer_requests').select('*').eq('user_id',userId).eq('id',id).maybeSingle()
  if(error)throw error
  if(candidate.action==='new'){
    if(row)return row
    const {data,error}=await supabase.from('prayer_requests').insert({...values,id:candidate.id,user_id:userId}).select().single()
    if(error)throw error
    return data
  }
  if(!row)throw new Error('This request is no longer available. Select another request.')
  if(row.updates.some(u=>u.import_id===candidate.id))return row
  if(row.updated_at!==candidate.targetVersion)throw new Error('The existing request changed since review. Refresh its preview before adding this update.')
  return saveOwned('prayer_requests',userId,row,{updates:[...row.updates,{date:new Date().toISOString(),text:values.body,ref:values.ref,source:values.source,request_date:values.request_date,import_id:candidate.id}]})
}
