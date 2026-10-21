const assert=require('node:assert/strict');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const baseline=require('./fixtures/v3-contract.json');
const protection=require('./protected-files.cjs');
const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
let checks=0;const ok=(x,m)=>{checks++;assert.ok(x,m);};
const staticCache=new Map();
function staticScientificScripts(lesson){
 const file=lesson.href.split(/[?#]/)[0];
 if(!staticCache.has(file)){
  const html=protection.gitBytes(file).toString('utf8');
  staticCache.set(file,[...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/g)].map(m=>m[1]).filter(src=>baseline.protectedFiles[src]));
 }
 return staticCache.get(file);
}
function assertCurrentScrolls(trace,{fragment,previous}){
 assert.ok(trace.length>0,'No valid current-fragment scroll observed');
 for(const call of trace){
  assert.ok(!previous.includes(call.target),'Previous fragment scroll detected: '+JSON.stringify(call));
  assert.equal(call.hash,'#'+fragment,'Scroll belongs to the current fragment');
  assert.equal(call.target,fragment,'Every observed scroll uses the current target');
  assert.equal(call.connected,true,'Scroll target belongs to the current render');
 }
}

(async()=>{
 const service=await browserServer(),errors=[];
 try{
  const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  // Test-only observation: the loader is untouched. Record actual script loads
  // and dependency availability at the two diagnostic entry points, before use.
  await page.addInitScript(()=>{
   if(!location.pathname.endsWith('/map-diagnostics.html'))return;
   const trace=window.qaDiagnostic={loads:[],uses:[]};
   document.addEventListener('load',event=>{if(event.target.tagName==='SCRIPT')trace.loads.push(event.target.getAttribute('src'));},true);
   const watch=(name,method,available)=>{
    let value;Object.defineProperty(window,name,{configurable:true,get:()=>value,set:api=>{
     value=api;const call=api[method];api[method]=function(...args){trace.uses.push({module:name,method,ready:available(...args)});return call.apply(this,args);};
    }});
   };
   watch('CARTO_DIAGNOSTIC_VIEW','create',scene=>scene.renderer==='projection'&&
    typeof window.CRS_ENGINE?.transform==='function'&&typeof window.CARTO_GEODESIC?.inverse==='function'&&
    typeof window.CARTO_PROJECTION_LAB_ENGINE?.geometry==='function'&&typeof window.CARTO_PROJECTION_VIEW?.create==='function'&&
    typeof window.CARTO_COMPARE?.create==='function');
   watch('CARTO_P06_MODEL','diagnose',()=>typeof window.CARTO_CLASSIFY?.classify==='function'&&
    typeof window.CARTO_P05_MODEL?.statistics==='function'&&typeof window.CARTO_P05_MODEL?.network==='function'&&
    !!window.CARTO_MAP_DIAGNOSTICS?.getState());
  });
  // DOM targets, not a guessed render duration, establish readiness. A broken
  // target times out with the resource name and missing condition in the trace.
  const ready=async lesson=>{
   const canonical=content.lessons.find(l=>l.id===(lesson.canonical_id||lesson.id));
   await page.waitForFunction(({anchors,title,href,home})=>{
    const active=[...document.querySelectorAll('#chapter-nav [aria-current="page"]')];
    return document.querySelectorAll('#chapter-nav a').length===71&&
     anchors.every(id=>document.getElementById(id))&&
     (home||document.querySelector('main .lesson-breadcrumb')?.textContent.includes(title))&&
     (home?active.length===0:active.length===1&&active[0].getAttribute('href').endsWith(href));
   },{anchors:baseline.routes[lesson.id].anchors,title:canonical.title,href:canonical.href,home:lesson.id==='home'});
  };
  // E4-01: stale preferences and manual expansion must never leak to a new page.
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:960});await page.goto(service.base+'index.html');
   await page.evaluate(()=>sessionStorage.setItem('cartografie-sidebar-state-v4',JSON.stringify({top:0,groups:{fundamentals:true,map:true,projections:true,methods:true,'geospatial-data':true,analysis:true,practice:true,'projection-families':true}})));
   await page.goto(service.base+'coordinates.html');
   const sequence=[['coordinates.html','fundamentals'],['raster-styling.html','methods'],['projection-crs-lab.html','projections'],['tutorials/t01.html','practice']];
   for(let i=0;i<sequence.length;i++){
    const [route,chapter]=sequence[i];
    await ready(content.lessons.find(l=>l.href===route));
    assert.deepEqual(await page.locator('#chapter-nav > .nav-group[open]').evaluateAll(groups=>groups.map(g=>g.dataset.navKey)),[chapter],width+' only current chapter '+route);checks++;
    ok(await page.locator('.nav-subgroup[open]').count()===0,width+' no unrelated projection subgroup '+route);
    if(width===390)await page.locator('#nav-toggle').click();
    const manual=page.locator('[data-nav-key="map"] > summary');await manual.focus();await page.keyboard.press('Enter');
    ok(await page.locator('[data-nav-key="map"]').getAttribute('open')!==null,width+' manual keyboard expansion '+route);
    ok(await manual.evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),width+' visible focus '+route);
    if(width===390){await page.keyboard.press('Escape');ok(await page.locator('#nav-toggle').getAttribute('aria-expanded')==='false',route+' Escape closes mobile menu');ok(await page.evaluate(()=>document.activeElement.id==='nav-toggle'),route+' Escape restores toggle focus');}
    if(i+1<sequence.length){
     if(width===390)await page.locator('#nav-toggle').click();
     const [target,targetChapter]=sequence[i+1],group=page.locator('[data-nav-key="'+targetChapter+'"]');
     if(await group.getAttribute('open')===null)await group.locator(':scope > summary').click();
     await page.locator('#chapter-nav a[href$="'+target+'"]').click();await page.waitForURL(service.base+target);
    }
   }
   await page.goto(service.base+'lesson.html?id=projection-conic');
   await ready(content.lessons.find(l=>l.id==='projection-conic'));
   assert.deepEqual(await page.locator('#chapter-nav > .nav-group[open]').evaluateAll(g=>g.map(x=>x.dataset.navKey)),['projections']);checks++;
   ok(await page.locator('[data-nav-key="projection-families"]').getAttribute('open')!==null,width+' query route opens its subgroup');
  }
  await page.goto(service.base+'digital-companion.html');await page.fill('#search','Laborator GIS');
  ok(await page.locator('#search-results a[href="digital-companion.html"]').count()===1,'E4-07 legacy name finds canonical catalogue');
  ok(await page.locator('#search-results a[href="gis-lab.html"]').count()===0,'E4-07 no alias result');
  ok(await page.evaluate(()=>window.CARTO_SEARCH_INDEX.length===90),'E4-07 canonical index count unchanged');
  for(const lesson of content.lessons){
   await page.goto(service.base+lesson.href);await ready(lesson);
   if(lesson.id==='map-diagnostics')await page.waitForFunction(required=>
    required.every(src=>window.qaDiagnostic.loads.includes(src))&&
    window.CARTO_MAP_DIAGNOSTICS?.getState()&&window.CARTO_P06?.instances.L08?.getResults()?.B&&
    window.qaDiagnostic.uses.some(call=>call.module==='CARTO_P06_MODEL'),
    baseline.routes[lesson.id].scripts.filter(src=>baseline.protectedFiles[src]),{timeout:15000});
   const state=await page.evaluate(()=>({ids:[...document.querySelectorAll('[id]')].map(e=>e.id),scripts:[...document.scripts].map(e=>e.getAttribute('src')).filter(Boolean),links:[...document.querySelectorAll('#chapter-nav a')].map(a=>a.getAttribute('href')),chapters:document.querySelectorAll('#chapter-nav > .nav-group').length,subgroups:document.querySelectorAll('#chapter-nav .nav-subgroup').length,active:[...document.querySelectorAll('#chapter-nav [aria-current="page"]')].map(a=>a.getAttribute('href')),continuations:[...document.querySelectorAll('.learning-continuation a')].map(a=>a.getAttribute('href')),catalog:document.querySelectorAll('.catalog-card').length,crumb:document.querySelector('main .lesson-breadcrumb')?.textContent||''}));
   ok(state.links.length===71&&new Set(state.links).size===71,lesson.id+' unique 71-entry menu');
   ok(state.chapters===7&&state.subgroups===1,lesson.id+' native chapter hierarchy');
   const expectedChapter=content.chapterFor(lesson.id)?.id;
   assert.deepEqual(await page.locator('#chapter-nav > .nav-group[open]').evaluateAll(g=>g.map(x=>x.dataset.navKey)),expectedChapter?[expectedChapter]:[],lesson.id+' only contextual chapter open');checks++;
   for(const anchor of baseline.routes[lesson.id].anchors)ok(state.ids.includes(anchor),lesson.id+' legacy anchor '+anchor);
   ok(state.ids.length===new Set(state.ids).size,lesson.id+' unique DOM IDs');
   const canonical=content.lessons.find(l=>l.id===(lesson.canonical_id||lesson.id));
   ok(state.active.length===(lesson.id==='home'?0:1),lesson.id+' contextual active resource');
   if(lesson.id!=='home')ok(state.active[0]?.endsWith(canonical.href),lesson.id+' canonical active target');
   ok(new Set(state.continuations).size===state.continuations.length,lesson.id+' deduplicated continuation');
   if(lesson.id!=='home')ok(state.crumb.includes(canonical.title),lesson.id+' thematic breadcrumb');
   // Preserve baseline presence, but only baseline HTML scripts have a global
   // document order. Independently loaded dynamic chains have a partial order.
   const protectedScripts=baseline.routes[lesson.id].scripts.filter(src=>baseline.protectedFiles[src]);
   for(const src of protectedScripts)ok(state.scripts.includes(src),lesson.id+' required script '+src);
   let position=-1;for(const src of staticScientificScripts(lesson)){const next=state.scripts.indexOf(src);ok(next>position,lesson.id+' static script order '+src);position=next;}
   if(lesson.id==='map-diagnostics'){
    const trace=await page.evaluate(()=>window.qaDiagnostic);
    const edges=[['data/crs-registry.js','js/crs-engine.js'],['js/vendor/proj4.js','js/crs-engine.js'],
     ['js/vendor/geographiclib-geodesic.min.js','js/geodesic-adapter.js'],['js/crs-engine.js','js/projection-lab-engine.js'],
     ['js/geodesic-adapter.js','js/projection-lab-engine.js'],['js/projection-lab-engine.js','js/projection-view.js'],
     ['js/classification-engine.js','js/p05-models.js']];
    for(const [dependency,consumer]of edges)ok(trace.loads.indexOf(dependency)>=0&&trace.loads.indexOf(consumer)>trace.loads.indexOf(dependency),'Diagnostic dependency load order '+dependency+' -> '+consumer);
    for(const name of ['CARTO_DIAGNOSTIC_VIEW','CARTO_P06_MODEL'])ok(trace.uses.some(call=>call.module===name),'Diagnostic module actually used '+name);
    ok(trace.uses.every(call=>call.ready),'Diagnostic dependencies available before every observed use: '+JSON.stringify(trace.uses));
    console.log('PASS diagnostic dependencies '+JSON.stringify(trace));
   }
   if(['digital-companion','gis-lab'].includes(lesson.id))ok(state.catalog===20,lesson.id+' exactly 20 labs');
  }
  // E5-03: preserve the published v3 meaning without conflating the intro.
  const fragmentTarget=hash=>hash==='grila'?'crs-grid':hash;
  const settled=async (p,hash)=>{
   await p.waitForFunction(({hash,target})=>{
    const e=document.getElementById(target);if(!e||location.hash!=='#'+hash)return false;
    const offset=(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+(parseFloat(getComputedStyle(e).scrollMarginTop)||0);
    return Math.abs(e.getBoundingClientRect().top-offset)<2;
   },{hash,target:fragmentTarget(hash)});
   await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   ok(await p.locator('#'+fragmentTarget(hash)).evaluate(e=>e.getBoundingClientRect().top>=0&&e.getBoundingClientRect().top<innerHeight/2),'Current fragment remains visible '+hash);
  };
  for(const width of [375,390,1280])for(const dark of [false,true]){
   await page.setViewportSize({width,height:900});
   for(const hash of ['concept-rect','grila-intro','sisteme-rect','grila','crs-grid']){
    await page.goto(service.base+'index.html');await page.evaluate(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
    await page.goto(service.base+'lesson.html?id=rectangular-coordinates#'+hash);
    await ready(content.lessons.find(l=>l.id==='rectangular-coordinates'));await settled(page,hash);
    ok(await page.locator('#crs-grid #grila').count()===1&&await page.locator('#crs-grid #grid-crs').count()===1,'Legacy alias and single advanced experiment '+width+'/'+dark+'/'+hash);
    ok(await page.locator('[data-learning-segment="rectangular-coordinates@intro"] #grila-intro').count()===1&&await page.locator('[data-learning-segment="rectangular-coordinates@intro"] #grila').count()===0,'Intro has a distinct fragment '+hash);
    ok(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.length===new Set(ids).size&&document.documentElement.scrollWidth<=innerWidth+1;}),'Unique IDs and no overflow '+width+'/'+hash);
    await page.reload();await ready(content.lessons.find(l=>l.id==='rectangular-coordinates'));await settled(page,hash);
   }
   // Same-document history preserves the experiment instance and its state.
   await page.evaluate(()=>{window.qaGrid=document.querySelector('#metric-grid');const a=document.createElement('a');a.id='qa-legacy-link';a.href='#grila';a.textContent='Legacy published link';document.querySelector('.lesson-jump').append(a);});
   await page.selectOption('#grid-crs','EPSG:4326');
   await page.locator('.lesson-jump a[href="#grila-intro"]').click();await settled(page,'grila-intro');
   await page.locator('#qa-legacy-link').click();await settled(page,'grila');
   await page.goBack();await settled(page,'grila-intro');await page.goForward();await settled(page,'grila');
   await page.goBack();await settled(page,'grila-intro');await page.goBack();await settled(page,'crs-grid');
   ok(await page.evaluate(()=>window.qaGrid===document.querySelector('#metric-grid')&&document.querySelector('#grid-crs').value==='EPSG:4326'),'Aliases and history reuse the same CRS experiment '+width+'/'+dark);
   await page.locator('.lesson-jump a[href="#grila-intro"]').click();await settled(page,'grila-intro');
   const beforeDraw=await page.evaluate(()=>scrollY);
   await page.evaluate(()=>{document.querySelector('#grid-crs').value='EPSG:3844';document.querySelector('#grid-crs').dispatchEvent(new Event('change'));});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   ok(Math.abs(await page.evaluate(()=>scrollY)-beforeDraw)<2,'Updating the advanced experiment never restores an old fragment '+width+'/'+dark);
  }
  for(const [variant,route] of Object.entries(model.plan.endings)){
   for(const ref of route){await page.goto(service.base+model.target(ref));await ready(content.lessons.find(l=>l.id===model.resourceId(ref)));}
   ok(await page.locator('#proiect-'+variant).isVisible(),'Prepared project variant '+variant);
   ok(await page.locator('.learning-continuation .continuation-primary').count()===0,'Project terminal '+variant);
  }
  await page.goto(service.base+'tutorials/t06.html');
  const projectActions=page.locator('.learning-continuation a[href*="final-project.html"]');
  ok(await projectActions.count()===1&&await projectActions.first().getAttribute('href')==='../final-project.html#proiect-raster','T06 keeps contextual primary variant without redundant chapter action');
  const delayedFonts=await service.browser.newContext();
  await delayedFonts.addInitScript(()=>{
   const actual=document.fonts.ready;let release;const gate=new Promise(resolve=>{release=resolve;});
   const work=window.qaFragmentWork={fonts:0,frames:0,completed:0};let insideFontCallback=false;
   const then=gate.then.bind(gate),raf=window.requestAnimationFrame.bind(window);
   // Observe completion of the real deferred callbacks, not a guessed duration.
   gate.then=(fulfilled,rejected)=>{work.fonts++;return then(value=>{
    const previous=insideFontCallback;insideFontCallback=true;
    try{return fulfilled?fulfilled(value):value;}finally{insideFontCallback=previous;work.fonts--;work.completed++;}
   },error=>{work.fonts--;if(rejected)return rejected(error);throw error;});};
   window.requestAnimationFrame=callback=>{
    if(!insideFontCallback)return raf(callback);
    work.frames++;return raf(time=>{try{return callback(time);}finally{work.frames--;}});
   };
   Object.defineProperty(document.fonts,'ready',{get:()=>gate});window.releaseQAFonts=()=>actual.then(release);
  });
  // Capture the real renderer inputs, without introducing a production test API.
  await delayedFonts.route('**/js/crs-lesson.js',async route=>{
   const response=await route.fetch();
   await route.fulfill({response,body:await response.text()+`\n{const render=window.CRS_LESSON.render;window.CRS_LESSON.render=(lesson,helpers)=>{window.qaRerender=()=>render(lesson,helpers);return render(lesson,helpers);};}`});
  });
  const fontPage=await delayedFonts.newPage();
  fontPage.on('pageerror',e=>errors.push(e.message));
  await fontPage.goto(service.base+'lesson.html?id=rectangular-coordinates#concept-rect');
  await fontPage.locator('#sisteme-rect').waitFor();await fontPage.locator('.lesson-jump a[href="#sisteme-rect"]').click();
  ok(await fontPage.evaluate(()=>location.hash==='#sisteme-rect'),'New fragment selected before fonts complete');
  await fontPage.evaluate(()=>window.releaseQAFonts());
  await fontPage.waitForFunction(()=>{const e=document.getElementById(location.hash.slice(1));return e&&e.getBoundingClientRect().top<innerHeight&&e.getBoundingClientRect().bottom>0;});
  await fontPage.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  ok(await fontPage.locator('#sisteme-rect').evaluate(e=>e.getBoundingClientRect().top<innerHeight&&e.getBoundingClientRect().bottom>0),'Late font callback never restores stale initial fragment');
  const rerenderPage=await delayedFonts.newPage();rerenderPage.on('pageerror',e=>errors.push(e.message));
  await rerenderPage.goto(service.base+'lesson.html?id=rectangular-coordinates#grila');
  await rerenderPage.locator('#grid-crs').waitFor();
  await rerenderPage.evaluate(()=>{
   window.qaScrollTrace=[];window.qaHashChanged=false;window.qaScrollInterval=false;const scroll=Element.prototype.scrollIntoView;
   // The observation interval begins when the requested new fragment is current.
   window.addEventListener('hashchange',()=>{if(location.hash==='#grila-intro'){window.qaHashChanged=true;window.qaScrollInterval=true;}});
   Element.prototype.scrollIntoView=function(...args){
    if(location.hash==='#grila-intro')window.qaScrollInterval=true;
    if(window.qaScrollInterval)window.qaScrollTrace.push({target:this.id,hash:location.hash,connected:this.isConnected,time:performance.now()});
    return scroll.apply(this,args);
   };
  });
  await rerenderPage.locator('.lesson-jump a[href="#grila-intro"]').click();
  await rerenderPage.waitForFunction(()=>window.qaHashChanged,null,{timeout:15000});
  await rerenderPage.evaluate(()=>window.qaRerender());
  await rerenderPage.evaluate(()=>window.releaseQAFonts());
  await rerenderPage.waitForFunction(()=>window.qaFragmentWork.completed>0&&window.qaFragmentWork.fonts===0&&
   window.qaFragmentWork.frames===0&&window.qaScrollTrace.length>0,null,{timeout:15000});
  await settled(rerenderPage,'grila-intro');
  const currentScrolls=await rerenderPage.evaluate(()=>window.qaScrollTrace);
  const scrollContract={fragment:'grila-intro',previous:['grila','crs-grid']};
  assertCurrentScrolls(currentScrolls,scrollContract);checks++;
  assertCurrentScrolls([...currentScrolls,currentScrolls[0]],scrollContract);checks++;
  // Negative control: a real call to the OLD target while the NEW hash remains
  // active must fail the same predicate, even though earlier calls were valid.
  await rerenderPage.evaluate(()=>document.querySelector('#crs-grid').scrollIntoView({block:'start',behavior:'instant'}));
  const staleScrolls=await rerenderPage.evaluate(()=>window.qaScrollTrace);
  assert.throws(()=>assertCurrentScrolls(staleScrolls,scrollContract),/Previous fragment scroll detected/,'Old-target injection must be rejected');checks++;
  assert.throws(()=>assertCurrentScrolls([],scrollContract),/No valid current-fragment scroll observed/,'No scroll is a failure');checks++;
  console.log('PASS fragment scroll contract '+JSON.stringify({observed:currentScrolls,negative:staleScrolls.at(-1),negativeRejected:true,work:await rerenderPage.evaluate(()=>window.qaFragmentWork)}));
  ok(await rerenderPage.locator('#crs-grid #grid-crs').count()===1&&await rerenderPage.locator('#grila').count()===1,'Reinitialization keeps one experiment and one legacy alias');
  await delayedFonts.close();
  const context=await service.browser.newContext({javaScriptEnabled:false});const staticPage=await context.newPage();
  for(const route of ['index.html','digital-companion.html','gis-lab.html','lesson.html','lesson.html?id=rectangular-coordinates#grila','tutorials/t01.html']){
   await staticPage.goto(service.base+route);ok(await staticPage.locator('#chapter-nav a').count()===71,route+' static menu');
   if(route.includes('companion')||route==='gis-lab.html')ok(await staticPage.locator('.catalog-card a').count()>=20,route+' static catalogue links');
  }
  await context.close();ok(errors.length===0,'No browser exceptions: '+errors.join('; '));
  console.log(`PASS lot 4.2: ${checks} assertions across 73 runtime destinations and static navigation/catalogues`);
 }finally{await service.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
