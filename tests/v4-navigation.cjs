const assert=require('node:assert/strict');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const baseline=require('./fixtures/v3-contract.json');
const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
let checks=0;const ok=(x,m)=>{checks++;assert.ok(x,m);};
(async()=>{
 const service=await browserServer(),errors=[];
 try{
  const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  // E4-01: stale preferences and manual expansion must never leak to a new page.
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:960});await page.goto(service.base+'index.html');
   await page.evaluate(()=>sessionStorage.setItem('cartografie-sidebar-state-v4',JSON.stringify({top:0,groups:{fundamentals:true,map:true,projections:true,methods:true,'geospatial-data':true,analysis:true,practice:true,'projection-families':true}})));
   await page.goto(service.base+'coordinates.html');
   const sequence=[['coordinates.html','fundamentals'],['raster-styling.html','methods'],['projection-crs-lab.html','projections'],['tutorials/t01.html','practice']];
   for(let i=0;i<sequence.length;i++){
    const [route,chapter]=sequence[i];
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
   assert.deepEqual(await page.locator('#chapter-nav > .nav-group[open]').evaluateAll(g=>g.map(x=>x.dataset.navKey)),['projections']);checks++;
   ok(await page.locator('[data-nav-key="projection-families"]').getAttribute('open')!==null,width+' query route opens its subgroup');
  }
  await page.goto(service.base+'digital-companion.html');await page.fill('#search','Laborator GIS');
  ok(await page.locator('#search-results a[href="digital-companion.html"]').count()===1,'E4-07 legacy name finds canonical catalogue');
  ok(await page.locator('#search-results a[href="gis-lab.html"]').count()===0,'E4-07 no alias result');
  ok(await page.evaluate(()=>window.CARTO_SEARCH_INDEX.length===90),'E4-07 canonical index count unchanged');
  for(const lesson of content.lessons){
   await page.goto(service.base+lesson.href);await page.waitForTimeout(80);
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
   // Scientific scripts retain their order; catalogue-only shared assets may differ.
   const protectedScripts=baseline.routes[lesson.id].scripts.filter(src=>baseline.protectedFiles[src]);
   let position=-1;for(const src of protectedScripts){const next=state.scripts.indexOf(src);ok(next>position,lesson.id+' script order '+src);position=next;}
   if(['digital-companion','gis-lab'].includes(lesson.id))ok(state.catalog===20,lesson.id+' exactly 20 labs');
  }
  const context=await service.browser.newContext({javaScriptEnabled:false});const staticPage=await context.newPage();
  for(const route of ['index.html','digital-companion.html','gis-lab.html','lesson.html','tutorials/t01.html']){
   await staticPage.goto(service.base+route);ok(await staticPage.locator('#chapter-nav a').count()===71,route+' static menu');
   if(route.includes('companion')||route==='gis-lab.html')ok(await staticPage.locator('.catalog-card a').count()>=20,route+' static catalogue links');
  }
  await context.close();ok(errors.length===0,'No browser exceptions: '+errors.join('; '));
  console.log(`PASS lot 4.2: ${checks} assertions across 73 runtime destinations and static navigation/catalogues`);
 }finally{await service.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
