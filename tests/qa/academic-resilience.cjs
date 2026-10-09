// Academic integrity, contextual search and static recovery regression.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),crypto=require('node:crypto');
const {root,manifest,playwright,browserOptions}=require('./expectations.cjs');
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4183/explorare-geospatiala/';
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const cff=JSON.parse(read('CITATION.cff')); // JSON is a strict subset of YAML 1.2, the CFF serialization format.
assert.equal(cff['cff-version'],'1.2.0');assert.equal(cff.type,'software');assert.equal(cff.title,'Explorare geospațială');checks+=3;
assert.deepEqual(cff.authors,[{'family-names':'Budileanu','given-names':'Marius',affiliation:'Universitatea din București, Facultatea de Geografie'}]);checks++;
for(const forbidden of ['doi','version','date-released','preferred-citation'])ok(!(forbidden in cff),'No invented release metadata: '+forbidden);
ok(!/email|orcid/i.test(JSON.stringify(cff)),'No private identifiers');
const registry=JSON.parse(read('data/data-registry.json'));
assert.deepEqual(registry.datasets.map(d=>d.id),['adizmb-schools','adizmb-medical','adizmb-sports','administrative-boundaries','census2021','hansen-loss','copernicus-dem']);checks++;
const sandbox={window:{}};vm.runInNewContext(read('data/data-registry.js'),sandbox);assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.CARTO_DATA_REGISTRY)),registry);checks++;
for(const d of registry.datasets){for(const field of ['name','provider','official_source','access_url','original_format','original_crs','license_name','license_url','modifications','platform_use'])ok(typeof d[field]==='string'&&d[field].length>0,d.id+' metadata '+field);for(const field of ['official_source','access_url','license_url'])ok(new URL(d[field]).protocol==='https:',d.id+' public HTTPS '+field);ok(!d.educational_download_package,d.id+' no workshop package');for(const s of d.interactive_subsets){ok(fs.existsSync(path.join(root,s.file)),'Runtime subset exists: '+s.file);assert.equal(fs.statSync(path.join(root,s.file)).size,s.bytes);checks++;}}
for(const id of ['administrative-boundaries','census2021']){const d=registry.datasets.find(d=>d.id===id);assert.equal(d.license_status,'needs_confirmation');ok(!d.attribution,'No invented attribution');checks++;}
const meta=JSON.parse(read('data/challenges/risca/raster_metadata.json'));for(const r of Object.values(meta.rasters)){assert.equal(r.epsg,3844);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'data/challenges/risca',r.filename))).digest('hex'),r.sha256);checks+=2;}
ok(!fs.existsSync(path.join(root,'assets/original/fig10-coordonate.png')),'No redistributed historical figure');
for(const lesson of manifest().lessons)for(const f of lesson.figures){ok(f.number&&f.page&&f.caption&&!f.asset,'Citation metadata preserved: '+lesson.id);}
ok(read('CONTENT_LICENSE.md').includes('Creative Commons Attribution 4.0 International (CC BY 4.0)'),'Official content license');ok(!read('CONTENT_LICENSE.md').includes('BY-NC'),'No obsolete restriction');
(async()=>{
 const browser=await playwright().chromium.launch(browserOptions());const errors=[];const measurements=[];
 try{
  const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'index.html');
  const terms=['Stereo 70','EPSG:3844','Pulkovo','hillshade','NULL','Clip','false easting','NoData','topologie','GeoPackage'];
  const normalize=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—-]/g,' ');
  for(const term of [...terms,'sTeReO 70','proiecții','proiectii','false-easting']){
   const start=performance.now();await page.locator('#search').fill(term);const matches=await page.locator('#search-results a').evaluateAll(es=>es.map(e=>({text:e.textContent,context:e.querySelector('small')?.textContent,href:e.getAttribute('href')})));
   ok(matches.length>0,'Search finds '+term);ok(new Set(matches.map(m=>m.href)).size===matches.length,'Unique search destinations');ok(matches.some(m=>normalize(m.context||'').includes(normalize(term))),'Term in educational context: '+term);measurements.push({term,ms:performance.now()-start,hrefs:matches.map(m=>m.href)});
  }
  await page.locator('#search').fill('inventat_xyz_987');ok((await page.locator('#search-results').innerText()).includes('Niciun rezultat'),'Unknown term');
  await page.locator('#search').fill('NULL');await page.locator('#search').press('ArrowDown');ok(await page.evaluate(()=>!!document.activeElement.closest('#search-results')),'Keyboard search');await page.keyboard.press('Escape');ok(await page.locator('#search').evaluate(e=>e===document.activeElement),'Search returns focus');
  for(const route of ['about.html','lesson.html?id=about']){await page.goto(base+route);const text=await page.locator('main').innerText();ok(text.includes('Universitatea din București, Facultatea de Geografie')&&text.includes('asistență AI'),'Academic About');ok(!text.includes('0 module')&&!text.includes('Niciun card'),'About is not an empty filtered lesson');ok(await page.locator('.site-context').count()===0||!await page.locator('.site-context').isVisible(),'About has no lesson filters');ok(await page.locator('a[href$="/issues"]').count()>0,'Public feedback');}
  for(const route of ['lesson.html?id=invalid','lesson.html']){await page.goto(base+route);ok(await page.locator('.lesson-error').isVisible(),'Explicit error '+route);ok(await page.locator('.lesson-error a[href="index.html#teme"]').count()===1,'Contents recovery');await page.locator('.lesson-error a').first().focus();ok(await page.locator('.lesson-error a').first().evaluate(e=>e===document.activeElement),'Keyboard recovery');}
  for(const lesson of manifest().lessons.filter(l=>l.href.startsWith('lesson.html'))){await page.goto(base+lesson.href);ok((await page.title()).includes(lesson.title),'Lesson title '+lesson.id);const description=await page.locator('meta[name="description"]').getAttribute('content');ok(description.length>15&&!description.startsWith('Lecție din'),'Relevant description');assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://mariusbudileanu.github.io/explorare-geospatiala/'+lesson.href);checks++;ok((await page.locator('h1').innerText()).includes(lesson.title),'Main heading');}
  await page.goto(base+'lesson.html?id=sphere');await page.locator('[data-source-index]').first().click();ok(await page.locator('#source-dialog').evaluate(e=>e.open),'Historical citation opens');ok((await page.locator('#source-caption').innerText()).includes('Năstase'),'Bibliographic citation');ok(await page.locator('#source-dialog img').count()===0,'No scan in dialog');await page.keyboard.press('Escape');
  await page.goto(base+'coordinates.html');await page.locator('[data-source-image="table"]').click();ok((await page.locator('#source-caption').innerText()).includes('pp. 20–21'),'Exact table reference');ok(await page.locator('#source-dialog img').count()===0,'Coordinate source citation only');await page.keyboard.press('Escape');
  for(const width of [1440,1024,768,390])for(const dark of [false,true]){
   await page.setViewportSize({width,height:960});await page.addInitScript(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
   for(const route of ['about.html','resources.html','lesson.html?id=invalid','lesson.html?id=rectangular-coordinates']){await page.goto(base+route);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No overflow '+width+'/'+dark+'/'+route);}
  }
  // Focusing an off-screen control may initiate smooth scrolling. Wait for it to
  // finish before testing whether Space itself causes an unwanted page scroll.
  await page.setViewportSize({width:1440,height:1000});
  for(const id of ['V1','R1']){
   await page.goto(base+'challenges.html#'+id);await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
   const zoom=page.locator('.leaflet-control-zoom-in');await zoom.focus();
   await page.waitForFunction(()=>{const now=performance.now(),state=window.qaFocusScroll;if(!state||state.y!==scrollY){window.qaFocusScroll={y:scrollY,since:now};return false;}return now-state.since>200;});
   const before=await page.evaluate(()=>({y:scrollY,path:document.querySelector('.leaflet-boundary-pane path').getAttribute('d')}));
   await page.keyboard.press('Space');await page.waitForFunction(old=>document.querySelector('.leaflet-boundary-pane path').getAttribute('d')!==old,before.path);
   ok(Math.abs(await page.evaluate(()=>scrollY)-before.y)<=2,'Space zoom does not scroll '+id);
   ok(await zoom.evaluate(e=>e===document.activeElement&&getComputedStyle(e).outlineStyle!=='none'),'Zoom retains visible keyboard focus '+id);
  }
  const nojs=await browser.newContext({javaScriptEnabled:false});const staticPage=await nojs.newPage();
  for(const route of ['index.html','about.html','resources.html','lesson.html?id=sphere','gis-lab.html','challenges.html','raster-styling.html','topology.html','formats-interoperability.html','tutorials/t01.html']){await staticPage.goto(base+route);ok(await staticPage.locator('h1').count()===1,'No-JS heading '+route);ok(await staticPage.locator('nav[aria-label="Navigare fără JavaScript"]').count()===1,'No-JS recovery');ok((await staticPage.locator('body').innerText()).includes('JavaScript'),'No-JS explanation');if(route==='resources.html')ok(await staticPage.locator('.dataset-record').count()===7,'Static registry');if(route==='about.html')ok((await staticPage.locator('main').innerText()).includes('asistență AI'),'Static academic content');}await nojs.close();
  const failed=await browser.newContext();await failed.route('**/*.js',r=>r.abort());const fallback=await failed.newPage();for(const route of ['about.html','resources.html','lesson.html?id=sphere']){await fallback.goto(base+route);ok((await fallback.locator('main').innerText()).length>150,'Failed-JS readable content '+route);}await failed.close();
  ok(!errors.length,'No browser errors: '+errors.join('; '));
  fs.mkdirSync(path.join(root,'tmp/qa/operation1'),{recursive:true});fs.writeFileSync(path.join(root,'tmp/qa/operation1/academic-resilience.json'),JSON.stringify({status:'PASS',checks,search:measurements,errors},null,2));console.log(JSON.stringify({status:'PASS',checks,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
