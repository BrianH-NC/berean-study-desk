import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ownedRows } from '../lib/dailyStudyData'
import { localMinute } from '../lib/studyToolsModel'
export default function StudyReminderBanner({userId}) {
 const [rows,setRows]=useState([]),[now,setNow]=useState(localMinute),[failed,setFailed]=useState(false)
 useEffect(()=>{let live=true;const load=()=>ownedRows('study_reminders',userId).then(data=>{if(live){setRows(data);setFailed(false)}}).catch(()=>{if(live)setFailed(true)});load();const tick=()=>{setNow(localMinute());load()};const timer=setInterval(tick,60000);window.addEventListener('study-reminders-changed',load);window.addEventListener('focus',tick);return()=>{live=false;clearInterval(timer);window.removeEventListener('study-reminders-changed',load);window.removeEventListener('focus',tick)}},[userId])
 const due=rows.filter(r=>!r.paused&&!r.completed&&r.due_local.slice(0,16)<=now)
 return failed?<div className="study-reminder-banner"><Link to="/study-tools?tool=reminders">Reminders couldn’t load. Open reminders to retry.</Link></div>:due.length?<aside className="study-reminder-banner" aria-label="Study reminders"><strong>{due.length===1?due[0].title:`${due.length} study reminders are due`}</strong> <Link to="/study-tools?tool=reminders">View reminders →</Link></aside>:null
}
