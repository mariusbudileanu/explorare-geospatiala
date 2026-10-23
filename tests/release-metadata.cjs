'use strict';
// QA only. AUTO accepts either coherent state. Publication QA must set
// CARTO_RELEASE_EXPECTED_STATE=PUBLISHED and CARTO_RELEASE_APPROVED_DATE.
// CARTO_RELEASE_APPROVED_DOI is an operator-supplied, independently verified
// version DOI, never a generated identifier or a live-network assumption.
// CARTO_QA_PYTHON may select Python with PyYAML/jsonschema installed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'..');
const TECHNICAL='6c22ed6477557d646a9c3b0d8c2bbf892950bda7';
const V3='6c36a95c2bb58d31208efbee4b9f3595130bb814';
const CONCEPT='10.5281/zenodo.23422847';
const PRIOR_DOIS=[CONCEPT,'10.5281/zenodo.23422848','10.5281/zenodo.23471181'];
const META=['CITATION.cff','README.md','CHANGELOG.md','about.html','js/site.js','data/search-index.js'];
const QA_FILES=['tests/qa/academic-resilience.cjs','tests/qa/companion-hub.cjs','tests/qa/learning-consolidation.cjs','tests/v4-build.cjs','tests/release-metadata.cjs','tests/release-states.cjs','tests/qa/validate-cff.py','tests/fixtures/cff-1.2.0.schema.json'];
const plain=x=>JSON.parse(JSON.stringify(x));
const norm=s=>String(s).replace(/\r\n/g,'\n');
const normalized=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
const candidate=s=>/candidat|unpublished|nepublicat|nelansat|not (?:yet )?published|nu (?:este|a fost) publicat|versiune in pregatire/.test(normalized(s));
const published=s=>/publicat|published|released/.test(normalized(s))&&String(s).includes('4.0.0');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function requiredGit(root,args){
 try{return cp.execFileSync('git',args,{cwd:root,maxBuffer:32*1024*1024,stdio:['pipe','pipe','pipe']});}
 catch(error){throw new Error('Required Git verification unavailable: git '+args.join(' ')+'; '+(error.stderr?.toString().trim()||error.message));}
}
function git(root,ref,file){return requiredGit(root,['show',ref+':'+file]);}
function validatePerimeter(root){
 // Compare every distribution path, independently in HEAD, index and worktree.
 // Ignored local data/caches are not distribution inputs; force-staged ignored
 // files are covered by the index. Only these eight QA paths are exempt.
 const command=args=>requiredGit(root,args).toString('utf8');
 const tree=ref=>new Map(command(['ls-tree','-r','-z','--full-tree',ref]).split('\0').filter(Boolean).map(row=>{
  const tab=row.indexOf('\t'),[mode,type,id]=row.slice(0,tab).split(' ');return[row.slice(tab+1),{mode,type,id}];
 }));
 const baseline=tree(TECHNICAL),head=tree('HEAD'),staged=new Map(),problems=new Map(),eolOnly=[];
 const flag=(file,layer)=>{if(!problems.has(file))problems.set(file,new Set());problems.get(file).add(layer);};
 for(const row of command(['ls-files','--stage','-z']).split('\0').filter(Boolean)){
  const tab=row.indexOf('\t'),[mode,id,stage]=row.slice(0,tab).split(' '),file=row.slice(tab+1);
  if(stage!=='0')flag(file,'unmerged index');
  staged.set(file,{mode,id,type:mode==='160000'?'commit':'blob'});
 }
 const untracked=command(['ls-files','--others','--exclude-standard','-z']).split('\0').filter(Boolean);
 const permitted=new Set([...META,...QA_FILES]);
 const textExtensions=new Set(['.js','.cjs','.mjs','.json','.geojson','.svg','.csv','.md','.txt','.html','.css','.xml','.yml','.yaml','.py','.cff','.toml']);
 const textNames=new Set(['.gitignore','.gitattributes','.nojekyll','LICENSE','ibm-plex-sans-condensed-LICENSE','source-serif-4-LICENSE']);
 const text=file=>textExtensions.has(path.extname(file).toLowerCase())||textNames.has(path.basename(file));
 const canonical=(file,bytes)=>{
  if(!text(file))return bytes;
  try{new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return null;}
  return Buffer.from(norm(bytes.toString('utf8')),'utf8');
 };
 const algorithm=command(['rev-parse','--show-object-format']).trim();assert(['sha1','sha256'].includes(algorithm),'Unsupported Git object format');
 const blobHash=bytes=>crypto.createHash(algorithm).update('blob '+bytes.length+'\0').update(bytes).digest('hex');
 const cache=new Map(),blob=id=>{if(!cache.has(id))cache.set(id,requiredGit(root,['cat-file','blob',id]));return cache.get(id);};
 const sameEntry=(file,a,b)=>{
  if(!a||!b)return a===b;
  if(a.mode!==b.mode||a.type!==b.type)return false;
  if(a.id===b.id)return true;
  if(a.type!=='blob'||a.mode==='120000'||!text(file))return false;
  const left=canonical(file,blob(a.id)),right=canonical(file,blob(b.id));return !!left&&!!right&&left.equals(right);
 };
 for(const file of new Set([...baseline.keys(),...head.keys(),...staged.keys(),...untracked])){
  if(permitted.has(file))continue;
  const base=baseline.get(file);
  for(const[label,entries]of [['HEAD',head],['index',staged]]){
   const entry=entries.get(file);
   if(!sameEntry(file,base,entry))flag(file,label);
   else if(base&&entry&&base.id!==entry.id)eolOnly.push(label+':'+file);
  }
  const filename=path.join(root,file);let info;
  try{info=fs.lstatSync(filename);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!base){if(info)flag(file,'worktree/new');continue;}
  if(!info){flag(file,'worktree/deleted');continue;}
  if(base.type!=='blob'||(base.mode==='120000'?!info.isSymbolicLink():!info.isFile())){flag(file,'worktree/type');continue;}
  const bytes=base.mode==='120000'?Buffer.from(fs.readlinkSync(filename)):fs.readFileSync(filename);
  if(blobHash(bytes)===base.id)continue;
  if(base.mode!=='120000'&&text(file)){
   const normalizedBytes=canonical(file,bytes);
   if(normalizedBytes&&blobHash(normalizedBytes)===base.id){eolOnly.push('worktree:'+file);continue;}
   const baselineBytes=normalizedBytes&&canonical(file,blob(base.id));
   if(normalizedBytes&&baselineBytes&&normalizedBytes.equals(baselineBytes)){eolOnly.push('worktree:'+file);continue;}
  }
  flag(file,'worktree');
 }
 assert.equal(problems.size,0,'Unauthorized E62-01 paths versus '+TECHNICAL+': '+[...problems].sort(([a],[b])=>a.localeCompare(b)).map(([file,layers])=>file+' ['+[...layers].join(', ')+']').join('; '));
 return {baseline:TECHNICAL,productAllowlist:META,approvedQaFiles:QA_FILES.length,eolOnly};
}
function validateApprovedDate(value){
 assert(typeof value==='string'&&value.length===10&&/^\d{4}-\d{2}-\d{2}$/.test(value),'PUBLISHED requires explicit CARTO_RELEASE_APPROVED_DATE in YYYY-MM-DD format; received '+JSON.stringify(value));
 const [year,month,day]=value.split('-').map(Number),leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 assert(year>=1&&month>=1&&month<=12&&day>=1&&day<=days[month-1],'Invalid approved publication calendar date: '+value+'; expected an existing YYYY-MM-DD date');
 return value;
}
function parseCff(text,root=ROOT){
 const executable=process.env.CARTO_QA_PYTHON||(process.platform==='win32'&&fs.existsSync('C:/Program Files/QGIS 3.40.11/apps/Python312/python.exe')?'C:/Program Files/QGIS 3.40.11/apps/Python312/python.exe':process.platform==='win32'?'python':'python3');
 const result=cp.spawnSync(executable,[path.join(root,'tests/qa/validate-cff.py'),'--stdin'],{input:text,encoding:'utf8',maxBuffer:2*1024*1024,env:{...process.env,PYTHONIOENCODING:'utf-8',PYTHONNOUSERSITE:'1'}});
 if(result.error)throw result.error;
 assert.equal(result.status,0,result.stderr||'CFF YAML/schema validation failed');
 return JSON.parse(result.stdout);
}
function index(text){const c={window:{}};vm.runInNewContext(text,c);return plain(c.window.CARTO_SEARCH_INDEX);}
function views(html){
 const status=html.match(/<h3>Statut și QGIS<\/h3><p>([\s\S]*?)<\/p>/)?.[1];
 const citation=html.match(/<section id="cum-citezi"[^>]*>[\s\S]*?<p>[\s\S]*?<\/p><p>([\s\S]*?)<\/p>/)?.[1];
 assert(status&&citation,'Existing About metadata boundaries retained');
 return {status:words(status),citation:words(citation)};
}
function maskViews(text){
 return text.replace(/(<h3>Statut și QGIS<\/h3>)<p>[\s\S]*?<\/p>/,'$1<p>STATUS</p>')
  .replace(/(<section id="cum-citezi"[^>]*>[\s\S]*?<p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/,'$1<p>CITATION</p>');
}
function historicalContract(root){
 const read=f=>fs.readFileSync(path.join(root,f));
 // Both the immutable snapshot and the exact-exception policy are frozen.
 for(const f of ['tests/fixtures/v3-contract.json','tests/protected-files.cjs','data/content-manifest.js','data/learning-model.js'])
  assert.equal(hash(norm(read(f))),hash(norm(git(root,TECHNICAL,f))),'Historical/pedagogical file changed: '+f);
 const snapshot=JSON.parse(read('tests/fixtures/v3-contract.json'));
 assert.equal(snapshot.commit,V3);
 const protection=require(path.join(root,'tests/protected-files.cjs'));
 let intact=0,exceptions=0;
 for(const [f,h]of Object.entries(snapshot.protectedFiles)){
  assert.equal(protection.digest(f,read(f)),protection.expectedHash(f,h),'Protected v3 file changed: '+f);
  if(protection.intentionalUpdates[f])exceptions++;else intact++;
 }
 assert.equal(intact,194);assert.equal(exceptions,9);
 const c={window:{}};for(const f of ['data/content-manifest.js','data/learning-model.js'])vm.runInNewContext(read(f).toString(),c);
 const content=c.window.CARTO_CONTENT,model=c.window.CARTO_LEARNING;
 assert.equal(content.lessons.length,73);assert.equal(model.activePath.length,24);
 assert.deepEqual(Object.keys(model.plan.endings).sort(),['medical','population','raster']);
 const historicalCff=parseCff(git(root,V3,'CITATION.cff').toString(),root);
 assert.equal(historicalCff.version,'3.0.0','Historical release version remains v3');
 assert.equal(content.version,'3.0.0','Legacy manifest contract is independent of current release version');
 return {intact,exceptions,destinations:73,steps:24,projects:3,manifestVersion:content.version};
}
function validateRelease(root=ROOT,env=process.env){
 const read=f=>norm(fs.readFileSync(path.join(root,f),'utf8'));
 const reference=Object.fromEntries(META.map(f=>[f,norm(git(root,TECHNICAL,f).toString())]));
 const current=Object.fromEntries(META.map(f=>[f,read(f)]));
 const cff=parseCff(current['CITATION.cff'],root),original=parseCff(reference['CITATION.cff'],root);
 const expected=env.CARTO_RELEASE_EXPECTED_STATE||'AUTO';
 assert(['AUTO','CANDIDATE','PUBLISHED'].includes(expected),'Unknown release verification mode');
 const state=Object.hasOwn(cff,'date-released')?'PUBLISHED':'CANDIDATE';
 assert(expected==='AUTO'||state===expected,'Expected '+expected+' release, found '+state);
 assert.equal(cff.version,'4.0.0','Current software release is v4.0.0');
 const about=views(current['about.html']),source=views(current['js/site.js']);
 assert.deepEqual(about,source,'Static About and authoritative source metadata agree');
 const records=index(current['data/search-index.js']),oldIndex=index(reference['data/search-index.js']);
 assert.equal(records.length,90);assert.deepEqual(records.map(r=>[r.id,r.href]),oldIndex.map(r=>[r.id,r.href]),'90 search identities/URLs unchanged');
 assert.equal(records.filter(r=>!r.parentId).length,72);
 for(const r of records)if(r.id!=='about')assert.deepEqual(r,oldIndex.find(x=>x.id===r.id),'Non-metadata search content unchanged: '+r.id);
 const aboutRecord=records.find(r=>r.id==='about');
 for(const text of Object.values(about))assert(aboutRecord.paragraphs.some(p=>words(p)===text),'About metadata is synchronized into search index');
 // Outside the two existing metadata paragraphs, the source and generated About
 // must still be exactly the independently audited product.
 for(const f of ['about.html','js/site.js'])assert.equal(maskViews(current[f]),maskViews(reference[f]),'Only existing About metadata may change: '+f);
 if(state==='CANDIDATE'){
  assert.deepEqual(cff,original,'Exact approved candidate CFF, parsed as YAML');
  for(const f of META.filter(f=>f!=='CITATION.cff'))assert.equal(current[f],reference[f],'Exact approved candidate content: '+f);
  assert(!cff.doi&&!Object.hasOwn(cff,'date-released'),'Candidate has no publication date or version DOI');
 }else{
  const date=validateApprovedDate(env.CARTO_RELEASE_APPROVED_DATE);
  assert.equal(cff['date-released'],date,'Publication date equals independently approved date');
  const approvedDoi=env.CARTO_RELEASE_APPROVED_DOI;
  if(approvedDoi){
   assert(/^10\.5281\/zenodo\.\d+$/.test(approvedDoi)&&!PRIOR_DOIS.includes(approvedDoi),'Approved v4 DOI must be distinct from concept/prior versions');
   assert.equal(cff.doi,approvedDoi,'CFF version DOI equals explicitly verified identifier');
  }else assert(!Object.hasOwn(cff,'doi'),'Version DOI is forbidden until independently assigned and approved');
  assert.equal(cff.identifiers.length,1);assert.equal(cff.identifiers[0].type,'doi');assert.equal(cff.identifiers[0].value,CONCEPT);
  assert(/concept/i.test(cff.identifiers[0].description)&&!/unpublished|candidat/i.test(cff.identifiers[0].description),'Concept DOI scope remains explicit');
  const baselineBody=original.abstract.replace(/^Unpublished 4\.0\.0 candidate\. /,'');
  assert(['Published 4.0.0 release. ','Version 4.0.0. '].some(prefix=>cff.abstract===prefix+baselineBody),'Scientific abstract/license scopes unchanged outside release prefix');
  const fixed=plain(cff);delete fixed['date-released'];delete fixed.doi;
  fixed.message=original.message;fixed.abstract=original.abstract;fixed.identifiers=original.identifiers;
  assert.deepEqual(fixed,original,'All other CFF fields and scoped licenses remain unchanged');
  const changes=current['CHANGELOG.md'].split(/^## v3\.0\.0\s*$/m);
  assert.equal(changes.length,2);assert.equal(changes[1],reference['CHANGELOG.md'].split(/^## v3\.0\.0\s*$/m)[1],'Historical changelog unchanged');
  assert(/^# Explorare geospațială v4\.0\.0\b/.test(current['README.md']),'README identifies the current v4 release');
  assert(/^## v4\.0\.0\b/m.test(changes[0]),'Changelog identifies the current v4 release');
  const releaseTexts={message:cff.message,abstract:cff.abstract,identifiers:JSON.stringify(cff.identifiers),readme:current['README.md'],changelog:changes[0],about:about.status,citation:about.citation};
  for(const [name,text]of Object.entries(releaseTexts))assert(!candidate(text),'PUBLISHED contains contradictory candidate wording: '+name);
  for(const [name,text]of Object.entries({message:cff.message,readme:current['README.md'],changelog:changes[0],about:about.status,citation:about.citation}))assert(published(text),'Explicit published v4 status: '+name);
  for(const [name,text]of Object.entries({readme:current['README.md'],changelog:changes[0],about:about.status}))assert(text.includes(date),'Approved publication date visible: '+name);
  // Only the candidate-specific README paragraphs can change. The retained
  // educational scope, limits, provenance and license paragraphs stay intact.
  for(const paragraph of reference['README.md'].split(/\n\s*\n/))if(paragraph.trim()&&!candidate(paragraph))assert(current['README.md'].includes(paragraph),'Retained README paragraph: '+paragraph.slice(0,70));
  const allowed=new Set([...PRIOR_DOIS,...(approvedDoi?[approvedDoi]:[])]);
  for(const text of Object.values(releaseTexts))for(const match of text.matchAll(/10\.\d{4,9}\/[\w./-]+/g))assert(allowed.has(match[0].replace(/[.,]+$/,'')),'Unapproved DOI in publication metadata: '+match[0]);
 }
 const history=historicalContract(root);
 const perimeter=validatePerimeter(root);
 return {state,cff,about,history,perimeter,indexRecords:records.length,searchResources:72};
}
async function validateRenderedRelease(page,release){
 const status=page.locator('h3').filter({hasText:/^Statut și QGIS$/}).locator('..').locator('p').first();
 if(await status.count()){
  assert.equal(words(await status.innerText()),release.about.status,'Rendered About status agrees with validated metadata');
  assert.equal(words(await page.locator('#cum-citezi > p').nth(1).innerText()),release.about.citation,'Rendered citation agrees with validated metadata');
 }else{
  assert.equal(await page.locator('#cum-citezi a[href="about.html#cum-citezi"]').count(),1,'Resources delegates status/citation to About');
 }
}
module.exports={validateRelease,validateRenderedRelease,parseCff,historicalContract,validatePerimeter,validateApprovedDate,QA_FILES,TECHNICAL,V3,CONCEPT};
if(require.main===module){const release=validateRelease();console.log(JSON.stringify({status:'PASS',state:release.state,cffVersion:release.cff['cff-version'],version:release.cff.version,history:release.history,indexRecords:release.indexRecords,searchResources:release.searchResources}));}
