// One write at a time; a newer edit cannot be overwritten by an older request.
export function createNoteSaveQueue(save, changed, delay=650) {
  let pending=null, running=null, timer=null
  async function flush() {
    clearTimeout(timer)
    if(running) {await running; if(pending) return flush(); return}
    if(!pending)return
    running=(async()=>{
      while(pending) {
        const value=pending;pending=null;changed('Saving…')
        try {await save(value)} catch(error){if(!pending)pending=value;changed('Save failed',error);throw error}
      }
      changed('Saved')
    })()
    try{await running}finally{running=null}
  }
  return {push(value){pending=value;changed('Unsaved changes');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),delay)},flush,get dirty(){return !!pending||!!running},stop(){clearTimeout(timer)}}
}
