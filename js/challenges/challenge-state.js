const root=new URL('../../',import.meta.url);
export function describeRasterLoad(state){
  const label=state.source==='dem'?'modelul altitudinal':'pierderea forestieră';
  if(state.status==='error')return `Încărcarea pentru ${label} a eșuat: ${state.error} Folosește Reîncearcă.`;
  if(state.status==='complete')return `${label}: descărcare completă; se pregătește grila raster.`;
  const size=n=>new Intl.NumberFormat('ro-RO',{maximumFractionDigits:2}).format(n/1000000)+' MB';
  return `Se descarcă ${label}${state.total?` — ${Math.min(100,Math.floor(state.loaded/state.total*100))}% (${size(state.loaded)} / ${size(state.total)})`:state.loaded?` — ${size(state.loaded)} transferați`:'…'}`;
}
export function createDataStore({timeoutMs=90000}={}) {
  const cache=new Map(),states=new Map(),listeners=new Set();
  const emit=state=>{states.set(state.source,state);for(const listener of listeners)listener(state);};
  const get=(path,binary=false,source)=>{
    const key=(binary?'binary:':'json:')+path;
    if(!cache.has(key))cache.set(key,(async()=>{
      const controller=binary?new AbortController():null;let timeout,timedOut=false,loaded=0,total=null,last=0;
      try{
        if(binary){emit({source,status:'loading',loaded,total});timeout=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);}
        // Revalidate release metadata/TIFFs; unchanged HTTP bodies remain browser-cached.
        const revalidate=binary||path.endsWith('challenge-data.json')||path.endsWith('raster_metadata.json');
        const response=await fetch(new URL(path,root),{...(controller?{signal:controller.signal}:{}),...(revalidate?{cache:'no-cache'}:{})});
        if(!response.ok)throw Error(`HTTP ${response.status}: datele nu au putut fi încărcate.`);
        if(!binary)return await response.json();
        const length=Number(response.headers.get('Content-Length'));total=length>0&&!response.headers.get('Content-Encoding')?length:null;
        let buffer;
        if(response.body?.getReader){
          const reader=response.body.getReader(),chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;chunks.push(value);loaded+=value.byteLength;const now=performance.now();if(now-last>200){emit({source,status:'loading',loaded,total});last=now;}}}finally{reader.releaseLock();}
          const bytes=new Uint8Array(loaded);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}buffer=bytes.buffer;
        }else {emit({source,status:'loading',loaded,total});buffer=await response.arrayBuffer();loaded=buffer.byteLength;}
        emit({source,status:'complete',loaded,total});return buffer;
      }catch(error){const failure=timedOut?Error(`Transferul a depășit ${timeoutMs/1000} s. Verifică conexiunea și reîncearcă.`):error;if(binary)emit({source,status:'error',loaded,total,error:failure.message});throw failure;}
      finally{clearTimeout(timeout);}
    })().catch(error=>{cache.delete(key);throw error;}));
    return cache.get(key);
  };
  return {
    subscribe(listener){listeners.add(listener);for(const state of states.values())listener(state);return ()=>listeners.delete(listener);},
    async discardRaster(source){const manifest=await this.manifest(),path=manifest.risca[source]?.file;if(path)cache.delete('binary:'+path);},
    config:()=>get('data/challenges/challenges.json'),manifest:()=>get('data/challenges/challenge-data.json'),
    async load(id,area='sector1',binary=false){const manifest=await this.manifest(),entry=manifest[area]?.[id];if(!entry?.file)throw Error('Setul nu este definit în registrul central.');return get(entry.file,binary,id);},
    async loadMany(ids,area='sector1'){return Object.fromEntries(await Promise.all(ids.map(async id=>[id,await this.load(id,area)])));}
  };
}
const key='explorare-gis-progress-v1';
export const progress={
  read(){try{const data=JSON.parse(localStorage.getItem(key));return Array.isArray(data)?data.filter(x=>/^[VR][1-6]$/.test(x)):[];}catch{return [];}},
  complete(id){const done=new Set(this.read());done.add(id);try{localStorage.setItem(key,JSON.stringify([...done]));}catch{}},
  reset(){try{localStorage.removeItem(key);}catch{}}
};
