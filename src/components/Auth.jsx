import {Link} from 'react-router-dom'
import {useRef,useState} from 'react'
import {BookOpen,ShieldCheck,Leaf,LoaderCircle} from 'lucide-react'
import {supabase} from '../lib/supabase'
import Logo,{BrandLockup} from './Logo'
import './Auth.css'

function GoogleMark(){return <svg aria-hidden="true" width="24" height="24" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>}
export default function Auth(){
 const [loading,setLoading]=useState(false),[error,setError]=useState('');const pending=useRef(false)
 async function handleGoogleSignIn(){
  if(pending.current)return;pending.current=true;setLoading(true);setError('')
  try{
   const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin,queryParams:{prompt:'select_account'}}})
   if(error)throw error
   // Supabase redirects; App's existing listener handles the returning session.
  }catch{pending.current=false;setLoading(false);setError('We couldn’t connect to Google. Please check your connection and try again.')}
 }
 return <main className="auth-page"><section className="auth-visual" aria-label="Welcome to Berean Study Desk"><div className="auth-brand"><Logo transparent size={100}/><BrandLockup/><p className="auth-tagline">Search. Study. Discern.</p><blockquote className="scripture-text">“Your word is a lamp<br/>to my feet and a light<br/>to my path.”<cite>Psalm 119:105</cite></blockquote></div><div className="auth-values">{[[BookOpen,'Build Your Library','Keep good books close'],[ShieldCheck,'Compare with Truth','Test ideas carefully'],[Leaf,'Grow in Understanding','All for the glory of Christ']].map(([Icon,title,copy])=><div key={title}><Icon aria-hidden="true"/><div><strong>{title}</strong><span>{copy}</span></div></div>)}</div></section>
 <section className="auth-panel" aria-labelledby="auth-title"><div className="auth-card"><header><Logo transparent size={64}/><p className="auth-welcome">Welcome to</p><h1 id="auth-title">Berean Study Desk</h1><div className="auth-rule" aria-hidden="true">◆</div><p className="auth-tagline">Search. Study. Discern.</p></header><div className="auth-action"><button type="button" className="btn btn-primary auth-google" disabled={loading} aria-busy={loading} onClick={handleGoogleSignIn}>{loading?<LoaderCircle className="auth-spinner" aria-hidden="true"/>:<GoogleMark/>}<span>{loading?'Connecting to Google…':'Continue with Google'}</span></button><div aria-live="polite" role="status">{loading&&<p className="auth-status">Opening Google’s secure sign-in…</p>}</div>{error&&<p className="auth-error" role="alert">{error}</p>}</div><blockquote className="auth-verse scripture-text">“Search the Scriptures daily<br/>to see if these things are so.”<cite>Acts 17:11</cite></blockquote><footer className="auth-footer"><Link to="/privacy">Privacy Policy</Link><span aria-hidden="true"> · </span><Link to="/terms">Terms of Service</Link></footer></div></section></main>
}
