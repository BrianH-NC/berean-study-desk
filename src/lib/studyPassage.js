import { parseReference, fetchChapter, formatReference } from './bsb'
export async function studyPassage(input) {
  const ref=parseReference(input.replace(/[–—]/g,'-'))
  if(!ref || ref.chapter<1 || (ref.verseStart!==null && (ref.verseStart<1||ref.verseEnd<ref.verseStart)))throw new Error('Enter a passage such as Romans 8:28–30 (use a hyphen for ranges).')
  const chapter=await fetchChapter(ref.book,ref.chapter)
  const verses=chapter.filter(v=>ref.verseStart===null||(v.verse>=ref.verseStart&&v.verse<=ref.verseEnd))
  if(!verses.length || (ref.verseEnd && !verses.some(v=>v.verse===ref.verseEnd)))throw new Error('That passage could not be found. Check its chapter and verses.')
  const title=formatReference(ref.book,ref.chapter,ref.verseStart,ref.verseEnd)
  return {id:`verse:${title}`,title,body:verses.map(v=>`${v.verse} ${v.text}`).join('\n'),citation:`${title} · Berean Standard Bible (BSB)`}
}
