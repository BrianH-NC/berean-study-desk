import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, BookOpen, ShieldCheck } from 'lucide-react'
import { useAuth } from '../App'
import { verdictClass, verdictIcon } from '../lib/verdict'
import { CONFESSIONS } from '../lib/theologyCheck'
import '../screens/DoctrineCheck.css'

export function DoctrineHeader({ report = false }) {
  const user = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const name = user.user_metadata?.display_name || user.user_metadata?.full_name?.split(' ')[0] || 'Reader'
  return <><div className="doctrine-topbar"><form onSubmit={e => { e.preventDefault(); if(query.trim()) navigate(`/search?type=Doctrine+Checks&q=${encodeURIComponent(query.trim())}`) }}><Search size={19}/><input aria-label="Search saved doctrine checks" placeholder="Search your assessments by book, author, or topic…" value={query} onChange={e => setQuery(e.target.value)}/><button className="btn btn-primary">Search</button></form><Link to="/settings/profile" className="doctrine-account"><span>{name.slice(0,2).toUpperCase()}</span>{name}</Link><blockquote>“Contend for the faith that was once for all entrusted to the saints.”<cite>Jude 1:3 · BSB</cite></blockquote></div><header className="doctrine-title"><h1>Doctrine Check</h1><p>Evaluate. Compare. Discern. &nbsp; All for the glory of Christ.</p></header><nav className="doctrine-tabs" aria-label="Doctrine workspace"><Link to="/checks"><BookOpen size={17}/>{report ? 'New Book / Author Check' : 'Check a Book or Author'}</Link>{report && <a href="#doctrine-comparison"><ShieldCheck size={17}/>Compare Doctrinal Standards</a>}</nav></>
}

export function CreationAssessment({ value, introduction = false }) {
  return <section className="card doctrine-creation"><h2>Creation &amp; Origins</h2><strong>{introduction ? 'Creation positions remain part of every check' : value || 'Not Addressed / Unclear'}</strong><p>This records the assessed position separately from the overall verdict.</p><details><summary>Positions considered</summary><ul><li>Young-Earth Creationist</li><li>Old-Earth Creationist</li><li>Intelligent Design</li><li>Evolution</li><li>Theistic Evolutionist</li><li>Not Addressed / Unclear</li></ul><p>Intelligent Design does not, by itself, establish an age-of-earth position. Existing assessment wording is preserved.</p></details></section>
}

export function DoctrineLegend() {
  const descriptions = [['Sound','Consistent with the assessment’s doctrinal standard.'],['Caution','Areas that call for closer consideration.'],['Concern','Significant points of doctrinal disagreement.'],['Baptism/Polity Distinctive','Differences concerning baptism or church governance.'],['Unable to Assess','Insufficient information for a confident assessment.']]
  return <aside className="doctrine-reference-rail"><section className="card"><h2>Assessment Legend</h2>{descriptions.map(([label,description])=>{const Icon=verdictIcon(label);return <div className="doctrine-legend-item" key={label}><span className={`tag ${verdictClass(label)}`}><Icon size={20}/></span><div><strong>{label}</strong><p>{description}</p></div></div>})}</section><section className="card"><h2>Doctrinal Standards</h2><p>Baptist Faith &amp; Message 2000 is the primary framework. Additional comparisons are available in each report.</p><ul>{CONFESSIONS.map(c=><li key={c.slug}>{c.name}</li>)}</ul></section><section className="card doctrine-advisory"><h2>Important Note</h2><p>Assessments are AI-assisted study aids. They can miss context or make mistakes. Examine conclusions against Scripture, seek wise counsel, and study prayerfully. Scripture is the final authority.</p></section></aside>
}
