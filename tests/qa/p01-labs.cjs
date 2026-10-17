// P01: independent differential references, exact access arithmetic and real browser state.
const fs=require('fs'),path=require('path'),vm=require('vm'),http=require('http'),assert=require('assert/strict');
const {root,playwright,browserOptions}=require('./expectations.cjs');
const c={URL,URLSearchParams,window:{proj4:require(path.join(root,'js/vendor/proj4.js'))}};vm.createContext(c);
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
for(const p of ['data/content-manifest.js','data/crs-registry.js','js/crs-engine.js','js/projection-distortion.js','data/formats-lab.js','js/formats-model.js','js/quality-model.js','js/v3-lab.js'])vm.runInContext(read(p),c,{filename:p});
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);},near=(a,b,t,m)=>ok(Math.abs(a-b)<=t,m+': '+Math.abs(a-b));
const ref=JSON.parse(read('tests/qa/distortion-reference.json')),max={};
for(const r of ref.cases){const a=c.window.CARTO_DISTORTION.factors(r.crs,r.point);for(const k of ['major','minor','east','north','area','angle']){max[k]=Math.max(max[k]||0,Math.abs(a[k]-r[k]));near(a[k],r[k],k==='angle'?3e-6:2e-7,'Independent '+r.crs+' '+k);}for(let i=0;i<2;i++)near(a.point[i],r.native[i],1e-7,'Native axis '+i);}
const D=c.window.CARTO_DISTORTION;
ok(D.factors('EPSG:4326',[26,44]).angular,'Degrees never receive a metric indicatrix');
near(D.factors('EPSG:3035',[26,44]).area,1,2e-7,'Equal-area ellipsoidal ground');
ok(D.factors('EPSG:3857',[26,44]).angle>.1,'Pseudo Mercator is not ellipsoidally conformal');
for(const p of [[0,90],[0,-90],[181,44],[26,NaN],[26,'44']]){assert.throws(()=>D.factors('EPSG:3857',p));checks++;}
assert.throws(()=>D.factors('bogus',[26,44]));checks++;
const M=c.window.CARTO_FORMATS_MODEL;
eq(M.access({scenario:'cube',subset:'nw',from:1,to:1}),{total:864,useful:16,whole:864,selective:32,objects:1,ids:['C01'],unit:'bytes',assumptions:'6×6×6 float32; 2×2×2 chunks'},'Exact independently counted cube request');
const raster=M.access({scenario:'raster',subset:'center'});eq([raster.total,raster.useful,raster.selective,raster.objects],[144,64,144,9],'Centre request touches all nine tiles');
const vector=M.access({scenario:'vector',subset:'nw',columns:'attributes'});eq([vector.total,vector.useful,vector.selective,vector.columnar],[1152,48,96,576],'One NW feature; column projection is not spatial filtering');
for(const scenario of ['raster','cube','access'])for(const subset of Object.keys(c.window.CARTO_FORMATS.subsets))for(let from=0;from<6;from++)for(let to=from;to<6;to++){const r=M.access({scenario,subset,from,to});ok(r.useful<=r.selective&&r.selective<=r.total,'Conserved payload '+scenario);eq(r.ids.length,r.objects,'Objects required');}
for(const opts of [{from:4,to:1},{from:-1},{to:6},{subset:'unknown'},{scenario:'unknown'},{columns:'script'}]){assert.throws(()=>M.access(opts));checks++;}
eq(c.window.CARTO_FORMATS.formats.length,9,'Nine-format detailed catalog');
for(const s of JSON.parse(read('data/geospatial-formats.json')))if(s.id!=='csv'){eq(s.catalog_id,s.id,'Canonical ID mapping');eq(s.name,c.window.CARTO_FORMATS.byId[s.id].name,'Canonical format name');}
const Q=c.window.CARTO_QUALITY;
for(const scenario of ['resolution','lineage','missing','dates'])for(const metadata of Q.statuses)for(const history of [false,true])for(const zero of [false,true]){const r=Q.diagnose(scenario,{metadata,history,zero});eq(r.source.values,[0,12,null,8],'Original is never overwritten');eq(r.derived.license.status,metadata,'Four distinct metadata states');if(scenario==='missing')eq(r.derived.values[2],zero?0:null,'Controlled NULL counterexample');}
eq(Q.pair('resolution').derived.resolution.value,5,'Finer grid is 5 m');eq(Q.pair('dates').source.observed.value,Q.pair('dates').derived.observed.value,'Publication does not alter observation');eq(Q.pair('lineage',{history:false}).derived.lineage.status,'missing','Absent lineage');
assert.throws(()=>Q.pair('bogus'));checks++;
const U=c.window.CARTO_V3;for(const query of ['?L03=not-json','?L03='+encodeURIComponent(JSON.stringify({v:99,state:{}}))])eq(U.read(query,'L03',{lang:'ro'},()=>{throw Error();}),{lang:'ro'},'Safe obsolete/invalid URL fallback');
const formatHtml=read('formats-interoperability.html');ok(formatHtml.indexOf('src="data/p01-content.js"')<formatHtml.indexOf('src="js/p01-labs.js"'),'Canonical language content loads before controller on legacy page');
const source=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://local').pathname).replace(/^\/explorare-geospatiala\//,'')||'index.html',p=path.resolve(root,rel);if(!p.startsWith(root+path.sep)||/^(content|tmp)\//.test(rel))return res.writeHead(404).end();fs.readFile(p,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(p)]||'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>source.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${source.address().port}/explorare-geospatiala/`,browser=await playwright().chromium.launch(browserOptions()),errors=[],requests=[],layouts=[];
try{const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 const routes={L03:'projection-crs-lab.html',L10:'formats-interoperability.html',L13:'data-quality.html'};
 for(const [id,route] of Object.entries(routes)){
  await page.goto(base+route);const section=page.locator('[data-lab-id='+id+']');await section.locator('.p01-interactive').waitFor({state:'visible'});eq(await section.count(),1,'One canonical lab '+id);
  for(const lang of ['ro','en'])for(const dark of [false,true])for(const width of [1440,1024,768,390]){
   await page.setViewportSize({width,height:1000});await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);await section.locator('[data-key=lang]').selectOption(lang);
   const overflow=await page.evaluate(()=>({bad:document.documentElement.scrollWidth>innerWidth+1,nodes:[...document.querySelectorAll('main *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(n=>({tag:n.tagName,cls:n.className,width:n.getBoundingClientRect().width,right:n.getBoundingClientRect().right}))}));
   ok(!overflow.bad,'No horizontal overflow '+id+'/'+lang+'/'+width+' '+JSON.stringify(overflow.nodes));
   await section.locator('[data-key=lang]').focus();await page.keyboard.press('Tab');ok(await page.evaluate(()=>document.activeElement.closest('.p01-interactive')!==null),'Native keyboard control '+id);
   eq(await section.locator('.p01-interactive').getAttribute('lang'),lang,'Interface language');
   eq(await section.getAttribute('lang'),lang,'Screen readers receive the language of the translated explanations');
   ok((await section.locator('h2').innerText()).includes(lang==='en'?(id==='L03'?'Local distortion':id==='L10'?'Storage':'Data quality'):(id==='L03'?'Deformări':id==='L10'?'Experimente':'Inspector')),'New experiment prose is localized');
   const contrast=await section.locator('select').first().evaluate(n=>{const s=getComputedStyle(n),rgb=x=>x.match(/[\d.]+/g).slice(0,3).map(Number),lum=x=>rgb(x).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});ok(contrast>=4.5,'Control text contrast '+id+'/'+dark);
   layouts.push({id,lang,dark,width});
  }
  if(id==='L03'){
   for(const scenario of ['geographic','web','equalarea','utm','measurement'])await section.locator('[data-key=scenario]').selectOption(scenario);
   await section.locator('[data-key=mode]').selectOption('toggle');await section.locator('[data-key=active]').selectOption('B');ok(await section.locator('[data-side=A]').isHidden()&&await section.locator('[data-side=B]').isVisible(),'Accessible A/B toggle');await section.locator('[data-key=mode]').selectOption('side');
   await section.locator('[data-key=a]').selectOption('EPSG:3035');await section.locator('[data-key=b]').selectOption('EPSG:3035');
   eq(await page.evaluate(()=>window.CARTO_P01.controllers.L03.compare.getMetrics().A.area),await page.evaluate(()=>window.CARTO_P01.controllers.L03.compare.getMetrics().B.area),'Identical CRS predictable');
   await section.locator('[data-key=lon]').fill('26.2');await section.locator('[data-key=lon]').dispatchEvent('change');
   eq(await page.evaluate(()=>window.CARTO_PROJECTION_LAB.compare.getState().sharedLocation),[26.2,44.432],'Legacy and new common point synchronized');
   await section.locator('[data-key=lat]').fill('91');await section.locator('[data-key=lat]').dispatchEvent('change');ok((await section.locator('.p01-error').innerText()).length>0,'Invalid coordinates explained');await section.locator('[data-key=lat]').fill('44.5');await section.locator('[data-key=lat]').dispatchEvent('change');eq(await section.locator('.p01-error').innerText(),'','Restored valid state clears error');
  }
  if(id==='L10'){await section.locator('[data-key=scenario]').selectOption('raster');await section.locator('[data-key=scale]').selectOption('1024');ok((await section.locator('.p01-results').innerText()).includes('150'),'Large payload visible');await section.locator('[data-key=scenario]').selectOption('cube');await section.locator('[data-key=from]').fill('5');await section.locator('[data-key=from]').dispatchEvent('change');ok((await section.locator('.p01-error').innerText()).length>0,'Invalid time interval explained');await section.locator('[data-key=from]').fill('1');await section.locator('[data-key=from]').dispatchEvent('change');}
  if(id==='L13'){await section.locator('[data-key=scenario]').selectOption('missing');await section.locator('[data-key=zero]').check();ok((await section.locator('.p01-results').innerText()).includes('4/4'),'NULL imputation visible');for(const s of ['missing','unknown','invalid','known'])await section.locator('[data-key=metadata]').selectOption(s);await section.locator('[data-key=dataset]').selectOption('administrative-boundaries');ok((await section.locator('.p01-registry').innerText()).includes('necesită confirmare'),'Never invent CC license');}
  const before=await page.evaluate(id=>window.CARTO_P01.controllers[id].getState(),id);await section.locator('[data-action=share]').click();ok(page.url().includes(id+'='),'Shareable owner-scoped URL');await page.reload();await page.locator('[data-lab-id='+id+'] .p01-interactive').waitFor({state:'visible'});eq(await page.evaluate(id=>window.CARTO_P01.controllers[id].getState(),id),before,'Exact validated state restored');
  await page.goto(base+route+'?'+id+'=%7B%22v%22%3A99%7D');await page.locator('[data-lab-id='+id+'] .p01-interactive').waitFor({state:'visible'});eq(await page.evaluate(id=>window.CARTO_P01.controllers[id].getState(),id),defaultsFor(id),'Obsolete state falls back');
 }
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});for(const [id,route] of Object.entries(routes)){const p=await nojs.newPage();await p.goto(base+route);ok(await p.locator('[data-lab-id='+id+'] h2').isVisible(),'Static purpose '+id);ok(await p.locator('[data-lab-id='+id+'] .p01-fallback').isVisible(),'No-JS explanation '+id);await p.close();}await nojs.close();
 eq(errors,[],'Zero browser exceptions');eq(requests.filter(u=>!u.startsWith(base)),[],'Zero external runtime requests');
 const out=path.join(root,'tmp/qa/p01');fs.mkdirSync(out,{recursive:true});await page.goto(base+routes.L03);await page.locator('[data-lab-id=L03]').screenshot({path:path.join(out,'L03.png')});await page.goto(base+routes.L13);await page.locator('[data-lab-id=L13]').screenshot({path:path.join(out,'L13.png')});
 const report={status:'PASS',checks,numericCases:ref.cases.length,maxErrors:max,layouts:layouts.length,errors,externalRequests:0};fs.writeFileSync(path.join(out,'p01-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>source.close(r));}})().catch(e=>{console.error(e);source.close();process.exitCode=1;});
function defaultsFor(id){return id==='L03'?{lang:'ro',scenario:'web',a:'EPSG:3857',b:'EPSG:32635',lon:26.106,lat:44.432,mode:'side',active:'A'}:id==='L10'?{lang:'ro',scenario:'cube',subset:'nw',from:1,to:1,columns:'all',scale:1}:{lang:'ro',scenario:'resolution',metadata:'known',history:true,zero:false,dataset:'copernicus-dem'};}
