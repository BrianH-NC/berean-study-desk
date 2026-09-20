import { Link } from 'react-router-dom'
import UserAvatar from './UserAvatar'
import './AccountLink.css'

export default function AccountLink({ user }) {
  const name = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.full_name?.trim() || 'My account'
  return <Link className="bsd-account-link" to="/settings?section=account" aria-label={`${name} — Account settings`} title="Account settings"><UserAvatar user={user}/><span className="bsd-account-name">{name}</span></Link>
}
