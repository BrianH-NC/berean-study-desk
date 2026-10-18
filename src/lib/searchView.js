export function readSearchView(key) {
  try {
    const value=JSON.parse(sessionStorage.getItem(key)||'null')
    if(!value || Date.now()-value.savedAt>86400000)return {}
    return {selectedId:typeof value.selectedId==='string'?value.selectedId:null,visible:Math.max(30,Math.min(3000,Number(value.visible)||30)),bibleLimit:Math.max(60,Math.min(3000,Number(value.bibleLimit)||60)),scroll:Math.max(0,Math.min(1000000,Number(value.scroll)||0)),previewOpen:!!value.previewOpen}
  } catch { return {} }
}
export function saveSearchView(key,value) {
  try { sessionStorage.setItem(key,JSON.stringify({...value,savedAt:Date.now()})) } catch { /* Search remains usable when tab storage is unavailable. */ }
}
export function searchMatches(text,query) {
  const content=String(text||''),terms=[...new Set(query.trim().split(/\s+/).filter(Boolean))].sort((a,b)=>b.length-a.length)
  if(!terms.length)return [{text:content,match:false}]
  const escaped=terms.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))
  return content.split(new RegExp(`(${escaped.join('|')})`,'gi')).filter(Boolean).map(part=>({text:part,match:terms.some(t=>t.toLowerCase()===part.toLowerCase())}))
}
