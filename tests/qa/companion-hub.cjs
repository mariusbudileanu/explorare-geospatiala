// D0: test canonical discovery, navigation, real hit targets and engine boundaries.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {root,playwright,browserOptions,inspectNavigation,checkHomeDestinations}=require('./expectations.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),context={window:{}};
for(const file of ['data/content-manifest.js','data/learning-model.js','js/learning.js'])vm.runInNewContext(read(file),context,{filename:file});
const content=context.window.CARTO_CONTENT,model=context.window.CARTO_LEARNING,ui=context.window.CARTO_LEARNING_UI;
let checks=0;const ok=(value,label)=>{checks++;assert.ok(value,label);},equal=(a,b,label)=>{checks++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),label);};
const primary=['projection-crs-lab','classification-lab','styling-labeling','map-diagnostics'];
const routes=['index.html','digital-companion.html','projection-crs-lab.html','classification-lab.html','styling-labeling.html#map-design-studio','map-diagnostics.html','raster-styling.html','topology.html','tutorials/t05.html'];
equal(content.companion.primary,primary,'Four main experiences');equal(content.companion.secondary,['challenges','raster-styling','topology','transparency-blending','formats-interoperability'],'Existing mature secondary experiences');
equal(content.groups.filter(g=>g.number||/^\d\./.test(g.label)).map(g=>g.label),['1. FUNDAMENTE GEOSPAȚIALE','2. HARTA ȘI ELEMENTELE EI','3. PROIECȚII ȘI SISTEME DE COORDONATE','4. METODE DE REPREZENTARE','5. DATE GEOSPAȚIALE','6. ANALIZA DATELOR GEOSPAȚIALE','7. ATELIERE QGIS · PRACTICĂ'],'Seven academic chapters preserved');
for(const id of [...primary,...content.companion.secondary]){const experience=ui.experience(id),lesson=content.lessons.find(l=>l.id===id);equal(experience.level,model.items[id].level,'Level authority '+id);equal(experience.description,lesson.companion.description,'Description authority '+id);ok(experience.href.includes('.html')&&!experience.href.startsWith('/'),'Relative destination '+id);}
const protectedFiles=['js/compare-core.js','js/crs-engine.js','js/projection-lab-engine.js','js/geodesic-adapter.js','js/classification-engine.js','js/cartography-labs.js','js/map-diagnostics.js','data/diagnostic-scenes.js','js/data-source.js','CITATION.cff'];
// Git's text blobs use LF; Windows checkout may use CRLF without a content change.
const textHash=value=>crypto.createHash('sha256').update(value.toString('utf8').replace(/\r\n/g,'\n')).digest('hex');
// AUD-NUM-01 permits only rounding/rate helpers, not Jenks or classification
// semantics; AUD-ED-01 permits only this scenario title. Retain full protection
// for every other byte and for every other engine/release file.
const omitFunctions=(source,names)=>{for(const name of names){const start=source.indexOf('  function '+name+'(');if(start<0)continue;const end=source.indexOf('\n  function ',start+1);source=source.slice(0,start)+source.slice(end+1);}return source;};
for(const file of protectedFiles){
 let actual=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),before=execFileSync('git',['show','44325c3f1db1ebbd6bf322eda7045632c7858d52:'+file],{cwd:root}).toString('utf8').replace(/\r\n/g,'\n');
 if(file==='CITATION.cff'){const citation=JSON.parse(actual);equal(citation.authors[0].affiliation,'University of Bucharest, Faculty of Geography','Verified v2.0.0 affiliation');delete citation.authors[0].affiliation;actual=JSON.stringify(citation);before=JSON.stringify(JSON.parse(before));}
 if(file==='js/map-diagnostics.js'){
  const old="topology:['data/topology-lab.js','data/topology-rules.js','js/topology-engine.js','js/topology-rule-engine.js','js/topology-scene.js']",updated="topology:['data/topology-lab.js','data/topology-rules.js','js/topology-engine.js','js/vendor/turf.min.js','js/topology-geometry.js','js/topology-rule-engine.js','js/topology-scene.js']";
  equal(actual.split(updated).length,2,'P02: exact local topology dependency list');actual=actual.replace(updated,old);
 }
 if(file==='js/classification-engine.js'){
  actual=omitFunctions(actual,['equalUpper','quantileLerp','roundedRatio','interpolate','scaledRate']).replace(':scaledRate(v,d,scale)',':v/d*scale');
  before=omitFunctions(before,['equalUpper','quantileLerp']);
 }
 if(file==='data/diagnostic-scenes.js')before=before.replace('O hartă care arată corect poate avea geometrie invalidă','O hartă care arată corect poate încălca reguli topologice');
 equal(textHash(actual),textHash(before),'Protected code outside explicitly audited corrections unchanged '+file);
}
const server=http.createServer((req,res)=>{const relative=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname).replace(/^\/explorare-geospatiala\//,'')||'index.html',file=path.resolve(root,relative);if(!file.startsWith(root+path.sep)||/^(content|tmp)\//.test(relative))return res.writeHead(404).end();fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.tif':'image/tiff'})[path.extname(file)]||'application/octet-stream');res.end(data);});});
const out=path.join(root,'tmp/qa/companion-hub');fs.mkdirSync(out,{recursive:true});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`,browser=await playwright().chromium.launch(browserOptions()),errors=[],warnings=[],badResponses=[],search=[],layouts=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(base))badResponses.push(r.url());});
 const hubRequests=[];let collectHub=true;page.on('request',r=>{if(collectHub)hubRequests.push(r.url());});
 await page.goto(base+'digital-companion.html');await inspectNavigation(page,JSON.parse(JSON.stringify(content)),base);collectHub=false;ok(await page.locator('h1').innerText()==='Explorează interactiv','Public title');
 const hubTiming=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0];return {domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd,resources:performance.getEntriesByType('resource').length};});
 for(const [selector,ids] of [['.companion-primary-grid',primary],['.companion-secondary-grid',content.companion.secondary]]){
  equal(await page.locator(selector+' [data-experience]').evaluateAll(nodes=>nodes.map(n=>n.dataset.experience)),ids,'Exact experience set/order');
  for(const id of ids){const card=page.locator('[data-experience="'+id+'"]'),experience=ui.experience(id);equal(await card.locator('h3').innerText(),experience.title,'Canonical title '+id);equal(await card.locator('p').innerText(),experience.description,'Canonical description '+id);equal(await card.locator('a').count(),1,'Single meaningful destination '+id);equal(await card.locator('a').getAttribute('href'),experience.href,'Canonical URL '+id);equal(await card.locator('.level-badge').innerText(),model.levels[experience.level].label,'Canonical visible level '+id);}
 }
 ok(!hubRequests.some(url=>!url.startsWith(base)),'Zero external Hub requests');ok(!hubRequests.some(url=>/engine|compare-core|diagnostic-scenes|map-diagnostics\.js|cartography-labs\.js|\.tiff?(?:\?|$)|tile/i.test(url)),'Hub never loads heavy engines/data');
 // Every new internal destination must resolve, including the anchored Studio.
 const destinations=await page.locator('main a').evaluateAll(nodes=>[...new Set(nodes.map(a=>a.getAttribute('href')))].filter(href=>href&&!href.startsWith('https:')));
 for(const href of destinations){const url=new URL(href,base),response=await page.request.get(url.href);equal(response.status(),200,'HTTP destination '+href);if(url.hash){await page.goto(url.href);equal(await page.locator('[id="'+decodeURIComponent(url.hash.slice(1))+'"]').count(),1,'Existing anchor '+href);}}
 await page.goto(base+'index.html');checkHomeDestinations(await page.locator('.home-actions a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href'))));checks++;equal(await page.locator('.companion-home article').count(),2,'Two clear home paths');equal(await page.locator('#cuprins .theme-card').count(),7,'Existing chapters kept');
 const searchStart=checks,normalize=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const indexContext={window:{}};vm.runInNewContext(read('data/search-index.js'),indexContext);
 const records=indexContext.window.CARTO_SEARCH_INDEX;
 const genericSnippetStart=checks;
 for(const query of ['proiecții','PROIECȚII','proiectii']){
  await page.fill('#search',query);const result=page.locator('#search-results a[href="lesson.html?id=projection-classification"]');
  equal(await result.count(),1,'Canonical projection lesson '+query);equal(await result.locator('small').innerText(),'Distingi proiecțiile conforme de cele echivalente.','Meaningful term-bearing educational body wins over a generic overview '+query);
  const matches=await page.locator('#search-results a').evaluateAll(es=>es.map(e=>({href:e.getAttribute('href'),context:e.querySelector('small')?.textContent})));
  ok(matches.some(m=>normalize(m.context||'').includes(normalize(query))),'Academic contextual projection invariant '+query);equal(new Set(matches.map(m=>m.href)).size,matches.length,'Unique projection destinations');
  search.push({query,href:await result.getAttribute('href'),snippet:await result.locator('small').innerText()});
 }
 for(const query of ['NoData','NODATA']){
  await page.fill('#search',query);const result=page.locator('#search-results a[href="map-diagnostics.html#nodata-nu-este-zero"]');
  equal(await result.count(),1,'One canonical NoData result '+query);equal(await page.locator('#search-results a').first().getAttribute('href'),'map-diagnostics.html#nodata-nu-este-zero','NoData ranking/destination preserved');
  equal(await result.locator('small').innerText(),'Absența unei valori raster este tratată drept observație numerică zero.','NoData description, never category metadata');equal(await result.locator('small > *').count(),0,'Plain NoData explanation');
  search.push({query,title:'NoData nu este zero',href:await result.getAttribute('href'),snippet:await result.locator('small').innerText()});
 }
 for(const query of ['parcurs recomandat','PARCURS RECOMANDAT']){
  await page.fill('#search',query);const hit=await page.locator('#search-results a').first().evaluate(a=>({href:a.getAttribute('href'),title:[...a.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join('').trim(),snippet:a.querySelector('small').textContent,markup:a.querySelector('small').children.length}));
  equal(hit.href,'learning-path.html','Learning path destination '+query);equal(hit.title,'Parcurs recomandat','Unchanged learning path title');equal(hit.snippet,'Punct de orientare, cu acces liber la toate nivelurile.','Associated paragraph replaces isolated title '+query);ok(normalize(hit.snippet)!==normalize(hit.title)&&hit.markup===0,'Distinct plain descriptive snippet '+query);
  search.push({query,...hit});
 }
 const pathSnippetChecks=checks-genericSnippetStart;
 const expectedQueries={'explorează interactiv':'digital-companion.html','digital companion':'digital-companion.html','laboratoare':'digital-companion.html','experimente':'digital-companion.html','proiecții interactive':'projection-crs-lab.html','clasificare interactivă':'classification-lab.html','map design':'styling-labeling.html#map-design-studio','map design studio':'styling-labeling.html#map-design-studio','diagnostic hartă':'map-diagnostics.html','ce este greșit în această hartă':'map-diagnostics.html','challenge':'challenges.html','topologie':'topology.html','raster styling':'raster-styling.html','blending':'transparency-blending.html'};
 for(const [query,expected] of Object.entries(expectedQueries)){
  await page.fill('#search',query);const hits=await page.locator('#search-results a').evaluateAll(nodes=>nodes.map(a=>({href:a.getAttribute('href'),text:a.textContent,snippet:a.querySelector('small').textContent,markup:a.querySelector('small').children.length})));
  equal(hits[0]?.href,expected,'Exact specific/generic destination '+query);
  if(!normalize(hits[0].snippet).includes(normalize(query))){
   const title=content.lessons.find(l=>l.href===expected)?.title||records.find(r=>r.href===expected)?.title||'';
   ok(normalize(title).includes(normalize(query)),'Visible title explains the query '+query);equal(hits[0].snippet,records.find(r=>r.href===expected).description,'Title-only match uses canonical description '+query);
  }
  else ok(normalize(hits[0].snippet).includes(normalize(query)),'Keyword/body context preserved '+query);
  ok(hits.every(hit=>hit.markup===0&&!/<(?:script|style|template)|hartăÎncepător|informației\.Coordonatele/.test(hit.snippet)),'Plain clean snippets '+query);
  ok(!normalize(hits[0].snippet).startsWith('temă indexată: '+normalize(content.lessons.find(l=>l.href===expected.split('#')[0])?.title||'')), 'No immediate metadata title repetition '+query);
  search.push({query,expected,...hits[0]});await page.locator('#search').press('ArrowDown');ok(await page.evaluate(()=>!!document.activeElement.closest('#search-results')),'Search keyboard '+query);await page.keyboard.press('Escape');equal(await page.locator('#search-results').isHidden(),true,'Search recovery '+query);
 }
 // A general query still belongs to the whole Styling/Labeling page, not Studio.
 for(const query of ['stilizare','etichetare']){await page.fill('#search',query);equal(await page.locator('#search-results a[href="styling-labeling.html"]').count(),1,'Page-level destination '+query);equal(await page.locator('#search-results a[href="styling-labeling.html#map-design-studio"]').count(),0,'No unrelated Studio redirect '+query);}
 for(const query of ['Stereo 70','EPSG:3844','arie geodezică','arie elipsoidală','distanță geodezică','hillshade','NULL','Clip','GeoPackage','incertitudine','reproiectare']){await page.fill('#search',query);ok(await page.locator('#search-results a').count()>0,'Prior discovery preserved '+query);}
 for(const query of ['PROIECȚII INTERACTIVE','proiectii interactive']){await page.fill('#search',query);equal(await page.locator('#search-results a').first().getAttribute('href'),'projection-crs-lab.html','Case/diacritics '+query);}
 await page.fill('#search','xyz-no-such-companion-923');equal(await page.locator('#search-results a').count(),0,'Unknown query no invented result');
 // P02 adds two canonical destinations. Require exact manifest + diagnostic
 // coverage instead of retaining the pre-P02 count; uniqueness remains strict.
 const sceneContext={window:{}};vm.runInNewContext(read('data/diagnostic-scenes.js'),sceneContext);
 const expectedIDs=[...content.lessons.map(l=>l.id),...sceneContext.window.CARTO_DIAGNOSTICS.scenes.map(s=>s.id)];
 equal(records.map(r=>r.id).sort(),expectedIDs.sort(),'Exact canonical search inventory');equal(new Set(records.map(r=>r.id)).size,expectedIDs.length,'Unique search IDs');equal(new Set(records.map(r=>r.href)).size,expectedIDs.length,'Unique indexed URLs');equal(records.filter(r=>r.id==='styling-labeling').length,1,'One Styling/Studio entity');
 // Exercise the generic rules with unrelated names/anchors in an isolated DOM.
 const fixtureStart=checks;
 const fixture=await browser.newPage();await fixture.setContent('<div class="global-search"><label for="search">Caută</label><input id="search"><div id="search-results" hidden></div></div>');
 await fixture.evaluate(()=>{
  const lessons=[{id:'orientation',title:'Orientare în platformă',href:'orientation.html',keywords:['orientare'],figures:[]},{id:'intro',title:'Introducere în cartografie',href:'intro.html',keywords:[],figures:[]},{id:'symbols',title:'Simbolizare și etichete',href:'symbols.html',keywords:['studio de simboluri','symbology'],figures:[],companion:{title:'Studio de simboluri',href:'symbols.html#studio'}},{id:'field',title:'Observații în teren',href:'field.html',keywords:[],figures:[]},{id:'isolated',title:'Scări de reprezentare',href:'scale.html',keywords:[],figures:[]}];
  window.CARTO_SEARCH_INDEX=[{id:'orientation',description:'Un ghid pentru alegerea materialelor potrivite scopului.',paragraphs:[]},{id:'intro',description:'Introducere în cartografie',paragraphs:['Compari metodele și verifici sursele înainte de reprezentare.']},{id:'symbols',description:'Alege simbolurile potrivite mesajului.',paragraphs:['Studio de simboluri: compară accentul temei cu lizibilitatea contextului.','Lizibilitatea pe fundal urban','Compară simbolurile la scara de afișare.']},{id:'field',description:'O descriere canonică distinctă de contextul paragrafului.',paragraphs:['  OBSERVATII   IN TEREN  ','Documentează sursa și compară măsurătorile repetate.']},{id:'isolated',description:'Compară nivelul de generalizare pentru două reprezentări.',paragraphs:['Scări de reprezentare']}];window.searchFixture={lessons};
  lessons.push(
   {id:'validation',title:'Validarea observațiilor',href:'validation.html',keywords:['Date tematice','Risc metodologic','Intermediar','Laborator interactiv','tipare'],figures:[]},
   {id:'boundary',title:'Măsurarea distanțelor',href:'measure.html',keywords:['Date vectoriale'],figures:[]},
   {id:'missing',title:'Documentarea limitelor',href:'limits.html',keywords:['Intermediar'],figures:[]},
   {id:'overview',title:'Analiza informațiilor',href:'information.html',keywords:[],figures:[]},
   {id:'foreign',title:'Controlul aspectului',href:'appearance.html',keywords:[],figures:[],companion:{description:'Analiza informațiilor este menționată și într-un alt laborator despre aspectul hărții.',contexts:['overview']}},
   {id:'projection',title:'Compararea proiecțiilor',href:'projections.html',keywords:['clasificare'],figures:[]},
   {id:'measure',title:'Unități de suprafață',href:'areas.html',keywords:['măsurare areală'],figures:[]},
   {id:'S07',title:'S07 · Compararea suprafețelor',href:'surface-workshop.html',keywords:['S07'],figures:[]},
   {id:'catalog',title:'Catalog general',href:'catalog.html',keywords:[],figures:[]});
  window.CARTO_SEARCH_INDEX.push(
   {id:'validation',description:'Verifică proveniența datelor și consemnează metoda de control.',paragraphs:['Validarea observațiilor','Date tematice · Risc metodologic','Intermediar','Laborator interactiv','Compari observațiile cu sursa și documentezi excepțiile înaintea interpretării.']},
   {id:'boundary',description:'Alege unitățile și sistemul de coordonate înaintea măsurării.',paragraphs:['Măsurarea distanțelor','Date vectoriale','Un alt subiect','Această propoziție aparține altei secțiuni și nu explică măsurarea.']},
   {id:'missing',description:'',paragraphs:['Documentarea limitelor','Intermediar']},
   {id:'overview',description:'Compară câmpurile și documentează alegerea indicatorului analizat.',paragraphs:['Analiza informațiilor este menționată și într-un alt laborator despre aspectul hărții.']},
   {id:'projection',description:'Compară proprietățile păstrate înainte de alegerea reprezentării.',paragraphs:['O explicație introductivă poate descrie scopul fără termenul căutat.','Compari proiecții conforme și echivalente; clasificarea privește proprietățile păstrate, nu culoarea.']},
   {id:'measure',description:'La măsurare areală folosești unități pătrate și verifici sistemul de coordonate.',paragraphs:[]},
   {id:'S07',description:'Compară unitățile și verifică suprafața înaintea interpretării.',paragraphs:['Organizează fișierele în atelier_S07/data_raw/ înainte de import.','Punctele de control sunt încărcate într-o etapă din S07.']},
   {id:'catalog',description:'Materiale și activități pentru explorare.',paragraphs:['Calitate și incertitudine']});
 });
 await fixture.addScriptTag({content:read('js/search.js')});await fixture.evaluate(()=>window.CARTO_SEARCH.init(window.searchFixture,'../'));
 for(const [query,href,snippet] of [['Orientare în platformă','../orientation.html','Un ghid pentru alegerea materialelor potrivite scopului.'],['Introducere în cartografie','../intro.html','Compari metodele și verifici sursele înainte de reprezentare.'],['studio de simboluri','../symbols.html#studio','Studio de simboluri: compară accentul temei cu lizibilitatea contextului.'],['symbology','../symbols.html',null],['Observații în teren','../field.html','Documentează sursa și compară măsurătorile repetate.'],['OBSERVATII IN TEREN','../field.html','Documentează sursa și compară măsurătorile repetate.'],['Lizibilitatea pe fundal urban','../symbols.html','Lizibilitatea pe fundal urban · Compară simbolurile la scara de afișare.'],['Scări de reprezentare','../scale.html','Compară nivelul de generalizare pentru două reprezentări.'],['Validarea observațiilor','../validation.html','Compari observațiile cu sursa și documentezi excepțiile înaintea interpretării.'],['Risc metodologic','../validation.html','Temă indexată: Risc metodologic. Verifică proveniența datelor și consemnează metoda de control.'],['tipare','../validation.html','Temă indexată: tipare. Verifică proveniența datelor și consemnează metoda de control.'],['Măsurarea distanțelor','../measure.html','Alege unitățile și sistemul de coordonate înaintea măsurării.'],['Documentarea limitelor','../limits.html','Temă indexată: Documentarea limitelor.'],['proiecții','../projections.html','Compari proiecții conforme și echivalente; clasificarea privește proprietățile păstrate, nu culoarea.'],['clasificare','../projections.html','Compari proiecții conforme și echivalente; clasificarea privește proprietățile păstrate, nu culoarea.'],['măsurare areală','../areas.html','La măsurare areală folosești unități pătrate și verifici sistemul de coordonate.']]){
  await fixture.fill('#search',query);equal(await fixture.locator('#search-results a').count(),1,'Generic rule retains one entity '+query);equal(await fixture.locator('#search-results a').getAttribute('href'),href,'Generic canonical/page URL and relative prefix '+query);const text=await fixture.locator('#search-results small').innerText();if(snippet)equal(text,snippet,'Generic descriptive/body context '+query);else ok(text.includes('symbology'),'Metadata keyword context retained');
  ok(text.trim().length>0&&!/<(?:script|style|template)|<[^>]+>/.test(text)&&await fixture.locator('#search-results small > *').count()===0,'Nonblank plain-text generic snippet '+query);
 }
 await fixture.fill('#search','Analiza informațiilor');equal(await fixture.locator('#search-results small').innerText(),'Compară câmpurile și documentează alegerea indicatorului analizat.','Page overview instead of an incidental mention in another section');
 await fixture.fill('#search','S07');equal(await fixture.locator('#search-results a').count(),1,'Exact material ID keeps one result');equal(await fixture.locator('#search-results small').innerText(),'Compară unitățile și verifică suprafața înaintea interpretării.','An exact ID uses the resource overview, not an incidental filename or step');
 await fixture.fill('#search','incertitudine');equal(await fixture.locator('#search-results a').count(),1,'Body-only navigation match has a destination');equal(await fixture.locator('#search-results small').innerText(),'Calitate și incertitudine','Without related prose, keep the actual navigation text instead of an unrelated fallback');
 const genericSnippetChecks=pathSnippetChecks+checks-fixtureStart;
 await fixture.close();
 // Inspect actual explanations across the ten public content families. These
 // topic assertions reject bare labels, not just short or empty strings.
 const semanticStart=checks,semanticCases=[
  ['Fundamente','latitudine','coordinates.html',/latitudine|longitudine/i],
  ['Harta','Definiția hărții','lesson.html?id=map-definition',/micșorare|generalizare|scar/i],
  ['CRS','proiecții interactive','projection-crs-lab.html',/coordonat|distan|arii/i],
  ['Clasificare','clasificare interactivă','classification-lab.html',/clas|normaliz|indicator/i],
  ['Design','map design','styling-labeling.html#map-design-studio',/ierarh|lizibil|simbol/i],
  ['Raster','raster styling','raster-styling.html',/contrast|culoar|relief|pixel/i],
  ['Topologie','topologie','topology.html',/geometri|regul|topologic/i],
  ['Map Diagnostics','NoData','map-diagnostics.html#nodata-nu-este-zero',/valo.*raster|masc|zero/i],
  ['Ateliere QGIS','T05','tutorials/t05.html',/grid|celule|popula/i],
  ['Hub','explorează interactiv','digital-companion.html',/experiment|compara|diagnostic/i]];
 const semanticExamples=[];
 for(const [family,query,href,topic] of semanticCases){
  await page.fill('#search',query);const hit=await page.locator('#search-results a').first().evaluate(a=>{const title=a.cloneNode(true);title.querySelector('small').remove();title.querySelector('strong').remove();return {title:title.textContent.trim(),href:a.getAttribute('href'),snippet:a.querySelector('small').textContent,markup:a.querySelector('small').children.length};});
  equal(hit.href,href,'Semantic family destination '+family);ok(topic.test(hit.snippet),'Explanation describes the actual topic '+family);ok(hit.snippet.trim().split(/\s+/).length>=6&&normalize(hit.snippet)!==normalize(hit.title),'Descriptive rather than isolated heading/label '+family);ok(hit.markup===0&&!/<(?:script|style|template)|hartăÎncepător|informației\.Coordonatele/.test(hit.snippet),'Clean semantic text '+family);ok((await page.request.get(new URL(href,base).href)).ok(),'Actual semantic destination responds '+family);semanticExamples.push({family,query,...hit});
 }
 const semanticChecks=checks-semanticStart;
 // Activate the actual result by keyboard; no second user click reaches Studio.
 for(const width of [1440,768,390])for(const dark of [false,true]){
  await page.setViewportSize({width,height:1000});await page.goto(base+'index.html');await page.evaluate(d=>{document.body.classList.toggle('dark',d);localStorage.setItem('cartografie-theme',d?'dark':'light');},dark);
  await page.fill('#search','explorează interactiv');equal(await page.locator('#search-results a').first().getAttribute('href'),'digital-companion.html','Hub result '+width+'/'+dark);equal(await page.locator('#search-results small').first().innerText(),content.lessons.find(l=>l.id==='digital-companion').description,'Descriptive Hub snippet '+width+'/'+dark);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Search wrapping '+width+'/'+dark);await page.locator('#search-results').screenshot({path:path.join(out,`polish-search-${width}-${dark?'dark':'light'}.png`)});
  await page.fill('#search','parcurs recomandat');equal(await page.locator('#search-results small').first().innerText(),'Punct de orientare, cu acces liber la toate nivelurile.','Descriptive learning path snippet '+width+'/'+dark);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Learning path search wrapping '+width+'/'+dark);await page.locator('#search-results').screenshot({path:path.join(out,`polish-path-search-${width}-${dark?'dark':'light'}.png`)});
  await page.fill('#search','NoData');equal(await page.locator('#search-results small').first().innerText(),'Absența unei valori raster este tratată drept observație numerică zero.','Descriptive NoData snippet '+width+'/'+dark);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'NoData search wrapping '+width+'/'+dark);await page.locator('#search-results').screenshot({path:path.join(out,`polish-nodata-search-${width}-${dark?'dark':'light'}.png`)});
  await page.fill('#search','map design');await page.locator('#search').press('ArrowDown');ok(await page.locator('#search-results a').first().evaluate(e=>e===document.activeElement&&getComputedStyle(e).outlineStyle!=='none'),'Visible keyboard focus on Studio result');await page.keyboard.press('Enter');await page.waitForURL(base+'styling-labeling.html#map-design-studio');equal(new URL(page.url()).hash,'#map-design-studio','Direct Studio result '+width+'/'+dark);equal(await page.locator('#map-design-studio').count(),1,'Studio anchor exists');await page.waitForFunction(()=>{const r=document.querySelector('#map-design-studio h2').getBoundingClientRect();return r.top>=document.querySelector('.topbar').getBoundingClientRect().bottom-2&&r.bottom<=innerHeight;});ok(await page.locator('#map-design-studio h2').isVisible(),'Studio heading in viewport without extra click');equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')),dark,'Requested destination theme');
 }
 const searchChecks=checks-searchStart;
 for(const [route,expected] of [['lesson.html?id=rectangular-coordinates','projection-crs-lab'],['projection-intro.html','projection-crs-lab'],['lesson.html?id=method-choropleth','classification-lab'],['styling-labeling.html','styling-labeling'],['gis-lab.html','map-diagnostics'],['data-quality.html','map-diagnostics'],['topology.html','map-diagnostics'],['raster-styling.html','map-diagnostics'],['transparency-blending.html','map-diagnostics']]){await page.goto(base+route);equal(await page.locator('[data-companion-callout="'+expected+'"]').count(),1,'One contextual affordance '+route);equal(await page.locator('[data-companion-callout] a').getAttribute('href'),ui.experience(expected).href,'Contextual destination '+route);}
 for(const width of [1440,1024,768,390])for(const dark of [false,true])for(const route of routes){
  await page.setViewportSize({width,height:1000});await page.goto(base+route);await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);await inspectNavigation(page,JSON.parse(JSON.stringify(content)),base);
  equal(await page.locator('#chapter-nav a[href="'+(route.startsWith('tutorials/')?'../':'')+'digital-companion.html"]').count(),1,'One global Hub item '+route);
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow '+route+'/'+width+'/'+dark);
  const state=await page.locator('main .companion-card, main .companion-callout, .companion-home article').evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,scroll:n.scrollWidth,client:n.clientWidth})));ok(state.every(s=>s.scroll<=s.client+1),'No card overflow');layouts.push({route,width,dark,cards:state.length});
  if(route==='digital-companion.html'){
   const boxes=await page.locator('.companion-primary-grid article').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.getBoundingClientRect().width})));
   if(width===390)ok(boxes.every(b=>Math.abs(b.x-boxes[0].x)<1)&&boxes.every((b,i)=>!i||b.y>boxes[i-1].y),'Mobile primary cards stacked');
   const anchor=page.locator('.companion-card a').first();await anchor.focus();equal(await anchor.evaluate(e=>e===document.activeElement),true,'Card keyboard focus');ok(await anchor.evaluate(e=>{const s=getComputedStyle(e);return s.outlineStyle!=='none'&&parseFloat(s.outlineWidth)>0;}),'Visible keyboard focus');
   const contrasts=await page.locator('.companion-card h3,.companion-card p,.companion-card a,.companion-card .eyebrow,.companion-card .level-badge').evaluateAll(nodes=>{
    const rgba=color=>color.match(/[\d.]+/g).map(Number),luminance=c=>c.slice(0,3).map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
    return nodes.map(e=>{const style=getComputedStyle(e),ink=rgba(style.color);let node=e,bg;while(node){const color=rgba(getComputedStyle(node).backgroundColor);if(color.length===3||color[3]===1){bg=color;break;}node=node.parentElement;}bg=bg||[255,255,255];const a=luminance(ink),b=luminance(bg);return {ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),required:parseFloat(style.fontSize)>=24||(parseFloat(style.fontSize)>=18.66&&parseFloat(style.fontWeight)>=700)?3:4.5};});
   });ok(contrasts.every(c=>c.ratio>=c.required),'WCAG text contrast of new cards '+width+'/'+dark);
   await page.locator('h1').evaluate(e=>e.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(out,`hub-${width}-${dark?'dark':'light'}.png`),fullPage:true});
   if(width<=768){await page.locator('#nav-toggle').focus();await page.keyboard.press('Enter');const hubLink=page.locator('#chapter-nav a[href="digital-companion.html"]');ok(await hubLink.isVisible(),'Mobile global Hub entry');await hubLink.focus();equal(await hubLink.evaluate(e=>e===document.activeElement),true,'Mobile Hub entry keyboard focus');await page.locator('#nav-toggle').click();ok(await page.locator('body').evaluate(e=>e.classList.contains('nav-collapsed')),'Mobile sidebar closes');}
  }
  if(route==='index.html')await page.screenshot({path:path.join(out,`home-${width}-${dark?'dark':'light'}.png`),fullPage:true});
  if(!['index.html','digital-companion.html'].includes(route))await page.screenshot({path:path.join(out,`review-${route.split('/').pop().split('.')[0]}-${width}-${dark?'dark':'light'}.png`)});
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'}),fallback=await nojs.newPage();
 for(const width of [1440,1024,768,390])for(const route of routes.slice(0,6)){
  await fallback.setViewportSize({width,height:1000});await fallback.goto(base+route);ok(await fallback.locator('h1').isVisible(),'No-JS title '+route);ok(await fallback.locator('main').innerText().then(t=>t.length>200),'Static purpose/content '+route);ok(await fallback.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No-JS overflow');
  for(const target of [fallback.locator('h1'),fallback.locator('main p').first()]){await target.scrollIntoViewIfNeeded();ok(await target.evaluate(e=>{const r=e.getBoundingClientRect(),x=r.left+Math.min(12,r.width/2),y=r.top+r.height/2,top=document.elementFromPoint(x,y);return top&&e.contains(top)&&!top.closest('#sidebar');}),'Actual no-JS content not covered '+width+'/'+route);}
  const nav=await fallback.locator('#chapter-nav').evaluate(e=>e.innerHTML),expectedNav=await fallback.evaluate(markup=>{const container=document.createElement('div');container.innerHTML=markup;return container.innerHTML;},content.navigationMarkup({prefix:route.startsWith('tutorials/')?'../':''}));equal(nav,expectedNav,'Static and runtime navigation single source '+route);
  if(route==='digital-companion.html'){equal(await fallback.locator('.companion-card').count(),9,'All static experience cards');equal(await fallback.locator('.companion-card .level-badge').count(),9,'All static canonical levels');const a=fallback.locator('.companion-card a').first();await a.focus();await fallback.keyboard.press('Enter');await fallback.waitForURL('**/projection-crs-lab.html');ok(fallback.url().endsWith('projection-crs-lab.html'),'No-JS card keyboard activation');}
  if(route==='index.html')equal(await fallback.locator('#cuprins .theme-card').count(),7,'No-JS seven usable chapter destinations');
 }
 await nojs.close();equal(errors,[],'Zero browser errors');equal(badResponses,[],'Zero missing public assets');equal(warnings,[],'Zero browser warnings');
 const report={status:'PASS',checks,searchChecks,genericSnippetChecks,semanticChecks,semanticExamples,primary,secondary:content.companion.secondary,search,layouts,hubRequests,hubTiming,external:hubRequests.filter(u=>!u.startsWith(base)),heavyEngines:0,brokenLinks:badResponses.length,errors,warnings};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:'PASS',checks,searchChecks,genericSnippetChecks,semanticChecks,errors:errors.length,warnings:warnings.length,brokenLinks:badResponses.length,report:path.relative(root,path.join(out,'result.json'))}));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}})().catch(error=>{console.error(error);process.exitCode=1;});
