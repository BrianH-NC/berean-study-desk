// The preacher's own outline: {big_idea, points:[{heading, ref, subpoints:[]}]}.
export const emptyOutline=()=>({big_idea:'',points:[]})
export const emptyPoint=()=>({heading:'',ref:'',subpoints:[]})

export function isEmptyOutline(o){return !o||(!o.big_idea?.trim()&&!(o.points||[]).some(p=>p.heading?.trim()))}

// Trim, drop blank points and subpoints; null when nothing is left so the column stays empty.
export function cleanOutline(o){
 if(!o)return null
 const points=(o.points||[]).map(p=>({heading:(p.heading||'').trim(),ref:(p.ref||'').trim(),subpoints:(p.subpoints||[]).map(t=>(t||'').trim()).filter(Boolean)})).filter(p=>p.heading)
 const out={big_idea:(o.big_idea||'').trim(),points}
 return isEmptyOutline(out)?null:out
}

export function outlineText(o){
 if(isEmptyOutline(o))return ''
 return [o.big_idea?`Big idea: ${o.big_idea}`:'',...(o.points||[]).map((p,i)=>[`${i+1}. ${p.heading}${p.ref?` (${p.ref})`:''}`,...(p.subpoints||[]).map(t=>`   - ${t}`)].join('\n'))].filter(Boolean).join('\n')
}
