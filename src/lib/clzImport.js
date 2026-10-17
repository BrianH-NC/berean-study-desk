import { isValidISBN, normalizeISBN } from './isbn.js'

export const CLZ_FIELDS={title:'Title',author:'Author',isbn:'ISBN',publisher:'Publisher',pub_date:'Publication date',pages:'Pages',tags:'Categories / tags'}
export const isBlank=value=>value==null||(typeof value==='string'&&!value.trim())||(Array.isArray(value)&&!value.some(v=>String(v).trim()))
const normalized=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()
export function isbnKey(value){
 const isbn=normalizeISBN(value)
 if(!isValidISBN(isbn))return ''
 if(isbn.length===13)return isbn
 const stem='978'+isbn.slice(0,9)
 return stem+((10-[...stem].reduce((s,n,i)=>s+Number(n)*(i%2?3:1),0)%10)%10)
}
export function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false,closed=false
 const push=()=>{row.push(cell);cell='';closed=false}
 for(let i=0;i<text.length;i++){
  const c=text[i]
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++}else{quoted=false;closed=true}}else cell+=c;continue}
  if(c==='"'){if(cell||closed)throw Error('Invalid CSV quotation. Export again as a comma-separated CSV.');quoted=true}
  else if(c===',')push()
  else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;push();if(row.some(v=>v.trim()))rows.push(row);row=[]}
  else{if(closed&&!/\s/.test(c))throw Error('Unexpected text after a CSV quotation.');if(!closed)cell+=c}
 }
 if(quoted)throw Error('The CSV ends inside a quoted field.')
 push();if(row.some(v=>v.trim()))rows.push(row)
 if(rows.length<2)throw Error('The CSV must contain a header and at least one book.')
 const headers=rows.shift().map(h=>h.trim())
 if(new Set(headers.map(h=>h.toLowerCase())).size!==headers.length)throw Error('Duplicate CSV column headings.')
 for(const name of ['Title','Author','ISBN'])if(!headers.includes(name))throw Error(`Missing CLZ column: ${name}. Use the CLZ Books CSV export.`)
 if(rows.length>5000)throw Error('Import at most 5,000 books at a time.')
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`CSV row ${i+2} has the wrong number of columns.`);return Object.fromEntries(headers.map((h,n)=>[h,r[n].trim()]))})
}
export function mapCLZ(raw,index){
 const warnings=[];const isbn=normalizeISBN(raw.ISBN)
 if(isbn&&!isValidISBN(isbn))warnings.push('Invalid ISBN: omitted; review the title/author match.')
 const pages=/^\d+$/.test(raw.Pages||'')?Number(raw.Pages):null
 if(raw.Pages&&(!pages||pages>2147483647))warnings.push('Invalid page count: omitted.')
 // Preserve a CLZ genre label intact; commas can be part of its name.
 const tags=(raw.Genre||'').split(/[;|]/).map(v=>v.trim()).filter(Boolean)
 return {index,raw,warnings,book:{title:raw.Title,author:raw.Author||null,isbn:isValidISBN(isbn)?isbn:null,publisher:raw.Publisher||null,pub_date:raw['Publication Date']||null,pages:pages>0&&pages<=2147483647?pages:null,tags:[...new Set(tags)]}}
}
export function matchCLZ(incoming,books){
 const key=isbnKey(incoming.isbn)
 const isbnMatches=key?books.filter(b=>isbnKey(b.isbn)===key):[]
 if(isbnMatches.length)return {kind:isbnMatches.length===1?'isbn':'review',candidates:isbnMatches}
 const title=normalized(incoming.title),author=normalized(incoming.author)
 const exact=books.filter(b=>normalized(b.title)===title&&author&&normalized(b.author)===author)
 if(exact.length===1&&(!key||!isbnKey(exact[0].isbn)))return {kind:'title-author',candidates:exact}
 const candidates=books.filter(b=>title&&((normalized(b.title)===title)|| (author&&normalized(b.author)===author&&(normalized(b.title).includes(title)||title.includes(normalized(b.title))))))
 return {kind:candidates.length?'review':'new',candidates}
}
export function blankPatch(existing,incoming,fields=Object.keys(CLZ_FIELDS)){
 return Object.fromEntries(Object.keys(CLZ_FIELDS).filter(k=>fields.includes(k)&&isBlank(existing[k])&&!isBlank(incoming[k])).map(k=>[k,incoming[k]]))
}
export function planCLZ(rows,books){
 const seen=new Set()
 return rows.map((raw,index)=>{
  const item=mapCLZ(raw,index),key=isbnKey(item.book.isbn)||`${normalized(item.book.title)}|${normalized(item.book.author)}`
  const duplicate=seen.has(key);seen.add(key)
  const match=matchCLZ(item.book,books)
  return {...item,...match,duplicate,choice:!item.book.title||duplicate?'skip':['isbn','title-author'].includes(match.kind)?match.candidates[0].id:match.kind==='new'?'new':'skip'}
 })
}
