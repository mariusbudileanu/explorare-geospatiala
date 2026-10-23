'use strict';
// Explicit simulation only: CARTO_QA_SIMULATED_DATE must be a declared fictional
// date. All metadata mutations and negative controls run in an autonomous clone
// under the OS temporary directory. No simulated date/DOI is written to ROOT.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {TECHNICAL,parseCff,QA_FILES}=require('./release-metadata.cjs');
const ROOT=path.resolve(__dirname,'..');
const META=['CITATION.cff','README.md','CHANGELOG.md','js/site.js','about.html','data/search-index.js'];
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function run(command,args,cwd,env=process.env){
 const r=cp.spawnSync(command,args,{cwd,env,encoding:'utf8',maxBuffer:16*1024*1024});
 if(r.error)throw r.error;
 assert.equal(r.status,0,(r.stderr||'')+(r.stdout||''));return r.stdout;
}
function main(){
 const date=process.env.CARTO_QA_SIMULATED_DATE;
 assert(/^\d{4}-\d{2}-\d{2}$/.test(date||''),'Declare a fictional CARTO_QA_SIMULATED_DATE explicitly');
 const original=Object.fromEntries(META.map(f=>[f,sha(fs.readFileSync(path.join(ROOT,f)))]));
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),'carto-v4-release-qa-')),copy=path.join(directory,'repository');
 // Preserve Git/archive LF bytes; inherit no Windows checkout conversion.
 run('git',['clone','--no-local','--no-hardlinks','--no-checkout','--config','core.autocrlf=false',ROOT,copy],directory);
 run('git',['checkout','--detach',TECHNICAL],copy);
 console.log('External autonomous QA copy: '+copy);
 assert(!fs.existsSync(path.join(copy,'.git/objects/info/alternates')),'Clone must not borrow source Git objects');
 for(const f of QA_FILES)fs.copyFileSync(path.join(ROOT,f),path.join(copy,f));
 const read=f=>fs.readFileSync(path.join(copy,f),'utf8');
 const write=(f,data)=>{assert(path.resolve(copy,f).startsWith(copy+path.sep));fs.writeFileSync(path.join(copy,f),data);};
 const env={...process.env,CARTO_RELEASE_EXPECTED_STATE:'PUBLISHED',CARTO_RELEASE_APPROVED_DATE:date};delete env.CARTO_RELEASE_APPROVED_DOI;
 const candidateEnv={...env,CARTO_RELEASE_EXPECTED_STATE:'CANDIDATE'};
 run(process.execPath,['tests/release-metadata.cjs'],copy,candidateEnv);
 const productFiles=run('git',['ls-files','-z'],copy).split('\0').filter(f=>f&&!f.startsWith('tests/'));
 const before=Object.fromEntries(productFiles.map(f=>[f,sha(fs.readFileSync(path.join(copy,f)))]));
 const cff=parseCff(read('CITATION.cff'),copy),candidateCff=JSON.parse(JSON.stringify(cff));
 const candidateAbout=read('about.html');
 cff['date-released']=date;
 cff.message='Metadate pentru versiunea publicată 4.0.0. Pentru citare folosiți metadatele acestei versiuni.';
 cff.abstract=cff.abstract.replace(/^Unpublished 4\.0\.0 candidate\. /,'Published 4.0.0 release. ');
 cff.identifiers[0].description='Concept DOI for the project across versions; not a version-specific DOI.';
 // A real YAML timestamp scalar exercises PyYAML date -> ISO string handling.
 const python=process.env.CARTO_QA_PYTHON||(process.platform==='win32'?'C:/Program Files/QGIS 3.40.11/apps/Python312/python.exe':'python3');
 const yaml=cp.spawnSync(python,['-c',"import sys,json,yaml,datetime; d=json.load(sys.stdin); d['date-released']=datetime.date.fromisoformat(d['date-released']); print(yaml.safe_dump(d,allow_unicode=True,sort_keys=False))"],{input:JSON.stringify(cff),encoding:'utf8',env:{...env,PYTHONIOENCODING:'utf-8',PYTHONNOUSERSITE:'1'}});
 assert.equal(yaml.status,0,yaml.stderr);assert(yaml.stdout.includes('date-released: '+date));write('CITATION.cff',yaml.stdout);
 assert.equal(parseCff(read('CITATION.cff'),copy)['date-released'],date,'Unquoted YAML date normalized to the schema-required ISO string');
 let readme=read('README.md').replace('— candidată nepublicată','— publicată');
 readme=readme.replace(/\*\*Versiune în pregătire:\*\*[^\n]+/,'**Versiune publicată:** 4.0.0, publicată la '+date+'. [Platforma publică](https://mariusbudileanu.github.io/explorare-geospatiala/) reflectă versiunea publicată din main. [Release v4.0.0](https://github.com/mariusbudileanu/explorare-geospatiala/releases/tag/v4.0.0).');
 readme=readme.replace('Candidata v4 oferă','Versiunea v4 oferă');
 readme=readme.replace(/Metadatele versiunii sunt în[^\n]+/,'Metadatele versiunii publicate 4.0.0 sunt în [CITATION.cff](CITATION.cff). Publicată la '+date+'. [DOI-ul de concept](https://doi.org/10.5281/zenodo.23422847) identifică familia de versiuni. DOI-ul specific va fi consemnat după confirmarea arhivării.');
 write('README.md',readme);
 let changelog=read('CHANGELOG.md').replace('## v4.0.0 — candidat, nepublicat','## v4.0.0 — publicată — '+date);
 changelog=changelog.replace(/- Pregătește citarea software-ului 4\.0\.0[^\n]+/,'- Publică metadatele software-ului 4.0.0; DOI-ul specific va fi consemnat după confirmarea arhivării.');write('CHANGELOG.md',changelog);
 let site=read('js/site.js');
 site=site.replace(/(<h3>Statut și QGIS<\/h3>)<p>[\s\S]*?<\/p>/,'$1<p>Versiunea <strong>4.0.0 — publicată</strong>, publicată la '+date+'. DOI-ul de versiune va fi consemnat după confirmarea Zenodo.</p>');
 site=site.replace(/(<section id="cum-citezi"[^>]*>[\s\S]*?<p>[\s\S]*?<\/p>)<p>[\s\S]*?<\/p>/,'$1<p>Metadatele <a href="CITATION.cff">CITATION.cff</a> descriu versiunea publicată 4.0.0. <a href="https://doi.org/10.5281/zenodo.23422847">DOI-ul de concept</a> identifică familia de versiuni. DOI-ul specific va fi consemnat după confirmarea arhivării.</p>');write('js/site.js',site);
 const results=[];
 const execute=(name,args)=>{const output=run(process.execPath,args,copy,env);fs.writeFileSync(path.join(directory,name+'.log'),output);results.push({name,status:'PASS'});console.log('PASS simulated publication: '+name);};
 execute('generate',['tools/build-public-content.mjs']);
 execute('published',['tests/release-metadata.cjs']);
 const schemaFile='tests/fixtures/cff-1.2.0.schema.json',schema=fs.readFileSync(path.join(copy,schemaFile));
 try{
  write(schemaFile,schema.toString('utf8').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
  execute('published-schema-crlf',['tests/release-metadata.cjs']);
 }finally{write(schemaFile,schema);}
 fs.writeFileSync(path.join(directory,'published-auto.log'),run(process.execPath,['tests/release-metadata.cjs'],copy,{...env,CARTO_RELEASE_EXPECTED_STATE:'AUTO'}));
 results.push({name:'published-auto',status:'PASS'});
 const changed=productFiles.filter(f=>sha(fs.readFileSync(path.join(copy,f)))!==before[f]).sort();
 assert.deepEqual(changed,META.toSorted(),'Simulation changes exactly the six authorized metadata/generated files');
 if(process.argv.includes('--full')){
  execute('build',['tests/v4-build.cjs']);
  execute('validator',['tools/validate-learning.cjs']);
  execute('model',['tests/v4-model.cjs']);
  execute('academic-and-hub',['tests/run-existing.cjs','academic-resilience','companion-hub']);
  execute('learning',['tests/qa/learning-consolidation.cjs']);
 }
 const mutated=[...META,'tests/fixtures/v3-contract.json','tests/protected-files.cjs','js/classification-engine.js',schemaFile,'css/design-system.css','js/search.js'];
 const saved=Object.fromEntries(mutated.map(f=>[f,fs.readFileSync(path.join(copy,f))]));
 const negative=[];
 const reject=(name,mutate,pattern,overrides={},target=copy)=>{
  try{
   mutate();const r=cp.spawnSync(process.execPath,['tests/release-metadata.cjs'],{cwd:target,env:{...env,...overrides},encoding:'utf8',maxBuffer:4*1024*1024});
   if(r.error)throw r.error;assert.notEqual(r.status,0,'Negative control accepted: '+name);
   assert(pattern.test(r.stderr),'Expected contract failure, not environment error: '+name+'\n'+r.stderr);
   fs.writeFileSync(path.join(directory,'negative-'+name+'.log'),r.stderr);negative.push({name,status:'REJECTED'});
  }finally{if(target===copy)for(const[f,b]of Object.entries(saved))write(f,b);}
 };
 const modifyCff=fn=>{const value=JSON.parse(JSON.stringify(cff));fn(value);write('CITATION.cff',JSON.stringify(value,null,2));};
 reject('wrong-version',()=>modifyCff(v=>v.version='3.0.0'),/Current software release/);
 reject('published-without-date',()=>modifyCff(v=>delete v['date-released']),/Expected PUBLISHED/);
 reject('invalid-date',()=>modifyCff(v=>v['date-released']='2026-02-30'),/CFF INVALID/);
 reject('unapproved-date',()=>{},/equals independently approved date/,{CARTO_RELEASE_APPROVED_DATE:'2000-01-01'});
 reject('missing-date-approval',()=>{},/requires explicit CARTO_RELEASE_APPROVED_DATE/,{CARTO_RELEASE_APPROVED_DATE:''});
 reject('candidate-messages-with-date',()=>modifyCff(v=>{v.message=candidateCff.message;v.abstract=candidateCff.abstract;}),/Scientific abstract\/license scopes|contradictory candidate/);
 reject('about-disagrees',()=>write('about.html',candidateAbout),/Static About and authoritative source metadata agree/);
 reject('invented-doi',()=>modifyCff(v=>v.doi='10.5281/zenodo.999999999'),/forbidden until independently assigned/);
 reject('doi-differs-from-approval',()=>modifyCff(v=>v.doi='10.5281/zenodo.999999999'),/equals explicitly verified identifier/,{CARTO_RELEASE_APPROVED_DOI:'10.5281/zenodo.999999998'});
 reject('historical-snapshot',()=>write('tests/fixtures/v3-contract.json',read('tests/fixtures/v3-contract.json')+'\n '),/Historical\/pedagogical file changed/);
 reject('historical-engine',()=>write('js/classification-engine.js',read('js/classification-engine.js')+'\n// unauthorized test mutation\n'),/Protected v3 file changed/);
 reject('historical-policy',()=>write('tests/protected-files.cjs',read('tests/protected-files.cjs')+'\n// unauthorized exception policy mutation\n'),/Historical\/pedagogical file changed/);
 reject('altered-cff-schema',()=>write(schemaFile,read(schemaFile)+' '),/CFF INVALID: Official CFF schema changed/);
 reject('release-mode-rejects-candidate',()=>{for(const f of META)write(f,run('git',['show',TECHNICAL+':'+f],copy));},/Expected PUBLISHED/);
 reject('approved-date-invalid-month',()=>{},/Invalid approved publication calendar date: 2099-13-01/,{CARTO_RELEASE_APPROVED_DATE:'2099-13-01'});
 reject('approved-date-invalid-day',()=>{},/Invalid approved publication calendar date: 2026-02-30/,{CARTO_RELEASE_APPROVED_DATE:'2026-02-30'});
 reject('approved-date-invalid-format',()=>{},/YYYY-MM-DD format/,{CARTO_RELEASE_APPROVED_DATE:'31-12-2099'});
 reject('approved-date-trailing-newline',()=>{},/YYYY-MM-DD format/,{CARTO_RELEASE_APPROVED_DATE:date+'\n'});
 reject('perimeter-css-line',()=>write('css/design-system.css',read('css/design-system.css')+'\n'),/Unauthorized E62-01 paths[^\n]*css\/design-system\.css/);
 reject('perimeter-search',()=>write('js/search.js',read('js/search.js')+'\n// Q-01 unauthorized product edit\n'),/Unauthorized E62-01 paths[^\n]*js\/search\.js/);
 const extra='qa-unapproved-release.html';
 try{reject('perimeter-new-file',()=>write(extra,'<!doctype html><title>Unauthorized release file</title>'),/Unauthorized E62-01 paths[^\n]*qa-unapproved-release\.html/);}
 finally{if(fs.existsSync(path.join(copy,extra)))fs.unlinkSync(path.join(copy,extra));}
 reject('perimeter-path-list',()=>{write('css/design-system.css',read('css/design-system.css')+'\n');write('js/search.js',read('js/search.js')+'\n');},/Unauthorized E62-01 paths[^\n]*css\/design-system\.css[^\n]*js\/search\.js/);
 reject('git-unavailable',()=>{},/Required Git verification unavailable/,{PATH:''});
 // CRLF alone remains valid, but a BOM or trailing space is real content.
 try{
  write('css/design-system.css',read('css/design-system.css').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
  write('js/search.js',read('js/search.js').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
  execute('published-product-crlf',['tests/release-metadata.cjs']);
 }finally{for(const f of ['css/design-system.css','js/search.js'])write(f,saved[f]);}
 reject('perimeter-text-bom',()=>write('css/design-system.css',Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),saved['css/design-system.css']])),/Unauthorized E62-01 paths[^\n]*css\/design-system\.css/);
 // Isolate synthetic staging/commits in a second autonomous clone. The main
 // simulation and original repository retain their HEAD and empty index.
 const historyCopy=path.join(directory,'perimeter-history');
 run('git',['clone','--no-local','--no-hardlinks','--no-checkout','--config','core.autocrlf=false',ROOT,historyCopy],directory);
 run('git',['checkout','--detach',TECHNICAL],historyCopy);
 assert(!fs.existsSync(path.join(historyCopy,'.git/objects/info/alternates')));
 for(const f of [...QA_FILES,...META])fs.copyFileSync(path.join(copy,f),path.join(historyCopy,f));
 const historyWrite=(f,b)=>{assert(path.resolve(historyCopy,f).startsWith(historyCopy+path.sep));fs.writeFileSync(path.join(historyCopy,f),b);};
 const historyRun=args=>run('git',args,historyCopy);
 const hooks=path.join(directory,'empty-hooks');fs.mkdirSync(hooks);
 const commit=(...args)=>historyRun(['-c','user.name=Release QA','-c','user.email=qa@example.invalid','-c','commit.gpgsign=false','-c','core.hooksPath='+hooks,'commit',...args]);
 const historyPass=name=>{fs.writeFileSync(path.join(directory,name+'.log'),run(process.execPath,['tests/release-metadata.cjs'],historyCopy,env));results.push({name,status:'PASS'});};
 historyWrite('css/design-system.css',saved['css/design-system.css'].toString('utf8').replace(/\r\n/g,'\n').replace(/\n/g,'\r\n'));
 historyRun(['add','--','css/design-system.css']);historyPass('published-staged-crlf');
 commit('-m','QA control: CRLF-only product bytes');historyPass('published-committed-crlf');
 reject('perimeter-staged-product',()=>{
  historyWrite('js/search.js',Buffer.concat([saved['js/search.js'],Buffer.from('\n// staged Q-01 control\n')]));
  historyRun(['add','--','js/search.js']);historyWrite('js/search.js',saved['js/search.js']);
 },/Unauthorized E62-01 paths[^\n]*js\/search\.js \[index\]/,{},historyCopy);
 commit('-m','QA negative control: forbidden product change');
 const forbiddenCommit=historyRun(['rev-parse','HEAD']).trim();
 commit('--allow-empty','-m','QA control: later commit with no product diff');
 historyRun(['restore','--source='+TECHNICAL,'--staged','--','js/search.js']);
 assert.equal(historyRun(['diff-tree','--no-commit-id','--name-only','-r','HEAD']).trim(),'','Latest commit has no product change; cumulative comparison must still fail');
 reject('perimeter-committed-product',()=>{},/Unauthorized E62-01 paths[^\n]*js\/search\.js \[HEAD\]/,{},historyCopy);
 execute('published-after-negatives',['tests/release-metadata.cjs']);
 const finalChanged=productFiles.filter(f=>sha(fs.readFileSync(path.join(copy,f)))!==before[f]).sort();
 assert.deepEqual(finalChanged,META.toSorted(),'Only six metadata files remain changed after every control');
 for(const[f,h]of Object.entries(original))assert.equal(sha(fs.readFileSync(path.join(ROOT,f))),h,'Real repository metadata changed: '+f);
 const result={status:'PASS',copy,autonomous:true,fictionalDate:date,fictionalDateIsNotARelease:true,productChanges:finalChanged,results,negative,historyControl:{copy:historyCopy,forbiddenCommit,head:historyRun(['rev-parse','HEAD']).trim(),latestCommitProductDiffEmpty:true},realMetadataUnchanged:true};
 fs.writeFileSync(path.join(directory,'results.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({status:'PASS',copy,autonomous:true,fictionalDateOnlyInCopy:true,positiveChecks:results.length,negativeChecks:negative.length,realMetadataUnchanged:true}));
}
try{main();}catch(error){console.error(error);process.exitCode=1;}
