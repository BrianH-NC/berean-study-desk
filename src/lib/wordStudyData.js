const cache = new Map()
export async function studyJson(url) {
  if (!cache.has(url)) cache.set(url, fetch(url, {credentials:url.startsWith('/')?'same-origin':'omit',signal:AbortSignal.timeout(20000)}).then(async r=>{
    if (!r.ok) throw new Error('Study source could not load. Please retry.')
    return r.json()
  }).catch(e=>{cache.delete(url);throw e}))
  return cache.get(url)
}
export function strongsId(value) {
  const match=String(value).trim().toUpperCase().match(/^([GH])0*([1-9]\d{0,4})$/)
  if (!match) throw new Error('Enter a Strong’s number such as G25 or H7225.')
  return match[1]+match[2]
}
export function unpackVerse(id) { return {bookNumber:Math.floor(id/1000000),chapter:Math.floor(id/1000)%1000,verse:id%1000} }
export async function occurrences(value) {
  const id=strongsId(value)
  const data=await studyJson(`https://bibleengine.org/v1/index/strongs/${id[0]}/${Math.floor(Number(id.slice(1))/1000)}.json`)
  return [...new Set(data[id]||[])].sort((a,b)=>a-b).map(unpackVerse)
}
export async function stepEntry(value) {
  const id=strongsId(value)
  return (await studyJson(`/data/word-study/lexicon/${id[0]}/${Math.floor(Number(id.slice(1))/100)}.json`))[id]||[]
}
export async function grammar(bookNumber,chapter,verse,id) {
  const [data,codes]=await Promise.all([studyJson(`/data/word-study/grammar/${bookNumber}/${chapter}.json`),studyJson('/data/word-study/morphology.json')])
  return (data[verse]||[]).filter(row=>row.ids.includes(id)).map(row=>({...row,meanings:row.codes.map(code=>({code,...codes[code]}))}))
}
export async function variants(bookNumber,chapter) {
  if (bookNumber<40) return null
  const chapters=await studyJson(`/data/word-study/variants/${bookNumber}/index.json`)
  return chapters.includes(String(chapter))?studyJson(`/data/word-study/variants/${bookNumber}/${chapter}.json`):{}
}
// Preserve the source apparatus; split only its explicit reading separator.
export function apparatusReadings(note) {
  const parts=note.replace(/^(?:\d+:)?\d+\s+|^•\s*/u,'').trim().split(/\s*]\s*/)
  return parts.length===2?[parts[0],...parts[1].split(/;\s*/)]:[note]
}
export function changedWords(text,base) {
  const words=new Set(base.split(/\s+/))
  return text.split(/(\s+)/).map(word=>({word,changed:!!word.trim()&&!words.has(word)}))
}
