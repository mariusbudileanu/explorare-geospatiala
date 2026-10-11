// Operation 3: test educational contracts, actual controls and rendered geometry.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),assert=require('node:assert/strict');
const {root,playwright,browserOptions,manifest,inspectNavigation}=require('./expectations.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const context={window:{}};for(const p of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js'])vm.runInNewContext(read(p),context);
const model=JSON.parse(JSON.stringify(context.window.CARTO_LEARNING)),glossary=JSON.parse(JSON.stringify(context.window.CARTO_GLOSSARY)),content=manifest();
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
const equal=(a,b,message)=>{checks++;assert.deepEqual(a,b,message);};
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—-]/g,' ');
equal(Object.values(model.levels).map(l=>l.label),['Începător','Intermediar','Avansat'],'Three textual levels');
const referenceOnly=new Set(['home','about','resources']);
equal(Object.keys(model.items).sort(),content.lessons.filter(l=>!referenceOnly.has(l.id)).map(l=>l.id).sort(),'Every classifiable destination, no extra route');
const observable=/^(Identifici|Explici|Interpretezi|Convertești|Distingi|Verifici|Compari|Alegi|Clasifici|Reproduci|Construiești|Formulezi|Justifici|Separi|Documentezi|Încarci|Creezi|Filtrezi)/;
for(const [id,item] of Object.entries(model.items)){
 ok(model.levels[item.level],id+' valid level');ok(item.reason.length>20,id+' substantive classification');
 ok(item.outcomes.length>=2&&item.outcomes.every(t=>observable.test(t)),id+' observable outcomes');
 for(const p of [...item.prerequisites,item.next])ok(model.items[p]&&p!==id,id+' real prerequisite/continuation '+p);
 if(item.level!=='beginner')ok(item.prerequisites.length>0,id+' explicit prior knowledge');
}
for(const stage of model.stages)for(const id of stage.items)ok(model.items[id],'Real path destination: '+id);
for(const workshop of JSON.parse(read('data/tutorial-catalog.json')))equal(workshop.level,model.levels[model.items[workshop.id].level].label,'Catalogue level derives from model: '+workshop.id);
let questionCount=0,diagnostics=0;for(const [id,questions] of Object.entries(model.checks)){
 ok(questions.length>=1&&questions.length<=3,id+' compact checks');
 const ids=new Set();for(const q of questions){questionCount++;diagnostics+=Number(q.diagnostic);ok(!ids.has(q.id),'Unique question ID');ids.add(q.id);ok(q.options.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,'Answer exists');ok(q.explanation.length>80,'Explanatory feedback');}
}
ok(diagnostics>=3,'At least three diagnostic exercises');
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(read('js/learning.js')),'No score/progress persistence or network dependency');
ok(glossary.length>=40&&glossary.length<=65,'Compact complete glossary');
equal(glossary.map(t=>t.term_ro),[...glossary].sort((a,b)=>a.term_ro.localeCompare(b.term_ro,'ro',{sensitivity:'base'})).map(t=>t.term_ro),'Romanian alphabetic order');
for(const term of glossary){ok(term.term_ro&&term.term_en,'Bilingual term');ok((term.modern_definition||term.historical_definition).length>20,'Definition');if(term.lesson_id)ok(model.items[term.lesson_id],'Glossary links into actual content');}
const cff=JSON.parse(read('CITATION.cff'));equal(cff['cff-version'],'1.2.0');equal(cff.authors,[{'family-names':'Budileanu','given-names':'Marius'}]);
ok(!/affiliation|email|orcid|doi|date-released|"version"/.test(JSON.stringify(cff)),'No excluded citation metadata');
equal(cff.title,'Explorare geospațială');equal(cff['repository-code'],'https://github.com/mariusbudileanu/explorare-geospatiala');
ok(read('README.md').includes('Budileanu, M. (2026). *Explorare geospațială*.\n'),'Exact README citation');
const server=http.createServer((req,res)=>{const uri=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname);if(!uri.startsWith('/explorare-geospatiala/'))return res.writeHead(404).end();const relative=uri.slice('/explorare-geospatiala/'.length)||'index.html',file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||relative.startsWith('content/')||relative.startsWith('tmp/'))return res.writeHead(404).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const pages=['index.html','learning-path.html','glossary.html','data-quality.html','final-project.html','resources.html','tutorials/t05.html'];
const out=path.join(root,'tmp/qa/operation3');fs.mkdirSync(out,{recursive:true});
async function unobstructed(page,selector){const element=page.locator(selector).first();await element.scrollIntoViewIfNeeded();ok(await element.evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.left+Math.min(10,r.width/2),r.top+r.height/2);return !!top&&e.contains(top)&&!top.closest('#sidebar');}),'Actual hit target unobstructed: '+selector);}
async function internalLinks(page){const links=await page.locator('.learning-context a,.learning-continuation a,.learning-main a,.learning-home a').evaluateAll(es=>es.map(a=>a.href));for(const href of new Set(links)){const url=new URL(href);if(url.origin!==new URL(page.url()).origin)continue;ok(url.pathname.startsWith('/explorare-geospatiala/'),'Project Pages base path');const response=await page.request.get(href);ok(response.ok(),'Destination responds: '+href);if(url.hash){const html=await response.text();ok(html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),'Actual target anchor '+href);}}}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`;
 const browser=await playwright().chromium.launch(browserOptions());const errors=[],layouts=[],contrast=[];
 try{
  const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  for(const lesson of content.lessons){await page.goto(base+lesson.href);ok(await page.locator('main h1').count()===1,'One heading '+lesson.id);await inspectNavigation(page,content,base);checks++;
   if(model.items[lesson.id]){equal(await page.locator('main > .learning-context .level-badge').innerText(),model.levels[model.items[lesson.id].level].label,'Correct visible level '+lesson.id);equal(await page.locator('.learning-continuation').count(),1,'One continuation '+lesson.id);}
   if(/^T0[1-6]$/.test(lesson.id))equal(await page.locator('.tutorial-meta > span').first().innerText(),model.levels[model.items[lesson.id].level].label,'Workshop hero has the same level');
   if(lesson.id==='tutorials')for(const card of await page.locator('.workshop-card-top').all()){const id=await card.locator('.workshop-id').innerText();ok((await card.innerText()).includes(model.levels[model.items[id].level].label),'Workshop card has the same level: '+id);}
  }
  await page.goto(base+'lesson.html?id=rectangular-coordinates');await page.locator('[data-info="level"]').click();ok((await page.locator('#filter-info-content').innerText()).includes('separat de nivelul pedagogic'),'Detail filter is distinct from difficulty');equal(await page.locator('[data-filter="level"]').evaluateAll(es=>es.map(e=>e.parentElement.textContent.trim())),['Esențial','Detaliat','Extins'],'Detail labels do not introduce competing difficulty levels');
  for(const [id,questions] of Object.entries(model.checks)){
   const lesson=content.lessons.find(l=>l.id===id);await page.goto(base+lesson.href);
   for(const q of questions){const form=page.locator(`[data-learning-question="${q.id}"]`),feedback=form.locator('[role="status"]');
    await form.locator('button[type=submit]').click();ok((await feedback.innerText()).includes('Alege o variantă'),'Unanswered feedback');
    const radios=form.locator('input[type=radio]');await radios.nth((q.answer+1)%q.options.length).check();await form.locator('button[type=submit]').click();ok((await feedback.innerText()).startsWith('Revizuiește'),'Wrong answer explained');ok((await feedback.innerText()).includes(q.explanation),'Full explanation');
    await radios.nth(q.answer).focus();await page.keyboard.press('Space');await form.locator('button[type=submit]').focus();await page.keyboard.press('Enter');ok((await feedback.innerText()).startsWith('Alegere justificată'),'Keyboard correct answer');
    await form.locator('button[type=reset]').click();equal(await radios.filter({visible:true}).evaluateAll(es=>es.filter(e=>e.checked).length),0,'Reset radio selection');equal(await feedback.innerText(),'','Reset feedback');
   }
  }
  const terms=['acuratețe','precizie','incertitudine','NoData','NULL','lineage','metadate','proiect final','începător','avansat','Stereo 70','EPSG:3844','hillshade','GeoPackage'];
  for(const term of [...terms,'ACURATEȚE','acuratete']){await page.goto(base+'index.html');await page.locator('#search').fill(term);const hits=await page.locator('#search-results a').evaluateAll(es=>es.map(e=>({text:e.textContent,snippet:e.querySelector('small').textContent,href:e.href})));ok(hits.length>0,'Search '+term);ok(hits.some(h=>normalized(h.snippet).includes(normalized(term))),'Contextual snippet '+term);const destination=hits[0].href;await page.locator('#search-results a').first().click();equal(page.url(),destination,'Search click '+term);}
  await page.goto(base+'glossary.html');const filter=page.locator('#glossary-filter');for(const term of ['NULL','NoData','EPSG-no-such-term','ACURATEȚE','acuratete','Spatial Join']){await filter.fill(term);const visible=await page.locator('.glossary-entry:visible').count();ok(term==='EPSG-no-such-term'?visible===0:visible>0,'Glossary filter '+term);ok((await page.locator('#glossary-status').innerText()).startsWith(visible+' din'),'Live glossary count');}
  await page.locator('#glossary-reset').focus();await page.keyboard.press('Enter');equal(await page.locator('.glossary-entry:visible').count(),glossary.length,'Keyboard clears glossary');ok(await filter.evaluate(e=>e===document.activeElement),'Filter focus returns');
  const citation='Budileanu, M. (2026). Explorare geospațială.';
  for(const route of ['about.html','lesson.html?id=about','resources.html']){await page.goto(base+route);equal(await page.locator('#cum-citezi > p').first().innerText(),citation,'Exact citation '+route);ok(!(await page.locator('#cum-citezi').innerText()).includes('DOI'),'No release speculation in citation');if(route!=='resources.html')ok((await page.locator('main').innerText()).includes('Universitatea din București, Facultatea de Geografie'),'Affiliation remains separately');}
  await page.goto(base+'data-quality.html');const text=await page.locator('main').innerText();for(const term of ['Acuratețe ≠ precizie ≠ rezoluție','Proximitate ≠ accesibilitate','Overlay ≠ cauzalitate','Geometry change ≠ attribute reallocation','NULL','NoData','lineage','provenance','completitudine','consistență','actualitate'])ok(normalized(text).includes(normalized(term)),'Quality concept '+term);
  const definitions=await page.locator('#acuratete-precizie-rezolutie dd').allTextContents();ok(/referință/.test(definitions[0]),'Accuracy uses a documented reference');ok(/măsurări repetate/.test(definitions[1])&&/abatere sistematică/.test(definitions[1]),'Precision permits systematic bias');ok(/nu garantează acuratețe/.test(definitions[2]),'Finer resolution does not imply accuracy');
  const missing=await page.locator('#valori-lipsa').innerText();ok(/NULL.*absentă sau necunoscută/.test(missing)&&/0 este o valoare numerică/.test(missing),'NULL and observed zero are distinct');ok(/originalul Hansen/.test(missing)&&/subset procesat.*mască/.test(missing),'Original no-loss encoding is distinct from subset mask');
  const assumptions=await page.locator('#ipoteze').innerText();ok(/nu este automat cel mai accesibil/.test(assumptions),'Nearest facility does not establish accessibility');ok(/nu demonstrează.*cauzat/.test(assumptions),'Overlay does not establish causation');ok(/SUM\(population\).*nu este automat/.test(assumptions)&&/estimare ipotetică/.test(assumptions),'Clip total has no automatic population reallocation');
  await page.goto(base+'final-project.html');equal(await page.locator('.project-steps > li').count(),11,'Eleven project requirements');equal(await page.locator('#autoevaluare dt').count(),8,'Eight rubric dimensions');equal(await page.locator('main .learning-grid > article').count(),3,'Three controlled directions');
  for(const width of [1440,1024,768,390])for(const dark of [false,true])for(const route of pages){await page.setViewportSize({width,height:1000});await page.addInitScript(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);await page.goto(base+route);await page.waitForTimeout(100);
   const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,duplicateIds:[...document.querySelectorAll('[id]')].map(e=>e.id).filter((id,i,a)=>a.indexOf(id)!==i)}));ok(geometry.scroll<=width+1,'No page overflow '+route+'/'+width+'/'+dark);equal(geometry.duplicateIds,[],'No duplicate IDs');await unobstructed(page,'main h1');
   for(const element of await page.locator('.level-badge:visible').all())ok((await element.innerText()).length>0,'Textual badge, not color only');
   const ratios=await page.locator('.level-badge').evaluateAll(es=>{const lum=color=>{const values=color.match(/[\d.]+/g).slice(0,3).map(Number).map(x=>x/255).map(x=>x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4));return .2126*values[0]+.7152*values[1]+.0722*values[2];};return es.map(e=>{const s=getComputedStyle(e),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});});ok(ratios.every(r=>r>=4.5),'Badge contrast '+width+'/'+dark);contrast.push(...ratios);
   if(route==='glossary.html'){await filter.fill('precision');ok(await page.locator('.glossary-entry:visible').count()>0,'Glossary in each layout');await page.locator('#glossary-reset').click();}
   if(route==='tutorials/t05.html'){await page.locator('#clip-share').fill('30');await page.locator('#clip-share').dispatchEvent('input');equal((await page.locator('#clip-attribute').innerText()).trim(),'100','T05 Clip stays 100');equal((await page.locator('#clip-estimate').innerText()).trim(),'30','T05 hypothetical 30');ok((await page.locator('#clip-populatie').innerText()).includes('uniform'),'T05 hypothesis retained');}
   await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(out,`${route.replace(/[/.]/g,'_')}-${width}-${dark?'dark':'light'}.png`)});layouts.push({route,width,dark});
  }
  for(const route of pages){await page.goto(base+route);await internalLinks(page);}
  const nojs=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'}),staticPage=await nojs.newPage();
  for(const width of [1440,1024,768,390])for(const route of [...pages,'about.html']){await staticPage.setViewportSize({width,height:1000});await staticPage.goto(base+route);ok((await staticPage.locator('main').innerText()).length>200,'Essential static content '+route);await unobstructed(staticPage,'main h1');await unobstructed(staticPage,'nav[aria-label="Navigare fără JavaScript"] a');
   if(route==='glossary.html')equal(await staticPage.locator('.glossary-entry:visible').count(),glossary.length,'Full static glossary');if(route==='resources.html'||route==='about.html')equal(await staticPage.locator('#cum-citezi > p').first().innerText(),citation,'Static citation');
   for(const explanation of await staticPage.locator('.formative-explanation').all()){await explanation.locator('summary').click();ok((await explanation.innerText()).length>100,'No-JS justification is accessible');}
  }await nojs.close();
  // File opening must not acquire a backend or CDN for the new material.
  await page.goto('file:///'+path.join(root,'glossary.html').replace(/\\/g,'/'));await page.locator('#glossary-filter').fill('NULL');ok(await page.locator('.glossary-entry:visible').count()>0,'Offline glossary');
  await page.goto('file:///'+path.join(root,'data-quality.html').replace(/\\/g,'/'));await page.locator('[data-learning-question="precision"] input').nth(1).check();await page.locator('[data-learning-question="precision"] button[type=submit]').click();ok((await page.locator('[data-learning-question="precision"] [role=status]').innerText()).startsWith('Alegere justificată'),'Offline formative control');
  ok(errors.length===0,'No new browser errors: '+errors.join('; '));
  const report={status:'PASS',checks,questionCount,diagnostics,glossaryTerms:glossary.length,layouts:layouts.length,minBadgeContrast:Math.min(...contrast),errors};fs.writeFileSync(path.join(out,'learning-consolidation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
