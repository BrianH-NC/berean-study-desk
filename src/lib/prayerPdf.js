import { MAX_PRAYER_TEXT } from './prayerImportModel'
// PDF and OCR libraries run locally; only reviewed prayer records are saved.
export async function readPrayerPdf(file,{signal,onProgress=()=>{},forceOcr=false}={}){
  if(!file.name.toLowerCase().endsWith('.pdf')||file.size>20*1024*1024)throw new Error('Choose a PDF under 20 MB.')
  const check=()=>{if(signal?.aborted)throw new DOMException('Cancelled','AbortError')}
  const pdf=await import('pdfjs-dist'),workerUrl=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');check()
  pdf.GlobalWorkerOptions.workerSrc=workerUrl.default
  const task=pdf.getDocument({data:await file.arrayBuffer(),isEvalSupported:false})
  let engine,renderTask,text='',scanned=0
  const cancel=()=>{void task.destroy();void engine?.terminate();renderTask?.cancel()}
  signal?.addEventListener('abort',cancel,{once:true})
  try{
    const doc=await task.promise;check()
    if(doc.numPages>30)throw new Error('Use a PDF of 30 pages or fewer.')
    for(let i=1;i<=doc.numPages;i++){
      check();onProgress(`Reading page ${i} of ${doc.numPages}…`)
      const page=await doc.getPage(i),content=await page.getTextContent();check()
      let pageText=content.items.map(item=>(item.str||'')+(item.hasEOL?'\n':' ')).join('')
      if(forceOcr||pageText.replace(/\s/g,'').length<30){
        onProgress(`Recognizing scanned page ${i} of ${doc.numPages}…`)
        if(!engine){const {createWorker}=await import('tesseract.js');check();engine=await createWorker('eng');check()}
        const original=page.getViewport({scale:1}),scale=Math.min(2,2400/Math.max(original.width,original.height))
        const viewport=page.getViewport({scale}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height)
        try{renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport});await renderTask.promise;check();const result=await engine.recognize(canvas);check();pageText=result.data.text;scanned++}finally{canvas.width=canvas.height=0;renderTask=null}
      }
      text+=pageText.trim()+'\n\n';page.cleanup()
      if(text.length>MAX_PRAYER_TEXT)throw new Error('This PDF contains too much text. Import a smaller section (up to 100,000 characters).')
    }
    if(!text.trim())throw new Error('No readable text found. Try a clearer scan or paste the email text.')
    return {text:text.trim(),pages:doc.numPages,scanned}
  }finally{signal?.removeEventListener('abort',cancel);await engine?.terminate().catch(()=>{});await task.destroy().catch(()=>{})}
}
