// Run only on the immutable v3 commit, before changing shared renderers.
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const {execFileSync}=require('node:child_process');
const {fromGit}=require('./protected-files.cjs');
const sha='6c36a95c2bb58d31208efbee4b9f3595130bb814';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
(async()=>{
  if(git('rev-parse','HEAD')!==sha)throw Error('Snapshot requires v3 baseline HEAD');
  git('diff','--exit-code',sha,'--','data','js','css','*.html','tutorials');
  const {CARTO_CONTENT:manifest}=loadModel();
  const data={commit:sha,inventory:manifest.lessons.map(({id,href,editorial_number,lab_id,source_section,source_pages})=>({id,href,editorial_number,lab_id,source_section,source_pages})),routes:{},operations:JSON.parse(fs.readFileSync(path.join(root,'data/processing-operations.json'),'utf8')).map(o=>({id:o.id,model:o.model,qgis_url:o.qgis_url})),protectedFiles:{},storageSources:{}};
  data.queryParameters={lesson:'id',laboratories:manifest.lessons.filter(l=>l.lab_id).map(l=>l.lab_id).sort(),additional:['L07-design','operation'],stateVersion:1};
  data.challengeIds=JSON.parse(fs.readFileSync(path.join(root,'data/challenges/challenges.json'),'utf8')).challenges.map(c=>c.id);
  const files=git('ls-files','-z','js','data','assets').split('\0').filter(Boolean);
  const shared=new Set(['js/site.js','js/app.js','js/search.js','js/learning.js','data/content-manifest.js','data/learning-model.js','data/learning-pages.js','data/search-index.js','data/tutorial-catalog.json']);
  for(const file of files){
    const bytes=fs.readFileSync(path.join(root,file));
    if(!shared.has(file))data.protectedFiles[file]=null;
    if(file.endsWith('.js')&&/localStorage|sessionStorage/.test(bytes.toString()))data.storageSources[file]=bytes.toString().split(/\r?\n/).filter(line=>/localStorage|sessionStorage|(?:const|let) (?:key|KEY)|georef-lab|carto-challenge/.test(line)).map(line=>line.trim());
  }
  Object.assign(data,fromGit(Object.keys(data.protectedFiles)));
  const service=await browserServer();const errors=[];
  try {
    const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));
    for(const lesson of manifest.lessons){
      await page.goto(service.base+lesson.href);await page.waitForTimeout(120);
      data.routes[lesson.id]=await page.evaluate(()=>({anchors:[...new Set([...document.querySelectorAll('[id]')].map(e=>e.id))].sort(),scripts:[...document.scripts].map(s=>s.getAttribute('src')).filter(Boolean)}));
    }
    if(errors.length)throw Error([...new Set(errors)].join('\n'));
  }finally{await service.close();}
  fs.mkdirSync(path.join(__dirname,'fixtures'),{recursive:true});
  fs.writeFileSync(path.join(__dirname,'fixtures/v3-contract.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`PASS v3 snapshot: ${data.inventory.length} destinations, ${Object.keys(data.protectedFiles).length} protected files, ${data.operations.length} operations`);
})().catch(e=>{console.error(e);process.exitCode=1;});
