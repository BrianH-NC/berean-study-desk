import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCSV, planCLZ, matchCLZ, blankPatch, isbnKey } from './clzImport.js'
test('CLZ CSV handles BOM, quoted commas/newlines/escaped quotes and rejects malformed rows',()=>{
 const rows=parseCSV('\uFEFFAuthor,Title,ISBN\r\n"Last, First","A ""quoted""\nTitle",9780842379427\r\n')
 assert.equal(rows[0].Author,'Last, First');assert.equal(rows[0].Title,'A "quoted"\nTitle')
 assert.throws(()=>parseCSV('Author,Title,ISBN\n"unfinished'))
 assert.throws(()=>parseCSV('Author,Title,ISBN\nA,B'))
 assert.throws(()=>parseCSV('Title,Title,ISBN\nA,B,C'))
})
test('ISBN matching reconciles equivalent editions and never auto-merges a conflicting ISBN',()=>{
 assert.equal(isbnKey('0842379428'),isbnKey('9780842379427'))
 const existing=[{id:'one',title:'Heaven',author:'Randy Alcorn',isbn:'9780842379427'}]
 assert.equal(matchCLZ({isbn:'0842379428'},existing).kind,'isbn')
 assert.equal(matchCLZ({title:'Heaven',author:'Randy Alcorn',isbn:'9780310110118'},existing).kind,'review')
 assert.equal(matchCLZ({title:'Heaven',author:'Randy Alcorn'},existing).kind,'title-author')
 assert.equal(matchCLZ({title:'Heaven',author:'Other Writer'},existing).kind,'review')
 assert.equal(matchCLZ({isbn:'0842379428'},[...existing,{...existing[0],id:'two'}]).kind,'review')
})
test('blank-only patch cannot change notes, progress, ratings, dates added, or existing metadata',()=>{
 const existing={title:'Original',author:'Writer',pages:0,tags:['Existing'],publisher:'  ',pub_date:null,notes:'Mine',current_page:20}
 const incoming={title:'New',author:'New',pages:200,tags:['Theology'],publisher:'Publisher',pub_date:'2020',notes:'Overwrite',current_page:0,rating:5,created_at:'2000'}
 assert.deepEqual(blankPatch(existing,incoming),{publisher:'Publisher',pub_date:'2020'})
 assert.deepEqual(blankPatch({tags:[]},{tags:['Theology']}),{tags:['Theology']})
 assert.deepEqual(blankPatch({},incoming,['publisher']),{publisher:'Publisher'})
})
test('repeat imports produce no changes and duplicate file rows are skipped',()=>{
 const raw={Title:'Heaven',Author:'Randy Alcorn',ISBN:'9780842379427',Pages:'516',Genre:'Theology; Heaven','Publication Date':'Oct 01, 2004',Publisher:'Tyndale'}
 const planned=planCLZ([raw,raw],[])
 assert.equal(planned[0].choice,'new');assert.equal(planned[1].choice,'skip')
 const existing={id:'saved',...planned[0].book}
 const next=planCLZ([raw],[existing])[0]
 assert.equal(next.choice,'saved');assert.deepEqual(blankPatch(existing,next.book),{})
})
