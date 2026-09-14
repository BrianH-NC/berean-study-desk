export const NOTE_TYPES = {scripture:'Scripture',book:'Books',doctrine_check:'Doctrine Check',bible_study:'Bible Study',resource:'Resource',standalone:'Stand-Alone'}
export function noteType(note) { return note.note_type || (note.shelf_book_id ? 'book' : note.ref ? 'scripture' : 'standalone') }
export function plainDocument(text) {return {type:'doc',content:(text || '').split('\n').map(line=>({type:'paragraph',...(line?{content:[{type:'text',text:line}]}:{})}))}}
export function safeNoteUrl(value) {try {const url=new URL(value);return ['https:','http:'].includes(url.protocol)?url.href:null}catch{return null}}
export function noteMarkdown(note) {
  function render(node) {
    const children=(node.content||[]).map(render).join('')
    if(node.type==='text') return (node.marks||[]).reduce((text,mark)=>mark.type==='bold'?`**${text}**`:mark.type==='italic'?`*${text}*`:mark.type==='link'?`[${text}](${mark.attrs.href})`:text,node.text||'')
    if(node.type==='heading')return '#'.repeat(node.attrs.level)+' '+children+'\n\n'
    if(node.type==='paragraph')return children+'\n\n'
    if(node.type==='blockquote'||node.type==='scriptureQuote')return (children.trim()+(node.attrs?.reference?'\n\n'+node.attrs.reference:'')).split('\n').map(line=>'> '+line).join('\n')+'\n\n'
    if(node.type==='orderedList')return (node.content||[]).map((child,i)=>`${(node.attrs?.start||1)+i}. ${(child.content||[]).map(render).join('').trim()}\n`).join('')+'\n'
    if(node.type==='listItem')return '- '+children.trim()+'\n'
    if(node.type==='image')return `![${node.attrs.alt||''}](${node.attrs.src})\n\n`
    return children
  }
  return `# ${note.title || 'Untitled'}\n\n${note.ref ? note.ref+'\n\n':''}${note.rich_doc?render(note.rich_doc):note.body||''}`
}

export function exportNote(note) {
  const url=URL.createObjectURL(new Blob([noteMarkdown(note)],{type:'text/markdown;charset=utf-8'}))
  const a=document.createElement('a');a.href=url;a.download=`${(note.title||'note').replace(/[^a-z0-9 -]/gi,'').slice(0,80)||'note'}.md`;a.click();URL.revokeObjectURL(url)
}

// Shared relationships are suggestions, never links silently written to the note.
export function relatedNotes(note, notes, parse) {
  const passage=parse((note.ref||'').replace(/[–—]/g,'-'))
  return notes.filter(n=>n.id!==note.id).map(n=>{
    const reasons=[]
    const other=parse((n.ref||'').replace(/[–—]/g,'-'))
    if(passage&&other&&passage.book===other.book&&passage.chapter===other.chapter)reasons.push('Same Bible chapter')
    for(const [field,label] of [['shelf_book_id','Same book'],['doctrine_check_id','Same assessment'],['resource_url','Same resource']])if(note[field]&&note[field]===n[field])reasons.push(label)
    const tags=(n.tags||[]).filter(t=>(note.tags||[]).some(x=>x.toLowerCase()===t.toLowerCase()))
    if(tags.length)reasons.push(`Shared tags: ${tags.join(', ')}`)
    return {...n,reasons}
  }).filter(n=>n.reasons.length).sort((a,b)=>b.reasons.length-a.reasons.length)
}
