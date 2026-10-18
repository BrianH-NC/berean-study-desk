// Public-domain KJV/Strong's data, served by BibleEngine (CC0 format).
// https://bibleengine.org/advanced — no credentials or private content sent.
const BASE = 'https://bibleengine.org/v1'
const cache = new Map()
export const wordParts = text => String(text).split(/(\s+)/)
export const normalizeWord = text => String(text).toLowerCase().replace(/[^a-z0-9]/g, '')
export function normalizeTokens(record) {
  if (!Array.isArray(record?.w)) throw new Error('Word mappings are unavailable for this verse.')
  return record.w.filter(row=>Array.isArray(row)&&typeof row[0]==='string').map(([word,ids])=>({word,ids:Array.isArray(ids)?ids.filter(id=>/^[HG][1-9]\d{0,4}$/.test(id)):[]}))
}
export function alignedWord(tokens, text, index, translation) {
  if (translation !== 'eng_kjv') return -1
  const words=wordParts(text).filter(w=>w.trim()).map(normalizeWord).filter(Boolean)
  const mapped=tokens.map(t=>normalizeWord(t.word)).filter(Boolean)
  return words.length===mapped.length && words.every((w,i)=>w===mapped[i]) ? index : -1
}
async function json(path) {
  if (cache.has(path)) return cache.get(path)
  const response=await fetch(`${BASE}/${path}`, {signal:AbortSignal.timeout(15000),credentials:'omit',referrerPolicy:'no-referrer'})
  if (!response.ok) throw new Error('Word-study source is unavailable. Please retry.')
  const value=await response.json()
  cache.set(path,value)
  return value
}
export async function strongsVerse(bookNumber,chapter,verse) {
  if (!Number.isInteger(bookNumber)||bookNumber<1||bookNumber>66||!Number.isInteger(chapter)||chapter<1||chapter>150) throw new Error('Invalid passage.')
  const data=await json(`kjv/${String(bookNumber).padStart(2,'0')}/${String(chapter).padStart(3,'0')}.json`)
  return normalizeTokens(data[verse])
}
export async function strongsEntry(id) {
  if (!/^[HG][1-9]\d{0,4}$/.test(id)) throw new Error('Invalid Strong’s number.')
  const data=await json(`lexicon/${id[0]}/${Math.floor(Number(id.slice(1))/100)}.json`)
  if (!data[id]) throw new Error(`No dictionary entry is available for ${id}.`)
  return data[id]
}
