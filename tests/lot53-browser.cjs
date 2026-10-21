// Integration tests for actual scoped routes; opening a page never records completion.
const assert=require('node:assert/strict');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const {CARTO_LEARNING:model,CARTO_CONTENT:content}=loadModel();
const {validateLearning}=require('../tools/validate-learning.cjs');
const ops=JSON.parse(fs.readFileSync(path.join(root,'data/processing-operations.json'),'utf8'));
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);};
eq(model.activePath,['coordinates','map-definition','map-classification','map-exterior','map-frame','map-interior','geospatial-data','scale-resolution','rectangular-coordinates@intro','method-signs','method-qualitative','workflow@intro','T01@core','earth-to-map','projection-basics','rectangular-coordinates','projection-crs-lab','measurement-lab','workflow','method-choropleth','classification-lab','gis-calculator','analysis','data-quality'],'Approved 24 scoped steps, independent expected progression');
eq(validateLearning(content,model,ops),[],'Valid integrated graph');
const mutation=fn=>{const m=structuredClone(JSON.parse(JSON.stringify(model)));fn(m);ok(validateLearning(content,m,ops).length>0,'Invalid progression rejected');};
mutation(m=>m.plan.endings.population.splice(0,1));
mutation(m=>m.plan.endings.raster.splice(0,1));
mutation(m=>m.plan.stages[1].items[2]='rectangular-coordinates');
mutation(m=>m.segments['final-project@medical'].terminal=false);
mutation(m=>m.plan.endings.medical.push('coordinates'));
(async()=>{
 const service=await browserServer(),errors=[],failures=[],out=path.join(root,'tmp/qa/lot53');fs.mkdirSync(out,{recursive:true});
 try{
 const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(service.base))failures.push(r.url());});
 const navFor=ref=>ref.includes('@')?page.locator('[data-learning-scope="'+ref+'"]'):page.locator('.learning-continuation');
 async function visit(ref){
  await page.goto(service.base+model.target(ref));
  const hash=new URL(page.url()).hash;
  if(hash){const anchor=page.locator('[id="'+hash.slice(1)+'"]');await anchor.waitFor({state:'visible'});}
  ok((await page.locator('main .lesson-breadcrumb').innerText()).includes(content.lessons.find(l=>l.id===model.resourceId(ref)).title),'Canonical breadcrumb '+ref);
 }
 await page.goto(service.base+'index.html');await page.locator('.learning-home a[href="learning-path.html"]').first().click();
 eq(await page.locator('.learning-stages > li').count(),7,'Seven visible stages');
 for(const ref of model.activePath)eq(await page.locator('.learning-stages a[href="'+model.target(ref)+'"]').count(),1,'Each common step displayed once '+ref);
 // Follow actual primary links across all common steps, including query/hash routes.
 await page.locator('.learning-stages a[href="coordinates.html"]').click();
 for(const [i,ref] of model.activePath.entries()){
  eq(page.url(),service.base+model.target(ref),'Real navigation reaches scoped step '+ref);
  const nav=navFor(ref);await nav.waitFor();
  const primary=nav.locator('a.continuation-primary').first();
  const expected=model.activePath[i+1]||'final-project';
  eq(await primary.evaluate(a=>a.href),service.base+model.target(expected),'Derived next '+ref);
  const hrefs=await nav.locator('a').evaluateAll(a=>a.map(e=>e.href));eq(hrefs.length,new Set(hrefs).size,'No duplicate action '+ref);
  await primary.click();await page.waitForURL(service.base+model.target(expected));
 }
 eq(await page.locator('[data-project-variant]').count(),3,'One page, three application preparations');
 for(const [name,ending] of Object.entries(model.plan.endings)){
  const prep=page.locator('[data-project-variant="'+name+'"]');
  for(const ref of ending.slice(0,-1))ok(await prep.locator('a[href="'+model.target(ref)+'"]').count()===1,'Preparation '+name+'/'+ref);
  for(const ref of ending.slice(0,-1)){
   await visit(ref);const next=model.recommendedNext(ref);const a=page.locator('.learning-continuation a.continuation-primary').first();
   eq(await a.evaluate(e=>e.href),service.base+model.target(next),'Application continuation '+name+'/'+ref);await a.click();await page.waitForURL(service.base+model.target(next));
  }
  await visit(ending.at(-1));eq(model.continuations(ending.at(-1)),[],'Explicit terminal '+name);
  eq(await page.locator('.learning-continuation .continuation-primary').count(),0,'No automatic restart');
  await page.goto(service.base+'final-project.html');
 }
 // WFi anchors survive every dynamic panel change; they are static siblings, not replaced panels.
 for(const fragment of ['etape','proiect-date','workflow-integral']){
  await page.goto(service.base+'index.html');
  await page.goto(service.base+'workflow.html#'+fragment);
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(id=>{const e=document.getElementById(id);return e&&scrollY>100&&e.getBoundingClientRect().top<innerHeight/2&&e.getBoundingClientRect().bottom>100;},fragment);
  ok(true,'Workflow fragment actually scrolled into view after JS '+fragment);
  for(const key of ['data','crs','attributes','query','processing','symbology','layout','export']){
   await page.locator('[data-workflow="'+key+'"]').click();
   eq(await page.locator('#etape').count(),1,'Overview preserved');eq(await page.locator('#proiect-date').count(),1,'Project/data preserved');
   eq(await page.locator('[data-learning-scope="workflow@intro"] a.continuation-primary').getAttribute('href'),model.target('T01@core'),'Intro continuation survives panel');
  }
 }
 for(const hash of ['concept-rect','grila','sisteme-rect','crs-grid']){
  await page.goto(service.base+'index.html');await page.goto(service.base+'lesson.html?id=rectangular-coordinates#'+hash);
  await page.waitForFunction(id=>{const e=document.getElementById(id);return e&&scrollY>100&&e.getBoundingClientRect().top<innerHeight;},hash);
  ok(await page.locator('#'+hash).isVisible(),'Dynamic fragment works '+hash);
 }
 // E53-01: beginners get a usable instruction and real links to later CRS study.
 await page.goto(service.base+'tutorials/t01.html#t01-core-layout');
 const datum=page.locator('#t01-core-layout');
 const datumText=await datum.innerText();
 ok(datumText.includes('opțiunea implicită recomandată pentru zona Bucureștiului')&&datumText.includes('notează transformarea utilizată'),'Beginner datum instruction');
 ok(datumText.includes('nu este disponibilă sau că lipsesc grile necesare')&&datumText.includes('verifică situația înainte de export'),'Warnings investigated before export');
 ok(!datumText.includes('Verifică CRS-ul sursă și țintă, zona de utilizare'),'Premature advanced criteria removed from core');
 for(const [href,anchor] of [['../lesson.html?id=rectangular-coordinates#sisteme-rect','#sisteme-rect'],['../projection-crs-lab.html','#v3-L03']]){
  await page.goto(service.base+'tutorials/t01.html#t01-core-layout');await datum.locator('a[href="'+href+'"]').click();
  await page.locator(anchor).waitFor({state:'visible'});ok(true,'Core link resolves to existing full resource '+href);
 }
 await page.goto(service.base+'styling-labeling.html');
 const lang=page.locator('[data-p05-lab="L07"] select[data-key="lang"]');
 for(const [language,label] of [['en','Style'],['ro','Stil'],['en','Style']]){
  await lang.selectOption(language);eq(await page.locator('.p05-extra legend').allTextContents(),['A · '+label,'B · '+label],'Live L07 localization');
 }
 await page.locator('[data-p05-lab="L07"] [data-action="share"]').click();const saved=page.url();ok(saved.includes('L07-design='),'Existing L07 state parameter retained');await page.reload();
 eq(await lang.inputValue(),'en','Language restored with existing state');eq(await page.locator('.p05-extra legend').allTextContents(),['A · Style','B · Style'],'Localized legends restored');
 for(const width of [375,390,768,1280])for(const dark of [false,true]){
  await page.setViewportSize({width,height:900});await page.goto(service.base+'index.html');await page.evaluate(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
  for(const route of ['learning-path.html','final-project.html','workflow.html','tutorials/t01.html']){
   await page.goto(service.base+route);eq(await page.locator('body').evaluate(e=>e.classList.contains('dark')),dark,'Actual theme');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width+'/'+route);
   if(width===390&&['learning-path.html','final-project.html'].includes(route))await page.screenshot({path:path.join(out,route.replace('.html','')+'-'+(dark?'dark':'light')+'-390.png')});
   if(width<500){await page.locator('#nav-toggle').click();eq(await page.locator('#nav-toggle').getAttribute('aria-expanded'),'true','Mobile opens');await page.keyboard.press('Escape');eq(await page.locator('#nav-toggle').getAttribute('aria-expanded'),'false','Mobile closes');}
  }
 }
 // Catalogue/direct Lxx entry and canonical operation query routes.
 await page.goto(service.base+'digital-companion.html');await page.locator('.catalog-card[data-lab="L03"] h3 a').click();ok(page.url().includes('projection-crs-lab.html'),'Catalogue enters canonical L03');
 await visit('zarr-cloud-data');ok(await page.locator('.learning-continuation').count()===1,'Direct lab has continuation');
 await page.goto(service.base+'final-project.html');
 const medical=await page.locator('#proiect-medical').innerText();
 for(const text of ['Buffer sau Nearest','nu sunt obligatorii ambele','puncte_interes','Dissolve dezactivat','Select by Location','intersect','creating new selection','Exportă doar bufferele selectate','ID-urile serviciilor păstrate','cel puțin un punct de interes','nu enumeră toate perechile serviciu–punct','nu calculează traseul'])ok(medical.includes(text),'Medical question answered with observable service selection: '+text);
 eq(await page.locator('#proiect-medical a[href$="vectorselection.html#select-by-location"]').count(),1,'Selection has official QGIS documentation');
 const operationLinks=await page.locator('[data-project-operation]').evaluateAll(a=>a.map(e=>({href:e.getAttribute('href'),id:e.dataset.projectOperation})));
 eq([...new Set(operationLinks.map(o=>o.id))].sort(),['raster-slope','vector-buffer','vector-dissolve','vector-intersection','vector-nearest'],'Five documented project operations');
 for(const o of operationLinks){await page.goto(service.base+o.href);await page.locator('#'+(o.id.startsWith('raster')?'raster':'vector')+'-operation-detail').waitFor();ok((await page.locator('main').innerText()).length>100,'Existing operation query resolves '+o.id);}
 await page.goto(service.base+'challenges.html');
 for(const id of ['R1','R2','R3','R4','R5','R6']){
  await page.locator('[data-challenge="'+id+'"]').click();await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
  await page.locator('#challenge-methods').selectOption('raster-'+id.toLowerCase());await page.locator('#challenge-run').click();
  await page.locator('#challenge-results').waitFor({state:'visible',timeout:90000});
  eq(await page.locator('#challenge-results').getAttribute('data-result-kind'),'RASTER','Native raster challenge executed '+id);
  const metrics=await page.locator('#challenge-metrics').innerText();ok(metrics.length>20&&!/NaN|undefined/.test(metrics),'Raster metrics '+id);
 }
 const nojs=await service.browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),staticPage=await nojs.newPage();
 for(const route of ['learning-path.html','final-project.html','workflow.html','tutorials/t01.html']){
  await staticPage.goto(service.base+route);eq(await staticPage.locator('#chapter-nav a').count(),71,'Static menu retained');ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Static mobile layout');
 }
 await staticPage.goto(service.base+'workflow.html#proiect-date');ok(await staticPage.locator('[data-learning-scope="workflow@intro"] a').isVisible(),'Static WFi continuation');await nojs.close();
 eq(errors,[],'No runtime errors');eq(failures,[],'No missing resources');
 const report={status:'PASS',checks,common:24,variants:3,errors,failures};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await service.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
