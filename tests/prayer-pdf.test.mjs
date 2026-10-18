import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const original=await readFile(new URL('../src/lib/prayerPdf.js',import.meta.url),'utf8')
const source=original.replace("import { MAX_PRAYER_TEXT } from './prayerImportModel'",'const MAX_PRAYER_TEXT=100000')
 .replace("await import('pdfjs-dist')",'globalThis.__prayerPdf.pdf')
 .replace("await import('pdfjs-dist/build/pdf.worker.min.mjs?url')",'({default:"worker"})')
 .replace("await import('tesseract.js')",'globalThis.__prayerPdf.ocr')
test('PDF import preserves readable text, uses OCR for scanned pages, and releases resources',async()=>{
 let destroyed=0,terminated=0,recognized=0
 const canvas={getContext:()=>({})}
 globalThis.document={createElement:()=>canvas}
 globalThis.__prayerPdf={pdf:{GlobalWorkerOptions:{},getDocument:()=>({destroy:async()=>{destroyed++},promise:Promise.resolve({numPages:2,getPage:async n=>({getTextContent:async()=>({items:n===1?[{str:'A readable prayer request from the church email.',hasEOL:true}]:[]}),getViewport:()=>({width:600,height:800}),render:()=>({promise:Promise.resolve()}),cleanup(){}})})})},ocr:{createWorker:async()=>({recognize:async()=>{recognized++;return {data:{text:'Prayer request from a scanned page'}}},terminate:async()=>{terminated++}})}}
 try{const {readPrayerPdf}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));const result=await readPrayerPdf({name:'requests.pdf',size:20,arrayBuffer:async()=>new ArrayBuffer(0)});assert.equal(result.pages,2);assert.equal(result.scanned,1);assert.match(result.text,/church email/);assert.match(result.text,/scanned page/);assert.equal(recognized,1);assert.equal(destroyed,1);assert.equal(terminated,1);assert.equal(canvas.width,0)
 const abort=new AbortController();abort.abort();await assert.rejects(()=>readPrayerPdf({name:'requests.pdf',size:20},{signal:abort.signal}),{name:'AbortError'})
 await assert.rejects(()=>readPrayerPdf({name:'large.pdf',size:21*1024*1024}),/20 MB/)
 }finally{delete globalThis.document;delete globalThis.__prayerPdf}
})
