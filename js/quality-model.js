/* Controlled synthetic pairs, not reconstructions of undocumented dataset history. */
(function(root){
  'use strict';
  const field=(status,value)=>({status,value});
  const base=()=>({source:field('known','Synthetic observatory'),observed:field('known','2021-07-15'),published:field('known','2022-02-01'),crs:field('known','EPSG:3844'),coverage:field('known','2 km × 2 km'),resolution:field('known',30),license:field('known','CC BY 4.0 · synthetic fixture'),lineage:field('known','Original synthetic observations'),values:[0,12,null,8]});
  function pair(scenario,{history=true,metadata='known',zero=false}={}){
    if(!['resolution','lineage','missing','dates'].includes(scenario)||!['known','missing','unknown','invalid'].includes(metadata)||typeof history!=='boolean'||typeof zero!=='boolean')throw Error('scenario');
    const source=base(),derived=base();
    if(scenario==='resolution'){derived.resolution=field('known',5);derived.lineage=field('known','Bilinear resampling: 30 m → 5 m');}
    if(scenario==='lineage'){derived.crs=field('known','EPSG:4326');derived.resolution=field('unknown',null);derived.lineage=history?field('known','Reprojected EPSG:3844 → EPSG:4326; source retained'):field('missing',null);}
    if(scenario==='missing'){derived.values=zero?[0,12,0,8]:[0,12,null,8];derived.lineage=field('known',zero?'NULL replaced with 0 (unsupported imputation)':'NULL preserved');}
    if(scenario==='dates')derived.published=field('known','2026-10-01');
    derived.license=metadata==='known'?base().license:field(metadata,metadata==='invalid'?'not-a-license':null);
    return {source,derived};
  }
  function diagnose(scenario,options){const p=pair(scenario,options);return {...p,findings:[scenario==='resolution'?'resolution':scenario==='lineage'?(options.history?'documented':'undocumented'):scenario==='missing'?(options.zero?'imputed':'preserved'):'dates',p.derived.license.status]};}
  root.CARTO_QUALITY={pair,diagnose,statuses:['known','missing','unknown','invalid']};
})(typeof window==='undefined'?globalThis:window);
