export const rasterSources=id=>['R1','R2'].includes(id)?['dem']:id==='R6'?['dem','forestLoss']:['forestLoss'];
export function createRasterService(store){
  let worker,foundation,sequence=0;const jobs=new Map(),sources=new Map();
  function call(type,payload){const token=++sequence;return new Promise((resolve,reject)=>{jobs.set(token,{resolve,reject});worker.postMessage({token,type,payload});});}
  function startWorker(){
    if(worker)return;const instance=new Worker(new URL('raster-worker.js',import.meta.url));worker=instance;
    instance.onmessage=event=>{if(worker!==instance)return;const {token,result,error,code}=event.data,job=jobs.get(token);if(!job)return;jobs.delete(token);error?job.reject(Object.assign(Error(error),{code})):job.resolve(result);};
    instance.onerror=event=>{if(worker!==instance)return;event.preventDefault();for(const job of jobs.values())job.reject(Error(event.message||'Motorul raster nu a pornit.'));jobs.clear();sources.clear();instance.terminate();worker=null;};
  }
  async function common(){if(!foundation)foundation=Promise.all([store.load('rasterMetadata','risca'),store.load('boundary','risca')]).then(([metadata,boundary])=>({metadata,boundary,definition:window.CRS_ENGINE.byId['EPSG:3844'].proj4})).catch(error=>{foundation=null;throw error;});return foundation;}
  return {
    async prepare(required=['dem','forestLoss']){
      if(required.some(id=>!['dem','forestLoss'].includes(id))||!required.length)throw Error('Sursă raster necunoscută.');
      const context=await common();startWorker();
      await Promise.all(required.map(source=>{if(!sources.has(source))sources.set(source,store.load(source,'risca',true).then(buffer=>call('load',{source,buffer,...context})).catch(async error=>{sources.delete(source);if(error.code==='RASTER_DECODE')await store.discardRaster(source);throw error;}));return sources.get(source);}));
      return {metadata:context.metadata,boundary:context.boundary,summary:await call(required.length===2?'init':'summary')};
    },
    analyze:(id,params)=>call('analyze',{id,params}),render:payload=>call('render',payload),inspect:(x,y)=>call('inspect',{x,y}),samples:indices=>call('samples',indices)
  };
}
