const hosts = new Set(['sermonaudio.com', 'www.sermonaudio.com', 'web.sermonaudio.com', 'legacy.sermonaudio.com', 'embed.sermonaudio.com'])
export function sermonAudioLink(value) {
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || !hosts.has(url.hostname) || url.username || url.password || url.port) return null
    let id = url.pathname.match(/^\/sermons\/(\d+)\/?$/)?.[1]
    if (/^\/sermoninfo\.asp$/i.test(url.pathname)) id = [...url.searchParams].find(([key]) => key.toLowerCase() === 'sid')?.[1]
    if (url.hostname === 'embed.sermonaudio.com') id = url.pathname.match(/^\/player\/[av]\/(\d+)\/?$/)?.[1]
    if (!id || !/^\d{5,20}$/.test(id)) return null
    return { id, url: `https://www.sermonaudio.com/sermons/${id}`, embedUrl: `https://embed.sermonaudio.com/player/a/${id}/` }
  } catch { return null }
}
