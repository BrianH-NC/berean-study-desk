import { useState } from 'react'
import { supabase } from '../lib/supabase'
import UserAvatar from './UserAvatar'

export default function ProfilePhoto({ user }) {
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function update(file) {
    setBusy(true)
    setMessage('')
    let path
    const previous = user.user_metadata?.bsd_avatar_path
    try {
      if (file) {
        if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG, or WebP image.')
        if (file.size > 2 * 1024 * 1024) throw new Error('Choose an image smaller than 2 MB.')
        path = `${user.id}/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]}`
        const uploaded = await supabase.storage.from('profile-photos').upload(path, file, { contentType:file.type })
        if (uploaded.error) throw uploaded.error
      }
      const saved = await supabase.auth.updateUser({ data:{ bsd_avatar_path:path || null } })
      if (saved.error) {
        if (path) await supabase.storage.from('profile-photos').remove([path])
        throw saved.error
      }
      if (previous) await supabase.storage.from('profile-photos').remove([previous])
      setMessage(file ? 'Profile picture saved.' : 'Picture removed. Your initials will be shown.')
    } catch (err) { setMessage(err.message || 'Could not update your picture. Please try again.') }
    finally { setBusy(false) }
  }
  return <div style={{ marginBottom:24 }}><h3>Profile picture</h3><UserAvatar user={user} size={80}/><label className="settings-field">Upload a picture<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => { const file=event.target.files?.[0]; event.target.value=''; if(file) update(file) }}/></label><p className="card-meta">JPG, PNG, or WebP · up to 2 MB. Shown in a circle. Changes save immediately.</p>{(user.user_metadata?.bsd_avatar_path || (user.user_metadata?.bsd_avatar_path !== null && (user.user_metadata?.avatar_url || user.user_metadata?.picture))) && <button className="btn btn-secondary" disabled={busy} onClick={() => update(null)}>Remove picture</button>}<p role="status">{busy ? 'Saving picture…' : message}</p></div>
}
