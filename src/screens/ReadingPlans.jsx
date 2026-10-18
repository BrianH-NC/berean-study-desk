import { READING_PRESETS, readingPlanStatus } from '../lib/readingPresets'
import { useFormRecovery } from '../lib/useFormRecovery'
import QuotationBookPicker from '../components/QuotationBookPicker'
import CreatePanel from '../components/CreatePanel'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import { ownedRows, saveOwned, removeOwned } from '../lib/dailyStudyData'
import { localDay, addDays, planQueue, pageAssignments } from '../lib/dailyStudyModel'
import { CANONICAL_BOOKS } from '../lib/entries'
import { parseReference, fetchChapterCount, fetchChapter, formatReference } from '../lib/bsb'
import { scriptureUrl } from '../lib/noteScripture'
import './DailyStudy.css'

export default function ReadingPlans() {
  const user=useAuth(),[plans,setPlans]=useState([]),[books,setBooks]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false)
  const [preset,setPreset]=useState('john')
  const [kind,setKind]=useState('bible'),[title,setTitle]=useState(''),[start,setStart]=useState(localDay()),[interval,setInterval]=useState(1),[bookId,setBookId]=useState(''),[bibleBook,setBibleBook]=useState('John'),[readings,setReadings]=useState(''),[first,setFirst]=useState(1),[last,setLast]=useState(100),[perDay,setPerDay]=useState(10),[edit,setEdit]=useState(null)
  useEffect(()=>{let active=true;setLoading(true);Promise.all([ownedRows('reading_plans',user.id),ownedRows('books',user.id)]).then(([p,b])=>{if(active){setPlans(p);setBooks(b.sort((a,b)=>a.title.localeCompare(b.title)));setError('')}}).catch(e=>{if(active)setError(e.message)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[user.id,retry])
  const recovery=useFormRecovery(`${user.id}:reading-plan`,{kind,title,start,interval,bookId,bibleBook,readings,first,last,perDay,editId:edit?.id},saved=>{setKind(saved.kind||'bible');setTitle(saved.title||'');setStart(saved.start||localDay());setInterval(saved.interval||1);setBookId(saved.bookId||'');setBibleBook(saved.bibleBook||'John');setReadings(saved.readings||'');setFirst(saved.first||1);setLast(saved.last||100);setPerDay(saved.perDay||10);setEdit(plans.find(p=>p.id===saved.editId)||null)},!loading)
  function replace(row){setPlans(rows=>[...rows.filter(p=>p.id!==row.id),row])}
  async function change(row,fields){if(busy)return;setBusy(true);try{replace(await saveOwned('reading_plans',user.id,row,fields));setError('')}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function chapters(){setBusy(true);try{const n=await fetchChapterCount(bibleBook);if(!n)throw new Error('Could not load chapters.');setReadings(Array.from({length:n},(_,i)=>`${bibleBook} ${i+1}`).join('\n'));if(!title)setTitle(`Read ${bibleBook}`)}catch(e){setError(e.message)}finally{setBusy(false)}}
  function reset(){setEdit(null);setTitle('');setReadings('');setBookId('')}
  async function save(event){event.preventDefault();setBusy(true);setError('');try{
    let items
    if(!edit){
      if(kind==='book'){if(!books.some(b=>b.id===bookId))throw new Error('Choose a book from your library.');items=pageAssignments(Number(first),Number(last),Number(perDay))}
      else {
        const lines=readings.split('\n').map(s=>s.trim()).filter(Boolean)
        if(!lines.length||lines.length>1500)throw new Error('Enter 1–1,500 readings, one passage per line.')
        items=[];const counts=new Map(),chapters=new Map()
        for(const line of lines){const p=parseReference(line.replace(/[–—]/g,'-'));if(!p||p.chapter<1||p.verseStart===0||p.verseEnd<p.verseStart)throw new Error(`Check this passage: ${line}`)
          if(!counts.has(p.book))counts.set(p.book,await fetchChapterCount(p.book))
          if(p.chapter>counts.get(p.book))throw new Error(`Chapter does not exist: ${line}`)
          if(p.verseStart){const key=`${p.book}:${p.chapter}`;if(!chapters.has(key))chapters.set(key,await fetchChapter(p.book,p.chapter));const verses=chapters.get(key);if(!verses.some(v=>v.verse===p.verseStart)||!verses.some(v=>v.verse===p.verseEnd))throw new Error(`Verse does not exist: ${line}`)}
          items.push({...p,label:formatReference(p.book,p.chapter,p.verseStart,p.verseEnd)})
        }
      }
    }
    replace(await saveOwned('reading_plans',user.id,edit,{title:title.trim(),start_date:start,interval_days:Number(interval),...(!edit?{kind,book_id:kind==='book'?bookId:null,items}: {})}));reset()
  }catch(e){setError(e.message)}finally{setBusy(false)}}
  async function remove(row){if(!confirm(`Delete “${row.title}” and its reading checklist? Your books and notes remain.`))return;setBusy(true);try{await removeOwned('reading_plans',user.id,row);setPlans(rows=>rows.filter(p=>p.id!==row.id));if(edit?.id===row.id)reset()}catch(e){setError(e.message)}finally{setBusy(false)}}
  function toggle(plan,index){const completed={...plan.completed};if(completed[index])delete completed[index];else completed[index]=new Date().toISOString();void change(plan,{completed})}
  function destination(plan,item){return plan.kind==='bible'?scriptureUrl(item):plan.book_id?`/reading/${plan.book_id}`:null}
  const queue=planQueue(plans)
  return <div className="daily-study"><header><div><h1>Reading Plans</h1><p>Make room for daily study. Missed readings stay in your queue.</p></div><Link to="/reading">Reading now →</Link></header>
    {error&&<p role="alert">{error} <button onClick={()=>setRetry(n=>n+1)}>Reload</button></p>}
    <p className="draft-hint">Unfinished edits are kept in this browser tab.</p>{recovery.error&&<p role="alert">{recovery.error}</p>}<div className="study-columns task-first"><CreatePanel title="+ New reading plan" editing={!!edit}><form className="card study-form" onSubmit={save}><h2>{edit?'Edit schedule':'Create a plan'}</h2><fieldset disabled={busy||loading} className="study-form">
      <label>Plan name<input className="input" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
      {!edit&&<><label>Reading type<select className="input" value={kind} onChange={e=>setKind(e.target.value)}><option value="bible">Bible</option><option value="book">Library book</option></select></label>
      {kind==='bible'?<><label>Start with a reading plan<select className="input" value={preset} onChange={e=>setPreset(e.target.value)}>{READING_PRESETS.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label><button type="button" className="btn btn-secondary" onClick={()=>{const p=READING_PRESETS.find(p=>p.id===preset);if(readings.trim()&&!confirm('Replace the readings in this unsaved draft with this preset?'))return;setReadings(p.readings.join('\n'));setTitle(p.title);setBibleBook(p.book)}}>Use this plan</button><p className="muted">Presets fill an editable draft. Nothing is saved until you create the plan.</p><label>Bible book<select className="input" value={bibleBook} onChange={e=>setBibleBook(e.target.value)}>{CANONICAL_BOOKS.map(b=><option key={b}>{b}</option>)}</select></label><button type="button" className="btn btn-secondary" onClick={chapters}>Fill with one chapter per reading</button><label>Readings — one passage per line<textarea className="input" required value={readings} onChange={e=>setReadings(e.target.value)} placeholder={'John 1\nJohn 2:1-12\nPsalm 23'}/></label></>:<><QuotationBookPicker books={books} value={bookId} required onChange={id=>{setBookId(id);const b=books.find(b=>b.id===id);if(b?.pages)setLast(b.pages);if(b&&!title)setTitle(`Read ${b.title}`)}}/><label>First page<input className="input" type="number" min="1" required value={first} onChange={e=>setFirst(e.target.value)}/></label><label>Last page<input className="input" type="number" min={first} max="100000" required value={last} onChange={e=>setLast(e.target.value)}/></label><label>Pages per reading<input className="input" type="number" min="1" required value={perDay} onChange={e=>setPerDay(e.target.value)}/></label></>}</>}
      <label>Start date<input className="input" type="date" required value={start} onChange={e=>setStart(e.target.value)}/></label><label>Schedule<select className="input" value={[1,2,7].includes(Number(interval))?interval:"custom"} onChange={e=>setInterval(e.target.value==="custom"?3:Number(e.target.value))}><option value="1">Every day</option><option value="2">Every other day</option><option value="7">Weekly</option><option value="custom">Custom interval</option></select></label><details><summary>Adjust the interval</summary><label>Days between readings<input className="input" type="number" required min="1" max="365" value={interval} onChange={e=>setInterval(e.target.value)}/></label></details><button className="btn btn-primary">{busy?'Saving…':edit?'Save schedule':'Create plan'}</button>{edit&&<button type="button" className="btn btn-secondary" onClick={reset}>Cancel</button>}</fieldset></form></CreatePanel>
      <section><div className="card"><h2>Today’s study queue</h2>{loading?<p role="status">Loading plans…</p>:queue.length?queue.map(({plan,item,index,date})=><div className="study-row" key={`${plan.id}:${index}`}><div><strong>{item.label}</strong><small>{plan.title} · {date<localDay()?`Waiting since ${date}`:'Today'}</small>{destination(plan,item)&&<Link to={destination(plan,item)}>Open reading →</Link>}</div><button className="btn btn-secondary" disabled={busy} onClick={()=>toggle(plan,index)}>Mark complete</button></div>):<p>No readings due. Create a plan or continue with an upcoming reading below.</p>}</div>
      {plans.map(plan=><section className="card" key={plan.id}><h2>{plan.title}</h2><p>{Object.keys(plan.completed).length} / {plan.items.length} completed · {readingPlanStatus(plan,localDay())}</p><progress aria-label={`${plan.title} progress`} value={Object.keys(plan.completed).length} max={plan.items.length}/><div className="study-actions"><button disabled={busy} onClick={()=>change(plan,{paused:!plan.paused})}>{plan.paused?'Resume':'Pause'}</button><button disabled={busy} onClick={()=>{setEdit(plan);setTitle(plan.title);setStart(plan.start_date);setInterval(plan.interval_days)}}>Edit schedule</button><button disabled={busy} onClick={()=>remove(plan)}>Delete plan</button></div><details><summary>All readings · review or undo completion</summary>{plan.items.map((item,index)=><div className="study-row" key={index}><div>{destination(plan,item)?<Link to={destination(plan,item)}>{item.label}</Link>:item.label}<small>{addDays(plan.start_date,index*plan.interval_days)}</small></div><button className="btn btn-ghost" disabled={busy} aria-pressed={!!plan.completed[index]} onClick={()=>toggle(plan,index)}>{plan.completed[index]?'Completed · undo':'Mark complete'}</button></div>)}</details></section>)}</section></div></div>
}
