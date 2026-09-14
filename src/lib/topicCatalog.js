export const TOPIC_CATEGORIES=['Doctrine','Bible','Christian Living','Church & Ministry','Apologetics','History','People','Other']
export const TOPIC_GROUPS=['Systematic Theology','Biblical Theology','Practical Christian Living','History & Biography']
const definitions=[
 ['Grace','The unmerited favor of God in salvation and the Christian life.','Doctrine','Systematic Theology',['Salvation','New Testament'],['Ephesians 2:8-10','Titus 2:11-14'],['unmerited favor']],
 ['Faith','Trust in God, his promises, and the saving work of Jesus Christ.','Christian Living','Practical Christian Living',['Trust','New Testament'],['Hebrews 11:1-6','Romans 5:1-2'],['belief']],
 ['Election','God’s choosing purpose in salvation and the life of his people.','Doctrine','Systematic Theology',['Salvation','Sovereignty'],['Ephesians 1:3-14','Romans 9:10-24'],['predestination']],
 ['Salvation','God’s saving work, from calling and justification to final glory.','Doctrine','Systematic Theology',['Grace','Soteriology'],['Romans 8:28-30','Ephesians 2:1-10'],['redemption']],
 ['The Church','The people of God, local congregations, and their worship and mission.','Church & Ministry','Systematic Theology',['Ecclesiology','Worship'],['Acts 2:42-47','Ephesians 4:1-16'],['church','ecclesiology']],
 ['Scripture','The inspiration, authority, trustworthiness, and sufficiency of the Bible.','Bible','Biblical Theology',['Authority','Bibliology'],['2 Timothy 3:16-17','2 Peter 1:19-21'],['Bible','inerrancy','bibliology']],
 ['Sanctification','Growth in holiness and conformity to Christ through the work of the Spirit.','Christian Living','Practical Christian Living',['Holiness','Salvation'],['1 Thessalonians 4:1-8','Philippians 2:12-13'],['holiness']],
 ['Providence','God’s preservation and governance of creation and history.','Doctrine','Systematic Theology',['Sovereignty','Creation'],['Matthew 6:25-34','Romans 8:28'],['sovereignty']],
 ['End Times','The return of Christ, resurrection, judgment, and the new creation.','Doctrine','Systematic Theology',['Eschatology','Hope'],['1 Thessalonians 4:13-18','Revelation 21:1-8'],['eschatology','last things']],
 ['Trinity','The one God eternally existing as Father, Son, and Holy Spirit.','Doctrine','Systematic Theology',['God','Theology'],['Matthew 28:18-20','2 Corinthians 13:14'],['triune God']],
 ['Creation','God, the world he made, and humanity’s place and calling within it.','Apologetics','Biblical Theology',['Origins','God'],['Genesis 1:1-31','Colossians 1:15-17'],['origins','old earth','young earth','evolution','intelligent design','theistic evolution']],
 ['Prayer','Communion with God in worship, confession, thanksgiving, and petition.','Christian Living','Practical Christian Living',['Worship','Discipleship'],['Matthew 6:5-15','Philippians 4:6-7'],['intercession']],
 ['Covenant','God’s promises and covenant relationships across the biblical story.','Bible','Biblical Theology',['Promises','Redemption'],['Genesis 12:1-3','Jeremiah 31:31-34'],['covenants']],
 ['Justification','God’s gracious declaration of righteousness through faith in Christ.','Doctrine','Systematic Theology',['Faith','Salvation'],['Romans 3:21-26','Romans 5:1-11'],[]],
 ['Worship','Honoring God in gathered praise, obedience, and daily life.','Church & Ministry','Practical Christian Living',['Praise','Christian Living'],['John 4:21-24','Romans 12:1-2'],['praise']],
 ['Christology','The person and work of Jesus Christ, truly God and truly human.','Doctrine','Systematic Theology',['Jesus Christ','Incarnation'],['John 1:1-18','Philippians 2:5-11'],['Jesus','incarnation']],
 ['Church History','The life, teaching, and witness of Christians through the centuries.','History','History & Biography',['Church','History'],['Hebrews 12:1-2'],['historical theology']],
 ['Paul','The apostle Paul’s ministry, letters, and witness to Jesus Christ.','People','History & Biography',['New Testament','Apostles'],['Acts 9:1-22','Philippians 3:1-14'],['apostle Paul']]
]
export const normalizeTopic=value=>(value||'').trim().toLocaleLowerCase().replace(/\s+/g,' ')
export const topicSlug=value=>encodeURIComponent(normalizeTopic(value))
export const BUILTIN_TOPICS=definitions.map(([name,description,category,group,tags,scripture,aliases],i)=>({key:`system:${name.toLowerCase().replace(/\s+/g,'-')}`,name,description,category,group,tags,scripture,aliases,is_system:true,priority:i,related_topics:[],image_url:['/images/study-mountains.webp','/images/study-olive-grove.webp','/images/study-lake.webp'][i%3]}))

export function topicCatalog(personal,notes,books,checks){
  const result=[...BUILTIN_TOPICS,...personal.map(t=>({...t,key:`personal:${t.id}`,is_personal:true,scripture:[],group:t.category==='History'||t.category==='People'?TOPIC_GROUPS[3]:t.category==='Christian Living'||t.category==='Church & Ministry'?TOPIC_GROUPS[2]:t.category==='Bible'?TOPIC_GROUPS[1]:TOPIC_GROUPS[0]}))]
  const known=new Set(result.flatMap(t=>[t.name,...t.aliases||[]]).map(normalizeTopic))
  for(const entity of [...notes,...books,...checks])for(const tag of entity.tags||[]){const normalized=normalizeTopic(tag);if(normalized&&!known.has(normalized)){known.add(normalized);result.push({key:`tag:${normalized}`,name:tag,description:'A topic from tags in your study collection.',category:'Other',tags:[],aliases:[],scripture:[],related_topics:[],is_derived:true})}}
  return result
}
export function topicContent(topic,data,links){
  const terms=new Set([topic.name,...topic.aliases||[]].map(normalizeTopic))
  const tagged=entity=>(entity.tags||[]).some(tag=>terms.has(normalizeTopic(tag)))
  const explicit=links.filter(link=>link.topic_key===topic.key)
  const result={}
  for(const [type,rows] of [['note',data.notes],['book',data.books],['doctrine_check',data.checks]]){
    result[type]=rows.filter(row=>tagged(row)||explicit.some(l=>l.entity_type===type&&l.entity_id===row.id))
  }
  const passages=[...(topic.scripture||[]),...explicit.filter(l=>l.entity_type==='scripture').map(l=>l.entity_id),...result.note.map(n=>n.ref).filter(Boolean)]
  result.scripture=[...new Set(passages)]
  result.resource=explicit.filter(l=>l.entity_type==='resource')
  result.topic=[...new Set([...(topic.related_topics||[]),...explicit.filter(l=>l.entity_type==='topic').map(l=>l.entity_id)])]
  result.sources=[...(topic.is_personal?['My Topics']:[]),...(topic.is_system?['Built-in Topics']:[]),...(result.note.length?['From My Notes']:[]),...(result.book.length?['From My Library']:[]),...(result.doctrine_check.length?['From Doctrine Check']:[])]
  return result
}
export function matchesTopic(topic,content,query){
  const haystack=[topic.name,topic.description,...topic.aliases||[],...topic.tags||[],...content.note.map(n=>n.title),...content.book.flatMap(b=>[b.title,b.author]),...content.doctrine_check.map(c=>c.title||c.name),...content.resource.map(r=>r.label)].join(' ').toLowerCase()
  return query.trim().toLowerCase().split(/\s+/).every(term=>haystack.includes(term))
}
