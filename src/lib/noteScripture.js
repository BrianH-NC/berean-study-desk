export function scriptureDocument(reference,verses) {
  return [{type:'scriptureQuote',attrs:{reference:`${reference} · BSB`},content:verses.map(v=>({type:'paragraph',content:[{type:'text',text:`${v.verse} ${v.text}`}]}))},{type:'paragraph'}]
}
export function scriptureUrl(p) {
  return `/bible?${new URLSearchParams({book:p.book,chapter:String(p.chapter),...(p.verseStart?{verse:String(p.verseStart),verseEnd:String(p.verseEnd||p.verseStart)}:{})})}`
}
