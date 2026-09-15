import {supabase} from './supabase'
import {checksList} from './theologyCheck'
export function downloadJson(name,value){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
export async function exportStudyData(user){
 const tables=['books','entries','wishlist','topics','topic_links','topic_preferences','sermons','library_goals'];const data={};
 for(const table of tables){data[table]=[];for(let offset=0;;offset+=500){const {data:rows,error}=await supabase.from(table).select('*').eq('user_id',user.id).order(table==='library_goals'?'year':table==='topic_preferences'?'topic_key':'id').range(offset,offset+499);if(error)throw new Error(`Could not export ${table}. No partial export was downloaded.`);data[table].push(...rows);if(rows.length<500)break}}
 for(const [key,hidden] of [['doctrineChecks',false],['hiddenDoctrineChecks',true]]){data[key]=[];for(let offset=0;;offset+=200){const result=await checksList(hidden,offset);if(result.error||!Array.isArray(result.data))throw new Error('Could not export Doctrine Checks. No partial export was downloaded.');data[key].push(...result.data);if(result.data.length<200)break}}
 return {format:'bsd-data-export',version:1,exportedAt:new Date().toISOString(),displayName:user.user_metadata?.display_name||'',preferences:user.user_metadata?.bsd_preferences||{},data,notes:'Data records only. Uploaded files and images are not bundled. Keep originals separately. This is an archival export, not an automatic restore file.'}
}
