import test from 'node:test'
import assert from 'node:assert/strict'
import { reviewResult, reminderValues, completeReminder, reminderCalendar, packetHtml, packetText } from './studyToolsModel.js'
test('review scheduling resets difficult cards, caps intervals, and handles month boundaries',()=>{
 const now=new Date(2026,0,31,12),card={stage:0,reviews:2}
 assert.equal(reviewResult(card,'again',now).due_date,'2026-02-01')
 assert.equal(reviewResult(card,'good',now).due_date,'2026-02-03')
 assert.equal(reviewResult({...card,stage:6},'good',now).stage,6)
 assert.equal(reviewResult({...card,stage:3},'hard',now).stage,2)
 assert.equal(reviewResult(card,'good',now).reviews,3)
 assert.throws(()=>reviewResult(card,'bad',now))
})
test('reminder validation rejects impossible dates and completion advances overdue recurrence',()=>{
 const row={title:'Study',due_local:'2026-01-31T09:00',interval_days:7,destination:'/bible'}
 assert.equal(reminderValues(row).interval_days,7)
 assert.throws(()=>reminderValues({...row,due_local:'2026-02-30T09:00'}))
 assert.throws(()=>reminderValues({...row,destination:'https://example.com'}))
 assert.throws(()=>reminderValues({...row,interval_days:2}))
 assert.equal(completeReminder(row,new Date(2026,1,15,10)).due_local,'2026-02-21T09:00')
 assert.equal(completeReminder({...row,interval_days:0}).completed,true)
 assert.equal(completeReminder({...row,due_local:'2026-03-07T09:00',interval_days:1},new Date(2026,2,8,10)).due_local,'2026-03-09T09:00')
})
test('calendar exports escape injected properties, preserve local time, and fold UTF8 safely',()=>{
 const ics=reminderCalendar({id:'test',title:'Pray, study;\nEND:VEVENT '+ 'é'.repeat(100),due_local:'2026-11-01T08:30:00',interval_days:7,destination:'/prayer'},'https://www.bereanstudydesk.app',new Date('2026-10-17T12:00:00Z'))
 assert.match(ics,/DTSTART:20261101T083000/)
 assert.match(ics,/RRULE:FREQ=DAILY;INTERVAL=7/)
 assert.match(ics,/DTSTAMP:20261017T120000Z/)
 assert.match(ics,/SUMMARY:Pray\\, study\\;\\nEND:VEVENT/)
 assert.equal(ics.split('\r\n').filter(l=>l==='END:VEVENT').length,1)
 for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75)
})
test('packets escape executable HTML, preserve selected order and omit unselected content',()=>{
 const items=[{title:'<script>alert(1)</script>',citation:'A & B',body:'<img src=x onerror=alert(1)>\nNext line'},{title:'Second',body:'Body'}]
 const html=packetHtml('My <packet>',items)
 assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'))
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('A &amp; B'))
 assert.ok(html.indexOf('&lt;script&gt;')<html.indexOf('<h2>Second'))
 const md=packetText('Study',items);assert.match(md,/Next line/);assert.match(md,/## Second/)
})
