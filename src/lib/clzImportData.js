import { supabase } from './supabase'
import { blankPatch } from './clzImport'
export async function loadImportBooks(userId,client=supabase){
 const result=[]
 for(let from=0;;from+=500){const {data,error}=await client.from('books').select('*').eq('user_id',userId).order('id').range(from,from+499);if(error)throw error;result.push(...data);if(data.length<500)return result}
}
export async function fillBookBlanks(userId,id,incoming,fields,client=supabase){
 const {data:book,error}=await client.from('books').select('*').eq('user_id',userId).eq('id',id).single()
 if(error)throw error
 const patch=blankPatch(book,incoming,fields)
 if(!Object.keys(patch).length)return {book,fields:[]}
 let query=client.from('books').update(patch).eq('user_id',userId).eq('id',id)
 // Compare the values read immediately above. A concurrent edit must never be overwritten.
 for(const field of Object.keys(patch)){
  const value=book[field]
  const filterValue=Array.isArray(value)?`{${value.map(v=>'"'+String(v).replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(',')}}`:value
  query=value==null?query.is(field,null):query.eq(field,filterValue)
 }
 const result=await query.select('*').maybeSingle()
 if(result.error)throw result.error
 if(!result.data)throw Error('This book changed during import. Preview again to safely retry.')
 return {book:result.data,fields:Object.keys(patch)}
}
