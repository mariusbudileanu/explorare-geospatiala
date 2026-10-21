// Lot 5.2: real introductory instructions, preserved workshop routes and runtime copy.
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const vm=require('node:vm');
const {fs,path,root,loadModel,browserServer}=require('./support.cjs');
const contract=JSON.parse(fs.readFileSync(path.join(root,'data/workshop-reproducibility.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/tutorial-catalog.json'),'utf8'));
const {CARTO_LEARNING:model}=loadModel();
let checks=0;const ok=(value,message)=>{checks++;assert.ok(value,message);};
const eq=(a,b,message)=>{checks++;assert.deepEqual(a,b,message);};
const scaleExplanation='În EPSG:4326, coordonatele sunt exprimate în grade, iar scara diferă între direcțiile est–vest și nord–sud. O bară grafică în kilometri nu poate descrie fidel ambele direcții. Pentru harta finală folosim EPSG:3844, un sistem proiectat cu unități metrice.';
const nullExplanation='Dacă oricare dintre cele cinci câmpuri analizate conține NULL, înregistrarea este clasificată ca «Date incomplete», chiar dacă un alt nivel este marcat cu 1. Această regulă verifică completitudinea informației, nu doar nivelul maxim identificabil.';
eq(createHash('sha256').update(contract.workshops.T01.expressions.highest_documented_level).digest('hex'),'a2b2e9f1d6e99c3be2d1395bbcc6e501bd799a0009f3e6f741c7735b56fd4171','Approved pre-correction CASE remains byte-identical');
eq(model.activePath.length,24,'Approved full common path');
ok(model.segments['T01@core'].available,'Approved core integrated in Lot 5.3');
eq(JSON.parse(JSON.stringify(model.segments['T01@core'].anchors)),['t01-core'],'Core has a real target');
const search={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'data/search-index.js'),'utf8'),search);
eq(search.window.CARTO_SEARCH_INDEX.length,90,'Canonical search inventory');
ok(!JSON.stringify(search.window.CARTO_SEARCH_INDEX).includes('L12 Zarr Cloud Data Lab rămâne planificat'),'No obsolete L12 claim in generated search');
const generated=fs.readFileSync(path.join(root,'tutorials/t01.html'),'utf8');
for(const obsolete of ['Și un cadru EPSG:4326 poate avea scară grafică în km','Și un cadru geografic poate avea scară în km','EPSG:4326 poate avea scară grafică folosind unități și metodă de calcul adecvate']){
 ok(!generated.includes(obsolete),'E52-01 absent in generated HTML: '+obsolete);
 ok(!JSON.stringify(search.window.CARTO_SEARCH_INDEX).includes(obsolete),'E52-01 absent in search index: '+obsolete);
}
const oldAnchors={};
for(const id of Object.keys(contract.workshops)){
 const file='tutorials/'+id.toLowerCase()+'.html';
 const original=execFileSync('git',['show','0b3f4a528cdc93237e3a3a18f993861cde54094d:'+file],{cwd:root,encoding:'utf8'});
 oldAnchors[id]=[...original.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
}
(async()=>{
 const service=await browserServer(),errors=[],failures=[],out=path.join(root,'tmp/qa/lot52');fs.mkdirSync(out,{recursive:true});
 try{
  const page=await service.browser.newPage();page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(service.base))failures.push(r.url());});
  for(const [id,t] of Object.entries(contract.workshops)){
   await page.goto(service.base+'tutorials/'+id.toLowerCase()+'.html');
   for(const anchor of oldAnchors[id])eq(await page.locator('[id="'+anchor+'"]').count(),1,id+' retains unique #'+anchor);
   const level=model.levels[model.items[id].level].label;
   eq(catalog.find(t=>t.id===id).level,level,id+' catalogue derives level');
   const difficultyStep=page.locator('.tutorial-step').filter({has:page.locator('h3').filter({hasText:/nivel de dificultate/i})});
   eq(await difficultyStep.count(),1,id+' one procedural difficulty section');
   ok((await difficultyStep.innerText()).includes(level),id+' procedural level');
   ok((await page.locator('.tutorial-meta').innerText()).includes(level),id+' header level');
   eq(await page.locator('.tutorial-step').count(),oldAnchors[id].filter(a=>/^section-\d+$/.test(a)).length,id+' no progress steps added');
   ok(await page.locator('[data-verification]').count()>0,id+' evidence scope visible');
   for(const [number,revision] of Object.entries(t.step_revisions||{}))if(revision.note)ok((await page.locator('#section-'+number).innerText()).includes(revision.note.replace(/<[^>]+>/g,'')),id+' focused correction '+number);
  }
  for(const width of [375,390,768,1024,1440])for(const dark of [false,true]){
   await page.setViewportSize({width,height:900});await page.goto(service.base+'index.html');
   await page.evaluate(d=>localStorage.setItem('cartografie-theme',d?'dark':'light'),dark);
   await page.goto(service.base+'tutorials/t01.html#t01-core');
   eq(await page.locator('body').evaluate(e=>e.classList.contains('dark')),dark,'Actual theme '+width);
   const steps=page.locator('#t01-core .tutorial-core-step');eq(await steps.count(),7,'Seven observable core actions');
   eq(await steps.locator('pre code.language-qgis').count(),0,'No expression must be copied in core');
   ok((await page.locator('#t01-core-categories').innerText()).includes('selectează direct'),'Direct nominal field selection');
   for(const step of await steps.all()){
    ok((await step.innerText()).includes('Rezultat verificabil:'),'Observable core result');
    eq(await step.locator('input[type=checkbox]').count(),0,'Core does not claim completion via anchor');
   }
   const core=await page.locator('#t01-core').innerText();
   for(const term of ['Regim Juridic - Tip de proprietate','Categorized','465','292','EPSG:4326','EPSG:3844','PNG','PDF','CC BY 4.0'])ok(core.includes(term),'Core explains '+term);
   eq(await page.locator('#t01-core .tutorial-figure').count(),0,'No historical education screenshot proves nominal core');
   const expression=await page.locator('#section-14 pre code').innerText();
   eq(expression.trim(),contract.workshops.T01.expressions.highest_documented_level,'Rendered optional expression');
   ok((await page.locator('#t01-core-layout').innerText()).includes(scaleExplanation),'E52-01 corrected in core step 4');
   ok((await page.locator('#section-18').innerText()).includes(scaleExplanation),'E52-01 corrected in historical section 18');
   ok((await page.locator('#section-15').innerText()).includes(nullExplanation),'Approved conservative NULL policy explained beside the legend');
   ok((await page.locator('#section-14').innerText()).includes('Verificăm nivelurile începând cu Liceal și continuăm descrescător.'),'Descending order expressed unambiguously');
   const legend=await page.locator('#section-18').innerText();ok(legend.includes('proprietate')&&!legend.includes('Păstrați doar categoriile educaționale'),'Core-compatible legend');
   eq(await page.locator('.tutorial-figure').count(),3,'Three original screenshots, no generator duplication');
   for(const file of ['T01_02_categorized_schools.png','T01_03_first_map_layout.png']){
    const figure=page.locator('.tutorial-figure').filter({has:page.locator('img[src$="'+file+'"]')});
    ok((await figure.innerText()).includes('istoric'),'Historical screenshot scope visible');
    eq(await figure.getAttribute('data-level'),'optional','Screenshot no longer essential for nominal map');
   }
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No core page overflow '+width+'/'+dark);
   if(width===390){await page.locator('#t01-core').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'t01-core-390-'+(dark?'dark':'light')+'.png')});}
  }
  const picture=page.locator('[data-enlarge$="T01_02_categorized_schools.png"]');await picture.click();
  ok((await page.locator('#tutorial-dialog').innerText()).includes('istoric'),'Modal retains screenshot scope');await page.keyboard.press('Escape');
  ok(await picture.evaluate(e=>e===document.activeElement),'Modal restores focus');
  await page.goto(service.base+'formats-interoperability.html');
  const l10=page.locator('#v3-L10');
  for(const lang of ['ro','en']){
   await l10.locator('select[data-key="lang"]').selectOption(lang);
   const result=await l10.locator('.p01-results').innerText();
   ok(/L12 · Zarr/.test(result)&&!/planificat|indisponibil|planned|unavailable/.test(result),'L10 truthful after JS '+lang);
   eq(await l10.locator('.p01-results a[href="zarr-cloud-data.html"]').count(),1,'Working canonical L12 link');
  }
  await page.goto(service.base+'styling-labeling.html');
  eq(await page.locator('.p05-extra legend').count(),2,'L07 both style panels present');
  ok(!(await page.locator('.p05-extra legend').allTextContents()).some(t=>t.includes('P05')),'L07 no technical legend');
  await page.goto(service.base+'analysis.html');
  const l14=page.locator('[data-p03-lab="L14"]');
  for(const lang of ['ro','en']){
   await l14.locator('select[data-key="lang"]').selectOption(lang);
   const visible=await l14.innerText();ok(!/\bP02\b|\bTurf\b/.test(visible),'L14 student copy after JS '+lang);
   ok(/6371008[.,]8/.test(visible),'L14 scientific model remains explicit');
  }
  await page.goto(service.base+'lesson.html?id=rectangular-coordinates#grila');
  const intro=page.locator('[data-learning-segment="rectangular-coordinates@intro"]');
  ok((await intro.innerText()).includes('X reprezintă coordonata nordică'),'Stereo axis convention introduced');
  eq(await intro.locator('select').count(),0,'No advanced controls introduced');
  eq(await page.locator('#grid-crs option').count(),8,'Advanced CRS experiment retained');
  const nojs=await service.browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});
  const staticPage=await nojs.newPage();await staticPage.goto(service.base+'tutorials/t01.html#t01-core');
  eq(await staticPage.locator('#t01-core .tutorial-core-step').count(),7,'Core usable without JavaScript');
  ok(await staticPage.locator('#t01-core').isVisible(),'Static instructions visible');
  ok(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No-JS core mobile layout');await nojs.close();
  eq(errors,[],'No JavaScript errors');eq(failures,[],'No project resource failures');
  const report={status:'PASS',checks,viewports:[375,390,768,1024,1440],themes:2,errors,failures};
  fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await service.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
