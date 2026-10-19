import urllib.request,urllib.parse,json,re,html,collections,xml.etree.ElementTree as ET
from pathlib import Path
out=Path('public/data/word-study');out.mkdir(parents=True,exist_ok=True)
def read(repo,rev,path):
 return urllib.request.urlopen(f'https://raw.githubusercontent.com/{repo}/{rev}/'+urllib.parse.quote(path),timeout=60).read().decode('utf-8-sig')
def sha(repo):return json.load(urllib.request.urlopen(f'https://api.github.com/repos/{repo}/commits/master'))['sha']
def write(path,data):
 p=out/path;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
def plain(s):return html.unescape(re.sub('<[^>]*>',' ',re.sub(r'<br\s*/?>','\n',s,flags=re.I))).strip()
step='STEPBible/STEPBible-Data';sbl='Faithlife/SBLGNT';sr='ed476a8ee6e3f7b3a46fc48af6c7dabc02387b1d';br='c4d241a9c1c479a55b989ba35a4976c1d0b8052c'
tree=json.load(urllib.request.urlopen(f'https://api.github.com/repos/{step}/git/trees/{sr}?recursive=1'))['tree']
paths=[x['path'] for x in tree]
# Keep source revisions and original notices alongside transformed data.
write(Path('sources.json'),{'step':sr,'sbl':br,'license':'CC BY 4.0','changes':'Chapter JSON conversion; lexicon HTML converted to plain text; original morphology and apparatus wording retained.'})
for repo,rev,file,name in [(step,sr,'README.md','STEPBible-NOTICE.txt'),(sbl,br,'LICENSE','SBLGNT-LICENSE.txt'),(sbl,br,'README.md','SBLGNT-NOTICE.txt')]:
 (out/name).write_text(read(repo,rev,file),encoding='utf-8')
for prefix in ['Lexicons/TBESG','Lexicons/TBESH']:
 rows=collections.defaultdict(list)
 for line in read(step,sr,next(p for p in paths if p.startswith(prefix))).splitlines():
  c=line.split('\t')
  if len(c)<8 or not re.fullmatch('[GH][0-9]+',c[0]):continue
  id=c[0][0]+str(int(c[0][1:]));rows[id].append({'lemma':c[3],'transliteration':c[4],'gloss':plain(c[6]),'definition':plain(c[7])})
 buckets=collections.defaultdict(dict)
 for id,entries in rows.items():buckets[f'{id[0]}/{int(id[1:])//100}.json'][id]=entries
 for path,data in buckets.items():write(Path('lexicon')/path,data)
 print(prefix,len(rows),flush=True)
morph={}
for prefix in ['Morphology codes/TEGMC','Morphology codes/TEHMC']:
 current=None
 for line in read(step,sr,next(p for p in paths if p.startswith(prefix))).splitlines():
  c=line.split('\t')
  if len(c)>1 and c[0] and 'Function=' in c[1]:current=c[0];morph[current]={'description':c[1]}
  elif current and line.startswith('\t"'):
   value=line.strip().strip('"')
   if 'summary' not in morph[current]:morph[current]['summary']=value
   elif 'explanation' not in morph[current]:morph[current]['explanation']=value
write(Path('morphology.json'),morph)
books='Gen Exo Lev Num Deu Jos Jdg Rut 1Sa 2Sa 1Ki 2Ki 1Ch 2Ch Ezr Neh Est Job Psa Pro Ecc Sng Isa Jer Lam Ezk Dan Hos Jol Amo Oba Jon Mic Nam Hab Zep Hag Zec Mal Mat Mrk Luk Jhn Act Rom 1Co 2Co Gal Eph Php Col 1Th 2Th 1Ti 2Ti Tit Phm Heb Jas 1Pe 2Pe 1Jn 2Jn 3Jn Jud Rev'.split()
chapters=collections.defaultdict(lambda:collections.defaultdict(list))
for path in paths:
 if not path.startswith('Translators Amalgamated OT+NT/') or not re.search('/TA(GNT|HOT) ',path):continue
 greek='/TAGNT' in path
 for line in read(step,sr,path).splitlines():
  c=line.split('\t');m=re.match(r'([123]?[A-Za-z]+)\.(\d+)\.(\d+)#',c[0])
  if not m or len(c)<6 or m[1] not in books:continue
  if greek:
   tag=c[3].split('=',1)
   if len(tag)<2:continue
   ids=re.findall(r'G\d+',tag[0]);form=c[1];gloss=c[2];codes=[tag[1]];editions=c[5]
  else:
   ids=re.findall(r'H\d+',c[4]);form=c[1]+' ('+c[2]+')';gloss=c[3];language=c[5][:1];codes=[x if x[:1] in 'HA' else language+x for x in c[5].split('/')];editions='Leningrad Codex'
  ids=list(dict.fromkeys(i[0]+str(int(i[1:])) for i in ids))
  chapters[f'{books.index(m[1])+1}/{int(m[2])}.json'][str(int(m[3]))].append({'form':form,'gloss':gloss,'ids':ids,'codes':codes,'editions':editions})
 print(path,flush=True)
for path,data in chapters.items():write(Path('grammar')/path,data)
sblbooks='Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split()
for b,name in enumerate(sblbooks,40):
 root=ET.fromstring(read(sbl,br,f'data/sblgntapp/xml/{name}.xml'));chapters=collections.defaultdict(lambda:collections.defaultdict(list));ref=None
 for el in root:
  if el.tag=='verse':
   m=re.search(r'(\d+):(\d+)',el.text);ref=(m[1],m[2]) if m else None
  if el.tag=='note' and ref:chapters[ref[0]][ref[1]].append(''.join(el.itertext()))
 for ch,data in chapters.items():write(Path('variants')/f'{b}/{ch}.json',data)
 write(Path('variants')/f'{b}/index.json',list(chapters))
 print(name,flush=True)
print('Done',sr,br)
