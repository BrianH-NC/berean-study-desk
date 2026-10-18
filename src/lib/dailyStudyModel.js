export function overlaps(a, b) {
  if (!a || !b || a.book !== b.book || Number(a.chapter) !== Number(b.chapter)) return false
  const start = p => Number(p.verseStart || p.start) || 1
  const end = p => Number(p.verseEnd || p.end || p.verseStart || p.start) || Infinity
  return start(a) <= end(b) && start(b) <= end(a)
}
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
}
export function addDays(day, count) {
  const date = new Date(`${day}T12:00:00`)
  date.setDate(date.getDate()+count)
  return localDay(date)
}
export function planQueue(plans, today = localDay()) {
  return plans.filter(p=>!p.paused).flatMap(p=>(p.items||[]).map((item,index)=>({plan:p,item,index,date:addDays(p.start_date,index*p.interval_days)})))
    .filter(row=>!row.plan.completed?.[row.index] && row.date<=today).sort((a,b)=>a.date.localeCompare(b.date))
}
export function pageAssignments(first, last, perDay) {
  if (![first,last,perDay].every(Number.isInteger) || first<1 || last<first || perDay<1 || last>100000) throw new Error('Enter valid page numbers and pages per reading.')
  const items=[]
  for(let start=first;start<=last;start+=perDay)items.push({label:`Pages ${start}–${Math.min(last,start+perDay-1)}`,start,end:Math.min(last,start+perDay-1)})
  if(items.length>1500)throw new Error('Use at most 1,500 readings per plan.')
  return items
}
