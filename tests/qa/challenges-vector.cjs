const {root,manifest,playwright,browserOptions,inspectNavigation}=require('./expectations.cjs');
process.chdir(root);
const {chromium}=playwright();
const fs=require('fs');fs.mkdirSync('tmp/qa/challenges',{recursive:true});
const content=manifest();
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4183/explorare-geospatiala/',failures=[],network=[],results={},shots=[];
(async()=>{
 const browser=await chromium.launch(browserOptions());
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 page.on('pageerror',error=>failures.push(error.message));page.on('console',m=>{if(m.type()==='error')failures.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
 page.on('request',r=>network.push(r.url()));
 await page.goto(base+'challenges.html');await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
 await inspectNavigation(page,content,base);
 await page.locator('#challenge-methods').selectOption('count');await page.locator('#challenge-run').click();if(!await page.locator('#challenge-feedback').innerText())failures.push('method feedback');
 for(const id of ['V1','V2','V3','V4','V5','V6']){
   await page.locator(`[data-challenge="${id}"]`).click();await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
   const method=({V1:'sum',V2:'buffer-union',V3:'ratio',V4:'coverage',V5:'filter-nearest',V6:'boolean-nearest'})[id];
   await page.locator('#challenge-methods').selectOption(method);await page.locator('#challenge-run').click();
   await page.waitForFunction(()=>!document.querySelector('#challenge-results').hidden,{},{timeout:90000});
   results[id]=await page.locator('#challenge-metrics').innerText();
   await page.locator('[data-map-mode="COMPARE"]').click();await page.locator('#show-input').uncheck();await page.locator('#show-result').uncheck();await page.locator('#show-result').check();
   await page.locator('[data-map-mode="INPUT"]').click();await page.locator('[data-map-mode="RESULT"]').click();
   const issues=await page.evaluate(()=>{
     const issues=[],visible=e=>!!e.getClientRects().length&&!e.closest('[hidden]');
     for(const e of document.querySelectorAll('button,[role=button]'))if(visible(e)&&!(e.getAttribute('aria-label')||e.textContent.trim()||e.getAttribute('title')))issues.push('unnamed button');
     for(const e of document.querySelectorAll('input,select'))if(visible(e)&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.labels.length)issues.push('unlabelled control');
     return issues;
   });failures.push(...issues.map(x=>id+': '+x));
 }
 // V6 uses actual hospital fields; compare AND vs OR, then enforce nonempty criteria.
 await page.locator('#challenge-source').selectOption('hospitals');await page.locator('#challenge-run').click();await page.waitForFunction(()=>!document.querySelector('#challenge-results').hidden);results.V6_hospital_AND=await page.locator('#challenge-metrics').innerText();
 await page.locator('#challenge-logic').selectOption('OR');await page.locator('#challenge-run').click();await page.waitForFunction(()=>!document.querySelector('#challenge-results').hidden);results.V6_hospital_OR=await page.locator('#challenge-metrics').innerText();
 await page.locator('[name=medical-criterion]').evaluateAll(nodes=>nodes.forEach(n=>{n.checked=false;n.dispatchEvent(new Event('change',{bubbles:true}));}));await page.locator('#challenge-run').click();if(!(await page.locator('#challenge-status').innerText()).includes('cel puțin'))failures.push('empty criteria');
 // Reuse a result with stable params and inspect all responsive/theme combinations.
 await page.locator('[data-challenge="V2"]').click();await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);await page.locator('#challenge-methods').selectOption('buffer-union');await page.locator('#challenge-run').click();await page.waitForFunction(()=>!document.querySelector('#challenge-results').hidden);
 for(const width of [1440,1024,768,390]){
   await page.setViewportSize({width,height:1000});
   for(const dark of [false,true]){
     await page.evaluate(dark=>{document.body.classList.toggle('dark',dark);},dark);
     await page.locator('#challenge-workspace').scrollIntoViewIfNeeded();
     const overflow=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
     if(overflow.scroll>overflow.client+1)failures.push(`overflow ${width} dark=${dark}: ${JSON.stringify(overflow)}`);
     const file=`tmp/qa/challenges/${width}-${dark?'dark':'light'}.png`;await page.screenshot({path:file});shots.push(file);
   }
 }
 await page.locator('#challenge-reset').click();await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);if(!await page.locator('#challenge-results').isHidden())failures.push('reset result');
 await page.locator('#reset-challenge-progress').click();if((await page.locator('.challenge-completion').allInnerTexts()).some(t=>t.includes('Parcursă')))failures.push('reset progress');
 const counts={};for(const url of network.filter(url=>url.includes('.geojson')))counts[url]=(counts[url]||0)+1;if(Object.values(counts).some(n=>n>1))failures.push('GeoJSON cache failed');
 if(network.some(url=>!url.startsWith(base)))failures.push('mandatory external request');
 const report={failures,results,cached_geojson_requests:counts,screenshots:shots,external_requests:network.filter(url=>!url.startsWith(base))};fs.writeFileSync('tmp/qa/challenges/vector-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 await browser.close();if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exit(1);});
