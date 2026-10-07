const {root,manifest,playwright,browserOptions,inspectNavigation,inspectSourceCards}=require('./expectations.cjs');
process.chdir(root);
const {chromium}=playwright(),fs=require('fs');
const content=manifest();
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4183/explorare-geospatiala/',failures=[],warnings=[],checks=[],resources=[],layouts=[],http=[],contrasts=[];fs.mkdirSync('tmp/qa/phase4',{recursive:true});
const config=JSON.parse(fs.readFileSync('data/challenges/challenges.json','utf8')),registry=JSON.parse(fs.readFileSync('data/challenges/challenge-data.json','utf8'));
(async()=>{
 const browser=await chromium.launch(browserOptions()),page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 page.on('pageerror',e=>failures.push(e.message));page.on('console',m=>{if(m.type()==='error')failures.push(m.text());if(m.type()==='warning')warnings.push(m.text());});page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 const check=(ok,name)=>{checks.push(name);if(!ok)failures.push(name);};
 await page.goto(base+'index.html');
 for(const query of ['Provocări GIS','buffer','populație','școli','medicină de familie','pantă','forest loss','Rîșca']){await page.fill('#search',query);check(await page.locator('#search-results a[href="challenges.html"]').count()===1,'unique search: '+query);}
 await page.locator('#search').press('ArrowDown');check(await page.evaluate(()=>!!document.activeElement.closest('#search-results')),'keyboard search');await page.locator('#search').press('Escape');check(await page.locator('#search-results').isHidden(),'search Escape');
 await page.goto(base+'challenges.html');await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
 check(JSON.stringify(await page.locator('.challenge-catalog-section h3').allTextContents())===JSON.stringify(['VECTOR · Sectorul 1','RASTER · Rîșca']),'two challenge groups');check(await page.locator('.challenge-catalog-section').nth(0).locator('[data-challenge]').count()===6&&await page.locator('.challenge-catalog-section').nth(1).locator('[data-challenge]').count()===6,'six challenges per group');
 for(const c of config.challenges)for(const link of c.links){
   await page.goto(base+link.href);const target=new URL(link.href,base),operation=target.searchParams.get('operation');
   if(operation)check(await page.locator(`[data-operation="${operation}"]`).getAttribute('aria-pressed')==='true',c.id+' direct operation '+operation);
   if(target.hash)check(await page.locator(target.hash).count()===1,c.id+' anchor '+target.hash);
 }
 for(const width of [1440,1024,768,390])for(const dark of [false,true]){
   await page.setViewportSize({width,height:1000});
   for(const route of ['index.html','challenges.html','resources.html','geospatial-data.html?operation=raster-slope#raster-lab','lesson.html?id=rectangular-coordinates','tutorials/t06.html']){
     await page.goto(base+route);await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);if(route==='challenges.html')await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);if(route==='resources.html')await inspectSourceCards(page,registry);
     await inspectNavigation(page,content,base);checks.push(`${width}/${dark} ${route} semantic navigation`);
     const state=await page.evaluate(()=>{const visible=e=>!!e.getClientRects().length&&!e.closest('[hidden],dialog:not([open])'),issues=[];for(const e of document.querySelectorAll('input,select'))if(visible(e)&&!e.labels.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby'))issues.push('control without label');return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,issues};});layouts.push({width,dark,route,...state});check(state.overflow<=1&&!state.issues.length,`${width}/${dark} ${route} layout`);
     if(['index.html','resources.html','challenges.html'].includes(route)&&[1440,390].includes(width)){const selector=route==='index.html'?'.home-actions':route==='resources.html'?'.resource-grid':'#challenge-catalog';if(route==='resources.html')await page.locator('[data-resource-filter="Provocări GIS"]').click();const hide=await page.addStyleTag({content:'.topbar,.back-top,.skip-link{visibility:hidden!important}'});await page.locator(selector).screenshot({path:`tmp/qa/phase4/${width}-${dark?'dark':'light'}-${route.split('.')[0]}.png`});await hide.evaluate(e=>e.remove());}
     if(route==='resources.html'){
       const cards=await inspectSourceCards(page,registry);
       if(width===1440&&!dark)resources.push(...cards);
       checks.push('exact dataset cards, metadata chips, documented links and neutral unknown sources '+width+'/'+dark);
     }
   }
 }
 await page.goto(base+'challenges.html');await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
 // Every input/result state in both themes; values remain available in text/tables.
 for(const c of config.challenges){
   await page.locator(`[data-challenge="${c.id}"]`).click();await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);await page.selectOption('#challenge-methods',c.correct_method);await page.click('#challenge-run');await page.waitForFunction(()=>!document.querySelector('#challenge-results').hidden,{},{timeout:120000});
   for(const dark of [false,true])for(const mode of ['INPUT','RESULT','COMPARE']){
     await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);await page.locator(`[data-map-mode="${mode}"]`).click();await page.waitForTimeout(120);
     const info=await page.evaluate(()=>{const visible=e=>!!e.getClientRects().length&&!e.closest('[hidden]'),issues=[];for(const e of document.querySelectorAll('button,[role="button"]'))if(visible(e)&&!(e.getAttribute('aria-label')||e.textContent.trim()||e.getAttribute('title')))issues.push('unnamed button');return {metricCards:document.querySelectorAll('#challenge-metrics article').length,legend:document.querySelector('#challenge-legend').textContent,issues};});check(info.metricCards>0&&!info.issues.length,`${c.id} ${dark}/${mode} accessible result state`);
   }
 }
 const selections=[registry.sector1.schools.file,registry.sector1.censusGrid.file,registry.risca.dem.file,registry.risca.forestLoss.file,'data/challenges/challenge-data.json',registry.risca.rasterMetadata.file];
 const fetched=await page.evaluate(async paths=>Promise.all(paths.map(async p=>{const response=await fetch(new URL(p,document.baseURI)),buffer=await response.arrayBuffer();let type=null;if(/\.(json|geojson)$/.test(p))type=JSON.parse(new TextDecoder().decode(buffer)).type||'JSON';return {file:p,status:response.status,mime:response.headers.get('content-type'),bytes:buffer.byteLength,type};})),selections);http.push(...fetched);for(const f of fetched)check(f.status===200&&f.bytes===fs.statSync(f.file).size,'usable HTTP dataset '+f.file);
 // Targeted contrast measurements for shared text and challenge controls.
 for(const dark of [false,true]){
   await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);
   const ratios=await page.evaluate(()=>{
     const rgb=s=>s.match(/[\d.]+/g)?.map(Number),composite=(front,back)=>{const a=front[3]??1;return front.slice(0,3).map((v,i)=>v*a+back[i]*(1-a));},background=e=>{const nodes=[];for(let n=e;n;n=n.parentElement)nodes.push(n);let b=[255,255,255];for(const n of nodes.reverse())b=composite(rgb(getComputedStyle(n).backgroundColor),b);return b;},lum=c=>c.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
     return ['#challenge-status','#challenge-method-note','#challenge-feedback','#challenge-controls label','#challenge-metrics article>span','#challenge-warnings p','#challenge-legend li'].flatMap(selector=>[...document.querySelectorAll(selector)].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')&&e.textContent.trim()).map(e=>{const style=getComputedStyle(e),b=background(e),f=composite(rgb(style.color),b),a=lum(f),z=lum(b);return {selector,ratio:(Math.max(a,z)+.05)/(Math.min(a,z)+.05),color:style.color};}));
   });contrasts.push({dark,ratios});check(ratios.every(r=>r.ratio>=4.5),'targeted text contrast '+dark);
 }
 const report={checks:checks.length,failures,warnings,resources,layouts,http,contrasts};fs.writeFileSync('tmp/qa/phase4/integration-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({checks:checks.length,failures,warnings,layouts:layouts.length,http,minimumContrast:Math.min(...contrasts.flatMap(c=>c.ratios.map(r=>r.ratio)))},null,2));await browser.close();if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
