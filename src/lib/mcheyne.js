import { MCHEYNE_MODIFIED_DAYS } from './mcheyneData.js'

export const MCHEYNE_PLAN_ID = 'mcheyne-modified'
export const MCHEYNE_TITLE = 'M’Cheyne (Modified)'
export const MCHEYNE_DAYS = MCHEYNE_MODIFIED_DAYS.length
const BOOK_ALIASES = { 'Song of Songs': 'Song of Solomon' }

// One plan reading such as "Genesis 9-10", "Exodus 11:1-12:21" or "Jeremiah 36,45".
// The reader opens at `chapter` (and verseStart when the reading starts mid-chapter); `label` keeps the full span.
export function parsePlanReading(text) {
  const match = String(text).trim().match(/^(.+?)\s+(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?((?:,\d+)*)$/)
  if (!match) throw new Error(`Unreadable plan reading: ${text}`)
  const [, rawBook, c1, v1, x2, v2, extra] = match
  const book = BOOK_ALIASES[rawBook] || rawBook
  const chapter = Number(c1)
  const reading = { book, chapter, label: `${book === 'Psalms' && !x2 && !extra ? 'Psalm' : book} ${String(text).trim().slice(rawBook.length).trim().replace(/-/g, '–').replace(/,/g, ', ')}` }
  if (v1 && x2 && v2) { reading.verseStart = Number(v1); reading.chapterEnd = Number(x2); reading.verseEnd = Number(v2) }
  else if (v1 && x2) { reading.verseStart = Number(v1); reading.verseEnd = Number(x2) }
  else if (v1) { reading.verseStart = Number(v1); reading.verseEnd = Number(v1) }
  else if (x2) reading.chapterEnd = Number(x2)
  if (extra) reading.alsoChapters = extra.split(',').filter(Boolean).map(Number)
  return reading
}

export function mcheyneDay(index) {
  const day = MCHEYNE_MODIFIED_DAYS[index]
  if (!day) return null
  return day.map(parsePlanReading)
}

// The plan as a reading_plans row's items: one item per day, three readings each.
export function mcheynePlanItems() {
  return MCHEYNE_MODIFIED_DAYS.map((texts, index) => {
    const readings = texts.map(parsePlanReading)
    return { mcheyne: MCHEYNE_PLAN_ID, day: index + 1, label: readings.map(r => r.label).join(' · '), readings }
  })
}

export const isMcheynePlan = plan => plan?.items?.[0]?.mcheyne === MCHEYNE_PLAN_ID

const daysBetween = (from, to) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 864e5)

// Start so that `today` is `dayNumber`; every earlier day counts as read (the reader was already there elsewhere).
export function mcheyneStart(dayNumber, today) {
  const n = Math.min(MCHEYNE_DAYS, Math.max(1, Math.trunc(Number(dayNumber)) || 1))
  const start = new Date(`${today}T12:00:00Z`)
  start.setUTCDate(start.getUTCDate() - (n - 1))
  const completed = {}
  const at = new Date().toISOString()
  for (let i = 0; i < n - 1; i++) completed[i] = at
  return { start_date: start.toISOString().slice(0, 10), completed }
}

export const readingDone = (plan, dayIndex, n) => Boolean(plan.completed?.[dayIndex] || plan.completed?.[`${dayIndex}:${n}`])

// Self-paced: the day shown is the first one not finished. Missed days roll forward with a count.
export function mcheyneStatus(plan, today) {
  const total = plan.items.length
  let index = 0
  while (index < total && plan.completed?.[index]) index++
  const scheduled = Math.min(total - 1, Math.max(0, daysBetween(plan.start_date, today)))
  const finished = index >= total
  const day = finished ? null : plan.items[index]
  const readings = day ? day.readings.map((reading, n) => ({ ...reading, n, done: readingDone(plan, index, n) })) : []
  return { index, finished, day, readings, read: readings.filter(r => r.done).length, behind: finished ? 0 : Math.max(0, scheduled - index), ahead: finished ? 0 : Math.max(0, index - scheduled) }
}

// Toggle one reading; a day counts as complete once all of its readings are.
export function toggleMcheyneReading(plan, dayIndex, n, at = new Date().toISOString()) {
  const completed = { ...(plan.completed || {}) }
  const key = `${dayIndex}:${n}`
  const count = plan.items[dayIndex].readings.length
  if (readingDone(plan, dayIndex, n)) {
    if (completed[dayIndex]) for (let k = 0; k < count; k++) completed[`${dayIndex}:${k}`] = completed[`${dayIndex}:${k}`] || completed[dayIndex]
    delete completed[dayIndex]
    delete completed[key]
  } else {
    completed[key] = at
    if (Array.from({ length: count }, (_, k) => completed[`${dayIndex}:${k}`]).every(Boolean)) {
      completed[dayIndex] = at
      for (let k = 0; k < count; k++) delete completed[`${dayIndex}:${k}`]
    }
  }
  return completed
}

export function readingUrl(plan, dayIndex, reading) {
  const params = new URLSearchParams({ book: reading.book, chapter: String(reading.chapter) })
  if (reading.verseStart && !reading.chapterEnd) { params.set('verse', String(reading.verseStart)); params.set('verseEnd', String(reading.verseEnd || reading.verseStart)) }
  if (plan) { params.set('plan', plan.id); params.set('day', String(dayIndex)); params.set('reading', String(reading.n ?? 0)) }
  return `/bible?${params}`
}
