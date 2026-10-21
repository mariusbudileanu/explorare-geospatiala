// Operation 3: test educational contracts, actual controls and rendered geometry.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),assert=require('node:assert/strict');
const {root,playwright,browserOptions,manifest,inspectNavigation}=require('./expectations.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
const context={window:{}};for(const p of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js'])vm.runInNewContext(read(p),context);
const model=JSON.parse(JSON.stringify(context.window.CARTO_LEARNING)),glossary=JSON.parse(JSON.stringify(context.window.CARTO_GLOSSARY)),content=manifest();
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
const equal=(a,b,message)=>{checks++;assert.deepEqual(a,b,message);};
const normalized=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—-]/g,' ');
const workshopLevels={T01:'Începător',T02:'Intermediar',T03:'Intermediar',T04:'Intermediar',T05:'Avansat',T06:'Avansat'};
equal(Object.values(model.levels).map(l=>l.label),['Începător','Intermediar','Avansat'],'Three textual levels');
// The discovery Hub links to classified experiences; it is not another lesson.
const referenceOnly=new Set(['home','about','resources','digital-companion']);
equal(Object.keys(model.items).sort(),content.lessons.map(l=>l.id).sort(),'Every destination has metadata; reference levels may be null');
// P02 adds actual geometry editing and per-cell/per-feature calculation.
// Keep the observable-action whitelist; do not accept vague cognitive outcomes.
const observable=/^(Identifici|Explici|Interpretezi|Convertești|Distingi|Verifici|Compari|Alegi|Clasifici|Reproduci|Construiești|Formulezi|Justifici|Separi|Documentezi|Încarci|Creezi|Filtrezi|Editezi|Calculezi)/;
ok(!observable.test('Înțelegi datele')&&!observable.test('Cunoști GIS'),'Non-observable outcomes remain excluded');
for(const [id,item] of Object.entries(model.items)){
 if(item.level===null){ok(['reference','collection'].includes(content.lessons.find(l=>l.id===id).kind),id+' intentionally has no global level');continue;}
 ok(model.levels[item.level],id+' valid level');ok(item.reason.length>20,id+' substantive classification');
 ok(item.outcomes.length>=2&&item.outcomes.every(t=>observable.test(t)),id+' observable outcomes');
 for(const p of [...item.prerequisites,...(item.next?[item.next]:[])])ok((model.items[p]||model.segments[p])&&p!==id,id+' real resource/segment prerequisite or derived continuation '+p);
 if(item.level!=='beginner')ok(item.prerequisites.length>0,id+' explicit prior knowledge');
}
for(const stage of model.stages)for(const id of stage.items)ok(model.items[id]||(model.segments[id]?.available&&model.items[model.segments[id].resourceId]),'Real resource or supported scoped destination: '+id);
for(const workshop of JSON.parse(read('data/tutorial-catalog.json')))equal(workshop.level,model.levels[model.items[workshop.id].level].label,'Catalogue level derives from model: '+workshop.id);
for(const [id,level] of Object.entries(workshopLevels))equal(model.levels[model.items[id].level].label,level,'Official workshop classification unchanged: '+id);
equal(model.checks.T06[0].options,['Interpolarea biliniară este potrivită tuturor rasterelor.','Nearest neighbour păstrează codurile întregi; verific și NoData și alinierea.','Hillshade poate înlocui codul anual.'],'T06 option only corrects spelling');
equal(model.checks.T06[0].answer,1,'T06 methodological answer unchanged');
const searchContext={window:{}};vm.runInNewContext(read('data/search-index.js'),searchContext);
for(const bridge of JSON.parse(read('data/qgis-links.json')).bridges){const record=searchContext.window.CARTO_SEARCH_INDEX.find(r=>r.id===bridge.lesson_id);ok(record?.paragraphs.includes('În QGIS'),'Index waits for QGIS teaching section: '+bridge.lesson_id);ok(record.paragraphs.some(p=>normalized(p).includes(normalized(bridge.explanation))),'QGIS contextual explanation indexed: '+bridge.lesson_id);}
let questionCount=0,diagnostics=0;for(const [id,questions] of Object.entries(model.checks)){
 ok(questions.length>=1&&questions.length<=3,id+' compact checks');
 const ids=new Set();for(const q of questions){questionCount++;diagnostics+=Number(q.diagnostic);ok(!ids.has(q.id),'Unique question ID');ids.add(q.id);ok(q.options.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length,'Answer exists');ok(q.explanation.length>80,'Explanatory feedback');}
}
ok(diagnostics>=3,'At least three diagnostic exercises');
ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest/.test(read('js/learning.js')),'No score/progress persistence or network dependency');
ok(glossary.length>=40&&glossary.length<=65,'Compact complete glossary');
equal(glossary.map(t=>t.term_ro),[...glossary].sort((a,b)=>a.term_ro.localeCompare(b.term_ro,'ro',{sensitivity:'base'})).map(t=>t.term_ro),'Romanian alphabetic order');
for(const term of glossary){ok(term.term_ro&&term.term_en,'Bilingual term');ok((term.modern_definition||term.historical_definition).length>20,'Definition');if(term.lesson_id)ok(model.items[term.lesson_id],'Glossary links into actual content');}
const cff=JSON.parse(read('CITATION.cff'));equal(cff['cff-version'],'1.2.0');equal(cff.authors,[{'family-names':'Budileanu','given-names':'Marius','affiliation':'University of Bucharest, Faculty of Geography'}]);
ok(!/email|orcid|date-released/.test(JSON.stringify(cff))&&!('doi' in cff)&&!('preferred-citation' in cff),'No fabricated version DOI, publication date or private identifiers');
equal(cff.version,'3.0.0');equal(cff.version,content.version);equal(cff.identifiers,[{"type": "doi", "value": "10.5281/zenodo.23422847", "description": "Concept DOI for all versions of the project; not a version-specific DOI for v3.0.0."}]);
equal(cff.title,'Explorare geospațială');equal(cff['repository-code'],'https://github.com/mariusbudileanu/explorare-geospatiala');
ok(read('README.md').includes('Budileanu, M. (2026). *Explorare geospațială*.\n'),'Exact README citation');
const server=http.createServer((req,res)=>{const uri=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname);if(!uri.startsWith('/explorare-geospatiala/'))return res.writeHead(404).end();const relative=uri.slice('/explorare-geospatiala/'.length)||'index.html',file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||relative.startsWith('content/')||relative.startsWith('tmp/'))return res.writeHead(404).end();fs.readFile(file,(e,data)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const pages=['index.html','learning-path.html','glossary.html','data-quality.html','final-project.html','resources.html','tutorials/t05.html'];
const out=path.join(root,'tmp/qa/operation3');fs.mkdirSync(out,{recursive:true});
async function unobstructed(page,selector){const element=page.locator(selector).first();await element.scrollIntoViewIfNeeded();ok(await element.evaluate(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.left+Math.min(10,r.width/2),r.top+r.height/2);return !!top&&e.contains(top)&&!top.closest('#sidebar');}),'Actual hit target unobstructed: '+selector);}
async function internalLinks(page){const links=await page.locator('.learning-context a,.learning-continuation a,.learning-main a,.learning-home a').evaluateAll(es=>es.map(a=>a.href));for(const href of new Set(links)){const url=new URL(href);if(url.origin!==new URL(page.url()).origin)continue;ok(url.pathname.startsWith('/explorare-geospatiala/'),'Project Pages base path');const response=await page.request.get(href);ok(response.ok(),'Destination responds: '+href);if(url.hash){const html=await response.text();if(html.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))ok(true,'Static target anchor '+href);else{const probe=await page.context().browser().newPage();try{await probe.goto(href);await probe.locator('[id="'+decodeURIComponent(url.hash.slice(1))+'"]').waitFor({state:'visible'});ok(true,'Rendered dynamic target anchor '+href);}finally{await probe.close();}}}}}
async function workshopLevel(page,id){
 const section=page.locator('.tutorial-step').filter({has:page.locator('h3', {hasText:/nivel de dificultate/i})});
 equal(await section.count(),1,'One textual difficulty section '+id);
 equal(await section.locator('.tutorial-prose strong').filter({hasText:new RegExp('^'+workshopLevels[id]+'$')}).count(),1,'Body level equals model '+id);
 ok(!/începător spre intermediar|ușor spre mediu|mediu spre avansat|\bmediu\b/i.test(await section.innerText()),'No competing legacy level '+id);
 equal(await page.locator('main > .learning-context .level-badge').innerText(),workshopLevels[id],'Badge agrees with body '+id);
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`;
 const browser=await playwright().chromium.launch(browserOptions());const errors=[],layouts=[],contrast=[];
 try{
  const page=await browser.newPage({reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
  // Exercise the real extraction function against DOM structure, not known bad strings.
  const {extractSearchContent}=await import('../../tools/search-content.mjs');
  await page.setContent('<main><h1>Fixture</h1><p class="lead">Descriere</p><ul><li><a>hartă</a><span class="level-badge">Începător</span><p>Localizează</p></li><li><div>informației.</div><div>Coordonatele</div></li></ul><p>re<strong>pro</strong>iectare EPSG:3844; RO–EN</p><p><label>Alege</label><output>30</output><script type="application/json">SECRET_SCRIPT</script><style>/* SECRET_STYLE */</style><template>SECRET_TEMPLATE</template></p></main>');
  const extracted=await page.locator('main').evaluate(extractSearchContent);
  ok(extracted.paragraphs.includes('hartă Începător Localizează'),'Separate link, badge and paragraph');
  ok(extracted.paragraphs.includes('informației. Coordonatele'),'Separate adjacent structural nodes');
  ok(extracted.paragraphs.includes('reproiectare EPSG:3844; RO–EN'),'Preserve legitimate inline word, code and diacritics');
  ok(extracted.paragraphs.includes('Alege 30'),'Separate label and output');
  ok(!/SECRET|<\/?(?:script|style|template)/.test(extracted.paragraphs.join(' ')),'Exclude nested source code and markup');
  await page.setContent('<main><h1>Fixture</h1><ul><li><h4>Alpha</h4><p>Beta <em>Gamma</em></p><p>Delta</p></li></ul></main>');
  ok((await page.locator('main').evaluate(extractSearchContent)).paragraphs.includes('Alpha Beta Gamma Delta'),'General heading/card/paragraph separators, independent of reported examples');
  await page.setContent('<main><h1>Fixture</h1><p>Aleg <a>CRS</a>, apoi <a>EPSG:3844</a>.</p></main>');
  ok((await page.locator('main').evaluate(extractSearchContent)).paragraphs.includes('Aleg CRS, apoi EPSG:3844.'),'Structural padding does not separate punctuation or EPSG tokens');
  await page.setContent('<main><h1>Provocări</h1><p class="lead">Scop pedagogic stabil.</p><section id="challenge-workspace"><h2>Se pregătește provocarea…</h2></section><div id="challenge-catalog"></div></main>');
  const pending=await page.locator('main').evaluate(extractSearchContent);
  await page.evaluate(()=>{document.querySelector('#challenge-workspace').innerHTML='<h2>V1</h2><table><tr><td>Date încărcate</td></tr></table>';document.querySelector('#challenge-catalog').innerHTML='<h3>Catalog încărcat</h3>';});
  equal(await page.locator('main').evaluate(extractSearchContent),pending,'Index is independent of asynchronous exercise load state');
  const distant=Array(100).fill('Introducere').join(' ')+' EPSG:3844 descrie CRS-ul metric. '+Array(70).fill('Continuare').join(' ');
  await page.setContent('<div class="global-search"><input id="search"><div id="search-results" hidden></div></div>');
  await page.evaluate(({distant})=>{window.CARTO_SEARCH_INDEX=[{id:'fixture',description:'Descriere independentă',paragraphs:['Început generic.',distant]}];}, {distant});
  await page.addScriptTag({content:read('js/search.js')});
  await page.evaluate(()=>window.CARTO_SEARCH.init({lessons:[{id:'fixture',title:'Fixture',href:'fixture.html',keywords:['proximitate','<test & topic>'],figures:[]}]},'/explorare-geospatiala/'));
  await page.locator('#search').fill('EPSG:3844');
  let snippet=await page.locator('#search-results small').innerText();
  ok(snippet.includes('EPSG:3844 descrie CRS-ul metric.'),'Match deep in body is visible');
  ok(snippet.startsWith('… ')&&snippet.endsWith(' …'),'Consistent ellipses at both trimmed ends');
  equal(snippet.slice(2,-2).split(/\s+/).length,42,'Compact whole-word excerpt');
  ok(!snippet.includes('Început generic'),'Do not default to opening paragraph');
  await page.locator('#search').fill('proximitate');
  ok((await page.locator('#search-results small').innerText()).includes('Temă indexată: proximitate.'),'Explain metadata-only match');
  await page.locator('#search').fill('<test & topic>');
  ok((await page.locator('#search-results small').innerText()).includes('<test & topic>'),'Escape rendered metadata safely');
  equal(await page.locator('#search-results small test').count(),0,'Metadata does not become HTML');
  for(const lesson of content.lessons){await page.goto(base+lesson.href);ok(await page.locator('main h1').count()===1,'One heading '+lesson.id);await inspectNavigation(page,content,base);checks++;
   if(model.items[lesson.id]?.level){equal(await page.locator('main > .learning-context .level-badge').innerText(),model.levels[model.items[lesson.id].level].label,'Correct visible level '+lesson.id);equal(await page.locator('.learning-continuation').count(),1,'One continuation '+lesson.id);}
   if(/^T0[1-6]$/.test(lesson.id)){equal(await page.locator('.tutorial-meta > span').first().innerText(),model.levels[model.items[lesson.id].level].label,'Workshop hero has the same level');await workshopLevel(page,lesson.id);}
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
  const terms=['acuratețe','precizie','incertitudine','NoData','NULL','lineage','metadate','proiect final','Începător','Intermediar','Avansat','proximitate','Coordonatele','hartă','Clip','Stereo 70','EPSG:3844','hillshade','GeoPackage'];
  for(const term of [...terms,'ACURATEȚE','acuratete']){await page.goto(base+'index.html');await page.locator('#search').fill(term);const hits=await page.locator('#search-results a').evaluateAll(es=>es.map(e=>({text:e.textContent,snippet:e.querySelector('small').textContent,href:e.href})));ok(hits.length>0,'Search '+term);ok(hits.some(h=>normalized(h.snippet).includes(normalized(term))),'Contextual snippet '+term);const destination=hits[0].href;await page.locator('#search-results a').first().click();equal(page.url(),destination,'Search click '+term);}
  const searchExamples=[];
  for(const term of [...terms,'ÎNCEPĂTOR','incepator','harta','epsg:3844']){
   await page.goto(base+'index.html');await page.locator('#search').fill(term);
   const hits=await page.locator('#search-results a').evaluateAll(es=>es.map(e=>{const title=e.cloneNode(true);title.querySelector('small').remove();title.querySelector('strong').remove();return {title:title.textContent.trim(),snippet:e.querySelector('small').textContent,href:e.href};}));
   ok(hits.length>0,'Polish search '+term);
   for(const hit of hits){
    // A visible title explains a title-only match; the snippet must then give
    // the actual resource description, not repeat the query/title mechanically.
    const contextual=normalized(hit.snippet).includes(normalized(term));ok(contextual||normalized(hit.title).includes(normalized(term)),'Visible context explains match '+term);
    if(!contextual){const record=searchContext.window.CARTO_SEARCH_INDEX.find(r=>new URL(r.href,base).href===hit.href);equal(hit.snippet,record?.description,'Canonical descriptive snippet for title-only match '+term);ok(normalized(hit.snippet)!==normalized(hit.title),'Title-only snippet adds context '+term);}
    ok(!/hartăÎncepător|informației\.Coordonatele|<\/?(?:script|style|template)\b/.test(hit.snippet),'No structural concatenation or technical markup');ok((await page.request.get(hit.href)).ok(),'Actual search destination '+term);
   }
   if(['proximitate','Coordonatele','Începător'].includes(term))searchExamples.push({term,...hits[0]});
  }
  await page.locator('#search').fill('zzzx-no-such-polish-term');equal(await page.locator('#search-results a').count(),0,'Nonexistent query has no fabricated match');
  for(const width of [1440,768,390])for(const dark of [false,true]){
   await page.setViewportSize({width,height:1000});await page.addInitScript(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
   for(const id of ['T02','T03','T04','T05','T06']){await page.goto(base+'tutorials/'+id.toLowerCase()+'.html');await workshopLevel(page,id);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Workshop layout '+id+'/'+width+'/'+dark);const section=page.locator('.tutorial-step').filter({has:page.locator('h3',{hasText:/nivel de dificultate/i})});await section.scrollIntoViewIfNeeded();await section.screenshot({path:path.join(out,`polish-${id}-${width}-${dark?'dark':'light'}.png`)});}
   await page.goto(base+'index.html');equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')),dark,'Requested theme is active');for(const term of ['proximitate','Coordonatele','Începător','incertitudine']){await page.locator('#search').fill(term);ok(await page.locator('#search-results small').first().evaluate(e=>getComputedStyle(e).display==='block'),'Snippet separate from title');ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Search wrapping '+width);await page.locator('#search-results').screenshot({path:path.join(out,`polish-search-${term}-${width}-${dark?'dark':'light'}.png`)});}
  }
  fs.writeFileSync(path.join(out,'polish-search-examples.json'),JSON.stringify(searchExamples,null,2));
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
  }
  for(const id of Object.keys(workshopLevels)){await staticPage.goto(base+'tutorials/'+id.toLowerCase()+'.html');await workshopLevel(staticPage,id);}
  await staticPage.goto(base+'tutorials/t06.html');const explanation=staticPage.locator('[data-learning-question="years"] .formative-explanation');await explanation.locator('summary').click();ok((await explanation.innerText()).includes(model.checks.T06[0].explanation),'T06 static explanation preserves methodology');
  await nojs.close();
  // File opening must not acquire a backend or CDN for the new material.
  await page.goto('file:///'+path.join(root,'glossary.html').replace(/\\/g,'/'));await page.locator('#glossary-filter').fill('NULL');ok(await page.locator('.glossary-entry:visible').count()>0,'Offline glossary');
  await page.goto('file:///'+path.join(root,'data-quality.html').replace(/\\/g,'/'));await page.locator('[data-learning-question="precision"] input').nth(1).check();await page.locator('[data-learning-question="precision"] button[type=submit]').click();ok((await page.locator('[data-learning-question="precision"] [role=status]').innerText()).startsWith('Alegere justificată'),'Offline formative control');
  ok(errors.length===0,'No new browser errors: '+errors.join('; '));
  const report={status:'PASS',checks,questionCount,diagnostics,glossaryTerms:glossary.length,layouts:layouts.length,minBadgeContrast:Math.min(...contrast),errors};fs.writeFileSync(path.join(out,'learning-consolidation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
