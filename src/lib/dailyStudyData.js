import { supabase } from './supabase'
const fieldsByTable = {
  study_review_cards:['source_key','kind','title','body','citation','due_date','stage','reviews','paused','last_reviewed_at'],
  study_reminders:['title','destination','due_local','interval_days','paused','completed','last_completed_at'],
  reading_plans:['title','kind','book_id','start_date','interval_days','items','completed','paused'],
  prayer_requests:['title','body','ref','category','answered_at','updates','source','request_date'],
  book_quotations:['book_id','quote','page','reflection','tags'],
}
export async function ownedRows(table,userId,columns='*') {
  const rows=[]
  for(let offset=0;;offset+=500){
    let query=supabase.from(table).select(columns).eq('user_id',userId).order('id').range(offset,offset+499)
    if(table==='entries')query=query.is('deleted_at',null)
    const {data,error}=await query
    if(error)throw error
    rows.push(...data);if(data.length<500)return rows
  }
}
export async function saveOwned(table,userId,row,values) {
  if(!fieldsByTable[table])throw new Error('Unsupported collection')
  const fields={...Object.fromEntries(Object.entries(values).filter(([key])=>fieldsByTable[table].includes(key))),updated_at:new Date().toISOString()}
  const query=row?supabase.from(table).update(fields).eq('id',row.id).eq('user_id',userId).eq('updated_at',row.updated_at):supabase.from(table).insert({...fields,user_id:userId})
  const {data,error}=await query.select().maybeSingle()
  if(error)throw error
  if(!data)throw new Error('This item changed on another device. Reload before saving again. Your input remains here.')
  return data
}
export async function removeOwned(table,userId,row) {
  if(!fieldsByTable[table])throw new Error('Unsupported collection')
  const {data,error}=await supabase.from(table).delete().eq('user_id',userId).eq('id',row.id).eq('updated_at',row.updated_at).select('id')
  if(error)throw error
  if(!data.length)throw new Error('This item changed elsewhere. Reload and try again.')
}
