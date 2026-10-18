export const MAX_PRAYER_TEXT = 100000
export function splitPrayerText(text, mode='paragraphs') {
  if(text.length>MAX_PRAYER_TEXT)throw new Error('Use up to 100,000 characters per import.')
  const normalized=text.replace(/\r\n?/g,'\n').trim()
  const parts=mode==='single'?[normalized]:mode==='lines'?normalized.split('\n'):normalized.split(/\n\s*\n|\n(?=\s*(?:[•*-]|\d+[.)])\s+)/)
  const result=parts.map(s=>s.replace(/^\s*(?:[•*-]|\d+[.)])\s+/,'').trim()).filter(Boolean)
  if(result.length>100)throw new Error('Import up to 100 requests at a time, or choose a different splitting option.')
  if(result.some(s=>s.length>20000))throw new Error('One request exceeds 20,000 characters. Split it into smaller requests.')
  return result.map(body=>({title:body.split('\n')[0].slice(0,100),body}))
}
export function normalizePrayer(text){return String(text||'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}
export function prayerMatches(candidate,rows){
  const title=normalizePrayer(candidate.title),body=normalizePrayer(candidate.body)
  const words=new Set(`${title} ${body}`.split(' ').filter(w=>w.length>3))
  return rows.map(row=>{
    const other=normalizePrayer(row.body),otherTitle=normalizePrayer(row.title)
    const exact=!!body&&(body===other||(row.updates||[]).some(u=>normalizePrayer(u.text)===body))
    const tokens=new Set(`${otherTitle} ${other}`.split(' ').filter(w=>w.length>3))
    const common=[...words].filter(w=>tokens.has(w)).length
    const score=exact?1:title&&title===otherTitle?0.95:common/Math.max(words.size,tokens.size,1)
    return {row,exact,score}
  }).filter(m=>m.exact||m.score>=0.35).sort((a,b)=>b.score-a.score).slice(0,5)
}
export function prayerImportValues(candidate) {
  if(!candidate.title.trim()||candidate.title.trim().length>200)throw new Error('Each request needs a title of 1–200 characters.')
  if(!candidate.body.trim()||candidate.body.length>20000)throw new Error('Each request needs text of 1–20,000 characters.')
  if(candidate.source.length>100)throw new Error('Keep the source under 100 characters.')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(candidate.request_date)||Number.isNaN(Date.parse(candidate.request_date))||new Date(candidate.request_date).toISOString().slice(0,10)!==candidate.request_date)throw new Error('Choose a valid request date.')
  return {title:candidate.title.trim(),body:candidate.body.trim(),ref:candidate.ref.trim(),source:candidate.source.trim(),request_date:candidate.request_date,category:'shared'}
}
