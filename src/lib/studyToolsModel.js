import { addDays, localDay } from './dailyStudyModel.js'

export const reviewIntervals = [1,3,7,14,30,60,120]
export function reviewResult(card, rating, now = new Date()) {
  if (!['again','hard','good'].includes(rating)) throw new Error('Choose a review rating.')
  const stage = rating === 'again' ? 0 : rating === 'hard' ? Math.max(0, card.stage - 1) : Math.min(6, card.stage + 1)
  return { stage, due_date:addDays(localDay(now), reviewIntervals[stage]), reviews:card.reviews+1, last_reviewed_at:now.toISOString() }
}
export const reminderDestinations = {'/bible':'Bible Study','/reading-plans':'Reading Plans','/prayer':'Prayer Journal','/quotations':'Quotations','/study-sessions':'Study Sessions','/study-tools':'Review'}
export function localMinute(now = new Date()) { return `${localDay(now)}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}` }
export function reminderValues(form) {
  const due = form.due_local.slice(0,16), date = new Date(due)
  if (!form.title.trim() || form.title.length>200) throw new Error('Enter a title of up to 200 characters.')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(due) || Number.isNaN(+date) || localMinute(date)!==due) throw new Error('Choose a valid local date and time.')
  if (!Object.hasOwn(reminderDestinations,form.destination) || ![0,1,7].includes(Number(form.interval_days))) throw new Error('Choose a destination and schedule.')
  return {title:form.title.trim(),due_local:due,destination:form.destination,interval_days:Number(form.interval_days),completed:false}
}
export function completeReminder(row, now = new Date()) {
  if (!row.interval_days) return {completed:true,last_completed_at:now.toISOString()}
  let day = row.due_local.slice(0,10), time = row.due_local.slice(11,16)
  do {day=addDays(day,row.interval_days)} while (`${day}T${time}`<=localMinute(now))
  return {due_local:`${day}T${time}`,last_completed_at:now.toISOString()}
}
const calendarEscape = value => String(value).replaceAll('\\','\\\\').replace(/\r?\n/g,'\\n').replaceAll(';','\\;').replaceAll(',','\\,')
// RFC 5545 lines may contain at most 75 UTF-8 octets, including continuation spaces.
function fold(line) { let out='',length=0; for(const char of line){const size=new TextEncoder().encode(char).length;if(length+size>75){out+='\r\n ';length=1}out+=char;length+=size}return out }
export function reminderCalendar(row, origin, now = new Date()) {
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Berean Study Desk//Study Reminders//EN','BEGIN:VEVENT',`UID:${row.id}@bereanstudydesk.app`,`DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${row.due_local.slice(0,16).replace(/[-:]/g,'')}00`,'DURATION:PT15M',`SUMMARY:${calendarEscape(row.title)}`,`DESCRIPTION:${calendarEscape('Open Berean Study Desk: '+origin+row.destination)}`,`URL:${origin}${row.destination}`]
  if(row.interval_days) lines.push(`RRULE:FREQ=DAILY;INTERVAL=${row.interval_days}`)
  lines.push('BEGIN:VALARM','TRIGGER:-PT10M','ACTION:DISPLAY',`DESCRIPTION:${calendarEscape(row.title)}`,'END:VALARM','END:VEVENT','END:VCALENDAR')
  return lines.map(fold).join('\r\n')+'\r\n'
}
export function escapeHtml(value) { return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])) }
export function packetText(title, items) {
  return `# ${title}\n\nBerean Study Desk\n\n`+items.map(item=>`## ${item.title}\n\n${item.citation || ''}\n\n${item.body}`).join('\n\n---\n\n')
}
export function packetHtml(title, items) {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)} — Berean Study Desk</title><style>body{font:18px/1.65 Georgia,serif;color:#2e2a26;background:#fffdf7;max-width:850px;margin:40px auto;padding:24px}h1,h2{color:#0f3d2e}article{border-top:1px solid #d4cbb9;margin-top:28px;padding-top:16px}p{white-space:pre-wrap;overflow-wrap:anywhere}small{color:#555}@media print{body{margin:0;background:white}h2{break-after:avoid}p{orphans:3;widows:3}}</style><header><small>Berean Study Desk · Study packet</small><h1>${escapeHtml(title)}</h1></header>${items.map(item=>`<article><h2>${escapeHtml(item.title)}</h2><small>${escapeHtml(item.citation||'')}</small><p>${escapeHtml(item.body)}</p></article>`).join('')}</html>`
}
export function downloadStudyFile(name, text, type) {
  const url=URL.createObjectURL(new Blob([text],{type})), a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
