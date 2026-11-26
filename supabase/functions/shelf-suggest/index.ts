import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.115.0'
// Suggests a physical shelf label (category, subcategory, author filing name)
// for the signed-in owner's unlabeled books. Suggestions only: the app shows
// them for review and nothing is written here. The taxonomy comes from the app
// (src/lib/shelfLabels.js) so it has one source; every suggestion is checked
// against it before it is returned.
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Content-Type':'application/json'}
const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers})
type Sub={key:string,code:string,name:string}
type Cat={key:string,code:string,name:string,subs:Sub[]}

const SYSTEM=`You classify books for a Christian layman's home theological library onto physical shelves. Each book gets exactly one primary placement: a main category, a subcategory within it, and an author filing name.
Rules:
- Use only the category and subcategory keys given. A subcategory must belong to its category.
- Commentaries and studies of one Bible book go under COMM with that book. A study of two adjacent books uses the first book unless a listed combined group covers them.
- Textual criticism and translation works go under BIB / TEXT CRIT. Works defending the historical Jesus or Bible reliability go under APOL / EVIDENCE.
- Filing name: the first credited author's surname in uppercase, keeping particles, hyphens, apostrophes and accents. For an edited or organizational work use the editor or organization. Use AIG for Answers in Genesis.
- Follow the owner's existing placements shown as examples when a book is similar.
- If unsure, still choose the best fit and say so briefly in the note.
Output ONE JSON object only: {"suggestions":[{"id":"...","category":"key","subcategory":"key","author":"SURNAME","note":"one short line on why"}]}`

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers});if(req.method!=='POST')return reply(405,{error:'POST required.'})
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}},auth:{persistSession:false}})
 const token=(req.headers.get('Authorization')||'').replace(/^Bearer /i,'');const {data:{user},error:authError}=await client.auth.getUser(token)
 if(authError||!user)return reply(401,{error:'Sign in to get label suggestions.'})
 try{
  const body=await req.json()
  const ids:string[]=Array.isArray(body.bookIds)?body.bookIds.filter((x:unknown)=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x)).slice(0,40):[]
  const taxonomy:Cat[]=Array.isArray(body.taxonomy)?body.taxonomy:[]
  if(!ids.length)return reply(400,{error:'No books to classify.'})
  if(!taxonomy.length)return reply(400,{error:'Missing taxonomy.'})
  const valid=new Map(taxonomy.map(c=>[c.key,new Set((c.subs||[]).map(s=>s.key))]))
  const {data:books,error}=await client.from('books').select('id,title,author,subjects,tags,publisher,description').eq('user_id',user.id).in('id',ids)
  if(error)throw error
  if(!books?.length)return reply(404,{error:'Those books were not found.'})
  const {data:examples}=await client.from('books').select('title,author,shelf_category,shelf_subcategory,shelf_author').eq('user_id',user.id).not('shelf_category','is',null).limit(320)
  const key=Deno.env.get('ANTHROPIC_API_KEY');if(!key)return reply(500,{error:'Suggestions are not configured.'})
  const tax=taxonomy.map(c=>`${c.key} = ${c.code} (${c.name}): `+c.subs.map(s=>`${s.key}=${s.code}${s.code.toLowerCase()===s.name.toLowerCase()?'':' '+s.name}`).join('; ')).join('\n')
  const ex=(examples||[]).map(b=>`${b.title} | ${b.author||''} -> ${b.shelf_category}/${b.shelf_subcategory}/${b.shelf_author}`).join('\n')
  const list=books.map(b=>JSON.stringify({id:b.id,title:b.title,author:b.author,subjects:(b.subjects||[]).slice(0,8),tags:b.tags,publisher:b.publisher,about:String(b.description||'').slice(0,400)})).join('\n')
  const prompt=`TAXONOMY (key = printed code (name): subcategory keys)\n${tax}\n\nOWNER'S EXISTING PLACEMENTS (examples)\n${ex||'(none yet)'}\n\nBOOKS TO CLASSIFY\n${list}`
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:6000,system:SYSTEM,messages:[{role:'user',content:prompt}]})})
  if(!response.ok)throw new Error('The suggestion service could not complete the request. Try again later.')
  const result=await response.json()
  const raw=result.content.filter((c:{type:string})=>c.type==='text').map((c:{text:string})=>c.text).join('').trim()
  let parsed:{suggestions?:{id:string,category:string,subcategory:string,author:string,note?:string}[]}
  try{parsed=JSON.parse(raw.slice(raw.indexOf('{'),raw.lastIndexOf('}')+1))}catch{throw new Error('The suggestions came back in an unreadable format. Try again.')}
  const own=new Set(books.map(b=>b.id))
  const suggestions=(parsed.suggestions||[]).filter(s=>own.has(s.id)&&valid.get(s.category)?.has(s.subcategory)).map(s=>({id:s.id,category:s.category,subcategory:s.subcategory,author:String(s.author||'').replace(/\s+/g,' ').trim().toUpperCase().slice(0,60),note:String(s.note||'').slice(0,200)}))
  return reply(200,{suggestions})
 }catch(e){return reply(500,{error:e instanceof Error?e.message:'Suggestions failed.'})}
})
