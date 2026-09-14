import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Node } from '@tiptap/core'
import { useRef, useState } from 'react'
import { uploadEntryPhoto } from '../lib/entryPhotos'
import { plainDocument, safeNoteUrl } from '../lib/noteModel'
const ScriptureQuote=Node.create({name:'scriptureQuote',group:'block',content:'block+',defining:true,parseHTML:()=>[{tag:'blockquote[data-scripture]'}],renderHTML:()=>['blockquote',{'data-scripture':'true',class:'notes-scripture'},0]})
export default function NoteRichEditor({note,onChange,userId}) {
  const upload=useRef(null), [error,setError]=useState('')
  const editor=useEditor({extensions:[StarterKit.configure({heading:{levels:[2,3]},link:{openOnClick:false}}),Image,ScriptureQuote],content:note.rich_doc || plainDocument(note.body),editorProps:{attributes:{'aria-label':'Note content',role:'textbox','aria-multiline':'true'}},onUpdate:({editor})=>onChange({rich_doc:editor.getJSON(),body:editor.getText()})})
  if(!editor)return <p>Loading editor…</p>
  const action=(label,command)=> <button type="button" key={label} title={label} aria-label={label} onClick={command}>{label}</button>
  return <><div className="notes-toolbar" role="group" aria-label="Formatting">
    <select aria-label="Paragraph style" defaultValue="paragraph" onChange={e=>e.target.value==='paragraph'?editor.chain().focus().setParagraph().run():editor.chain().focus().toggleHeading({level:Number(e.target.value)}).run()}><option value="paragraph">Paragraph</option><option value="2">Heading</option><option value="3">Subheading</option></select>
    {action('Bold',()=>editor.chain().focus().toggleBold().run())}{action('Italic',()=>editor.chain().focus().toggleItalic().run())}{action('Underline',()=>editor.chain().focus().toggleUnderline().run())}{action('Bullets',()=>editor.chain().focus().toggleBulletList().run())}{action('Numbered list',()=>editor.chain().focus().toggleOrderedList().run())}{action('Quote',()=>editor.chain().focus().toggleBlockquote().run())}{action('Scripture',()=>editor.chain().focus().toggleWrap('scriptureQuote').run())}
    {action('Link',()=>{const value=window.prompt('Link URL (https://… or /bible?…)',editor.getAttributes('link').href||'');if(value===null)return;if(!value){editor.chain().focus().unsetLink().run();return}if(safeNoteUrl(value)||(value.startsWith('/')&&!value.startsWith('//')))editor.chain().focus().setLink({href:value}).run();else setError('Use a valid web address or BSD path.')})}
    {action('Image',()=>upload.current.click())}{action('Undo',()=>editor.chain().focus().undo().run())}{action('Redo',()=>editor.chain().focus().redo().run())}
    <input ref={upload} hidden type="file" accept="image/*" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;setError('Uploading image…');try{const src=await uploadEntryPhoto(userId,file);if(!editor.isDestroyed)editor.chain().focus().setImage({src,alt:file.name}).run();setError('')}catch(err){setError(err.message)}finally{e.target.value=''}}}/>
  </div>{error&&<p role="status">{error}</p>}<EditorContent editor={editor}/></>
}
