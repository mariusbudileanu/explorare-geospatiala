'use strict';
const fs=require('node:fs'),path=require('node:path'),{execFileSync}=require('node:child_process');
const {root}=require('./expectations.cjs');
module.exports=async function({browser,page,base,ok}){
  const evidence={circles:[],flows:[],badges:[],hashes:[],sizes:[],layouts:[]};
  const registry=JSON.parse(fs.readFileSync(path.join(root,'data/data-registry.json'),'utf8'));
  for(const dataset of registry.datasets)for(const item of dataset.interactive_subsets){
    if(!item.file.endsWith('.geojson'))continue;
    const bytes=fs.readFileSync(path.join(root,item.file));
    // On a raw archive, GIT_DIR can explicitly point at the source object store.
    const blob=execFileSync('git',['cat-file','blob','HEAD:'+item.file],{cwd:root});
    ok(bytes.equals(blob),'Checkout/archive is exactly the distributed Git blob '+item.file);
    ok(bytes.length===item.bytes,'Canonical raw-artifact bytes '+item.file);
    const response=await page.request.get(base+item.file);
    ok(response.ok()&&(await response.body()).equals(blob),'HTTP serves exact Git bytes '+item.file);
    evidence.sizes.push({file:item.file,bytes:bytes.length});
  }
  await page.goto(base+'lesson.html?id=method-signs');
  await page.locator('#same-data-tabs [data-mode="symbols"]').click();
  evidence.circles=await page.locator('#same-data-svg circle[data-quantity]').evaluateAll(es=>es.map(e=>({value:+e.dataset.value,r:+e.getAttribute('r'),title:e.textContent})));
  ok(evidence.circles.length===6,'All positive shared values represented');
  for(const a of evidence.circles)for(const b of evidence.circles)ok(Math.abs(a.r*a.r/(b.r*b.r)-a.value/b.value)<1e-12,'Circle AREA, not radius plus offset, is proportional');
  ok((await page.locator('#same-data-caption').innerText()).includes('Aria'),'Area encoding explained');
  await page.evaluate(()=>{window.CARTO_DEMO.regions[0].population=0;window.CARTO_DEMO.regions[1].population=null;});
  await page.locator('#same-data-tabs [data-mode="cartodiagram"]').click();await page.locator('#same-data-tabs [data-mode="symbols"]').click();
  ok(await page.locator('#same-data-svg circle[data-quantity]').count()===4,'Zero/missing have no misleading visible quantitative area');
  await page.goto(base+'lesson.html?id=method-cartodiagram');
  const bars=await page.locator('#same-data-svg rect[data-quantity]').evaluateAll(es=>es.map(e=>({key:e.dataset.quantity,value:+e.dataset.value,scale:+e.dataset.scale,h:+e.getAttribute('height'),title:e.textContent})));
  ok(bars.length===12&&await page.locator('#same-data-svg path').count()===0,'Two separate bars per region; no incompatible pie total');
  for(const bar of bars)ok(Math.abs(bar.h-bar.value*bar.scale)<1e-12&&bar.title.includes(String(bar.value)),'Separate quantitative bar scale and numeric label');
  const caption=await page.locator('#same-data-caption').innerText();
  ok(caption.includes('fără unitate')&&caption.includes('Scări independente')&&caption.includes('Nu sunt procente'),'Variables, units and independent scales declared');
  const baseline=execFileSync('git',['show','61fa8092aabd464da0116fa8fab3f01e1e990e55:js/method-demos.js'],{cwd:root}).toString('utf8');
  const current=fs.readFileSync(path.join(root,'js/method-demos.js'),'utf8');
  const energy=s=>s.slice(s.indexOf('  function drawCartodiagram('),s.indexOf('\n  function ',s.indexOf('  function drawCartodiagram(')+1)).replace(/\r\n/g,'\n');
  ok(energy(current).replace('r=proportionalRadius(total,maxTotal,maxSize)','r=Math.sqrt(total/maxTotal)*maxSize')===energy(baseline),'Separate GWh/year energy sectors unchanged except exact shared-radius delegation');
  await page.goto(base+'lesson.html?id=method-flows');
  for(const scale of [1,1.5,3]){
    await page.locator('#method-flow-size').evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},scale);
    const rows=await page.locator('.method-flow').evaluateAll(es=>es.map(e=>({value:+e.textContent.match(/: (\d+) mii/)[1],width:+e.getAttribute('stroke-width')})));
    for(const a of rows)for(const b of rows)ok(Math.abs(a.width/b.width-a.value/b.value)<1e-12,'Flow width proportional at every control scale');
    evidence.flows.push({scale,rows});
  }
  await page.evaluate(()=>{window.CARTO_METHOD_DATA.flows.routes[0].value=0;window.CARTO_METHOD_DATA.flows.routes[1].value=null;});
  await page.locator('#method-flow-size').dispatchEvent('input');
  ok(await page.locator('.method-flow').count()===await page.evaluate(()=>window.CARTO_METHOD_DATA.flows.routes.filter(r=>Number.isFinite(r.value)&&r.value>0).length),'Zero/missing flows have no quantitative width');
  for(const dark of [false,true]){
    await page.goto(base+'index.html');await page.locator('body').evaluate((e,d)=>e.classList.toggle('dark',d),dark);
    const colors=await page.locator('.interactive-tag').evaluateAll(es=>es.map(e=>{const s=getComputedStyle(e);return {text:e.textContent.trim(),fg:s.color,bg:s.backgroundColor,size:s.fontSize};}));
    for(const label of ['Explorare interactivă','Disponibil']){
      const item=colors.find(c=>c.text===label);ok(!!item,'Target badge exists '+label);
      const lum=s=>{const a=s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
      const l=[lum(item.fg),lum(item.bg)].sort((a,b)=>b-a),ratio=(l[0]+.05)/(l[1]+.05);
      ok(ratio>=4.5,'Actual small-text contrast '+dark+'/'+label);evidence.badges.push({dark,...item,ratio});
    }
  }
  for(const file of ['formats-interoperability.html','styling-labeling.html','transparency-blending.html','topology.html'])for(const hash of ['%','%A','%C3%28','unknown-valid','%3Cscript%3E']){
    await page.goto(base+file+'#'+hash);ok(await page.locator('h1').isVisible(),'Malformed/unknown hash leaves page readable '+file+'/'+hash);
    ok(await page.evaluate(()=>!!window.CARTO_LAB),'Lab initialized despite hash '+file+'/'+hash);
    evidence.hashes.push(file+'#'+hash);
  }
  await page.goto(base+'styling-labeling.html#map%2Ddesign%2Dstudio');ok(await page.locator('#map-design-studio').isVisible(),'Valid encoded Studio anchor opens correct panel');
  await page.goto(base+'map-diagnostics.html');await page.waitForFunction(()=>!!window.CARTO_MAP_DIAGNOSTICS?.getMetrics());
  await page.evaluate(()=>window.CARTO_MAP_DIAGNOSTICS.applyBook('BOOK_DIAG_10'));await page.waitForFunction(()=>window.CARTO_MAP_DIAGNOSTICS?.getState()?.scenario==='DIAG_TOPO_01');
  ok((await page.locator('#diag-active-title').innerText()).includes('reguli topologice'),'Canonical BOOK title corrected without changed scenario');
  await page.goto(base+'map-diagnostics.html#nodata-nu-este-zero');await page.goBack();await page.waitForFunction(()=>window.CARTO_MAP_DIAGNOSTICS?.getState()?.scenario==='DIAG_TOPO_01');
  await page.goForward();await page.waitForFunction(()=>window.CARTO_MAP_DIAGNOSTICS?.getState()?.scenario==='DIAG_RASTER_01');ok(true,'BOOK/scene Back/Forward preserved');
  for(const js of [true,false]){
    const context=await browser.newContext({javaScriptEnabled:js,reducedMotion:'reduce',viewport:{width:390,height:960}}),p=await context.newPage();
    try{
      await p.goto(base+'lesson.html?id='+(js?'invalid':'sphere'));const link=p.locator('main a[href="index.html#cuprins"]');
      await link.focus();await p.keyboard.press('Enter');await p.waitForURL(base+'index.html#cuprins');
      ok(await p.locator('#cuprins').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=-1&&r.top<innerHeight;}),'Keyboard recovery scrolls to real cuprins '+js);
    }finally{await context.close();}
  }
  const routes=['index.html','lesson.html?id=method-signs','lesson.html?id=method-flows','lesson.html?id=method-cartodiagram','styling-labeling.html#map-design-studio','topology.html','raster-styling.html','map-diagnostics.html','formats-interoperability.html'];
  for(const width of [390,768,1024,1440])for(const dark of [false,true])for(const route of routes){
    await page.setViewportSize({width,height:960});await page.goto(base+route);await page.locator('body').evaluate((e,d)=>e.classList.toggle('dark',d),dark);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No corrective layout overflow '+width+'/'+dark+'/'+route);
    if(route.includes('method-'))ok(await page.locator('#same-data-svg').evaluate(e=>[...e.querySelectorAll('circle[data-quantity],rect[data-quantity]')].every(n=>{const r=n.getBBox();return r.x>=0&&r.y>=0&&r.x+r.width<=520&&r.y+r.height<=420;})),'Quantitative diagrams fit SVG '+width+'/'+dark+'/'+route);
    evidence.layouts.push({width,dark,route});
  }
  await page.goto(base+'raster-styling.html');await page.locator('#raster-data-attribution a[href="resources.html#data-hansen-loss"]').waitFor();
  const provenance=await page.locator('#raster-data-attribution').innerText();
  for(const id of ['copernicus-dem','hansen-loss']){const r=registry.datasets.find(r=>r.id===id);ok(provenance.includes(r.license_name)&&provenance.includes(r.accessed),'Runtime confirmed source metadata is canonical '+id);}
  ok(!provenance.includes('data accesării Forest Loss și datum-ul')&&provenance.includes('rețeta originală'),'Subset caveats distinct from confirmed upstream metadata');
  for(const id of ['administrative-boundaries','census2021']){const r=registry.datasets.find(r=>r.id===id);ok(r.redistribution_permission.status==='owner_confirmed'&&r.license_status==='needs_confirmation','Owner permission distinct from published product license '+id);}
  return evidence;
};
