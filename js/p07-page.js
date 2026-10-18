/* Native-page adapter. The original laboratory owns its calculations and visuals. */
(function () {
  'use strict';
  const id=document.body.dataset.p07Lab, app=document.querySelector('#p07-app');
  if(!id||!app)return;
  const main=document.querySelector('main'), langControl=document.querySelector('#p07-lang');
  const messages=window.CARTO_P07_MESSAGES, originals=new WeakMap(), attrs=new WeakMap();
  const defaults={lang:'ro',...(id==='L12'?{layout:'A',sc:'serie',var:'max_temp',lon:26.1025,lat:44.4268,data:'2026-10-15',an:2025,anot:'JJA',filtru:true,expl:0,cursa:false,adv:'C',th:-.62,ph:.52}:{world:'buc',scen:'oblic',seed:7,type:'projective'})};
  const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const phrases=new RegExp('(?<![\\p{L}\\p{N}_])(?:'+Object.keys(messages).filter(k=>k.length>=3).sort((a,b)=>b.length-a.length).map(escapeRE).join('|')+')(?![\\p{L}\\p{N}_])','gu');
  let lang='ro', observer, stopped=false, initialized=false;
  const abort=new AbortController(), on=(node,event,fn)=>node.addEventListener(event,fn,{signal:abort.signal});
  function translate(text){
    if(lang==='ro')return text;
    const trimmed=text.trim(), exact=messages[trimmed]||messages[trimmed.replace(/\s+/g,' ')];
    if(exact)return text.replace(trimmed,exact);
    let value=text;
    for(const [pattern,render]of window.CARTO_P07_PATTERNS||[])value=value.replace(pattern,render);
    return value.replace(phrases,match=>messages[match]);
  }

  function localize(){
    observer?.disconnect();for(const block of main.querySelectorAll('footer.site-footer,.learning-continuation'))block.lang='ro';
    const walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){
      if(node.parentElement.closest('script,style,.learning-continuation,footer.site-footer'))continue;
      const previous=originals.get(node), source=previous&&node.data===previous.last?previous.source:node.data;
      const last=translate(source);originals.set(node,{source,last});if(last!==node.data)node.data=last;
    }
    for(const element of main.querySelectorAll('[aria-label],[title],[placeholder]')){
      for(const key of ['aria-label','title','placeholder'])if(element.hasAttribute(key)){
        const cache=attrs.get(element)||{}, current=element.getAttribute(key), previous=cache[key];
        const source=previous&&current===previous.last?previous.source:current,last=translate(source);
        cache[key]={source,last};attrs.set(element,cache);if(current!==last)element.setAttribute(key,last);
      }
    }
    observer?.observe(main,{childList:true,subtree:true,characterData:true});
  }
  function status(text){document.querySelector('#p07-status').textContent=translate(text);}
  function validate(value){
    if(!value||typeof value!=='object')throw Error('Invalid state');
    const s={...defaults,lang:value.lang==='en'?'en':'ro'};
    const choose=(key,options)=>{if(value[key]!==undefined){if(!options.includes(value[key]))throw Error('Invalid '+key);s[key]=value[key];}};
    if(id==='L12'){
      choose('layout',['A','B','C']);choose('sc',['punct','harta','sezon','serie']);choose('var',['max_temp','min_temp','precipitation']);choose('anot',['DJF','MAM','JJA','SON']);choose('adv',['B','C']);if(value.cursa!==undefined){if(typeof value.cursa!=='boolean')throw Error('Invalid race');s.cursa=value.cursa;}
      for(const [key,lo,hi]of [['lon',-180,180],['lat',-90,90],['an',1962,2050],['expl',0,1],['th',-10000,10000],['ph',.05,1.45]])if(value[key]!==undefined){if(!Number.isFinite(value[key])||value[key]<lo||value[key]>hi||(key==='an'&&!Number.isInteger(value[key])))throw Error('Invalid '+key);s[key]=value[key];}
      if(value.data!==undefined){if(!/^\d{4}-\d{2}-\d{2}$/.test(value.data)||!Number.isFinite(Date.parse(value.data))||new Date(Date.parse(value.data)).toISOString().slice(0,10)!==value.data||value.data<'1961-01-01'||value.data>'2050-12-31')throw Error('Invalid date');s.data=value.data;}
      if(value.filtru!==undefined){if(typeof value.filtru!=='boolean')throw Error('Invalid filter');s.filtru=value.filtru;}
    }else{
      choose('world',['buc','delta']);choose('scen',['afin','scanner','hartie','oblic']);choose('type',['linear','helmert','poly1','projective','poly2','poly3','tps']);
      if(value.seed!==undefined){if(!Number.isInteger(value.seed)||value.seed<1||value.seed>9999)throw Error('Invalid seed');s.seed=value.seed;}
      if(value.points!==undefined){
        if(!Array.isArray(value.points)||value.points.length>100)throw Error('Invalid points');
        const ids=new Set();s.points=value.points.map((p,i)=>{
          if(!Array.isArray(p)||![6,7].includes(p.length)||!p.slice(0,2).every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)||!p.slice(2,4).every(v=>v===null||(Number.isFinite(v)&&Math.abs(v)<1e9))||![0,1].includes(p[4])||![0,1].includes(p[5]))throw Error('Invalid point');
          const sequence=p.length===7?p[6]:i+1;if(!Number.isSafeInteger(sequence)||sequence<1||sequence>=100000||ids.has(sequence))throw Error('Invalid point ID');ids.add(sequence);
          return {id:'P'+sequence,col:p[0],row:p[1],X:p[2],Y:p[3],role:p[4]?'check':'gcp',active:!!p[5]};
        });const next=Math.max(0,...ids)+1;s.nextNum=value.nextNum??next;if(!Number.isSafeInteger(s.nextNum)||s.nextNum<next||s.nextNum>100000)throw Error('Invalid point sequence');
      }
    }
    return s;
  }
  const canvases=new WeakSet();function canvas(c){if(canvases.has(c))return c;canvases.add(c);for(const name of ['fillText','strokeText']){const original=c[name].bind(c);c[name]=(text,...args)=>original(translate(String(text)),...args);}return c;}
  const api=()=>id==='L12'?window.CARTO_ZARR:window.CARTO_GEO;
  function setLanguage(value){lang=value==='en'?'en':'ro';langControl.value=lang;main.lang=lang;app.lang=lang;localize();if(initialized)api().refresh();}
  async function restore(){
    let invalid=false;const raw=new URLSearchParams(location.search).get(id);
    if(raw)try{if(raw.length>2048)throw Error();const parsed=JSON.parse(raw);if(parsed.v!==1)throw Error();validate(parsed.state);}catch{invalid=true;}
    const state=window.CARTO_V3.read(location.search,id,defaults,validate);setLanguage(state.lang);
    if(id==='L12')api().setState(state);else await api().restore(state);localize();
    if(invalid)status(lang==='en'?'Invalid URL state: default exercise restored.':'Stare URL nevalidă: exercițiul implicit a fost restaurat.');return invalid;
  }
  async function ready(){
    initialized=true;const invalid=await restore();app.inert=false;app.setAttribute('aria-busy','false');document.querySelector('.p07-controls').hidden=false;document.querySelector('#p07-fallback').hidden=true;if(!invalid)status(lang==='en'?'Offline laboratory ready.':'Laborator offline pregătit.');
    if(id==='L19'){
      on(document.querySelector('#kb-add'),'click',()=>{try{api().addPoint(+document.querySelector('#kb-col').value,+document.querySelector('#kb-row').value);document.querySelector('#ed-x').focus();}catch{status(lang==='en'?'Choose a pixel inside the scan.':'Alege un pixel din interiorul scanării.');}});
      on(document.querySelector('#kb-move'),'click',()=>{try{const selected=document.querySelector('#ed-title-h').textContent.match(/P\d+/)?.[0];if(!selected)throw Error();api().movePoint(selected,+document.querySelector('#kb-col').value,+document.querySelector('#kb-row').value);}catch{status(lang==='en'?'Select a point and valid scan pixels.':'Selectează un punct și pixeli valizi din scanare.');}});
      for(const canvas of app.querySelectorAll('canvas.view'))canvas.tabIndex=0;
      for(const tab of app.querySelectorAll('[role=tab]'))on(tab,'keydown',e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const tabs=[...app.querySelectorAll('[role=tab]')],next=tabs[(tabs.indexOf(tab)+1)%tabs.length];next.click();next.focus();}});
    }
  }
  window.CARTO_P07={get lang(){return lang;},translate,canvas,feedback:status,ready,error:e=>{if(stopped)return;console.error(e);if(!initialized)app.hidden=true;status(lang==='en'?'Laboratory could not start; use the method and recovery links above.':'Laboratorul nu a pornit; folosește metoda și navigarea de mai sus.');},validate,getState:()=>({...api()?.getState(),lang}),destroy(){if(stopped)return;stopped=true;abort.abort();observer?.disconnect();themeObserver.disconnect();api()?.destroy();}};
  observer=new MutationObserver(()=>localize());
  const themeObserver=new MutationObserver(()=>{if(initialized)api().refresh();});themeObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
  on(langControl,'change',()=>setLanguage(langControl.value));
  on(document.querySelector('#p07-reset'),'click',async()=>{await api().reset();const url=new URL(location.href);url.searchParams.delete(id);history.replaceState(null,'',url);status(lang==='en'?'Reset complete.':'Resetare completă.');});
  on(document.querySelector('#p07-share'),'click',()=>{
    const raw=api().getState(), packed={...raw};if(id==='L19'&&raw.points)packed.points=raw.points.map(p=>[p.col,p.row,p.X,p.Y,p.role==='check'?1:0,p.active?1:0,+p.id.slice(1)]);const state={...validate(packed),lang};
    if(id==='L19'&&raw.points)state.points=raw.points.map(p=>[p.col,p.row,p.X,p.Y,p.role==='check'?1:0,p.active?1:0,+p.id.slice(1)]);
    const url=window.CARTO_V3.url(location.href,id,state);
    if(url.searchParams.get(id).length>2048){status(lang==='en'?'Too many points for a bounded URL. Work remains saved in this browser.':'Prea multe puncte pentru URL. Lucrul rămâne salvat în acest browser.');return;}
    history.pushState(null,'',url);status(lang==='en'?'Current state is in the URL.':'Starea curentă este în URL.');
  });
  on(window,'popstate',()=>restore());on(window,'pagehide',e=>{if(!e.persisted)window.CARTO_P07.destroy();});
  localize();app.setAttribute('aria-busy','true');app.hidden=false;
  if(id==='L12')Promise.resolve().then(()=>{const asset=window.CARTO_DATA_SOURCE.create(window.CARTO_DATA_REGISTRY,new URL('.',location.href)).resolveDataAsset('anm-eocube-snapshot');if(new URL(asset.url).origin!==location.origin)throw Error('Offline snapshot must be local');return fetch(asset.url,{signal:abort.signal});}).then(r=>{if(!r.ok)throw Error('Local snapshot missing');return r.json();}).then(data=>{if(stopped)return;window.CARTO_ANM_SNAPSHOT=data;const script=document.createElement('script');script.src='js/p07-zarr.js';script.onload=()=>ready();script.onerror=()=>window.CARTO_P07.error(Error('Local script missing'));document.head.append(script);}).catch(window.CARTO_P07.error);
  else import('./georef/app.js').catch(window.CARTO_P07.error);
})();
