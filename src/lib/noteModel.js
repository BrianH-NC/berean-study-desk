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
    if(node.type==='blockquote'||node.type==='scriptureQuote')return children.trim().split('\n').map(line=>'> '+line).join('\n')+'\n\n'
    if(node.type==='listItem')return '- '+children.trim()+'\n'
    if(node.type==='image')return `![${node.attrs.alt||''}](${node.attrs.src})\n\n`
    return children
  }
  return `# ${note.title || 'Untitled'}\n\n${note.ref ? note.ref+'\n\n':''}${note.rich_doc?render(note.rich_doc):note.body||''}`
}
