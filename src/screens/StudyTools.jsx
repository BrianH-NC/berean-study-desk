import { Link, useSearchParams } from 'react-router-dom'
import StudyReview from './StudyReview'
import StudyReminders from './StudyReminders'
import StudyPackets from './StudyPackets'
import './DailyStudy.css'
import WordStudyWorkspace from './WordStudyWorkspace'
export default function StudyTools(){
 const [params]=useSearchParams(),tab=params.get('tool')||'review'
 return <div className="daily-study"><header><div><h1>Study Tools</h1><p>Remember what you learn. Make time to study. Bring it together.</p></div><Link to="/study-sessions">Study sessions →</Link></header><nav className="study-actions" aria-label="Study tools">{[['review','Review & Memorize'],['reminders','Reminders'],['packets','Study Packets'],['words','Word Study'],['variants','Textual Variants']].map(([key,label])=><Link key={key} className={`btn ${tab===key?'btn-primary':'btn-secondary'}`} aria-current={tab===key?'page':undefined} to={`/study-tools?tool=${key}`}>{label}</Link>)}</nav>{tab==='words'?<WordStudyWorkspace key="words"/>:tab==='variants'?<WordStudyWorkspace key="variants" variant/>:tab==='reminders'?<StudyReminders/>:tab==='packets'?<StudyPackets/>:<StudyReview/>}</div>
}
