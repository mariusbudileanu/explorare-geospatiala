import {createDataStore,progress} from './challenge-state.js';
import {createChallengeMap} from './challenge-map.js';
import {renderCatalog,renderChallenge,renderCriteria,readParams,renderLegend,renderResult} from './challenge-ui.js';
import {createRasterService} from './raster-service.js';
import {rasterParams,syncRasterControls,renderPixel} from './raster-ui.js';
const $=id=>document.getElementById(id),store=createDataStore();
const rasters=createRasterService(store);
let config,active,data,map,worker,version=0,sequence=0,busy=false,hasResult=false,pending=new Map();
const status=text=>{$('challenge-status').textContent=text;};
function stopWorker(){const previous=worker;worker=null;if(previous){previous.onmessage=null;previous.onerror=null;previous.terminate();}for(const job of pending.values())job.reject(new Error('cancelled'));pending.clear();busy=false;}
function analyze(id,params){
  if(!worker){
    const instance=new Worker(new URL('challenge-worker.js',import.meta.url));worker=instance;
    instance.onmessage=event=>{if(worker!==instance)return;const {token,result,error}=event.data,job=pending.get(token);if(!job)return;pending.delete(token);error?job.reject(Error(error)):job.resolve(result);};
    instance.onerror=event=>{event.preventDefault();if(worker!==instance)return;for(const job of pending.values())job.reject(Error(event.message||'Motorul de analiză nu a pornit.'));pending.clear();instance.terminate();worker=null;};
  }
  const token=++sequence;return new Promise((resolve,reject)=>{pending.set(token,{resolve,reject});worker.postMessage({token,id,data,config,params});});
}
function mode(next){
  document.querySelectorAll('[data-map-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mapMode===next)));
  $('challenge-compare-controls').hidden=next!=='COMPARE';
  renderLegend(map.show(next,$('show-input').checked,$('show-result').checked));
}
function clearResult(){hasResult=false;$('challenge-results').hidden=true;document.querySelectorAll('[data-map-mode]').forEach(button=>button.disabled=button.dataset.mapMode!=='INPUT');mode('INPUT');}
async function select(id,{focus=false}={}) {
  const challenge=config.challenges.find(c=>c.id===id)||config.challenges[0],current=++version;
  if(busy)stopWorker();active=challenge;hasResult=false;
  $('challenge-run').disabled=true;$('challenge-reset').disabled=true;$('challenge-workspace').setAttribute('aria-busy','true');status('Se încarcă datele…');
  renderCatalog(config,progress.read(),active.id);
  try{
    const datasets=active.kind==='raster'?await rasters.prepare():await store.loadMany(active.datasets);if(current!==version)return;data=datasets;
    renderChallenge(active,config,data);renderLegend(active.kind==='raster'?map.setRasterInput(data,['R1','R2'].includes(active.id)?'dem':'forestLoss'):map.setInput(data));clearResult();
    $('challenge-fit').textContent=active.kind==='raster'?'Încadrează Rîșca':'Încadrează Sectorul 1';
    $('challenge-map').setAttribute('aria-label',`Hartă interactivă ${active.kind==='raster'?'Rîșca':'Sectorul 1'}; săgeți pentru deplasare, plus și minus pentru zoom`);
    $('raster-opacity').value='85';map.setOpacity(.85);$('raster-opacity-value').textContent='85%';$('raster-pixel-info').textContent='Deplasează cursorul sau apasă pe hartă pentru a inspecta pixelul.';
    if(id==='V6'){renderCriteria(config,'secondaryCare');$('challenge-source').addEventListener('change',()=>{renderCriteria(config,$('challenge-source').value);invalidate();});}
    $('challenge-controls').oninput=event=>{if(['raster-threshold','raster-threshold-slider'].includes(event.target.id)){syncRasterControls(event);invalidate();}};
    $('challenge-controls').onchange=event=>{if(active.kind==='raster'){const rerun=hasResult&&active.id==='R1'&&event.target.id==='raster-unit';syncRasterControls(event);if(rerun){run();return;}}if(event.target.id!=='challenge-source')invalidate();};
    $('challenge-run').disabled=false;$('challenge-reset').disabled=false;status('Datele sunt pregătite. Inspectează harta și alege metoda.');
    $('challenge-workspace').setAttribute('aria-busy','false');
    if(location.hash!==`#${active.id}`)history.replaceState(null,'',`#${active.id}`);
    if(focus)$('challenge-title').focus({preventScroll:true});
  }catch(error){if(current!==version)return;status(`Încărcare nereușită: ${error.message} Reîncarcă pagina pentru a încerca din nou.`);$('challenge-workspace').setAttribute('aria-busy','false');}
}
function invalidate(){if(busy){version++;stopWorker();$('challenge-run').disabled=false;$('challenge-reset').disabled=false;$('challenge-workspace').setAttribute('aria-busy','false');}clearResult();status('Parametrii s-au schimbat. Rulează din nou analiza.');}
async function run(){
  const method=$('challenge-methods').value;
  if(method!==active.correct_method){$('challenge-feedback').textContent=method?active.feedback:'Alege o metodă înainte de analiză.';$('challenge-methods').focus();return;}
  let params;try{params=active.kind==='raster'?rasterParams():readParams();}catch(error){status(error.message);return;}if(active.id==='V6'&&!params.criteria.length){status('Selectează cel puțin un criteriu medical.');document.querySelector('#challenge-criteria input')?.focus();return;}
  const current=version;busy=true;hasResult=false;clearResult();$('challenge-run').disabled=true;$('challenge-reset').disabled=false;$('challenge-workspace').setAttribute('aria-busy','true');$('challenge-feedback').textContent='Metoda este potrivită. Urmărește rezultatul și limitele sale.';
  status(active.id==='V4'?'Se reunesc 267 de buffere și se intersectează gridul. Calculul poate dura câteva zeci de secunde…':'Se calculează analiza pe datele încărcate…');
  try{
    const output=active.kind==='raster'?await rasters.analyze(active.id,params):await analyze(active.id,params);if(current!==version)return;
    renderResult(output,active.id);renderLegend(map.setResult(output));hasResult=true;
    document.querySelectorAll('[data-map-mode]').forEach(button=>button.disabled=false);mode('RESULT');
    progress.complete(active.id);renderCatalog(config,progress.read(),active.id);status('Analiza s-a încheiat. Rezultatul este pe hartă și în panoul numeric. Citește interpretarea.');
  }catch(error){if(current!==version||error.message==='cancelled')return;status(`Analiza nu a reușit: ${error.message}`);}
  finally{if(current===version){busy=false;$('challenge-run').disabled=false;$('challenge-workspace').setAttribute('aria-busy','false');}}
}
async function init(){
  try{
    config=await store.config();map=createChallengeMap($('challenge-map'),config,rasters,renderPixel,error=>status(`Afișarea rasterului nu a reușit: ${error.message}`));
    $('raster-opacity').addEventListener('input',()=>{map.setOpacity(Number($('raster-opacity').value)/100);$('raster-opacity-value').textContent=$('raster-opacity').value+'%';});
    $('raster-inspect-centre').addEventListener('click',()=>map.inspectCentre());
    $('challenge-catalog').addEventListener('click',event=>{const button=event.target.closest('[data-challenge]');if(button)select(button.dataset.challenge,{focus:true});});
    $('challenge-run').addEventListener('click',run);$('challenge-reset').addEventListener('click',()=>select(active.id));
    $('reset-challenge-progress').addEventListener('click',()=>{progress.reset();renderCatalog(config,[],active.id);status('Progresul local a fost șters. Toate provocările rămân disponibile.');});
    $('challenge-methods').addEventListener('change',()=>{$('challenge-feedback').textContent=$('challenge-methods').value===active.correct_method?'Metoda este potrivită. Poți rula analiza.':$('challenge-methods').value?active.feedback:'';});
    document.querySelectorAll('[data-map-mode]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.mapMode==='INPUT'||hasResult)mode(button.dataset.mapMode);}));
    for(const id of ['show-input','show-result'])$(id).addEventListener('change',()=>mode('COMPARE'));
    $('challenge-fit').addEventListener('click',()=>map.fit());
    new ResizeObserver(()=>map.resize()).observe($('challenge-map'));
    addEventListener('hashchange',()=>{if(location.hash.slice(1)!==active?.id)select(location.hash.slice(1));});
    await select(location.hash.slice(1)||'V1');
  }catch(error){status(`Pagina nu a pornit: ${error.message} Folosește site-ul prin HTTP și reîncarcă pagina.`);}
}
init();
