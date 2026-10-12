// Independent numeric fixtures plus persistent renderer, accessibility and HTTP integration.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http'),assert=require('node:assert/strict');
const {root,playwright,browserOptions,manifest,inspectNavigation}=require('./expectations.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const c={URL,window:{proj4:require(path.join(root,'js/vendor/proj4.js'))}};vm.createContext(c);
for(const p of ['data/crs-registry.js','js/crs-engine.js','js/vendor/geographiclib-geodesic.min.js','js/geodesic-adapter.js','js/projection-lab-engine.js','js/data-source.js'])vm.runInContext(read(p),c);
const G=c.window.CARTO_GEODESIC,E=c.window.CARTO_PROJECTION_LAB_ENGINE,C=c.window.CRS_ENGINE;
let checks=0;const ok=(x,m)=>{checks++;assert.ok(x,m);},near=(a,b,t,m)=>ok(Math.abs(a-b)<=t,m+'; delta '+Math.abs(a-b));
const r=JSON.parse(read('tests/qa/projection-reference.json')),max={distance:0,area:0,coordinates:0,planarDistance:0,planarArea:0};
for(const t of r.distances){const a=G.inverse(t.a,t.b).s12;max.distance=Math.max(max.distance,Math.abs(a-t.metres));near(a,t.metres,1e-6,'Independent geodesic distance');}
for(const t of r.areas){const a=G.area(t.ring);max.area=Math.max(max.area,Math.abs(a-t.square_metres));near(a,t.square_metres,.001,'Independent geodesic area');}
for(const t of r.transformations){const a=E.transform(t.crs,t.input);for(let i=0;i<2;i++){max.coordinates=Math.max(max.coordinates,Math.abs(a[i]-t.expected[i]));near(a[i],t.expected[i],t.crs==='EPSG:4326'?1e-10:1e-5,'PROJ transform '+t.crs);}}
for(const s of r.scenes){const geo=E.geometry(s.center,s.km);near(geo.reference.distance,s.distance,1e-6,'Synthetic segment independent');near(geo.reference.area,s.area,.001,'Synthetic polygon independent');near(G.area(geo.boundary),geo.reference.area,.001,'Densification preserves the same geodesic boundary');ok(geo.boundary.length===s.boundary_count,'Deterministic densification');
 for(const p of s.projected){const m=E.project(p.crs,geo).metrics;if(p.crs==='EPSG:4326'){ok(m.distance===null&&m.area===null,'Never metres from degrees');continue;}
  max.planarDistance=Math.max(max.planarDistance,Math.abs(m.distance-p.distance));max.planarArea=Math.max(max.planarArea,Math.abs(m.area-p.area));near(m.distance,p.distance,1e-5,'PROJ planar distance '+p.crs);near(m.area,p.area,.001+p.area*1e-12,'PROJ densified planar area '+p.crs);
 }}
// Existing authoritative CRS references remain valid (including reverse transforms).
const old=JSON.parse(read('data/crs-validation.json'));for(const t of old.tests){const actual=C.transform(t.source_crs,t.target_crs,t.input);for(let i=0;i<2;i++)near(actual[i],t.expected[i],t.tolerance,'Existing CRS reference '+t.source_crs+' -> '+t.target_crs);}
near(G.inverse([0,0],[90,0]).s12,6378137*Math.PI/2,1e-6,'Analytic equatorial quarter');
for(const p of [[181,0],[0,91],[NaN,44]])ok(assert.throws(()=>G.point(p))===undefined,'Invalid geographic coordinates');
for(const p of [[-26,44],[44,26],[30,44],[26,49]])ok(assert.throws(()=>E.validate(p))===undefined,'Lab domain / reversed axes rejected');
ok(E.utmCode(23.96)==='EPSG:32634'&&E.utmCode(26.106)==='EPSG:32635','UTM follows longitude');
ok(E.project('EPSG:32634',E.geometry([23.96,46.2],50)).metrics.warning.length>0,'Cross-zone polygon warning');
ok(E.project('EPSG:32635',E.geometry([26.106,44.432],10)).metrics.warning==='','Appropriate zone no warning');
const registry=JSON.parse(read('data/data-registry.json')),resolver=c.window.CARTO_DATA_SOURCE.create(registry,'https://example.org/explorare-geospatiala/');
ok(resolver.resolveDataAsset('copernicus-dem').url.startsWith('https://example.org/explorare-geospatiala/data/'),'Registry relative path preserves base');
const remote=JSON.parse(JSON.stringify(registry));remote.datasets.find(d=>d.id==='copernicus-dem').interactive_subsets[0].file='https://data.example.org/dem.cog.tif';
ok(c.window.CARTO_DATA_SOURCE.create(remote,'https://example.org/explorare-geospatiala/').resolveDataAsset('copernicus-dem').url==='https://data.example.org/dem.cog.tif','Remote HTTPS without new registry');
assert.throws(()=>resolver.resolveDataAsset('unknown'));checks++;
for(const bad of ['../secret','javascript:alert(1)','http://data.example.org/a.tif']){const invalid=JSON.parse(JSON.stringify(registry));invalid.datasets.find(d=>d.id==='copernicus-dem').interactive_subsets[0].file=bad;assert.throws(()=>c.window.CARTO_DATA_SOURCE.create(invalid,'https://example.org/explorare-geospatiala/').resolveDataAsset('copernicus-dem'));checks++;}
// Core lifecycle with adapters independent of SVG/Leaflet implementations.
const counts={A:{init:0,update:0,resize:0,destroy:0,point:0},B:{init:0,update:0,resize:0,destroy:0,point:0}},frames=new Map();let disconnected=0;
c.window.requestAnimationFrame=fn=>{frames.set(1,fn);return 1;};c.window.cancelAnimationFrame=id=>frames.delete(id);c.window.removeEventListener=()=>{};
c.window.ResizeObserver=class{constructor(fn){this.fn=fn;c.window.observer=this;}observe(){}disconnect(){disconnected++;}};
vm.runInContext(read('js/compare-core.js'),c);
const panels={A:{},B:{}},adapters={};for(const id of ['A','B']){adapters[id]={init:()=>counts[id].init++,update:()=>counts[id].update++,resize:()=>counts[id].resize++,destroy:()=>counts[id].destroy++,setSharedLocation:()=>counts[id].point++,getMetrics:()=>({})};}
const core=c.window.CARTO_COMPARE.create({container:{dataset:{}},panels,adapters,initial:{views:{A:{crs:'a'},B:{crs:'b'}},context:{},sharedLocation:[26,44],mode:'side',active:'A'}});
core.update({views:{A:{crs:'c'}}});ok(counts.A.init===1&&counts.B.init===1&&counts.A.update===2&&counts.B.update===1,'Persistent adapters update only affected view');
core.update({mode:'toggle',active:'B'});ok(panels.A.hidden&&!panels.B.hidden,'Toggle B');core.setSharedLocation([27,45]);core.reset();ok(!panels.A.hidden&&core.getState().views.A.crs==='a','Reset shared state');
c.window.observer.fn();ok(frames.size===1,'One scheduled resize');core.destroy();core.destroy();c.window.observer.fn();ok(disconnected===1&&frames.size===0&&counts.A.destroy===1&&counts.B.destroy===1,'Destroy cancels observer/RAF and ignores queued callbacks');assert.throws(()=>core.update({}));assert.throws(()=>core.getMetrics());checks+=2;
const out=path.join(root,'tmp/qa/digital-companion-a');fs.mkdirSync(out,{recursive:true});
function contrastAudit(){
 const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number),lum=c=>c.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
 const ratio=(a,b)=>{const x=lum(rgb(a)),y=lum(rgb(b));return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
 return {cursor:ratio(getComputedStyle(document.querySelector('.projection-cursor')).stroke,getComputedStyle(document.querySelector('.projection-drawing svg')).backgroundColor),error:ratio(getComputedStyle(document.querySelector('#projection-error')).color,getComputedStyle(document.body).backgroundColor)};
}
const server=http.createServer((req,res)=>{const uri=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname);if(!uri.startsWith('/explorare-geospatiala/'))return res.writeHead(404).end();const rel=uri.slice('/explorare-geospatiala/'.length)||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||/^(content|tmp)\//.test(rel))return res.writeHead(404).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`,browser=await playwright().chromium.launch(browserOptions()),errors=[],network=[],layouts=[],contrasts=[];
 try{
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',req=>network.push(req.url()));
 await page.goto(base+'projection-crs-lab.html');await page.waitForFunction(()=>window.CARTO_PROJECTION_LAB);await inspectNavigation(page,manifest(),base);
 const performanceSamples=await page.evaluate(()=>[1,10,50].map(km=>{const start=performance.now(),engine=window.CARTO_PROJECTION_LAB_ENGINE,geo=engine.geometry([26.106,44.432],km);engine.project('EPSG:3857',geo);engine.project('EPSG:3844',geo);return {km,points:geo.boundary.length,geometryAndTwoViewsMs:performance.now()-start};}));
 const headingOrder=await page.locator('main h1,main h2,main h3,main h4').evaluateAll(es=>es.map(e=>Number(e.tagName.slice(1))));ok(headingOrder.every((n,i)=>i===0?n===1:n<=headingOrder[i-1]+1),'Heading order without skipped levels');
 ok(await page.locator('h1').innerText()==='Laborator Proiecții & CRS','Actual lab title');ok(await page.locator('[data-learning-level="intermediate"]').count()===1,'Canonical level');
 const node=await page.locator('#view-A svg').evaluate(e=>{window.savedProjectionSVG=e;return true;});ok(node,'SVG exists');
 await page.locator('#crs-a').selectOption('EPSG:3857');ok(await page.evaluate(()=>window.savedProjectionSVG===document.querySelector('#view-A svg')),'SVG node persists after CRS update');
 await page.locator('#shared-longitude').fill('26.2');await page.locator('#shared-latitude').fill('44.5');await page.locator('#shared-latitude').press('Enter');
 ok((await page.locator('#projection-status').innerText()).includes('26,200000'),'Keyboard point updates common location');
 ok(await page.locator('#shared-latitude').evaluate(e=>e===document.activeElement),'Focus preserved after numeric update');
 await page.locator('#shared-longitude').fill('-26');await page.locator('#shared-latitude').press('Enter');ok((await page.locator('#projection-error').innerText()).length>20,'Invalid input explained');
 await page.locator('#projection-reset').click();ok(await page.locator('#crs-a').inputValue()==='EPSG:4326','Reset CRS');
 await page.evaluate(()=>{const compare=window.CARTO_PROJECTION_LAB.compare,original=compare.setSharedLocation.bind(compare);window.pointUpdates=0;compare.setSharedLocation=p=>{window.pointUpdates++;return original(p);};});
 await page.locator('#view-A svg').click({position:{x:280,y:100}});
 ok(await page.evaluate(()=>{const m=window.CARTO_PROJECTION_LAB.compare.getMetrics();return window.pointUpdates===1&&Math.abs(m.A.geographic[0]-26.106)>1e-5&&m.A.geographic.every((v,i)=>v===m.B.geographic[i]);}),'One graphic event updates the same geographic location in both views');
 ok((await page.locator('#metric-A-distance').innerText()).includes('grade'),'Angular distance textual fallback');
 await page.locator('#compare-mode').selectOption('toggle');await page.locator('#show-B').click();ok(!await page.locator('#view-A').isVisible()&&await page.locator('#view-B').isVisible(),'Entire inactive panel hidden');
 await page.locator('#projection-reset').click();
 for(const width of [1440,1024,768,390])for(const dark of [false,true]){
  await page.setViewportSize({width,height:1000});await page.evaluate(d=>document.body.classList.toggle('dark',d),dark);
  const ratios=await page.evaluate(contrastAudit);ok(ratios.cursor>=3,'Graphic cursor contrast '+dark);ok(ratios.error>=4.5,'Error text contrast '+dark);contrasts.push({width,dark,...ratios});
  for(const [a,b] of [['EPSG:4326','EPSG:3844'],['EPSG:3857','EPSG:3844'],['EPSG:3844','EPSG:32635']])for(const shape of ['point','segment','polygon']){
   await page.locator('#crs-a').selectOption(a);await page.locator('#crs-b').selectOption(b);await page.locator('#projection-shape').selectOption(shape);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,svg:[...document.querySelectorAll('.projection-drawing svg')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})),unlabelled:[...document.querySelectorAll('#projection-interactive input,#projection-interactive select')].filter(e=>!e.labels?.length).length}));
   if(layout.overflow){console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('#main-content *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&!e.closest('[hidden]')).map(e=>({tag:e.tagName,id:e.id,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,15))));await page.screenshot({path:path.join(out,'overflow.png')});}
   ok(!layout.overflow,'No page overflow '+width+'/'+dark);ok(layout.svg.every(v=>v.width>=240&&v.height>150),'Useful map dimensions '+width);ok(layout.unlabelled===0,'Every control labelled');layouts.push({width,dark,a,b,shape,...layout});
  }
  const radio=page.locator('[data-learning-question="crs-metric"] input').nth(2);await radio.focus();await page.keyboard.press('Space');await page.locator('[data-learning-question="crs-metric"] button[type=submit]').click();ok((await page.locator('[data-learning-question="crs-metric"] [role=status]').innerText()).startsWith('Alegere justificată'),'Formative feedback via keyboard');
  await page.locator('#experiment').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`lab-${width}-${dark?'dark':'light'}.png`)});
 }
 for(const query of ['CRS','proiecție','EPSG:4326','EPSG:3857','EPSG:3844','UTM','distanță geodezică','arie','datum','Set Layer CRS','reproiectare']){
  await page.locator('#search').fill(query);const results=page.locator('#search-results a[href*="projection-crs-lab.html"]');await results.first().waitFor();ok(await results.count()>0,'Lab found in contextual search '+query);
  const snippet=await results.first().locator('small').innerText(),normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();ok(normalize(snippet).includes(normalize(query)),'Snippet explains exact contextual match '+query);await page.locator('#search').fill('');
 }
 const staticContext=await browser.newContext({javaScriptEnabled:false});const staticPage=await staticContext.newPage();
 for(const width of [1440,1024,768,390]){await staticPage.setViewportSize({width,height:1000});await staticPage.goto(base+'projection-crs-lab.html');ok(await staticPage.locator('#metoda').isVisible()&&await staticPage.locator('#qgis a').count()>=3,'Static methodology/QGIS');ok(!await staticPage.locator('#projection-interactive').isVisible(),'Unavailable controls hidden without JS');
  for(const selector of ['h1','#limita p','#qgis a']){const target=staticPage.locator(selector).first();await target.scrollIntoViewIfNeeded();ok(await target.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+Math.min(10,r.width/2),r.top+Math.min(10,r.height/2));return !!hit&&e.contains(hit)&&!hit.closest('#sidebar');}),'No-JS real hit target '+width+' '+selector);}
 }
 await staticContext.close();await page.goto('file:///'+path.join(root,'projection-crs-lab.html').replace(/\\/g,'/'));await page.waitForFunction(()=>window.CARTO_PROJECTION_LAB);ok((await page.locator('#reference-distance').innerText()).includes('m'),'Offline local lab');
 await page.evaluate(()=>{window.detachedProjectionSVG=document.querySelector('#view-A svg');window.CARTO_PROJECTION_LAB.destroy();});ok(await page.locator('.projection-drawing svg').count()===0,'Actual adapters destroyed');
 await page.evaluate(()=>window.detachedProjectionSVG.dispatchEvent(new MouseEvent('click',{clientX:10,clientY:10})));await page.locator('#projection-reset').click();
 ok(!network.some(u=>/turf|geotiff|\.tif|tile\.openstreetmap/.test(u)),'No unused libraries/raster/basemap');ok(!network.some(u=>/^https?:/.test(u)&&!u.startsWith(base)),'No external runtime requests');ok(errors.length===0,'No browser errors '+errors.join('; '));
 const report={status:'PASS',checks,numeric:{reference:r.implementation,distances:r.distances.length,areas:r.areas.length,scenes:r.scenes.length,transformations:r.transformations.length,existingCRS:old.tests.length,max},layouts:layouts.length,performanceSamples,minimumContrast:Math.min(...contrasts.flatMap(c=>[c.cursor,c.error])),requests:network.length,errors};fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
