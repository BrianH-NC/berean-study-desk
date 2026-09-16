import {Link} from 'react-router-dom'
import Logo,{BrandLockup} from '../components/Logo'
import './Privacy.css'

export default function Terms(){
 return <div className="privacy-page"><a className="skip-link" href="#terms-content">Skip to Terms of Service</a><header className="privacy-header"><Link to="/" className="privacy-brand" aria-label="Berean Study Desk home"><Logo transparent size={52}/><BrandLockup/></Link><Link to="/" className="btn btn-secondary">Return to Berean Study Desk</Link></header><main id="terms-content" tabIndex={-1} className="card privacy-document">
 <h1>Terms of Service</h1>
 <p><strong>Berean Study Desk</strong><br/><em>Last updated: September 15, 2026</em></p>
 <h2>Acceptance of Terms</h2>
 <p>By accessing or using Berean Study Desk (“BSD”), you agree to these Terms of Service. If you do not agree to these terms, please do not use the application.</p>
 <h2>About Berean Study Desk</h2>
 <p>Berean Study Desk is a Bible study and theological research application designed to help users organize study materials, notes, resources, and related information. The application may include features for biblical study, theological research, personal libraries, sermon-related materials, and AI-assisted analysis.</p>
 <p>Berean Study Desk is currently privately operated and access may be limited to users authorized by the application owner.</p>
 <h2>User Accounts</h2>
 <p>Berean Study Desk may require authentication using a supported third-party identity provider, such as Google. You are responsible for maintaining the security of the account you use to access Berean Study Desk.</p>
 <p>Access to Berean Study Desk may be granted, restricted, suspended, or discontinued by the application owner. You may not attempt to access another user's account or circumvent application security or access controls.</p>
 <h2>Your Content</h2>
 <p>You retain ownership of notes, study materials, and other original content that you create or enter into Berean Study Desk.</p>
 <p>By using the application, you authorize Berean Study Desk and its service providers to store and process this content as necessary to provide the application's features. This does not transfer ownership of your content to Berean Study Desk.</p>
 <p>You are responsible for ensuring that content you add to the application does not violate applicable laws or the rights of others.</p>
 <h2>AI-Generated Content and Theological Assessments</h2>
 <p>Some Berean Study Desk features may use artificial intelligence to generate summaries, analysis, theological assessments, suggestions, or other content. AI-generated content may contain errors, omissions, or interpretations with which you disagree and should not be treated as authoritative.</p>
 <p>AI-generated theological assessments are provided as study aids. They are not a substitute for careful study of Scripture, wise pastoral counsel, or personal discernment.</p>
 <p>Berean Study Desk is designed around the conviction that Scripture is the final authority for Christian faith and practice. Users should evaluate theological conclusions in light of Scripture and seek the guidance of the Holy Spirit in understanding and applying God's Word.</p>
 <h2>Third-Party Services</h2>
 <p>Berean Study Desk relies on third-party services to provide portions of its functionality. These may include Google for authentication, Supabase for backend, database, and authentication infrastructure, Vercel for application hosting and delivery, and providers of artificial intelligence or other application services.</p>
 <p>Your use of those services may also be subject to their respective terms and privacy policies.</p>
 <h2>Availability and Changes</h2>
 <p>Berean Study Desk is provided on an “as available” basis. Features may be added, changed, temporarily unavailable, or removed as the application is developed.</p>
 <p>The application owner does not guarantee uninterrupted availability or that every feature will always operate without errors.</p>
 <h2>No Professional Advice</h2>
 <p>Information provided through Berean Study Desk is intended for personal study, research, and informational purposes. It does not constitute legal, medical, financial, or other professional advice.</p>
 <h2>Intellectual Property</h2>
 <p>Berean Study Desk's application design, software, branding, and original materials are protected by applicable intellectual property laws. Third-party content, Bible translations, books, quotations, images, and other materials remain subject to the rights and licenses of their respective owners.</p>
 <p>Nothing in these Terms grants users ownership of Berean Study Desk itself or of third-party materials available through the application.</p>
 <h2>Limitation of Liability</h2>
 <p>To the extent permitted by applicable law, Berean Study Desk and its owner will not be liable for indirect, incidental, consequential, or special damages arising from use of or inability to use the application.</p>
 <p>You are responsible for independently evaluating information produced by the application before relying upon it.</p>
 <h2>Termination</h2>
 <p>You may stop using Berean Study Desk at any time. You may also request deletion of your account and associated personal information as described in the <Link to="/privacy">Privacy Policy</Link>.</p>
 <p>Access may be suspended or terminated when necessary to protect the application, its users, or its services, or when these Terms are violated.</p>
 <h2>Changes to These Terms</h2>
 <p>These Terms may be updated as Berean Study Desk develops or its features and services change. The current version will be made available on this page with its most recent revision date.</p>
 <h2>Governing Law</h2>
 <p>These Terms are governed by the laws of the State of North Carolina, United States, without regard to its conflict-of-law principles.</p>
 <h2>Contact</h2>
 <p>Questions about these Terms may be sent to:</p>
 <p><strong>Berean Study Desk</strong><br/><strong>Email:</strong> <a href="mailto:bereanstudydesk+terms@gmail.com">bereanstudydesk+terms@gmail.com</a></p>
 </main></div>
}
