/* Resolve descriptors already held by the public data registry; never fetch here. */
(function(root){
  'use strict';
  function create(registry,baseURL){
    const base=new URL(baseURL);
    return {resolveDataAsset(id,{asset}={}){
      const metadata=registry.datasets.find(d=>d.id===id);if(!metadata)throw Error('Dataset necunoscut: '+id);
      const candidates=(metadata.interactive_subsets||[]).filter(s=>!asset||s.id===asset||s.name===asset);
      if(candidates.length!==1)throw Error('Selectează un subset documentat fără ambiguitate.');
      const descriptor=candidates[0];const path=descriptor.file;
      if(typeof path!=='string'||!path.trim()||path.includes('\\')||path.split('/').includes('..'))throw Error('Adresă de date invalidă.');
      const url=new URL(path,base);if(!['https:','http:','file:'].includes(url.protocol)||url.username||url.password||(/^https?:/.test(path)&&url.protocol!=='https:'))throw Error('Protocol de date invalid.');
      return {id,url:url.href,metadata,asset:descriptor};
    }};
  }
  root.CARTO_DATA_SOURCE={create};
})(window);
