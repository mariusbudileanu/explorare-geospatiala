// Batch 5.1: real introductory boundary, dynamic fragments and editorial consistency.
const assert=require('node:assert/strict');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const protection=require('./protected-files.cjs');
const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
const equal=(a,b,message)=>{checks++;assert.deepEqual(a,b,message);};
const source=fs.readFileSync(path.join(root,'js/crs-lesson.js'),'utf8').replace(/\r\n/g,'\n');
const original=protection.gitBytes('js/crs-lesson.js').toString('utf8').replace(/\r\n/g,'\n');
const start='    const locationSelect =';
equal(source.slice(source.indexOf(start)),original.slice(original.indexOf(start)),'Existing CRS draw, transforms, labels and handlers unchanged byte-for-byte');
ok(model.segments['rectangular-coordinates@intro'].available,'Intro segment editorially ready');
ok(model.activePath.includes('rectangular-coordinates@intro')&&model.activePath.length===24,'Approved scoped common path integrated in Lot 5.3');
(async()=>{
 const service=await browserServer(),errors=[],out=path.join(root,'tmp/qa/lot51');fs.mkdirSync(out,{recursive:true});
 try{
  const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(service.base+'index.html');
  for(const width of [375,390,768,1280,1440])for(const dark of [false,true]){
   // Enter the fragment as a fresh navigation, rather than reloading a page whose
   // browser history legitimately restores the reader's later scroll position.
   await page.setViewportSize({width,height:900});await page.goto(service.base+'index.html');await page.evaluate(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
   const url=service.base+'lesson.html?id=rectangular-coordinates#grila-intro';
   await page.goto(url);
   equal(await page.locator('body').evaluate(e=>e.classList.contains('dark')),dark,width+' requested theme actually applied');
   await page.waitForFunction(()=>{
    const g=document.querySelector('#grila-intro');if(!g)return false;
    const offset=(parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop)||0)+(parseFloat(getComputedStyle(g).scrollMarginTop)||0),top=g.getBoundingClientRect().top;
    return scrollY>200&&Math.abs(top-offset)<2&&top<innerHeight/2;
   });
   const intro=page.locator('[data-learning-segment="rectangular-coordinates@intro"]');
   ok(await intro.count()===1,width+' explicit introductory segment');
   ok(!/EPSG|datum|\bCRS\b|false easting/i.test(await intro.innerText()),width+' no premature CRS concepts');
   ok(await intro.locator('select').count()===0,width+' no CRS selector needed');
   ok((await intro.innerText()).includes('(40 m, 30 m)'),width+' units and ordered coordinates');
   await page.locator('#rect-intro-x').fill('70');await page.locator('#rect-intro-y').fill('50');
   ok((await page.locator('#rect-intro-values').innerText()).includes('(70 m, 50 m)'),width+' interactive coordinate reading');
   equal(await page.locator('#rect-intro-grid circle').getAttribute('cx'),'360',width+' X moves horizontally');
   equal(await page.locator('#rect-intro-grid circle').getAttribute('cy'),'250',width+' Y moves upward');
   ok(await page.locator('#sisteme-rect').evaluate(e=>e.compareDocumentPosition(document.querySelector('#grila-intro'))&Node.DOCUMENT_POSITION_PRECEDING),width+' CRS follows the complete introduction');
   ok(await page.locator('#grid-crs option').count()===8&&await page.locator('.crs-card').count()===8,width+' full CRS tools retained');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),width+' no overflow');
   ok((await page.locator('.learning-context').innerText()).includes('se poate studia separat'),width+' full-lesson prerequisites distinguished from introduction');
   if(width===390){await page.locator('#rect-intro-grid').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'intro-390-'+(dark?'dark':'light')+'.png')});}
  }
  // Each existing CRS still drives the advanced grid, then identity output in degrees.
  for(const crs of await page.locator('#grid-crs option').evaluateAll(opts=>opts.map(o=>o.value))){
   await page.selectOption('#grid-crs',crs);ok((await page.locator('#grid-meta').innerText()).includes(crs),'Advanced grid '+crs);
  }
  await page.selectOption('#input-crs','EPSG:4326');await page.selectOption('#output-crs','EPSG:4326');
  await page.locator('#input-x').fill('26.1');await page.locator('#input-y').fill('44.4');await page.locator('#transform-form button[type=submit]').click();
  ok((await page.locator('#transform-result').innerText()).includes('26,10000')&&(await page.locator('#transform-result').innerText()).includes('44,40000'),'Existing transformation form still calculates');
  await page.goto(service.base+'analysis.html');
  const outcomes=await page.locator('.learning-context h2').filter({hasText:'Ce vei ști să faci'}).locator('..').locator('li').allTextContents();
  equal(outcomes,JSON.parse(JSON.stringify(model.items.analysis.outcomes)),'L14 displayed outcomes derive from the model');
  ok(outcomes[0].startsWith('Alegi ghidat')&&outcomes[1].startsWith('Verifici'),'L14 guided, observable outcomes');
  for(const lesson of content.lessons){
   await page.goto(service.base+lesson.href);
   const labels=await page.locator('main .eyebrow').allTextContents();
   ok(labels.every(text=>!/^CONSOLIDARE · ÎNVĂȚARE ȘI APLICARE|DIGITAL COMPANION|^LABORATOR GIS\b|Laboratoare v3|\bP0[2-7]\b/i.test(text)),lesson.id+' no obsolete structural labels');
   ok(!(await page.locator('footer').allTextContents()).some(text=>text.includes('Explorare geospațială · Laborator GIS')),lesson.id+' coherent footer');
   ok(!(await page.locator('a[href$="digital-companion.html"],a[href$="gis-lab.html"]').allTextContents()).some(text=>/Digital Companion|Laborator GIS/i.test(text)),lesson.id+' catalogue links use canonical label');
  }
  ok(errors.length===0,'No browser exceptions: '+errors.join('; '));
  const report={status:'PASS',checks,viewports:[375,390,768,1280,1440],themes:2,editorialDestinations:content.lessons.length,errors};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await service.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
