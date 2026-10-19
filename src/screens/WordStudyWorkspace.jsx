import {useState} from 'react'
import {CANONICAL_BOOKS} from '../lib/entries'
import {strongsId} from '../lib/wordStudyData'
import {WordDetails} from '../components/WordStudyDetails'
import {Definition} from '../components/WordStudy'
import TextualVariants from '../components/TextualVariants'
import '../components/WordStudy.css'
export default function WordStudyWorkspace({variant=false}) {
 const [input,setInput]=useState('G25'),[id,setId]=useState('G25'),[error,setError]=useState('')
 const [book,setBook]=useState('John'),[chapter,setChapter]=useState('3'),[verse,setVerse]=useState('16'),[request,setRequest]=useState({book:'John',bookNumber:43,chapter:3,verse:16})
 function submit(e){e.preventDefault();try{const ch=Number(chapter),v=Number(verse);if(!Number.isInteger(ch)||ch<1||ch>150||!Number.isInteger(v)||v<1||v>176)throw new Error('Enter a valid chapter and verse.');if(!variant)setId(strongsId(input));setRequest({book,bookNumber:CANONICAL_BOOKS.indexOf(book)+1,chapter:ch,verse:v});setError('')}catch(err){setError(err.message)}}
 return <section className="study-language-workspace"><form className="card study-lookup-controls" onSubmit={submit}>{!variant&&<label>Strong’s number<input value={input} onChange={e=>setInput(e.target.value)} placeholder="G25 or H7225" required/></label>}<label>Book<select value={book} onChange={e=>setBook(e.target.value)}>{CANONICAL_BOOKS.map(b=><option key={b}>{b}</option>)}</select></label><label>Chapter<input type="number" min="1" max="150" value={chapter} onChange={e=>setChapter(e.target.value)} required/></label><label>Verse<input type="number" min="1" max="176" value={verse} onChange={e=>setVerse(e.target.value)} required/></label><button className="btn btn-primary">Look up</button></form>{error&&<p role="alert">{error}</p>}{variant?<TextualVariants key={`${request.book}/${request.chapter}/${request.verse}`} request={request} inline/>:<div className="card language-results"><h2>Word Study · {id}</h2><Definition key={id} id={id}/><WordDetails key={`${id}/${request.book}/${request.chapter}/${request.verse}`} id={id} request={request}/></div>}</section>
}
