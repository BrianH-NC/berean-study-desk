import {Link} from 'react-router-dom'
import Logo,{BrandLockup} from '../components/Logo'
import './Privacy.css'

export default function Privacy(){
 return <div className="privacy-page"><a className="skip-link" href="#privacy-content">Skip to Privacy Policy</a><header className="privacy-header"><Link to="/" className="privacy-brand" aria-label="Berean Study Desk home"><Logo transparent size={52}/><BrandLockup/></Link><Link to="/" className="btn btn-secondary">Return to Berean Study Desk</Link></header><main id="privacy-content" tabIndex={-1} className="card privacy-document">
 <h1>Privacy Policy</h1>
 <p><strong>Berean Study Desk</strong><br/><em>Last updated: September 15, 2026</em></p>
 <p>Berean Study Desk (“BSD”) is a Bible study and theological research application designed to help users organize study materials, notes, resources, and related information. This Privacy Policy explains what information Berean Study Desk collects, how that information is used, and the services involved in providing the application.</p>
 <h2>Information We Collect</h2>
 <p>When you sign in to Berean Study Desk using Google, Google provides the application with basic account information necessary to authenticate you. This may include your name, email address, profile image, and a unique identifier associated with your Google account.</p>
 <p>Berean Study Desk does not receive or store your Google password.</p>
 <p>The application may also store information that you intentionally create or provide while using Berean Study Desk, such as Bible study notes, library information, study progress, preferences, sermon-related information, and other content associated with features of the application.</p>
 <h2>How We Use Your Information</h2>
 <p>Information collected by Berean Study Desk is used to authenticate your account, provide application features, associate your saved content with your account, maintain application security, and improve the operation and reliability of the application.</p>
 <p>Berean Study Desk does not sell your personal information or use your personal information for advertising.</p>
 <h2>Google Sign-In</h2>
 <p>Berean Study Desk uses Google OAuth to provide Google account authentication. When you choose “Continue with Google,” authentication is handled by Google according to Google's own privacy policies and terms. Berean Study Desk receives only the account information authorized through the Google authentication process.</p>
 <p>Berean Study Desk's use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements where applicable.</p>
 <h2>Data Storage and Service Providers</h2>
 <p>Berean Study Desk uses third-party infrastructure and service providers to operate the application. These currently include Supabase for application backend services, database functionality, and authentication infrastructure, and Vercel for application hosting and delivery.</p>
 <p>These providers may process information as necessary to provide their services and are governed by their respective privacy policies and terms.</p>
 <h2>Data Security</h2>
 <p>Reasonable technical and organizational measures are used to protect information stored by Berean Study Desk. However, no method of electronic storage or transmission over the Internet can be guaranteed to be completely secure.</p>
 <h2>Data Retention and Deletion</h2>
 <p>Information associated with your Berean Study Desk account may be retained while your account remains active or as necessary to provide the application.</p>
 <p>You may request deletion of your Berean Study Desk account and associated personal data by contacting the application owner at the email address below. Deleting your Berean Study Desk account does not delete your Google account.</p>
 <p>You may also manage Berean Study Desk's access to your Google account through your Google Account security settings.</p>
 <h2>Children's Privacy</h2>
 <p>Berean Study Desk is not directed toward children under 13 and does not knowingly collect personal information from children under 13.</p>
 <h2>Changes to This Privacy Policy</h2>
 <p>This Privacy Policy may be updated as Berean Study Desk changes or new features and services are introduced. The current version will always be available on this page, with the most recent revision date shown above.</p>
 <h2>Contact</h2>
 <p>Questions about this Privacy Policy or requests concerning your Berean Study Desk data may be sent to:</p>
 <p><strong>Berean Study Desk</strong><br/><strong>Email:</strong> <a href="mailto:bereanstudydesk+privacy@gmail.com">bereanstudydesk+privacy@gmail.com</a></p>
 </main></div>
}
