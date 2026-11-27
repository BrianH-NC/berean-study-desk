// Primary Text can span chapters, e.g. "1 Peter 1:22-2:3". The stored primary_ref keeps the
// single-chapter shape older code expects ({book, chapter, verseStart, verseEnd}) and adds
// chapterEnd when the range crosses into a later chapter; verseEnd then belongs to chapterEnd.
const END_OF_CHAPTER=200

// Parse with the app's single-chapter parser, extended for cross-chapter ranges.
export function parsePrimaryText(text,parseReference){
 const clean=(text||'').trim().replace(/[–—]/g,'-')
 if(!clean)return null
 const m=clean.match(/^(.*?\d+)\s*:\s*(\d+)\s*-\s*(\d+)\s*:\s*(\d+)$/)
 if(!m)return parseReference(clean)
 const head=parseReference(`${m[1]}:${m[2]}`)
 if(!head)return null
 const chapterEnd=Number(m[3]),verseEnd=Number(m[4])
 if(chapterEnd===head.chapter)return verseEnd>=head.verseStart?{...head,verseEnd}:null
 if(chapterEnd<head.chapter||verseEnd<1)return null
 return {...head,chapterEnd,verseEnd}
}

// One single-chapter ref per chapter covered, so overlap checks written for one chapter keep working.
export function primaryRefSegments(ref){
 if(!ref)return []
 if(!ref.chapterEnd||ref.chapterEnd<=ref.chapter)return [ref]
 const out=[]
 for(let c=ref.chapter;c<=ref.chapterEnd;c++){
  out.push({book:ref.book,chapter:c,verseStart:c===ref.chapter?ref.verseStart||1:1,verseEnd:c===ref.chapterEnd?ref.verseEnd:END_OF_CHAPTER})
 }
 return out
}

export function primaryRefLabel(ref){
 if(!ref?.book)return ''
 if(ref.chapterEnd&&ref.chapterEnd>ref.chapter)return `${ref.book} ${ref.chapter}:${ref.verseStart||1}–${ref.chapterEnd}:${ref.verseEnd}`
 const verses=ref.verseStart?`:${ref.verseStart}${ref.verseEnd&&ref.verseEnd!==ref.verseStart?`–${ref.verseEnd}`:''}`:''
 return `${ref.book}${ref.chapter?` ${ref.chapter}${verses}`:''}`
}
