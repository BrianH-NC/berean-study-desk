import ScriptureText from './ScriptureText'
import {emptyOutline,emptyPoint,isEmptyOutline} from '../lib/sermonOutline'

export function SermonOutlineView({outline,sermonId}){
 if(isEmptyOutline(outline))return <p>No outline yet. Add one from Edit, or use Fill details from transcript there.</p>
 return <div className="sermon-outline">
  {outline.big_idea&&<p className="sermon-outline-idea"><strong>Big idea</strong>{outline.big_idea}</p>}
  <ol>{outline.points.map((p,i)=><li key={i}><h3>{p.heading}</h3>{p.ref&&<div className="sermon-outline-ref"><ScriptureText text={p.ref} sermonId={sermonId}/></div>}{p.subpoints?.length>0&&<ul>{p.subpoints.map((t,j)=><li key={j}>{t}</li>)}</ul>}</li>)}</ol>
 </div>
}

export function SermonOutlineEditor({value,onChange}){
 const o=value||emptyOutline()
 const set=next=>onChange({...o,...next})
 const setPoint=(i,next)=>set({points:o.points.map((p,j)=>j===i?{...p,...next}:p)})
 const move=(i,d)=>{const pts=[...o.points];const j=i+d;if(j<0||j>=pts.length)return;[pts[i],pts[j]]=[pts[j],pts[i]];set({points:pts})}
 return <fieldset className="sermon-outline-editor"><legend>Sermon outline</legend>
  <label>Big idea<input className="input" value={o.big_idea} onChange={e=>set({big_idea:e.target.value})} placeholder="The main point the preacher states"/></label>
  {o.points.map((p,i)=><div className="sermon-outline-point" key={i}>
   <div className="sermon-outline-point-head"><strong>Point {i+1}</strong><span><button type="button" className="btn" disabled={i===0} onClick={()=>move(i,-1)} aria-label={`Move point ${i+1} up`}>↑</button><button type="button" className="btn" disabled={i===o.points.length-1} onClick={()=>move(i,1)} aria-label={`Move point ${i+1} down`}>↓</button><button type="button" className="btn" onClick={()=>set({points:o.points.filter((_,j)=>j!==i)})}>Remove</button></span></div>
   <div className="sermon-form-grid"><label>Heading<input className="input" value={p.heading} onChange={e=>setPoint(i,{heading:e.target.value})}/></label><label>Verses<input className="input" value={p.ref} placeholder="e.g. 1 Peter 2:16" onChange={e=>setPoint(i,{ref:e.target.value})}/></label></div>
   <label>Sub-points — one per line<textarea className="input" rows={3} value={(p.subpoints||[]).join('\n')} onChange={e=>setPoint(i,{subpoints:e.target.value.split('\n')})}/></label>
  </div>)}
  <button type="button" className="btn btn-secondary" onClick={()=>set({points:[...o.points,emptyPoint()]})}>Add point</button>
 </fieldset>
}
