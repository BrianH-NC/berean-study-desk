import { Link } from 'react-router-dom'
import { Minus, ShieldCheck, ShieldAlert, ShieldQuestion } from 'lucide-react'
import { verdictClass } from '../lib/verdict'

export default function AssessmentBadge({ assessment, title, unassessedTo, state }) {
  const style = verdictClass(assessment?.verdict)
  const label = assessment ? assessment.verdict || 'Insufficient evidence' : 'Not Assessed'
  return <Link to={assessment ? `/checks/${assessment.id}` : unassessedTo} state={state}
    className={`tag assessment-badge ${verdictClass(assessment?.verdict)}`}
    aria-label={assessment ? `Open assessment for ${title}: ${label}` : `Run Doctrine Check for ${title}`}>
    {!assessment ? <Minus size={16} aria-hidden="true" /> : style === 'verdict-sound' ? <ShieldCheck size={16} aria-hidden="true" /> : ['verdict-caution','verdict-concern'].includes(style) ? <ShieldAlert size={16} aria-hidden="true" /> : <ShieldQuestion size={16} aria-hidden="true" />}{label}
  </Link>
}
