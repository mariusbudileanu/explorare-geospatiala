export function createRasterService(store){
  let worker,promise,sequence=0;const jobs=new Map();
  function call(type,payload){
    const token=++sequence;return new Promise((resolve,reject)=>{jobs.set(token,{resolve,reject});worker.postMessage({token,type,payload});});
  }
  return {
    async prepare(){
      if(!promise)promise=(async()=>{
        worker=new Worker(new URL('raster-worker.js',import.meta.url));
        worker.onmessage=event=>{const {token,result,error}=event.data,job=jobs.get(token);if(!job)return;jobs.delete(token);error?job.reject(Error(error)):job.resolve(result);};
        worker.onerror=event=>{event.preventDefault();for(const job of jobs.values())job.reject(Error(event.message||'Motorul raster nu a pornit.'));jobs.clear();worker.terminate();promise=null;};
        const [metadata,boundary,dem,forest]=await Promise.all([store.load('rasterMetadata','risca'),store.load('boundary','risca'),store.load('dem','risca',true),store.load('forestLoss','risca',true)]);
        const definition=window.CRS_ENGINE.byId['EPSG:3844'].proj4;
        const summary=await call('init',{metadata,boundary,dem,forest,definition});return {metadata,boundary,summary};
      })().catch(error=>{worker?.terminate();promise=null;throw error;});
      return promise;
    },
    analyze:(id,params)=>call('analyze',{id,params}),
    render:payload=>call('render',payload),inspect:(x,y)=>call('inspect',{x,y}),samples:indices=>call('samples',indices)
  };
}
