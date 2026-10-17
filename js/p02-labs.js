/* P02 UI adapters. Shared P01 locale/URL contract; numerical engines remain DOM-free. */
(function(root){
  'use strict';
  if(typeof document==='undefined')return;
  const U=root.CARTO_V3,E=root.CARTO_EXPRESSION,controllers={};
  const defaults={L04:{lang:'ro',preset:'segment',geometry:root.CARTO_MEASUREMENT?.presets.segment,a:'EPSG:3857',b:'EPSG:3844',mode:'side',active:'A'},L09:{lang:'ro',type:'Point',rule:'inside',variant:'valid',scene:null},L20:{lang:'ro',mode:'raster',preset:'scale',expression:'"DEM@1" * 2',source:'DEM@1',pixel:0,feature:'A'}};
  const exercises={raster:[['scale','"DEM@1" * 2','Scalare','Scaling'],['threshold','"DEM@1" > 500','Prag','Threshold'],['change','"T2@1" - "T1@1"','Schimbare','Change'],['mask','IF("MASK@1" = 1, "DEM@1", NULL)','Mască','Masking'],['precedence','("DEM@1" - 100) / 10','Paranteze','Parentheses']],field:[['density','"populatie" / "suprafata_km2"','Densitate (loc./km²)','Density (people/km²)'],['percent','"populatie" / "total" * 100','Procent (%)','Percentage (%)'],['category',"CASE WHEN \"populatie\" IS NULL THEN 'necunoscut' WHEN \"populatie\" > 1000 THEN 'mare' ELSE 'mic' END",'Categorii condiționale','Conditional categories'],['text',"UPPER(\"nume\") || ' / ' || \"id\"",'Text','Text'],['null','COALESCE("populatie", 0)','NULL → 0: ipoteză, nu observație','NULL → 0: assumption, not observation']]};
  const clone=v=>JSON.parse(JSON.stringify(v));
  function validate(id,s){
    if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!Object.hasOwn(defaults[id],k)))throw Error('state');const n={...clone(defaults[id]),...s};if(!['ro','en'].includes(n.lang))throw Error('language');
    if(id==='L04'){root.CARTO_MEASUREMENT.validate(n.geometry);if(!root.CARTO_MEASUREMENT.codes.includes(n.a)||!root.CARTO_MEASUREMENT.codes.includes(n.b)||!['side','toggle'].includes(n.mode)||!['A','B'].includes(n.active)||!Object.hasOwn(root.CARTO_MEASUREMENT.presets,n.preset))throw Error('state');}
    if(id==='L09'){
      if(!['Point','LineString','Polygon'].includes(n.type)||!root.CARTO_TOPOLOGY_RULES.byId[n.rule]?.types.includes(n.type)||!['valid','problem','custom'].includes(n.variant)||n.variant==='custom'&&!n.scene)throw Error('rule');
      n.scene??=root.CARTO_TOPOLOGY_RULES.p02Fixture(n.type,n.rule,n.variant);if(n.scene.rule!==n.rule||n.scene.type!==n.type)throw Error('scene');
      const G=root.CARTO_TOPOLOGY_ENGINE.geometry;for(const f of [...n.scene.target,...(n.scene.reference||[])])for(const p of G.vertices(f))if(Array.isArray(p)&&p.some(x=>typeof x==='number'&&(!Number.isFinite(x)||Math.abs(x)>10000))&&n.rule!=='invalid')throw Error('domain');
      root.CARTO_TOPOLOGY_ENGINE.ruleChecks.evaluate(n.scene);
    }
    if(id==='L20'){if(!['raster','field'].includes(n.mode)||typeof n.expression!=='string'||!Object.hasOwn(root.CARTO_CALCULATOR.bands,n.source)||!Number.isInteger(n.pixel)||n.pixel<0||n.pixel>8||!root.CARTO_CALCULATOR.features.some(f=>f.id===n.feature)||!exercises[n.mode].some(x=>x[0]===n.preset))throw Error('state');E.compile(n.expression);}
    return n;
  }
  // Numeric SVG coordinates only. The diagram fits the unchanged logical geometry;
  // every feature also has a native keyboard-accessible table/control selection.
  function drawing(features,selected=[],label='Geometry',interactive=false){
    const all=[];const visit=c=>{if(Array.isArray(c)&&c.length===2&&c.every(Number.isFinite))all.push(c);else if(Array.isArray(c))c.forEach(visit);};features.forEach(f=>visit(f.coordinates));
    if(!all.length)return '<p>'+U.esc(label)+'</p>';
    const xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),xmin=Math.min(...xs),ymin=Math.min(...ys),dx=Math.max(...xs)-xmin,dy=Math.max(...ys)-ymin,fit=Math.min(dx?400/dx:Infinity,dy?230/dy:Infinity),scale=Number.isFinite(fit)?fit:1,xy=p=>[(480-dx*scale)/2+(p[0]-xmin)*scale,(320+dy*scale)/2-(p[1]-ymin)*scale],path=r=>r.filter(p=>p?.every(Number.isFinite)).map((p,i)=>(i?'L':'M')+xy(p).join(' ')).join(' ');
    const shape=(f,type,c)=>{
      if(type.startsWith('Multi'))return c.map(q=>shape(f,type.slice(5),q)).join('');
      const cls=(f.layer==='B'?'p02-reference ':'')+(selected.includes(f.id)?'p02-affected p02-selected':'');
      const attrs=interactive?`data-feature="${U.esc(f.id)}" tabindex="0" role="button" aria-label="Feature ${U.esc(f.id)}" aria-pressed="${selected.includes(f.id)}"`:'';
      if(type==='Point'){if(!c.every(Number.isFinite))return '';const [x,y]=xy(c);return `<circle class="${cls}" ${attrs} cx="${x}" cy="${y}" r="6"/>`;}
      const rs=type==='Polygon'?(typeof c[0]?.[0]==='number'?[c]:c):[c];return `<path class="${cls}" ${attrs} d="${rs.map(r=>path(r)+(type==='Polygon'?' Z':'')).join(' ')}"/>`;
    };
    return `<svg viewBox="0 0 480 320" role="${interactive?'group':'img'}" aria-label="${U.esc(label)}">${features.map(f=>shape(f,f.type,f.coordinates)).join('')}${features.map(f=>{const v=[];const collect=c=>{if(Array.isArray(c)&&c.length===2&&c.every(Number.isFinite))v.push(c);else if(Array.isArray(c))c.forEach(collect);};collect(f.coordinates);if(!v.length)return '';const [x,y]=xy(v[0]);return `<text x="${x+8}" y="${y-8}">${U.esc(f.id)}</text>`;}).join('')}</svg>`;
  }
  function mount(id,section){
    const host=section.querySelector('.p02-interactive'),life=new AbortController();let state=U.read(location.search,id,defaults[id],s=>validate(id,s)),compare,last;
    state=validate(id,state);const t=(ro,en)=>U.text(state.lang,ro,en),num=(v,d=3)=>v===null?'—':U.number(v,state.lang,d);
    const on=(node,type,fn)=>node.addEventListener(type,fn,{signal:life.signal});
    const select=(key,ro,en,options)=>`<label>${t(ro,en)}<select data-key="${key}">${options.map(([v,r,e])=>`<option value="${U.esc(v)}"${String(state[key])===String(v)?' selected':''}>${U.esc(t(r,e??r))}</option>`).join('')}</select></label>`;
    const area=(key,ro,en,value)=>`<label class="p02-wide">${t(ro,en)}<textarea data-key="${key}" spellcheck="false">${U.esc(value)}</textarea></label>`;
    const button=(action,ro,en)=>`<button type="button" class="outline-button" data-action="${action}">${t(ro,en)}</button>`;
    const table=(heads,rows)=>`<table><thead><tr>${heads.map(h=>`<th scope="col">${U.esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>'<tr>'+row.map(v=>`<td>${U.esc(v)}</td>`).join('')+'</tr>').join('')}</tbody></table>`;
    host.innerHTML='<div class="p02-controls"></div><div class="p02-actions p01-actions"></div><p class="p02-error" role="alert"></p><p class="p02-status" role="status" aria-live="polite" aria-atomic="true"></p><div class="p02-results"></div>';
    const controls=host.querySelector('.p02-controls'),actions=host.querySelector('.p02-actions'),results=host.querySelector('.p02-results'),error=host.querySelector('.p02-error'),status=host.querySelector('.p02-status');
    function measurements(){
      const views={A:{crs:state.a},B:{crs:state.b}},context={geometry:state.geometry},sharedLocation=state.geometry.type==='polygon'?state.geometry.coordinates[0][0]:state.geometry.coordinates[0];
      const adapter=side=>{let node;return {init:n=>node=n,update:({view,context})=>{const m=root.CARTO_MEASUREMENT.measure(context.geometry,view.crs),polygon=context.geometry.type==='polygon';last??={};last[side]=m;
        const fs=polygon?m.geometry.coordinates.map((r,i)=>({id:i?'H'+i:'P',type:'Polygon',coordinates:r,layer:i?'B':'A'})):[{id:'L',type:'LineString',coordinates:m.geometry.coordinates,layer:'A'}];
        node.innerHTML=`<h3>${side} · ${U.esc(view.crs)}</h3><p>${t('Schemă lon/lat; tabelul folosește CRS-ul selectat.','Lon/lat schematic; the table uses the selected CRS.')}</p>`+drawing(fs,[],t('Schemă lon/lat, nu proiecția afișată','Lon/lat schematic, not a projected view'))+table([t('Metodă / mărime','Method / quantity'),t('Valoare','Value')],[[t(polygon?'Perimetru WGS 84':'Lungime WGS 84',polygon?'WGS84 perimeter':'WGS84 length'),num(m.geodesicLength)+' m'],[t('Arie WGS 84','WGS84 area'),num(m.geodesicArea)+' m²'],[t('Lungime / perimetru plan','Planar length / perimeter'),num(m.planarLength)+(m.metric?' m':' · °')],[t('Arie plană','Planar area'),num(m.planarArea)+(m.metric?' m²':' · °')],[t('Diferență lungime față de WGS 84','Length difference from WGS84'),num(m.lengthDelta)+' m; '+num(m.lengthPercent)+'%'],[t('Diferență arie față de WGS 84','Area difference from WGS84'),num(m.areaDelta)+' m²; '+num(m.areaPercent)+'%']])+`<p>${m.metric?t('Planul CRS-ului selectat.','Selected CRS plane.'):t('Grade: fără rezultat metric plan.','Degrees: no planar metric result.')}</p>`+(m.outside?`<p class="p01-notice">${t('Geometria depășește zona CRS-ului; verifică adecvarea, nu doar unitățile.','Geometry exceeds this CRS area; check suitability, not only units.')}</p>`:'');
      },getMetrics:()=>last?.[side],setSharedLocation(){},resize(){},destroy(){node?.replaceChildren();node=null;}};};
      if(!compare){results.innerHTML='<div class="p01-panels"><article class="p01-panel" data-view="A"></article><article class="p01-panel" data-view="B"></article></div>';const container=results.firstElementChild;compare=root.CARTO_COMPARE.create({container,panels:{A:container.children[0],B:container.children[1]},adapters:{A:adapter('A'),B:adapter('B')},initial:{views,context,sharedLocation,mode:state.mode,active:state.active}});}else compare.update({views,context,sharedLocation,mode:state.mode,active:state.active});
    }
    function topology(){
      last=root.CARTO_TOPOLOGY_ENGINE.ruleChecks.evaluate(state.scene);const rule=root.CARTO_TOPOLOGY_RULES.byId[state.rule];
      results.innerHTML=`<h3>${U.esc(rule.name)}</h3>`+drawing([...state.scene.target,...(state.scene.reference||[])],last.affectedFeatureIds,t('A: target; B: referință întreruptă; IDs și contur gros indică features semnalate','A: target; B: dashed reference; IDs and heavy outlines identify reported features'))+`<p class="p01-notice">${last.valid?t('Conform regulii selectate. Nu este o certificare universală.','Passes the selected rule. This is not universal certification.'):t('Regula semnalează','The rule reports')+' '+last.errors.length+' '+t('situații. IDs:','cases. IDs:')+' '+U.esc(last.affectedFeatureIds.join(', '))}</p>`+table(['ID',t('Tip','Type'),t('Locație logică','Logical location')],last.errors.map(e=>[e.affectedFeatureIds.join(', '),e.type,JSON.stringify(e.location)]))+`<p>${U.esc(state.lang==='ro'?rule.why:rule.why_en)}</p><p>${t('Restaurarea este o reparație controlată a exemplului, nu un algoritm universal de reparare.','Restoring the example is a controlled repair, not a universal repair algorithm.')}</p>`;
    }
    const errors={ 'unknown-field':['Câmp sau bandă necunoscută','Unknown field or band'],syntax:['Eroare de sintaxă','Syntax error'],expression:['Expresie invalidă','Invalid expression'],type:['Tip incompatibil','Type mismatch'],'division-zero':['Împărțire la zero','Division by zero'],'non-finite':['Rezultat nefinit','Non-finite result'],'unsupported-function':['Funcție nesuportată','Unsupported function'],'incompatible-raster':['Grile incompatibile, fără resampling','Incompatible grids, no resampling'],arity:['Număr de argumente incorect','Incorrect argument count'],complexity:['Expresie prea complexă','Expression too complex']};
    const value=r=>r.kind==='error'?t(...(errors[r.code]||['Eroare','Error'])):r.kind==='value'?String(r.value):r.kind==='nodata'?'NoData':'NULL';
    function calculator(){
      const ast=E.compile(state.expression),C=root.CARTO_CALCULATOR;let selected;
      if(state.mode==='raster'){
        last=C.rasterValues(ast);selected=last.results[state.pixel];const source=C.bands[state.source];
        const grid=(values,click)=>'<div class="p02-grid">'+values.map((v,i)=>click?`<button type="button" data-pixel="${i}" aria-pressed="${state.pixel===i}" aria-label="${t('Pixel','Pixel')} ${i+1}: ${U.esc(v)}">${U.esc(v)}</button>`:`<span>${U.esc(v)}</span>`).join('')+'</div>';
        results.innerHTML='<div class="p01-panels"><article class="p01-panel"><h3>'+U.esc(state.source)+' · '+U.esc(source.unit==='synthetic'?t('unități sintetice','synthetic units'):source.unit)+'</h3>'+grid(source.values.map(v=>v===null?'NoData':String(v)),false)+'</article><article class="p01-panel"><h3>'+t('Rezultat: selectează pixelul','Result: select a pixel')+'</h3>'+grid(last.results.map(value),true)+'</article></div>'+`<p>${t('Grilă comună: 3×3, EPSG:3844, origine [500000,300000] m, pas [30,−30] m.','Common grid: 3×3, EPSG:3844, origin [500000,300000] m, step [30,−30] m.')}</p>`;
        results.innerHTML+=table([t('Bandă / pixel selectat','Band / selected pixel'),t('Valoare sursă','Source value')],Object.entries(C.bands).map(([k,b])=>[k+' · '+(b.unit==='synthetic'?t('unități sintetice','synthetic units'):b.unit),b.values[state.pixel]===null?'NoData':String(b.values[state.pixel])]));
      }else{
        last=C.fieldValues(ast);selected=last.find(r=>r.id===state.feature).result;
        results.innerHTML=drawing(C.features.map(f=>({...f,layer:'A',type:'Polygon',coordinates:f.geometry.coordinates})),[state.feature],t('Poligoane sintetice; selecția este sincronizată cu tabelul','Synthetic polygons; selection synchronized with the table'),true)+`<div class="p02-scroll"><table class="p02-attributes"><thead><tr>${['ID','populatie','suprafata_km2','nume','total',t('Câmp derivat','Derived field')].map(v=>'<th scope="col">'+U.esc(v)+'</th>').join('')}</tr></thead><tbody>`+C.features.map((f,i)=>`<tr><th scope="row"><button type="button" data-feature="${f.id}" aria-pressed="${f.id===state.feature}">${f.id}</button></th>${['populatie','suprafata_km2','nume','total'].map(k=>'<td>'+U.esc(f[k]===null?'NULL':f[k])+'</td>').join('')}<td>${U.esc(value(last[i].result))}</td></tr>`).join('')+'</tbody></table></div>';
      }
      results.innerHTML+=`<h3>${t('Explică evaluarea selectată','Explain selected evaluation')}</h3><p>${t('Rezultat','Result')}: <strong>${U.esc(value(selected))}</strong></p><ol>${selected.trace.map(x=>'<li><code>'+U.esc(x)+'</code></li>').join('')}</ol><details><summary>AST</summary><pre>${U.esc(JSON.stringify(ast,null,2))}</pre></details>`;
    }
    function render(){
      const focused=document.activeElement?.dataset.key;section.lang=state.lang;
      for(const n of section.querySelectorAll('[data-p02-text]'))n.textContent=root.CARTO_P02_CONTENT.text[id][n.dataset.p02Text][state.lang==='en'?1:0];
      section.querySelector('[data-p02-summary]').textContent=t('Metodă, sintaxă și limite','Method, syntax and limitations');
      let html=select('lang','Limba noilor controale','New controls language',[['ro','Română','Romanian'],['en','Engleză','English']]);
      if(id==='L04')html+=select('preset','Experiment','Experiment',[['segment','Distanță scurtă','Short distance'],['polyline','Polilinie','Polyline'],['polygon','Poligon neregulat','Irregular polygon'],['hole','Poligon cu gaură','Polygon with hole'],['north','Aceeași diferență unghiulară la 55° N','Same angular difference at 55° N']])+select('a','CRS A','CRS A',root.CARTO_MEASUREMENT.codes.map(c=>[c,c]))+select('b','CRS B','CRS B',root.CARTO_MEASUREMENT.codes.map(c=>[c,c]))+select('mode','Comparație','Comparison',[['side','Alăturat','Side by side'],['toggle','Comutare','Toggle']])+select('active','Vedere în comutare','Toggle view',[['A','A'],['B','B']])+area('geometry','Editor: geometrie lon/lat JSON','Editor: lon/lat geometry JSON',JSON.stringify(state.geometry));
      if(id==='L09')html+=select('type','Tip geometrie','Geometry type',[['Point','Puncte','Points'],['LineString','Linii','Lines'],['Polygon','Poligoane','Polygons']])+select('rule','Regulă QGIS','QGIS rule',root.CARTO_TOPOLOGY_RULES.rules.filter(r=>r.types.includes(state.type)).map(r=>[r.id,r.name]))+select('variant','Exemplu controlat','Controlled example',[['valid','Conform','Valid'],['problem','Cu defect','Defective'],['custom','Scenă editată','Edited scene']])+area('scene','Editor: scenă JSON (target / reference)','Editor: scene JSON (target / reference)',JSON.stringify(state.scene));
      if(id==='L20')html+=select('mode','Calculator','Calculator',[['raster','Raster Calculator'],['field','Field Calculator']])+select('preset','Experiment','Experiment',exercises[state.mode].map(([v,,ro,en])=>[v,ro,en]))+(state.mode==='raster'?select('source','Raster sursă afișat','Displayed source raster',Object.keys(root.CARTO_CALCULATOR.bands).map(k=>[k,k])):'')+area('expression','Expresie','Expression',state.expression);
      controls.innerHTML=html;actions.innerHTML=button('apply',id==='L09'?'Rulează regula':id==='L20'?'Calculează':'Aplică geometria',id==='L09'?'Run rule':id==='L20'?'Calculate':'Apply geometry')+(id==='L09'?button('repair','Restabilește exemplul conform','Restore valid example'):'')+button('reset','Resetează','Reset')+button('share','Păstrează parametrii în URL','Keep parameters in URL');
      if(id==='L04')measurements();else if(id==='L09')topology();else calculator();error.textContent='';status.textContent=t('Calcul actualizat.','Calculation updated.');if(focused)controls.querySelector('[data-key="'+focused+'"]')?.focus();
    }
    function failure(e,node){if(node)node.setAttribute('aria-invalid','true');error.textContent=t('Nu s-a aplicat schimbarea; rezultatul valid anterior este păstrat. ','Change not applied; previous valid result retained. ')+(errors[e.code]?t(...errors[e.code]):String(e.message));status.textContent='';}
    on(controls,'change',event=>{
      const key=event.target.dataset.key;if(!key||['expression','geometry','scene'].includes(key))return;let next={...state,[key]:event.target.value};
      if(id==='L04'&&key==='preset')next.geometry=clone(root.CARTO_MEASUREMENT.presets[next.preset]);
      if(id==='L09'&&['type','rule','variant'].includes(key)){if(key==='type')next.rule=root.CARTO_TOPOLOGY_RULES.rules.find(r=>r.types.includes(next.type)).id;if(key!=='variant'&&next.variant==='custom')next.variant='valid';if(next.variant!=='custom')next.scene=root.CARTO_TOPOLOGY_RULES.p02Fixture(next.type,next.rule,next.variant);}
      if(id==='L20'&&['mode','preset'].includes(key)){if(key==='mode')next.preset=exercises[next.mode][0][0];next.expression=exercises[next.mode].find(x=>x[0]===next.preset)[1];}
      try{const checked=validate(id,next);if(id==='L20'){const a=E.compile(checked.expression);root.CARTO_CALCULATOR[checked.mode==='raster'?'rasterValues':'fieldValues'](a);}state=checked;render();}catch(e){failure(e,event.target);}
    });
    on(actions,'click',event=>{
      const action=event.target.dataset.action;if(!action)return;try{
        if(action==='share'){if(JSON.stringify({v:1,state}).length>2048)throw Error(t('Geometria este prea lungă pentru contractul URL.','Geometry exceeds the URL state limit.'));history.replaceState(null,'',U.url(location.href,id,state));status.textContent=t('Parametrii validați sunt în URL.','Validated parameters are in the URL.');return;}
        let next=clone(state);if(action==='reset'){next=clone(defaults[id]);const u=new URL(location.href);u.searchParams.delete(id);history.replaceState(null,'',u);}
        if(action==='repair')next.scene=root.CARTO_TOPOLOGY_RULES.p02Fixture(next.type,next.rule,'valid'),next.variant='valid';
        if(action==='apply'){const key=id==='L04'?'geometry':id==='L09'?'scene':'expression',node=controls.querySelector('[data-key='+key+']');if(node.value.length>16384)throw Error('Editor input exceeds 16384 characters');next[key]=id==='L20'?node.value:JSON.parse(node.value);if(id==='L09')next.variant='custom';}
        const checked=validate(id,next);if(id==='L20'){const a=E.compile(checked.expression);root.CARTO_CALCULATOR[checked.mode==='raster'?'rasterValues':'fieldValues'](a);}state=checked;render();actions.querySelector('[data-action='+action+']')?.focus();
      }catch(e){failure(e,controls.querySelector('textarea'));}
    });
    const selection=event=>{const n=event.target.closest('[data-pixel],[data-feature]');if(!n)return;if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;if(event.type==='keydown')event.preventDefault();if(n.dataset.pixel!==undefined)state.pixel=Number(n.dataset.pixel);if(n.dataset.feature)state.feature=n.dataset.feature;const wasMap=n.tagName.toLowerCase()==='path';render();results.querySelector(n.dataset.feature?(wasMap?'svg ':'table ')+'[data-feature="'+state.feature+'"]':'[data-pixel="'+state.pixel+'"]')?.focus();};
    on(results,'click',selection);on(results,'keydown',selection);
    on(root,'popstate',()=>{try{state=validate(id,U.read(location.search,id,defaults[id],s=>validate(id,s)));render();}catch(e){failure(e);}});
    on(root,'pagehide',event=>{if(!event.persisted){life.abort();compare?.destroy();}});
    render();host.hidden=false;section.querySelector('.p02-fallback').hidden=true;controllers[id]={getState:()=>clone(state),getResult:()=>last};
  }
  for(const section of document.querySelectorAll('[data-p02-lab]'))try{mount(section.dataset.p02Lab,section);}catch(e){section.querySelector('.p02-interactive').hidden=true;section.querySelector('.p02-fallback').textContent='Experiment indisponibil / Experiment unavailable: '+e.message;}
  root.CARTO_P02={controllers,validate,exercises};
})(window);
