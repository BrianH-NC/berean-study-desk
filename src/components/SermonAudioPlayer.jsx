import { useState } from 'react'
import { sermonAudioLink } from '../lib/sermonAudio'
import './SermonAudioPlayer.css'
export default function SermonAudioPlayer({ url, title = 'Sermon' }) {
  const link = sermonAudioLink(url)
  const [loaded, setLoaded] = useState(null)
  if (!link) return null
  return <section className="sermonaudio-player" aria-label="SermonAudio player">
    {loaded === link.id ? <iframe key={link.id} src={link.embedUrl} title={`${title} — SermonAudio audio player`} /> : <button type="button" className="btn btn-secondary" onClick={() => setLoaded(link.id)}>Load SermonAudio player</button>}
    <a href={link.url} target="_blank" rel="noreferrer">Open in SermonAudio ↗</a>
    <small>{loaded === link.id ? 'If playback is unavailable here, open the sermon on SermonAudio.' : 'Loads the player from SermonAudio. No broadcaster account needed.'}</small>
  </section>
}
