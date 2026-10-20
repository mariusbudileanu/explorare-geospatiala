// Independent P02 numeric/topology fixtures, expression truth tables and browser integration.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),http=require('http');
const {root,playwright,browserOptions,manifest,inspectNavigation}=require('./expectations.cjs');
const read=p=>fs.readFileSync(path.join(root,p),'utf8'),c={URL,URLSearchParams,window:{proj4:require(path.join(root,'js/vendor/proj4.js')),turf:require(path.join(root,'js/vendor/turf.min.js'))}};vm.createContext(c);
for(const p of ['data/crs-registry.js','js/crs-engine.js','js/vendor/geographiclib-geodesic.min.js','js/geodesic-adapter.js','js/projection-lab-engine.js','data/topology-lab.js','data/topology-rules.js','js/topology-engine.js','js/topology-geometry.js','js/topology-rule-engine.js','data/p02-topology-scenes.js','js/measurement-model.js','js/gis-expression.js','js/calculator-model.js','data/topology-diagnostics.js','js/topology-repair-engine.js'])vm.runInContext(read(p),c,{filename:p});
let checks=0;const ok=(v,m)=>{checks++;assert.ok(v,m);},eq=(a,b,m)=>{checks++;assert.deepEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)),m);},throws=(fn,m)=>{checks++;assert.throws(fn,undefined,m);},near=(a,b,t,m)=>ok(Math.abs(a-b)<=t,m+' delta='+Math.abs(a-b));
const M=c.window.CARTO_MEASUREMENT,E=c.window.CARTO_EXPRESSION,C=c.window.CARTO_CALCULATOR,T=c.window.CARTO_TOPOLOGY_ENGINE,R=c.window.CARTO_TOPOLOGY_RULES;
const reference=JSON.parse(read('tests/qa/measurement-reference.json')),maxErrors={};
for(const row of reference.cases){const a=M.measure(row.geometry,row.crs);for(const k of ['geodesicLength','geodesicArea','planarLength','planarArea']){if(row[k]===null){eq(a[k],null,'Non-metric or non-area output');continue;}const error=Math.abs(a[k]-row[k]);maxErrors[k]=Math.max(maxErrors[k]||0,error);near(a[k],row[k],k.includes('Area')?.001+row[k]*1e-12:1e-5,'Independent '+k+' '+row.crs);}}
const hole=M.measure(M.presets.hole,'EPSG:3844'),reversed=M.copy(M.presets.hole);reversed.coordinates.forEach(r=>r.reverse());near(M.measure(reversed,'EPSG:3844').geodesicArea,hole.geodesicArea,.001,'Ring orientation independent');
const filled=M.copy(M.presets.hole);filled.coordinates.length=1;const full=M.measure(filled,'EPSG:3844');ok(full.geodesicArea>hole.geodesicArea&&full.geodesicLength<hole.geodesicLength,'Hole subtracts area and adds perimeter');
eq(M.measure({type:'distance',coordinates:[[26,44],[26,44]]},'EPSG:3844').geodesicLength,0,'Coincident segment = zero, not invalid polygon');
for(const g of [{type:'distance',coordinates:[[44,26],[44,27]]},{type:'line',coordinates:[[26,NaN],[26,44]]},{type:'polygon',coordinates:[[[26,44],[26,44],[26,44],[26,44]]]},{type:'polygon',coordinates:[[[26,44],[27,45],[26,45],[27,44],[26,44]]]}])throws(()=>M.measure(g,'EPSG:3844'),'Invalid geometry/domain');
ok(M.measure(M.presets.north,'EPSG:3844').outside,'CRS domain warning');ok(M.measure(M.presets.segment,'EPSG:3857').lengthPercent>30,'Projected metres do not certify ground length');throws(()=>M.measure(M.presets.segment,'bogus'),'Unknown CRS');
const matrix=JSON.parse(read('tests/qa/topology-matrix.json'));eq(new Set(matrix.cases.map(r=>r.type+'/'+r.rule)).size,19,'All 19 combinations');
for(const row of matrix.cases)eq(T.ruleChecks.evaluate(row).valid,row.expected,'Independent matrix '+row.type+'/'+row.rule+'/'+row.expected);
// Reordering axes and translating/scaling must preserve every rule's verdict.
for(const row of matrix.cases)for(const scale of [.01,1,10]){
 const transformed=JSON.parse(JSON.stringify(row));const xy=v=>Array.isArray(v)&&v.length===2&&v.every(x=>typeof x==='number'||x===null)?v.map((_,i)=>v[1-i]===null?null:v[1-i]*scale+31):Array.isArray(v)?v.map(xy):v;
 for(const f of [...transformed.target,...transformed.reference])f.coordinates=xy(f.coordinates);
 eq(T.ruleChecks.evaluate(transformed).valid,row.expected,'Matrix affine invariance '+row.type+'/'+row.rule+'/'+scale);
}
for(const r of JSON.parse(read('tests/qa/topology-overlay-reference.json')).cases){const hit=T.ruleChecks.evaluate({rule:'overlap',target:[r.a,r.b]});eq(!hit.valid,r.overlap,'Independent GEOS overlap');near(hit.area,r.area,1e-7,'Independent GEOS planar intersection area');}
// Both enhanced and legacy UI examples must still compute their declared states.
for(const rule of R.rules)for(const type of rule.types)for(const variant of ['valid','problem'])for(const factory of [R.fixture,R.p02Fixture])eq(T.ruleChecks.evaluate(factory(type,rule.id,variant)).valid,variant==='valid','Catalog/geometry consistency '+type+'/'+rule.id);
const p=(id,xy)=>({id,layer:'A',type:'Point',coordinates:xy}),poly=(id,rs)=>({id,layer:'A',type:'Polygon',coordinates:rs}),line=(id,xy)=>({id,layer:'A',type:'LineString',coordinates:xy});
const box=[[0,0],[10,0],[10,10],[0,10],[0,0]],h=[[3,3],[7,3],[7,7],[3,7],[3,3]],donut=poly('z',[box,h]);
for(const [point,expected] of [[[0,5],false],[[1,1],true],[[5,5],false],[[3,5],false],[[1e-12,5],false],[[1e-6,5],true]])eq(T.ruleChecks.evaluate({rule:'inside',target:[p('p',point)],reference:[donut]}).valid,expected,'Interior/boundary/hole/tolerance');
eq(T.ruleChecks.evaluate({rule:'covered',target:[p('p',[3,5])],reference:[donut]}).valid,true,'Hole boundary covered, not inside');
const mp={id:'multi',layer:'A',type:'MultiPoint',coordinates:[[1,1],[5,5]]};eq(T.ruleChecks.evaluate({rule:'inside',target:[mp],reference:[donut]}).valid,false,'Every point part checked');
const multi=R.p02Fixture('Polygon','multipart','problem').target[0];ok(T.ruleChecks.validity(multi),'Disjoint multipolygon with hole valid');
const shifted=poly('h',[box,[[8,8],[12,8],[12,12],[8,12],[8,8]]]);ok(!T.ruleChecks.validity(shifted),'Hole crossing exterior invalid');
eq(T.ruleChecks.evaluate({rule:'gaps',target:[poly('a',box),poly('b',[[20,0],[30,0],[30,10],[20,10],[20,0]])]}).valid,true,'Exterior between disjoint polygons is not bounded gap');
near(T.ruleChecks.evaluate({rule:'gaps',target:[donut]}).area,16,1e-9,'Analytical square hole area');
throws(()=>T.ruleChecks.evaluate({rule:'invalid',target:[poly('tangent',[box,[[0,5],[2,4],[2,6],[0,5]]])]}),'Unsupported point tangency is reported, not mislabeled as a GEOS invalidity');
near(T.ruleChecks.evaluate({rule:'overlap',target:[poly('a',box),poly('b',[[5,0],[15,0],[15,10],[5,10],[5,0]])]}).area,50,1e-9,'Analytical rectangle intersection');
eq(T.ruleChecks.evaluate({rule:'overlap',target:[donut,poly('island',[[4,4],[6,4],[6,6],[4,6],[4,4]])]}).valid,true,'Polygon inside hole has zero overlap');
eq(T.ruleChecks.evaluate({rule:'duplicates',target:[line('a',[[0,0],[5,0],[10,0]]),line('b',[[10,0],[0,0]])]}).valid,false,'Reverse/collinear vertex segmentation duplicates');
eq(T.ruleChecks.evaluate({rule:'duplicates',target:[poly('a',[box,h]),poly('b',[box.slice().reverse(),h.slice().reverse()])]}).valid,false,'Duplicate with reverse rings and hole');
throws(()=>T.ruleChecks.evaluate({rule:'overlap',target:[shifted]}),'Invalid overlay never silently passes');throws(()=>T.ruleChecks.evaluate({rule:'inside',target:[line('a',[[0,0],[1,1]])]}),'Rule/geometry mismatch rejected');
const network=[line('l1',[[0,0],[10,0]]),line('l2',[[5,0],[5,5]])];const d=T.ruleChecks.evaluate({rule:'dangles',target:network});ok(!d.errors.some(e=>JSON.stringify(e.location)==='[5,0]'),'Endpoint on line interior is connected');
const pseudo=T.ruleChecks.evaluate({rule:'pseudos',target:[line('a',[[0,0],[5,0]]),line('b',[[5,0],[10,0]]),line('c',[[5,0],[5,5]])]});eq(pseudo.valid,true,'Three-way endpoint junction is not pseudo');
for(const round of c.window.CARTO_TOPOLOGY.rounds)for(const side of ['A','B'])ok(T.evaluateRound(round,side,round.expected[side]).correct,'Nine v2 relation rounds');
for(const round of c.window.CARTO_TOPOLOGY_DIAGNOSTICS.rounds){
 ok(T.repairChecks.diagnose(round).errors.length===1,'Legacy diagnosis');
 for(const candidate of round.candidates)eq(T.repairChecks.diagnose(round,candidate.id).correct,candidate.id===round.correct,'Diagnostic verdict '+round.id+'/'+candidate.id);
}
// Exercise the actual diagnose() path, not a separate geometry helper.
for(const id of ['gap','overlap']){
 const original=c.window.CARTO_TOPOLOGY_DIAGNOSTICS.rounds.find(r=>r.id===id),candidate=original.candidates.find(c=>c.id===original.correct),ring=candidate.location.slice(0,-1);
 const verdict=location=>{const round=JSON.parse(JSON.stringify(original));round.candidates.find(c=>c.id===round.correct).location=location;return T.repairChecks.diagnose(round,round.correct).correct;};
 for(const direction of [ring,ring.slice().reverse()])for(let start=0;start<ring.length;start++){
  const rotated=direction.slice(start).concat(direction.slice(0,start));
  ok(verdict([...rotated,rotated[0]]),'Same ring winding/start '+id+'/'+start);
  ok(verdict(rotated),'Same open ring winding/start '+id+'/'+start);
 }
 const wrongVertex=JSON.parse(JSON.stringify(candidate.location));wrongVertex[1][0]+=.001;
 const tinyRounding=candidate.location.map(p=>p.map(v=>v+1e-10));
 ok(verdict(tinyRounding),'Existing 1e-9 tolerance retained '+id);
 for(const bad of [[],ring.slice(0,2),[ring[0],ring[0],ring[0]],wrongVertex,candidate.location.map(p=>[p[0]+1,p[1]]),[ring[0],ring[2],ring[1],ring[3],ring[0]],[...candidate.location,...candidate.location.slice(1)]])ok(!verdict(bad),'Reject distinct/truncated/reordered/repeated ring '+id);
}
ok(T.repairChecks.evaluate(T.repairChecks.solution()).valid,'All eight controlled repairs still solve their rules');
for(const problem of c.window.CARTO_TOPOLOGY_DIAGNOSTICS.problems){const changed=T.repairChecks.repair(c.window.CARTO_TOPOLOGY_DIAGNOSTICS.initial(),problem.id);ok(T.repairChecks.evaluate(changed).checks.find(x=>x.id===problem.id).valid,'Individual v2 repair '+problem.id);}
const evaluate=(source,fields={})=>E.evaluate(E.compile(source),name=>Object.hasOwn(fields,name)?fields[name]:undefined);
const expressionCases=[['2+3*4',14],['(2+3)*4',20],['-2*-3+1',7],['10/2/5',1],['10%3',1],['NOT 2 > 3',true],['1<2 AND 2<3',true],['FALSE OR TRUE AND FALSE',false],["'a' || 'b'",'ab'],["CONCAT('a','b')",'ab'],['ABS(-3)',3],["LOWER(UPPER('Ab'))",'ab'],['COALESCE(NULL,0)',0],['IF(TRUE,5,1/0)',5],['CASE WHEN NULL THEN 1 WHEN FALSE THEN 3 ELSE 2 END',2],["CASE WHEN 2>1 THEN 'yes' ELSE 'no' END",'yes'],['NULL IS NULL',true],['0 IS NOT NULL',true],['NOT NULL IS NULL',false]];
for(const [source,expected] of expressionCases){const r=evaluate(source);eq(r.kind,'value','Value '+source);eq(r.value,expected,'Independent expression '+source);ok(r.trace.length>0,'Evaluation trace generated');}
for(let i=1;i<=100;i++){const a=i%7,b=i%11,c=i%13+1;eq(evaluate(`(${a}+${b})*${c}-${a}/${c}`).value,(a+b)*c-a/c,'Deterministic arithmetic precedence property');}
for(const [a,b] of [[true,true],[true,false],[true,null],[false,true],[false,false],[false,null],[null,true],[null,false],[null,null]]){
  const lit=v=>v===null?'NULL':String(v).toUpperCase();const and=a===false||b===false?false:a===null||b===null?null:true,or=a===true||b===true?true:a===null||b===null?null:false;
  for(const [op,expected] of [['AND',and],['OR',or]])eq(evaluate(lit(a)+' '+op+' '+lit(b)).value,expected,'Full three-valued '+op+' truth table');
}
for(const [source,code] of [['1/0','division-zero'],['1%0','division-zero'],['1e308*10','non-finite'],["'3'+1",'type'],['1 AND TRUE','type'],['"missing"','unknown-field'],['IF(1,2,3)','type']])eq(evaluate(source).code,code,'Distinct error '+source);
for(const source of ['1 +','(',')','CASE END','CASE WHEN TRUE THEN END',"'unterminated",'window.alert(1)','this.constructor','(()=>1)()','new Date()','[1]','1;2','{}','"__proto__".x','1e999','+'.repeat(80)+'1'])throws(()=>E.compile(source),'Unsafe/invalid syntax rejected');
for(const name of ['eval','Function','fetch','constructor','process','SIN']){try{E.compile(name+'(1)');ok(false,'Reject function '+name);}catch(e){ok(['unsupported-function','syntax'].includes(e.code),'Unsupported function '+name);}}
eq(evaluate('"x" + 1',{x:E.NODATA}).kind,'nodata','NoData propagation');eq(evaluate('"x" + 1',{x:E.NULL}).kind,'null','NULL propagation');eq(evaluate('COALESCE("x",0)',{x:E.NODATA}).kind,'nodata','COALESCE does not fill NoData mask');eq(evaluate('"x" OR TRUE',{x:E.NODATA}).value,true,'NoData logical true OR');eq([evaluate('IF(NULL,1,2)').kind,evaluate('IF(NULL,1,2)').value],['value',2],'IF NULL follows ELSE, consistently with CASE');
const scale=C.rasterValues(E.compile('"DEM@1" * 2'));eq(scale.results.map(r=>r.kind==='value'?r.value:r.kind),[200,1000,1400,0,'nodata',1600,400,800,1200],'Every raster cell independent expected values');
eq(C.rasterValues(E.compile('"T2@1"-"T1@1"')).results.map(r=>r.kind==='value'?r.value:r.kind),[2,-2,4,1,0,'nodata','nodata',-1,0],'Two-input raster, valid zero and masks');
eq(C.rasterValues(E.compile('IF("MASK@1" = 1, "DEM@1", NULL)')).results.map(r=>r.kind==='value'?r.value:r.kind),[100,500,'nodata',0,'nodata','nodata',200,'nodata',600],'Raster adapter converts conditional NULL to output NoData mask');
const density=C.fieldValues(E.compile('"populatie"/"suprafata_km2"'));eq(density.map(r=>r.result.kind==='value'?r.result.value:r.result.kind==='error'?r.result.code:r.result.kind),[600,'division-zero','null',0],'Feature-wise density does not convert invalid into zero');
ok(density[0].result.trace.includes('1200 / 2 → 600'),'Explanation uses actual evaluation operands');eq(C.fieldValues(E.compile('"populatie"/"total"*100'))[0].result.value,50,'Percentage');
for(const key of ['width','height','crs','origin','step','values']){const bands=JSON.parse(JSON.stringify(C.bands));bands['T2@1'][key]=key==='width'?4:key==='height'?2:key==='crs'?'EPSG:4326':key==='origin'?[0,0]:key==='step'?[60,-30]:[1];throws(()=>C.rasterValues(E.compile('"T1@1"+"T2@1"'),bands),'Raster alignment guard '+key);}
throws(()=>C.fieldValues(E.compile('"unknown"')),'Unknown field before row execution');
for(const file of ['js/gis-expression.js','js/calculator-model.js'])ok(!/\beval\s*\(|\bFunction\s*\(|innerHTML|document\.|fetch\(/.test(read(file)),'Narrow safe DOM-free evaluator '+file);
const unitChecks=checks;
if(process.argv.includes('--unit')){console.log(JSON.stringify({status:'PASS',checks,measurementCases:reference.cases.length,topologyCases:matrix.cases.length,maxErrors}));process.exit(0);}
const server=http.createServer((req,res)=>{const rel=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/explorare-geospatiala\//,'')||'index.html',file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)||/^(tmp|content)\//.test(rel))return res.writeHead(404).end();fs.readFile(file,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(b);});});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`,browser=await playwright().chromium.launch(browserOptions()),errors=[],requests=[],bad=[],layouts=[];const out=path.join(root,'tmp/qa/p02');fs.mkdirSync(out,{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)bad.push(r.url());});
 const routes={L04:'measurement-lab.html',L09:'topology.html',L20:'gis-calculator.html'};
 for(const [id,route] of Object.entries(routes)){
  await page.goto(base+route);const section=page.locator('[data-p02-lab='+id+']');await section.locator('.p02-interactive').waitFor({state:'visible',timeout:5000}).catch(async e=>{throw Error(id+' init: '+await section.locator('.p02-fallback').innerText()+'; '+errors.join(' | '));});await inspectNavigation(page,manifest(),base);checks++;
  for(const lang of ['ro','en'])for(const dark of [false,true])for(const width of [1440,1024,768,390]){
   await page.setViewportSize({width,height:1000});await page.evaluate(dark=>document.body.classList.toggle('dark',dark),dark);await section.locator('[data-key=lang]').selectOption(lang);
   eq(await section.getAttribute('lang'),lang,'Section language');ok(await section.locator('h2').isVisible(),'Visible purpose');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No page overflow '+id+'/'+width);
   const labels=await section.locator('input,select,textarea').evaluateAll(es=>es.every(e=>e.labels.length>0));ok(labels,'All controls labelled');eq(await page.locator('body').evaluate(n=>n.classList.contains('dark')),dark,'Actual site theme applied');
   const ratio=await section.locator('select').first().evaluate(n=>{const s=getComputedStyle(n),lum=color=>color.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0),a=lum(s.color),b=lum(s.backgroundColor);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);});ok(ratio>=4.5,'Text contrast '+id+'/'+dark);
   layouts.push({id,lang,dark,width});
  }
  await section.locator('[data-key=lang]').selectOption('en');
  if(id==='L04'){
   for(const preset of ['segment','polyline','polygon','hole','north']){await section.locator('[data-key=preset]').selectOption(preset);ok(await section.locator('.p02-error').innerText()==='','Preset valid '+preset);}
   await section.locator('[data-key=preset]').selectOption('hole');await section.locator('[data-key=a]').selectOption('EPSG:4326');ok(await section.locator('.p02-results').innerText().then(s=>s.includes('no planar metric')),'Degrees explicitly nonmetric');
   const before=await page.evaluate(()=>window.CARTO_P02.controllers.L04.getResult().B.geodesicArea);const g=await page.evaluate(()=>window.CARTO_P02.controllers.L04.getState().geometry);g.coordinates[1][1][0]+=.005;await section.locator('[data-key=geometry]').fill(JSON.stringify(g));await section.locator('[data-action=apply]').click();ok((await page.evaluate(()=>window.CARTO_P02.controllers.L04.getResult().B.geodesicArea))!==before,'Geometry edit changes actual calculation');
   await section.locator('[data-key=geometry]').fill('{');await section.locator('[data-action=apply]').click();ok((await section.locator('.p02-error').innerText()).length>0,'Invalid editor feedback');await section.locator('[data-key=b]').selectOption('EPSG:32635');eq(await section.locator('.p02-error').innerText(),'','Restored valid state clears stale error');eq(await section.locator('[data-key=geometry]').getAttribute('aria-invalid'),null,'Validation attribute reset');
   await section.locator('[data-key=mode]').selectOption('toggle');await section.locator('[data-key=active]').selectOption('B');ok(await section.locator('[data-view=A]').isHidden()&&await section.locator('[data-view=B]').isVisible(),'A/B accessible toggle');
  }
  if(id==='L09'){
   const diagnostic=page.locator('#T9');
   for(const [i,round] of c.window.CARTO_TOPOLOGY_DIAGNOSTICS.rounds.entries()){
    await diagnostic.locator('[data-key=round]').selectOption(String(i));
    const wrong=round.candidates.find(candidate=>candidate.id!==round.correct);
    await diagnostic.locator('[data-pick="'+wrong.id+'"]').click();
    ok(!(await diagnostic.locator('.lab-status').innerText()).includes('✓ Identificat'),'Browser diagnostic rejects '+round.id);
    await diagnostic.locator('[data-pick="'+round.correct+'"]').click();
    ok((await diagnostic.locator('.lab-status').innerText()).includes('✓ Identificat'),'Browser diagnostic accepts '+round.id);
    if(round.id==='gap')ok((await diagnostic.innerText()).includes('2400'),'Browser G1 computed area retained');
   }
   for(const type of ['Point','LineString','Polygon']){await section.locator('[data-key=type]').selectOption(type);const rules=await section.locator('[data-key=rule] option').evaluateAll(es=>es.map(e=>e.value));for(const rule of rules){await section.locator('[data-key=rule]').selectOption(rule);await section.locator('[data-key=variant]').selectOption('problem');await section.locator('[data-action=apply]').click();ok(!(await page.evaluate(()=>window.CARTO_P02.controllers.L09.getResult().valid)),'Browser rule detects '+type+'/'+rule);await section.locator('[data-action=repair]').click();ok(await page.evaluate(()=>window.CARTO_P02.controllers.L09.getResult().valid),'Controlled repair '+type+'/'+rule);}}
   await section.locator('[data-key=type]').selectOption('Point');await section.locator('[data-key=rule]').selectOption('inside');const edited=await page.evaluate(()=>window.CARTO_P02.controllers.L09.getState().scene);edited.target[0].coordinates=[190,140];await section.locator('[data-key=scene]').fill(JSON.stringify(edited));await section.locator('[data-action=apply]').click();eq(await section.locator('[data-key=variant]').inputValue(),'custom','Edited scene not mislabeled as a valid preset');ok(!await page.evaluate(()=>window.CARTO_P02.controllers.L09.getResult().valid),'Actual edited point in hole detected');await section.locator('[data-action=repair]').click();
  }
  if(id==='L20'){
   for(const mode of ['raster','field']){await section.locator('[data-key=mode]').selectOption(mode);const presets=await section.locator('[data-key=preset] option').evaluateAll(es=>es.map(e=>e.value));for(const preset of presets){await section.locator('[data-key=preset]').selectOption(preset);await section.locator('[data-action=apply]').click();eq(await section.locator('.p02-error').innerText(),'','Guided expression '+mode+'/'+preset);}}
   await section.locator('[data-key=preset]').selectOption('density');await section.locator('svg [data-feature=C]').focus();await page.keyboard.press('Enter');eq(await section.locator('table [data-feature=C]').getAttribute('aria-pressed'),'true','Map/keyboard to table synchronization');await section.locator('table [data-feature=B]').click();eq(await section.locator('svg [data-feature=B]').getAttribute('aria-pressed'),'true','Table to map synchronization');ok((await section.locator('.p02-results').innerText()).includes('Division by zero'),'Distinct division error');
   for(const width of [1440,1024,768,390])for(const dark of [false,true]){await page.setViewportSize({width,height:1000});await page.evaluate(dark=>document.body.classList.toggle('dark',dark),dark);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Field map/table no page overflow');}
   await section.locator('.p02-results').screenshot({path:path.join(out,'L20-field-390-dark.png')});
   await section.locator('[data-key=expression]').fill('fetch(1)');await section.locator('[data-action=apply]').click();ok((await section.locator('.p02-error').innerText()).includes('Unsupported function'),'No arbitrary execution');await section.locator('[data-key=expression]').fill('"populatie" / 2');await section.locator('[data-action=apply]').click();eq(await section.locator('.p02-error').innerText(),'','Valid correction clears error');
   await section.locator('[data-key=mode]').selectOption('raster');await section.locator('[data-pixel="4"]').focus();await page.keyboard.press('Enter');ok((await section.locator('.p02-results').innerText()).includes('NoData'),'Pixel-level missing-value inspection');
  }
  const before=await page.evaluate(id=>window.CARTO_P02.controllers[id].getState(),id);await section.locator('[data-action=share]').click();ok(page.url().includes(id+'='),'Share URL '+id);await page.reload();await section.locator('.p02-interactive').waitFor({state:'visible'});eq(await page.evaluate(id=>window.CARTO_P02.controllers[id].getState(),id),before,'URL round trip '+id);
  await page.goto(base+route+'?'+id+'=%7B%22v%22%3A99%7D');await section.locator('.p02-interactive').waitFor({state:'visible'});eq(await section.locator('[data-key=lang]').inputValue(),'ro','Obsolete state safe fallback');await section.locator('[data-key=lang]').focus();await page.keyboard.press('e');await page.keyboard.press('Tab');ok(await page.evaluate(()=>document.activeElement!==document.body),'Keyboard focus continues');
  for(const width of [1440,768,390])for(const theme of ['light','dark']){await page.evaluate(theme=>document.body.classList.toggle('dark',theme==='dark'),theme);await page.setViewportSize({width,height:1000});await section.screenshot({path:path.join(out,id+'-'+width+'-'+theme+'.png')});}
 }
 await page.goto(base+'digital-companion.html');for(const [id,route] of Object.entries(routes))ok(await page.locator('.catalog-card[data-lab="'+id+'"] a[href="'+route+'"]').count()===1,'Canonical catalogue discovery '+id);
 await page.goto(base+'index.html');for(const [query,route] of [['măsurători','measurement-lab.html'],['calculator','gis-calculator.html'],['topologie','topology.html']]){await page.fill('#search',query);ok(await page.locator('#search-results a[href="'+route+'"]').count()>0,'Canonical search '+query);}
 await page.goto(base+'map-diagnostics.html');await page.waitForFunction(()=>!!window.CARTO_MAP_DIAGNOSTICS?.getMetrics());await page.evaluate(()=>window.CARTO_MAP_DIAGNOSTICS.activate('DIAG_TOPO_01'));ok(await page.evaluate(()=>!!window.CARTO_TOPOLOGY_ENGINE.geometry&&!!window.CARTO_MAP_DIAGNOSTICS.getMetrics()),'Map Diagnostics loads the extended topology dependencies');
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}});for(const [id,route] of Object.entries(routes)){const p=await nojs.newPage();await p.goto(base+route);ok(await p.locator('[data-p02-lab='+id+'] h2').isVisible(),'No-JS purpose');ok(await p.locator('[data-p02-lab='+id+'] .p02-fallback').isVisible(),'No-JS guidance');ok(await p.locator('main a').first().isVisible(),'Recovery navigation');const heading=await p.locator('h1').boundingBox(),side=await p.locator('#sidebar').boundingBox();ok(!side||!heading||side.x+side.width<=heading.x||side.y+side.height<=heading.y,'No-JS no sidebar overlap');await p.close();}await nojs.close();
 eq(errors,[],'No browser exceptions');eq(bad,[],'No broken local resources');eq(requests.filter(u=>!u.startsWith(base)),[],'Zero external requests');
 const report={status:'PASS',checks,unitChecks,measurementCases:reference.cases.length,topologyMatrix:matrix.cases.length,layouts:layouts.length,maxErrors,browserErrors:errors,brokenResources:bad,externalRequests:0};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
