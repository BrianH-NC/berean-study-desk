export const SEARCH_TYPES = ['Bible','Books','Topics','Notes','Resources','Doctrine Checks']
export function matchesSearch(values, query, exact = false) {
  const text=values.flat().filter(Boolean).join(' ').toLowerCase()
  const q=query.trim().toLowerCase()
  if(!q)return false
  return exact ? text.includes(q) : q.split(/\s+/).every(word=>text.includes(word))
}
export function sortSearchResults(rows, query, sort) {
  const q=query.toLowerCase()
  const score=row=>row.title.toLowerCase()===q?3:row.title.toLowerCase().includes(q)?2:1
  return [...rows].sort((a,b)=>sort==='title'?a.title.localeCompare(b.title):sort==='recent'?(Date.parse(b.date)||0)-(Date.parse(a.date)||0):score(b)-score(a))
}
export function commentarySections(data, ref, source) {
  const blocks=data?.chapter?.content || []
  return blocks.flatMap((block,index)=>{
    if(block.type!=='verse')return []
    const start=Number(block.number)
    const next=blocks.slice(index+1).find(b=>b.type==='verse')
    const end=next?Number(next.number)-1:Infinity
    if(ref.verseStart && (start>(ref.verseEnd||ref.verseStart)||end<ref.verseStart))return []
    const text=(block.content||[]).map(s=>typeof s==='string'?s:s.text||'').join('\n\n')
    if(!text)return []
    return [{id:`resource:${source.id}:${ref.book}:${ref.chapter}:${index}`,type:'Resources',title:`${source.name} · ${ref.book} ${ref.chapter}:${start}`,text,ref:{...ref,verseStart:start,verseEnd:start},source:source.name}]
  })
}
