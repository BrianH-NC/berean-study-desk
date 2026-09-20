import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function UserAvatar({ user, size = 38 }) {
  const path = user?.user_metadata?.bsd_avatar_path
  const [photo, setPhoto] = useState(null)
  const name = user?.user_metadata?.display_name?.trim() || user?.user_metadata?.full_name?.trim() || user?.email || 'Reader'
  const googlePhoto = user?.user_metadata?.avatar_url || user?.user_metadata?.picture
  const [failedUrl, setFailedUrl] = useState(null)
  useEffect(() => {
    let active = true
    const refresh = () => { if (path) supabase.storage.from('profile-photos').createSignedUrl(path, 3600).then(({ data }) => {
      if (active && data?.signedUrl) setPhoto({ path, url: data.signedUrl })
    }).catch(() => {}) }
    refresh()
    const timer = setInterval(refresh, 45 * 60 * 1000)
    return () => { active = false; clearInterval(timer) }
  }, [path])
  const url = path ? (photo?.path === path ? photo.url : null) : user?.user_metadata?.bsd_avatar_path === null ? null : googlePhoto
  return <span aria-hidden="true" style={{ display:'inline-flex', flexShrink:0, width:size, height:size, minWidth:size, minHeight:size, borderRadius:'50%', overflow:'hidden', alignItems:'center', justifyContent:'center', background:'var(--bsd-forest)', color:'white', fontFamily:'Inter,sans-serif', fontSize:size / 3 }}>
    {url && url !== failedUrl ? <img src={url} alt="" referrerPolicy="no-referrer" style={{ display:'block', width:size, height:size, maxWidth:'none', objectFit:'cover' }} onError={() => setFailedUrl(url)} /> : name.split(/\s+/).map(word => word[0]).slice(0,2).join('').toUpperCase()}
  </span>
}
