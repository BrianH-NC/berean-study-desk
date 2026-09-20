import { createClient } from 'npm:@supabase/supabase-js@2.115.0'
import { DOMParser } from 'npm:linkedom@0.18.13'
import { MAX_BOOK_BYTES, sourcePage, safeSourceUrl, parseGutenbergSearch, parseGutenbergBook, parseCcelIndex, parseCcelBook, readLimited, validateDownload } from './catalog.js'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
const parse = (value: string, type: 'text/xml' | 'text/html') => new DOMParser().parseFromString(value, type)
const cache = new Map<string, { until: number, value: unknown }>()
const pending = new Map<string, Promise<any>>()
let nextCcelRequest = 0

async function upstream(value: string, limit = 2 * 1024 * 1024) {
  let url = safeSourceUrl(value, value)
  for (let redirects = 0; redirects < 4; redirects++) {
    if (['ccel.org', 'www.ccel.org'].includes(new URL(url).hostname)) {
      const wait = Math.max(0, nextCcelRequest - Date.now())
      if (wait > 30000) throw new Error('CCEL is busy. Please try again shortly.')
      nextCcelRequest = Date.now() + wait + 10000
      if (wait) await new Promise(resolve => setTimeout(resolve, wait))
    }
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'BereanStudyDesk/1.0 (+https://www.bereanstudydesk.app)' } })
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel()
      if (!location) throw new Error('The source returned an invalid redirect.')
      url = safeSourceUrl(location, url); continue
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`The book source is unavailable (${response.status}). Try again or open its website.`) }
    return await readLimited(response, limit)
  }
  throw new Error('The source redirected too many times.')
}

async function cached(key: string, load: () => Promise<any>) {
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.value
  if (pending.has(key)) return pending.get(key)
  const promise = load().then(value => {
    if (cache.size >= 100) cache.delete(cache.keys().next().value!)
    cache.set(key, { until: Date.now() + 3600000, value }); return value
  }).finally(() => pending.delete(key))
  pending.set(key, promise); return promise
}
const getText = async (url: string) => new TextDecoder().decode(await upstream(url))
async function details(source: string, id: string) {
  const url = sourcePage(source, id)
  return await cached(`${source}:${id}`, async () => source === 'gutenberg'
    ? parseGutenbergBook(await getText(`${url}.opds`), id, parse)
    : parseCcelBook(await getText(url), id, parse))
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!['GET', 'POST'].includes(req.method)) return json({ error: 'Method not supported.' }, 405)
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Sign in required.' }, 401)
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return json({ error: 'Sign in required.' }, 401)
  try {
    if (req.method === 'POST') {
      if (Number(req.headers.get('content-length')) > 2048) return json({ error: 'Request too large.' }, 400)
      const body = await req.text()
      if (body.length > 2048) return json({ error: 'Request too large.' }, 400)
      const { source, id, format } = JSON.parse(body)
      if (!['pdf', 'epub'].includes(format)) return json({ error: 'Unsupported book format.' }, 400)
      const book = await details(source, String(id))
      const download = book.formats.find((item: { format: string }) => item.format === format)
      if (!download) return json({ error: 'This edition does not offer that format. Open the source page.' }, 400)
      const bytes = await upstream(download.url, MAX_BOOK_BYTES)
      validateDownload(bytes, format)
      return new Response(bytes, { headers: { ...cors, 'Content-Type': format === 'pdf' ? 'application/pdf' : 'application/epub+zip', 'Cache-Control': 'no-store' } })
    }
    const params = new URL(req.url).searchParams, source = params.get('source') || 'gutenberg', id = params.get('id')
    if (!['gutenberg', 'ccel'].includes(source)) return json({ error: 'Unknown catalog.' }, 400)
    if (id) return json(await details(source, id))
    const query = (params.get('q') || '').trim().slice(0, 160), page = Number(params.get('page') || 1)
    if (!Number.isInteger(page) || page < 1 || page > 1000) return json({ error: 'Invalid page.' }, 400)
    if (source === 'gutenberg') {
      const search = new URL('https://www.gutenberg.org/ebooks/search.opds/')
      search.searchParams.set('query', query || 'theology')
      search.searchParams.set('start_index', String((page - 1) * 25 + 1))
      return json(await cached(search.href, async () => parseGutenbergSearch(await getText(search.href), parse)))
    }
    const books = await cached('ccel-index', async () => parseCcelIndex(await getText('https://www.ccel.org/index/author'), parse))
    const words = query.toLowerCase().split(/\s+/).filter(Boolean)
    const matching = books.filter((book: { title: string, author: string }) => words.every(word => `${book.title} ${book.author}`.toLowerCase().includes(word)))
    return json({ results: matching.slice((page - 1) * 24, page * 24), hasNext: matching.length > page * 24, count: matching.length })
  } catch (error) { return json({ error: error instanceof Error ? error.message : 'Unable to contact the book source.' }, 502) }
})
