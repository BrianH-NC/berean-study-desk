import { useEffect } from 'react'
import { useAuth } from '../App'
import AccountLink from '../components/AccountLink'
import { CHANGELOG, APP_VERSION, KIND_LABELS, markUpdateSeen } from '../lib/changelog'
import './WhatsNew.css'

const formatDate = (day) => new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })

export default function WhatsNew() {
  const user = useAuth()
  useEffect(() => {
    let storage
    try { storage = window.localStorage } catch { return }
    markUpdateSeen(storage, user.id)
    window.dispatchEvent(new Event('whats-new-seen'))
  }, [user.id])
  return (
    <div className="page whats-new">
      <header>
        <div>
          <h1>What’s New</h1>
          <p>You’re using version {APP_VERSION}. Here’s what has changed in each update.</p>
        </div>
        <AccountLink user={user} />
      </header>
      {CHANGELOG.map((release, i) => (
        <article className="card whats-new-release" key={release.version} aria-labelledby={`release-${release.version}`}>
          <div className="whats-new-heading">
            <h2 id={`release-${release.version}`}>{release.title}</h2>
            <p className="card-meta">
              Version {release.version} · <time dateTime={release.date}>{formatDate(release.date)}</time>
              {i === 0 && <span className="whats-new-current">Current</span>}
            </p>
          </div>
          <ul>
            {release.changes.map((change) => (
              <li key={change.text}>
                <span className={`whats-new-kind is-${change.kind}`}>{KIND_LABELS[change.kind]}</span>
                <span>{change.text}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  )
}
