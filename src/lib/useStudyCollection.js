import { useCallback, useEffect, useState } from 'react'
import { ownedRows, saveOwned, removeOwned } from './dailyStudyData'
export function useStudyCollection(table, userId) {
  const [rows,setRows]=useState([]), [loading,setLoading]=useState(true), [error,setError]=useState(''), [busy,setBusy]=useState(false), [revision,setRevision]=useState(0)
  const reload=useCallback(()=>setRevision(n=>n+1),[])
  useEffect(()=>{let live=true;setLoading(true);ownedRows(table,userId).then(data=>{if(live){setRows(data);setError('')}}).catch(e=>{if(live)setError(e.message)}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[table,userId,revision])
  async function save(row, values) {setBusy(true);setError('');try{const next=await saveOwned(table,userId,row,values);setRows(old=>[...old.filter(item=>item.id!==next.id),next]);return next}catch(e){setError(e.code==='23505'?'This item is already in your review deck. Reload to see it.':e.message);throw e}finally{setBusy(false)}}
  async function remove(row){setBusy(true);setError('');try{await removeOwned(table,userId,row);setRows(old=>old.filter(item=>item.id!==row.id))}catch(e){setError(e.message)}finally{setBusy(false)}}
  return {rows,loading,error,busy,reload,save,remove}
}
