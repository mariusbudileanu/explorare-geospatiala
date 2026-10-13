/* One active scene. All per-scene listeners are abortable; renderers belong to CARTO_COMPARE. */
(function(root){
  'use strict';
  const D=root.CARTO_DIAGNOSTICS,V=root.CARTO_DIAGNOSTIC_VIEW,P=root.CARTO_DIAGNOSTIC_CONTENT;
  const host=document.querySelector('#diag-interactive');if(!host)return;
  const $=id=>document.getElementById('diag-'+id),clone=value=>JSON.parse(JSON.stringify(value));
  const loaded=new Map();
  function script(path){if(!loaded.has(path))loaded.set(path,new Promise((resolve,reject)=>{const element=document.createElement('script');element.src=path;element.onload=resolve;element.onerror=()=>{loaded.delete(path);element.remove();reject(Error('Modul indisponibil: '+path));};document.head.append(element);}));return loaded.get(path);}
  const sources={projection:['data/crs-registry.js','js/vendor/proj4.js','js/crs-engine.js','js/vendor/geographiclib-geodesic.min.js','js/geodesic-adapter.js','js/projection-lab-engine.js','js/projection-view.js'],cartography:['data/styling-lab.js','data/labeling-lab.js','js/labeling-engine.js','js/styling-lab.js','js/classification-engine.js','data/cartography-scenes.js','js/cartography-view.js'],provenance:['js/data-source.js'],raster:['js/challenges/raster-engine.js','js/blend-compositor.js','data/raster-styling-lab.js','js/raster-styling-engine.js'],topology:['data/topology-lab.js','data/topology-rules.js','js/topology-engine.js','js/topology-rule-engine.js','js/topology-scene.js'],blending:['js/blend-compositor.js']};
  const categories={projection:['projection'],assignment:['projection'],classification:['cartography'],design:['cartography'],symbols:['cartography'],clip:[],overlay:['cartography'],provenance:['provenance'],raster:['raster'],resampling:['raster'],topology:['topology'],blending:['blending']};
  let compare=null,scene=null,scope=null,state=null,token=0,dead=false;const lifetime=new AbortController();
  function teardown(){scope?.abort();scope=null;compare?.destroy();compare=null;$('active').replaceChildren();}
  function list(){const items=D.scenes.filter(s=>$('family').value==='all'||s.family===$('family').value);$('select').innerHTML=items.map(s=>`<option value="${s.id}">${P.esc(s.title)}</option>`).join('');return items;}
  function selectItems(s){const items=list();if(!items.includes(s)){$('family').value='all';list();}$('select').value=s.id;}
  function controls(){const st=compare.getState();$('mode').value=st.mode;$('side').value=st.active;$('side').disabled=st.mode==='side';if($('shared'))$('shared').value=st.sharedLocation.join(',');}
  function semanticState(){if(!state||!compare)return null;const st=compare.getState();return {scenario:scene.id,views:clone(st.views),mode:st.mode,active:st.active,sharedLocation:[...st.sharedLocation],controls:{family:$('family').value,answer:$('active').querySelector('input[type=radio]:checked')?.value??null,book:$('book').value},context:clone(state.context)};}
  function selections(s){if(['raster','resampling'].includes(s.renderer))return Array.from({length:25},(_,i)=>[[i%5,Math.floor(i/5)],`Celula (${i%5}, ${Math.floor(i/5)})`]);if(s.renderer==='projection')return [[[26.106,44.432],'București'],[[26.055,44.465],'Al doilea punct în București']];if(s.renderer==='classification')return Array.from({length:24},(_,i)=>[[i+1,0],`Zona ${i+1}`]);if(s.renderer==='symbols')return Array.from({length:4},(_,i)=>[[i+1,0],`Simbolul ${i+1}`]);return [];}
  async function activate(id,{snapshot,focus=false,hash=true}={}){
    const next=D.scenes.find(s=>s.id===id);if(!next||dead)return false;const current=++token;teardown();scene=next;state=clone(snapshot||D.snapshot(next));selectItems(next);$('book').value=state.controls.book;$('status').textContent='Se pregătește scena…';
    try{
      for(const group of categories[next.renderer])for(const file of sources[group]){await script(file);if(current!==token||dead)return false;}
      scope=new AbortController();const signal=scope.signal,choices=selections(next);const bind=(id,event,fn)=>$(id).addEventListener(event,fn,{signal});
      $('active').innerHTML=`<h3 id="diag-active-title" class="diag-active-heading" tabindex="-1">${P.esc(next.title)}</h3><p class="diag-type">${P.esc(next.family)} · ${P.esc(next.type)}</p><div class="carto-controls"><label for="diag-mode">Comparație<select id="diag-mode"><option value="side">A și B alăturat</option><option value="toggle">O vedere: A / B</option></select></label><label for="diag-side">Vedere activă<select id="diag-side"><option>A</option><option>B</option></select></label>${choices.length?`<label for="diag-shared">${next.renderer==='projection'?'Punct geografic comun':'Obiect / celulă comună'}<select id="diag-shared">${choices.map(([p,label])=>`<option value="${p.join(',')}">${P.esc(label)}</option>`).join('')}</select></label>`:''}</div><div id="diag-views" class="carto-views">${V.panel('A')+V.panel('B')}</div>${root.CARTO_LEARNING_UI.form(next.question)}${P.explanation(next)}`;
      const context={scene:next.id};if(next.renderer==='projection'){context.geometry=root.CARTO_PROJECTION_LAB_ENGINE.geometry([26.106,44.432],10);context.type='polygon';}
      compare=root.CARTO_COMPARE.create({container:$('views'),panels:{A:$('panel-A'),B:$('panel-B')},adapters:{A:V.create(next,p=>p&&compare?.setSharedLocation(p)),B:V.create(next,p=>p&&compare?.setSharedLocation(p))},initial:{...state,context}});
      root.CARTO_LEARNING_UI.bindChecks($('active'),[next.question],{signal});
      bind('mode','change',()=>{compare.update({mode:$('mode').value});controls();});bind('side','change',()=>compare.update({active:$('side').value}));
      if(choices.length)bind('shared','change',()=>compare.setSharedLocation($('shared').value.split(',').map(Number)));
      controls();$('status').textContent=`${D.scenes.indexOf(next)+1} din ${D.scenes.length} · ${next.type}. B este o posibilă intervenție.`;
      const filtered=D.scenes.filter(s=>$('family').value==='all'||s.family===$('family').value);$('prev').disabled=filtered.indexOf(next)===0;$('next').disabled=filtered.indexOf(next)===filtered.length-1;
      $('notice').hidden=true;$('text').hidden=true;host.hidden=false;
      if(hash&&location.hash!=='#'+next.anchor)history.pushState(null,'','#'+next.anchor);
      if(focus){$('active-title').focus({preventScroll:true});$('active-title').scrollIntoView({block:'start',behavior:'instant'});}
      return true;
    }catch(error){if(current!==token)return false;teardown();$('status').textContent='La această activare interactivitatea nu este disponibilă. Consultă explicațiile de mai jos.';$('text').hidden=false;$('notice').hidden=false;host.hidden=false;return false;}
  }
  const bind=(id,event,fn)=>$(id).addEventListener(event,fn,{signal:lifetime.signal});
  bind('family','change',()=>{const selected=list()[0];if(selected)activate(selected.id,{focus:true});});bind('select','change',()=>activate($('select').value,{focus:true}));
  for(const [id,step] of [['prev',-1],['next',1]])bind(id,'click',()=>{const items=D.scenes.filter(s=>$('family').value==='all'||s.family===$('family').value),s=items[items.indexOf(scene)+step];if(s)activate(s.id,{focus:true});});
  bind('reset','click',()=>activate(scene.id,{focus:true}));
  const book=()=>{const snapshot=D.books[$('book').value];if(snapshot){$('family').value=snapshot.controls.family;return activate(snapshot.scenario,{snapshot,focus:true});}return Promise.resolve(false);};
  bind('book','change',book);bind('book-apply','click',book);
  const fromHash=()=>{const s=D.scenes.find(s=>s.anchor===location.hash.slice(1));if(s)activate(s.id,{focus:true,hash:false});};
  root.addEventListener('hashchange',fromHash,{signal:lifetime.signal});
  function destroy(){dead=true;++token;teardown();lifetime.abort();host.hidden=true;$('text').hidden=false;$('notice').hidden=false;}
  root.addEventListener('pagehide',event=>{if(!event.persisted)destroy();},{signal:lifetime.signal});
  root.CARTO_MAP_DIAGNOSTICS={activate,applyBook:id=>{if(!D.books[id])return Promise.resolve(false);$('book').value=id;return book();},getState:semanticState,getMetrics:()=>compare?.getMetrics(),reset:()=>activate(scene.id),destroy};
  const initial=D.scenes.find(s=>s.anchor===location.hash.slice(1))||D.scenes[0];activate(initial.id,{hash:false,focus:!!location.hash});
})(window);
