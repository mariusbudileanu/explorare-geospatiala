'use strict';
importScripts('../vendor/turf.min.js','challenge-vector.js');
self.onmessage=event=>{
  const {token,id,data,config,params}=event.data;
  try {self.postMessage({token,result:self.GISVector.run(id,data,config,params)});}
  catch(error){self.postMessage({token,error:error.message||'Analiza nu a putut fi calculată.'});}
};
