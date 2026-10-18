import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { ownedRows } from '../lib/dailyStudyData'
import { planQueue } from '../lib/dailyStudyModel'
export default function DailyQueue(){
  const user=useAuth(),[plans,setPlans]=useState(null),[error,setError]=useState(false)
  useEffect(()=>{let active=true;ownedRows('reading_plans',user.id).then(rows=>{if(active)setPlans(rows)}).catch(()=>{if(active)setError(true)});return()=>{active=false}},[user.id])
  const queue=plans?planQueue(plans):[]
  return <section className="card daily-queue"><div className="desk-panel-title"><h2>Today’s study queue</h2><Link to="/reading-plans">Open plans →</Link></div>{error?<p>Your queue could not load. <Link to="/reading-plans">Open Reading Plans to retry.</Link></p>:plans===null?<p>Loading readings…</p>:queue.length?<><p>{queue.length} reading{queue.length===1?'':'s'} waiting for you.</p>{queue.slice(0,3).map(r=><Link className="desk-activity-row" key={`${r.plan.id}:${r.index}`} to="/reading-plans"><span><strong>{r.item.label}</strong><small>{r.plan.title}</small></span></Link>)}</>:<p>{plans.length?"No readings due today.":"No reading plans yet."} <Link to="/reading-plans">Create or browse a reading plan.</Link></p>}</section>
}
