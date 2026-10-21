const assert=require('node:assert/strict');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
const operations=JSON.parse(fs.readFileSync(path.join(root,'data/processing-operations.json'),'utf8'));
const out=path.join(root,'tmp/qa/v4');fs.mkdirSync(out,{recursive:true});
const report={status:'RUNNING',checks:0,layouts:[],operations:[],failures:[],errors:[],screenshots:[]};
const check=(value,message)=>{report.checks++;if(!value)report.failures.push(message);};
const priority=new Set(['home','coordinates','rectangular-coordinates','digital-companion','gis-lab','projection-crs-lab','styling-labeling','geospatial-data','T01','challenges','zarr-cloud-data','georeferencing-lab']);
(async()=>{
 const service=await browserServer();
 try{
  const jobs=[];
  for(const width of [375,390,768,1024,1440])for(const dark of [false,true])for(const lesson of content.lessons)if(width===375||width===1440||priority.has(lesson.id))jobs.push({width,dark,lesson});
  async function worker(){
   const context=await service.browser.newContext(),page=await context.newPage();
   page.on('pageerror',e=>report.errors.push(e.message));
   for(;;){const job=jobs.shift();if(!job)break;const {width,dark,lesson}=job,label=width+'/'+(dark?'dark':'light')+' '+lesson.id;
    await page.setViewportSize({width,height:960});await page.goto(service.base+lesson.href);await page.waitForTimeout(50);
    if((await page.locator('body').getAttribute('class')||'').includes('dark')!==dark)await page.locator('#theme-toggle').click();
    const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,h1:!!document.querySelector('main h1'),badText:/\bundefined\b/.test(document.body.innerText),line:[...document.querySelectorAll('main .resource-level')].map(e=>({color:getComputedStyle(e).borderTopColor,width:getComputedStyle(e).borderTopWidth,icon:e.querySelector('svg')?.dataset.icon,text:e.querySelector('.level-badge')?.textContent.trim()})),chapterBadges:document.querySelectorAll('.theme-card .level-badge').length}));
    check(!state.overflow,label+' no horizontal page overflow');check(state.h1,label+' title');check(!state.badText,label+' no undefined UI');check(state.chapterBadges===0,label+' no chapter difficulty');
    if(model.items[lesson.id].level){
     const descriptor=model.levels[model.items[lesson.id].level];
     check(state.line.length===1,label+' single resource indicator');
     check(state.line[0]?.icon===descriptor.icon&&state.line[0]?.text===descriptor.label,label+' approved icon and textual level');
     const rgb=descriptor.color.match(/\w\w/g).map(v=>parseInt(v,16)).join(', ');
     check(state.line[0]?.color==='rgb('+rgb+')'&&state.line[0]?.width==='2px',label+' exact approved thin colored line');
    }else check(state.line.length===0,label+' no artificial difficulty');
    report.layouts.push(label);
    if((width===375&&!dark&&['digital-companion','T01','coordinates'].includes(lesson.id))||(width===1440&&dark&&['digital-companion','rectangular-coordinates'].includes(lesson.id))){
     const file=width+'-'+(dark?'dark':'light')+'-'+lesson.id+'.png';await page.screenshot({path:path.join(out,file)});report.screenshots.push(file);
    }
   }
   await context.close();
  }
  await Promise.all([worker(),worker()]);
  const context=await service.browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(service.base+'digital-companion.html');
  await page.selectOption('#catalog-level','advanced');check(await page.locator('.catalog-card:visible').count()===3,'Three advanced labs L09/L16/L18');
  await page.selectOption('#catalog-theme','map');check(await page.locator('.catalog-card:visible').count()===0&&await page.locator('#catalog-empty').isVisible(),'Combined empty filter state');
  await page.locator('.catalog-filters button').click();check(await page.locator('.catalog-card:visible').count()===20,'Reset filters restores 20 cards');
  await page.locator('#nav-toggle').click();const summary=page.locator('[data-nav-key="projections"] > summary');await summary.focus();
  const before=await summary.evaluate(e=>e.parentElement.open);await page.keyboard.press('Enter');check(await summary.evaluate(e=>e.parentElement.open)!==before,'Keyboard opens native chapter');
  check(await summary.evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),'Visible keyboard focus');
  await page.keyboard.press('Escape');check(await page.locator('#nav-toggle').getAttribute('aria-expanded')==='false','Escape closes drawer');
  await page.goto(service.base+'lesson.html?id=projection-conic');check(await page.locator('[data-nav-key="projections"]').getAttribute('open')!==null&&await page.locator('[data-nav-key="projection-families"]').getAttribute('open')!==null,'Current chapter and subgroup override stored closed state');
  check(await page.evaluate(()=>{const saved=JSON.parse(sessionStorage.getItem('cartografie-sidebar-state-v4'));return saved&&!Object.hasOwn(saved,'groups');}),'Only sidebar scroll persists, never chapter expansion');
  await page.fill('#search','Catalogul laboratoarelor');check(await page.locator('#search-results a[href="digital-companion.html"]').count()===1,'Single canonical catalogue search result');check(await page.locator('#search-results a[href="gis-lab.html"]').count()===0,'No legacy hub search duplicate');
  await page.locator('#search').press('ArrowDown');check(await page.evaluate(()=>!!document.activeElement.closest('#search-results')),'Keyboard enters search results');await page.keyboard.press('Escape');check(await page.locator('#search-results').isHidden(),'Search Escape');
  await page.locator('#theme-toggle').click();const dark=await page.locator('body').evaluate(e=>e.classList.contains('dark'));await page.reload();check(await page.locator('body').evaluate(e=>e.classList.contains('dark'))===dark,'Existing theme persistence');
  for(const query of ['','?id=invalid-v4-test','?id=about']){await page.goto(service.base+'lesson.html'+query);check(await page.locator('main h1').count()===1,'Lesson recovery/alias '+query);if(query!=='?id=about')check(await page.locator('.lesson-error').count()===1,'Invalid lesson recovery '+query);}
  await page.goto(service.base+'lesson.html?id=rectangular-coordinates#grila');check(await page.locator('#grila').count()===1,'Dynamic legacy CRS grid anchor');
  // Every existing operation is tested through the public query parameter.
  for(const op of operations){
   await page.goto(service.base+'geospatial-data.html?operation='+op.id);const detail=page.locator('#'+op.model+'-operation-detail');
   check((await detail.innerText()).includes(op.name_ro),'Operation query selects '+op.id);check(await detail.locator('.processing-svg').count()===2,'Operation input/output figures '+op.id);report.operations.push(op.id);
  }
  await page.goto(service.base+'geospatial-data.html?operation=vector-buffer');const output=page.locator('#vector-operation-detail .processing-svg').nth(1);const beforeBuffer=await output.innerHTML();await page.locator('#buffer-range').fill('2000');check(beforeBuffer!==await output.innerHTML(),'Buffer parameter updates geometry');
  await page.goto(service.base+'geospatial-data.html?operation=raster-hillshade');const shade=page.locator('#raster-operation-detail .processing-svg').nth(1),beforeShade=await shade.innerHTML();await page.locator('#light-range').fill('90');check(beforeShade!==await shade.innerHTML(),'Hillshade parameter updates raster');
  await page.goto(service.base+'challenges.html');await page.evaluate(async()=>{const {progress}=await import('./js/challenges/challenge-state.js');progress.complete('V1');progress.complete('R1');});await page.reload();
  check(await page.evaluate(async()=>{const {progress}=await import('./js/challenges/challenge-state.js');return progress.read().includes('V1')&&progress.read().includes('R1');}),'Existing challenge progress key persists');
  const config=JSON.parse(fs.readFileSync(path.join(root,'data/challenges/challenges.json'),'utf8'));
  check(JSON.stringify(config).includes('V6')&&JSON.stringify(config).includes('R6'),'Twelve challenge definitions retained');
  await context.close();
  const nojs=await service.browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:844}}),staticPage=await nojs.newPage();
  for(const file of [...new Set(content.lessons.map(l=>l.href.split('?')[0]))]){
   await staticPage.goto(service.base+file);check(await staticPage.locator('#chapter-nav a').count()===71,file+' static 71 links');check(await staticPage.locator('#sidebar').isVisible(),file+' static navigation visible on mobile');check(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),file+' static mobile no overflow');
  }
  await staticPage.goto(service.base+'digital-companion.html');check(await staticPage.locator('.catalog-card:visible').count()===20,'All catalogue cards without JS');check(await staticPage.locator('.catalog-filters').isHidden(),'Inactive filters hidden without JS');await nojs.close();
  // Focused technical accessibility audit, not a screen-reader/WCAG certificate.
  report.accessibility=[];
  const ux=await service.browser.newContext(),uxPage=await ux.newPage();
  uxPage.on('pageerror',e=>report.errors.push(uxPage.url()+': '+e.stack));
  const routes=['index.html','learning-path.html','digital-companion.html','lesson.html?id=rectangular-coordinates#grila','tutorials/t01.html','final-project.html','georeferencing-lab.html'];
  for(const dark of [false,true])for(const route of routes){
   await uxPage.setViewportSize({width:1280,height:900});await uxPage.goto(service.base+route);
   if(route==='georeferencing-lab.html')await uxPage.waitForFunction(()=>window.CARTO_GEO&&document.querySelector('#p07-fallback').hidden);
   if((await uxPage.locator('body').getAttribute('class')||'').includes('dark')!==dark)await uxPage.locator('#theme-toggle').click();
   const audit=await uxPage.evaluate(()=>{
    const visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
    const controls=[...document.querySelectorAll('button,input:not([type="hidden"]),select,textarea,[role="button"]')].filter(e=>visible(e)&&!e.disabled);
    const name=e=>e.getAttribute('aria-label')||(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>document.getElementById(id)?.textContent||'').join(' ').trim()||[...(e.labels||[])].map(l=>l.textContent).join(' ').trim()||e.getAttribute('title')||(e.matches('button,[role="button"]')?e.textContent:'');
    const rgba=value=>{const n=value.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [n[0],n[1],n[2],n[3]??1];};
    const over=(a,b)=>a.slice(0,3).map((v,i)=>v*a[3]+b[i]*(1-a[3]));
    const background=e=>{if(!e)return [255,255,255];const c=rgba(getComputedStyle(e).backgroundColor);return c[3]===1?c.slice(0,3):over(c,background(e.parentElement));};
    const luminance=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const samples=[...document.querySelectorAll('.lead,.learning-card>p,.learning-context p,main>section>p')].filter(e=>visible(e)&&e.textContent.trim().length>15).map(e=>{const s=getComputedStyle(e),bg=background(e),a=luminance(over(rgba(s.color),bg)),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),large=parseFloat(s.fontSize)>=24||parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700;return {text:e.textContent.trim().slice(0,70),ratio,required:large?3:4.5};});
    return {contrast:{samples:samples.length,min:Math.min(...samples.map(s=>s.ratio)),fail:samples.filter(s=>s.ratio<s.required)},missingNames:controls.filter(e=>!/[\p{L}\d]/u.test(name(e))).map(e=>({tag:e.tagName,id:e.id,html:e.outerHTML.slice(0,180)})),positiveTabindex:[...document.querySelectorAll('[tabindex]')].filter(e=>Number(e.tabIndex)>0&&visible(e)).map(e=>e.id),main:document.querySelectorAll('main').length,h1:document.querySelectorAll('main h1').length};
   });
   report.accessibility.push({route,dark,...audit});
   check(audit.missingNames.length===0,'Accessible control names '+route+'/'+dark+' '+JSON.stringify(audit.missingNames));
   check(audit.contrast.samples>0&&audit.contrast.fail.length===0,'Sampled text contrast '+route+'/'+dark+' '+JSON.stringify(audit.contrast.fail));
   check(audit.positiveTabindex.length===0,'Natural focus order '+route);check(audit.main===1&&audit.h1===1,'Main landmark and title '+route);
   // Fragment arrivals legitimately start sequential focus at that fragment.
   // Check the document's initial focus order on a fresh, fragment-free visit.
   await uxPage.goto(service.base+route.split('#')[0]);await uxPage.keyboard.press('Tab');
   check(await uxPage.evaluate(()=>document.activeElement.matches('a.skip-link')),'Skip link first in keyboard order '+route);
   await uxPage.keyboard.press('Enter');
   check(await uxPage.evaluate(()=>{const e=document.activeElement;return e.tagName==='MAIN'||e.closest('main')||location.hash==='#main-content'||location.hash==='#lesson-root';}),'Skip target reaches main '+route);
   for(let i=0;i<8;i++){
    await uxPage.keyboard.press('Tab');
    check(await uxPage.evaluate(()=>{const e=document.activeElement;return e===document.body||getComputedStyle(e).visibility!=='hidden'&&e.getClientRects().length>0;}),'Keyboard never focuses hidden control '+route);
   }
   await uxPage.setViewportSize({width:375,height:900});
   check(await uxPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Focused narrow reflow '+route);
   await uxPage.locator('#nav-toggle').click();await uxPage.keyboard.press('Escape');
   check(await uxPage.locator('#nav-toggle').getAttribute('aria-expanded')==='false','Focused Escape '+route);
   // Browser zoom at 200% halves the CSS viewport; CSS zoom alone does not
   // update media queries and is not an equivalent accessibility test.
   await uxPage.setViewportSize({width:640,height:900});await uxPage.evaluate(()=>document.fonts.ready);
   check(await uxPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'200 percent equivalent CSS viewport reflow '+route);
   await uxPage.setViewportSize({width:1280,height:900});await uxPage.evaluate(()=>document.documentElement.style.zoom='2');
   if(!route.includes('georeferencing')){
    await uxPage.waitForFunction(()=>document.documentElement.scrollWidth<=innerWidth+1).catch(async error=>{throw Error('Zoom layout '+route+'/'+dark+' '+JSON.stringify(await uxPage.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,active:document.activeElement.outerHTML.slice(0,500),pseudo:[...document.querySelectorAll('body *')].filter(e=>{const s=getComputedStyle(e,'::after');return s.content!=='none'&&s.position==='absolute';}).map(e=>({tag:e.tagName,id:e.id,cls:e.className,text:getComputedStyle(e,'::after').content,left:getComputedStyle(e,'::after').left,width:getComputedStyle(e,'::after').width}))})))+' '+error.message);});
    check(await uxPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Additional CSS zoom stress '+route);
   }
   await uxPage.evaluate(()=>document.documentElement.style.zoom='');
   await uxPage.emulateMedia({media:'print'});
   check(await uxPage.locator('main h1').isVisible(),'Print retains main title '+route);
   check(await uxPage.locator('main').evaluate(e=>getComputedStyle(e).display!=='none'),'Print retains content '+route);
   await uxPage.emulateMedia({media:'screen'});
  }
  await uxPage.goto(service.base+'lesson.html?id=rectangular-coordinates#grila');
  check(await uxPage.locator('#crs-grid #grila').count()===1,'Legacy fragment belongs to the single advanced experiment');
  check(await uxPage.locator('#crs-grid #grid-crs').isVisible(),'Legacy fragment reaches real CRS selector');
  await uxPage.waitForFunction(()=>{const e=document.getElementById('crs-grid');return e.getBoundingClientRect().top<innerHeight&&e.getBoundingClientRect().bottom>0;});
  check(true,'Legacy fragment actually scrolls to the advanced CRS experiment');
  await ux.close();
  // Reproduce a real race: history navigation while the L19 module is held.
  const delayed=await service.browser.newContext();let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await delayed.route('**/js/georef/app.js',async route=>{await gate;await route.continue();});
  const early=await delayed.newPage();early.on('pageerror',e=>report.errors.push('L19 early history: '+e.stack));
  early.on('console',message=>{if(message.type()==='error')report.errors.push('L19 early history console: '+message.text());});
  await early.goto(service.base+'georeferencing-lab.html',{waitUntil:'domcontentloaded'});
  check(await early.evaluate(()=>!window.CARTO_GEO),'Fixture really delays L19 API');
  await early.locator('.skip-link').focus();await early.keyboard.press('Enter');
  await early.evaluate(()=>dispatchEvent(new PopStateEvent('popstate')));
  release();await early.waitForFunction(()=>window.CARTO_GEO&&document.querySelector('#p07-fallback').hidden);
  check(await early.locator('#p07-app').getAttribute('aria-busy')!=='true','L19 eventually ready after early history');await delayed.close();
  check(report.errors.length===0,'No browser exceptions');report.status=report.failures.length?'FAIL':'PASS';
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:report.checks,layouts:report.layouts.length,operations:report.operations.length,failures:report.failures,errors:report.errors}));
  assert.equal(report.failures.length,0,'UI/browser regression');
 }finally{await service.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
