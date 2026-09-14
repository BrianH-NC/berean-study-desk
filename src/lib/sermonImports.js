import {parseTimedTranscript} from './sermonModel'
export async function readTranscript(file){
 if(file.size>20*1024*1024)throw new Error('Choose a transcript smaller than 20 MB.')
 const ext=file.name.split('.').pop().toLowerCase();let text='',cues=[]
 if(['txt','srt','vtt'].includes(ext)){text=await file.text();if(ext!=='txt')({text,cues}=parseTimedTranscript(text))}
 else if(ext==='docx'){const mammoth=await import('mammoth/mammoth.browser');const result=await (mammoth.default||mammoth).extractRawText({arrayBuffer:await file.arrayBuffer()});text=result.value}
 else if(ext==='pdf'){const pdf=await import('pdfjs-dist');const worker=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');pdf.GlobalWorkerOptions.workerSrc=worker.default;const task=pdf.getDocument({data:await file.arrayBuffer(),isEvalSupported:false});try{const document=await task.promise;if(document.numPages>500)throw new Error('This PDF exceeds 500 pages. Upload a smaller transcript.');for(let n=1;n<=document.numPages;n++){const page=await document.getPage(n),content=await page.getTextContent();text+=content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('')+'\n\n';if(text.length>1000000)throw new Error('Transcript exceeds the one-million-character limit.')}}finally{await task.destroy()}}
 else throw new Error('Choose TXT, PDF, DOCX, SRT, or VTT.')
 if(!text.trim())throw new Error('No readable text found. For a scanned PDF, paste a text transcript instead.')
 if(text.length>1000000)throw new Error('Transcript exceeds the one-million-character limit.')
 return {text,cues}
}
