import {Link} from 'react-router-dom'
import {BookOpen,LibraryBig,NotebookPen,ShieldCheck,Mic,Search} from 'lucide-react'
import Logo,{BrandLockup} from '../components/Logo'
import './About.css'

const features=[
 [BookOpen,'Read and compare Scripture','Read the Bible, compare translations side by side, and explore available commentaries and cross-references.'],
 [LibraryBig,'Build your personal library','Organize your books with tags and collections, track reading progress, and keep a wishlist.'],
 [NotebookPen,'Capture and connect your notes','Write rich-text study notes, link them to Scripture and other study materials, and explore biblical and theological topics.'],
 [ShieldCheck,'Consider theological assessments','Request AI-assisted Doctrine Checks on books and people, review topic-by-topic findings, and compare supported doctrinal standards.'],
 [Mic,'Study sermons','Save sermon information and links, import transcripts, explore detected Scripture references, and generate study guides with suggested topics.'],
 [Search,'Bring your research together','Search Scripture and your saved study content, explore commentary resources, and discover related books.'],
]

export default function About(){
 return <div className="about-page">
  <a href="#about-content" className="skip-link">Skip to main content</a>
  <header className="about-header"><Link to="/about" className="about-brand" aria-label="Berean Study Desk"><Logo transparent size={52}/><BrandLockup/></Link><Link to="/" className="btn btn-secondary">Sign In</Link></header>
  <main id="about-content" tabIndex={-1}>
   <section className="about-hero" aria-labelledby="about-title"><div className="about-intro"><p className="about-eyebrow">Search. Study. Discern.</p><h1 id="about-title">Berean Study Desk</h1><p className="about-lead">A personal Bible study and theological research workspace.</p><p>Bring study tools, resources, notes, and research together in one place—so you can spend more time understanding Scripture and applying it to life.</p><Link className="btn btn-primary" to="/">Open Berean Study Desk</Link><p className="about-signin-note">Sign in with your Google account to open your study workspace.</p></div><div className="about-scene"><blockquote className="scripture-text">“They received the word with all eagerness, examining the Scriptures daily to see if these things were so.”<cite>— Acts 17:11</cite></blockquote></div></section>
   <section className="about-features" aria-labelledby="about-tools"><p className="about-eyebrow">Your study, connected</p><h2 id="about-tools">A place for careful study</h2><div className="about-feature-grid">{features.map(([Icon,title,copy])=><article className="card" key={title}><Icon aria-hidden="true" size={28}/><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
   <section className="about-ai card" aria-labelledby="about-ai-title"><ShieldCheck aria-hidden="true" size={32}/><div><h2 id="about-ai-title">Study with discernment</h2><p>Some BSD features use AI to assist with study, organization, and theological analysis. AI-generated theological assessments are study aids rather than authoritative conclusions. They can contain errors and should be weighed through careful study and wise pastoral counsel.</p><p><strong>Scripture remains the final authority for Christian faith and practice.</strong></p></div></section>
  </main>
  <footer className="about-footer"><div><strong>Berean Study Desk</strong><p>Search. Study. Discern.</p></div><nav aria-label="Public information"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms of Service</Link><a href="mailto:bereanstudydesk+privacy@gmail.com">Contact: bereanstudydesk+privacy@gmail.com</a></nav></footer>
 </div>
}
