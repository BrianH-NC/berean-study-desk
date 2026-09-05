// One-time (or re-run-safe) seed for the bsb_verses table: fetches the
// public-domain Berean Standard Bible text and upserts all 31,102 verses.
//
// bsb_verses has no public write policy by design (see the migration), so
// this needs the service role key, not the anon key used everywhere else in
// this app -- run it locally, never from the browser:
//
//   SUPABASE_URL=https://<project>.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service role key, from Supabase > Project Settings > API> \
//   node scripts/seed-bsb.js
//
// Safe to re-run: upserts on the (book_number, chapter, verse) unique index,
// so running it again just overwrites existing rows with the same text
// rather than duplicating them.

import { createClient } from '@supabase/supabase-js'
import { CANONICAL_BOOKS } from '../src/lib/entries.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.')
  process.exit(1)
}

const BSB_TXT_URL = 'https://bereanbible.com/bsb.txt'

// The source file spells Psalms as singular "Psalm"; every other book name
// matches CANONICAL_BOOKS (src/lib/entries.js) exactly, so that's the only
// name-normalization needed to keep this table consistent with how the rest
// of the app already refers to Bible books.
const sourceNameToInfo = new Map()
CANONICAL_BOOKS.forEach((appName, i) => {
  const sourceName = appName === 'Psalms' ? 'Psalm' : appName
  sourceNameToInfo.set(sourceName, {
    book_number: i + 1,
    book_name: appName,
    testament: i < 39 ? 'OT' : 'NT',
  })
})

async function main() {
  console.log('Fetching', BSB_TXT_URL)
  const res = await fetch(BSB_TXT_URL)
  if (!res.ok) throw new Error(`Failed to fetch BSB text: ${res.status}`)
  const raw = await res.text()

  // First 3 lines are attribution/header, not verse data.
  const lines = raw.split('\n').slice(3)

  const rows = []
  const unmatched = []
  for (const line of lines) {
    if (!line.trim()) continue
    const tabIdx = line.indexOf('\t')
    if (tabIdx === -1) continue
    const ref = line.slice(0, tabIdx).trim()
    const text = line.slice(tabIdx + 1).trim()
    const m = ref.match(/^(.+?) (\d+):(\d+)$/)
    if (!m) {
      unmatched.push(ref)
      continue
    }
    const [, sourceBookName, chapter, verse] = m
    const info = sourceNameToInfo.get(sourceBookName)
    if (!info) {
      unmatched.push(ref)
      continue
    }
    rows.push({ ...info, chapter: Number(chapter), verse: Number(verse), text })
  }

  if (unmatched.length) {
    console.warn(`Warning: ${unmatched.length} line(s) could not be parsed, skipped:`, unmatched.slice(0, 10))
  }
  console.log('Parsed', rows.length, 'verses. Uploading...')

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const BATCH = 1000
  let uploaded = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const { error } = await supabase.from('bsb_verses').upsert(batch, { onConflict: 'book_number,chapter,verse' })
    if (error) throw new Error(`Batch at row ${i} failed: ${error.message}`)
    uploaded += batch.length
    console.log(`Uploaded ${uploaded} / ${rows.length}`)
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
