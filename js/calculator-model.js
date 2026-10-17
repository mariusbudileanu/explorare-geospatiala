/* Separate raster/attribute adapters for CARTO_EXPRESSION. No DOM, fetch or resampling.
 * Raster null cells resolve to NoData; field nulls resolve to NULL.
 * Output records are immutable calculations, not edits of the source fixtures.
 */
(function(root){
  'use strict';
  const E=root.CARTO_EXPRESSION;
  const raster=(values)=>({width:3,height:3,crs:'EPSG:3844',origin:[500000,300000],step:[30,-30],values});
  const bands={'DEM@1':raster([100,500,700,0,null,800,200,400,600]),'T1@1':raster([10,12,14,0,5,7,null,9,11]),'T2@1':raster([12,10,18,1,5,null,20,8,11]),'MASK@1':raster([1,1,0,1,1,0,1,null,1])};
  for(const [id,band] of Object.entries(bands))band.unit=id==='DEM@1'?'m':id==='MASK@1'?'0/1':'synthetic';
  const features=[
    {id:'A',populatie:1200,suprafata_km2:2,nume:'Valea',total:2400},
    {id:'B',populatie:800,suprafata_km2:0,nume:'Deal',total:2400},
    {id:'C',populatie:null,suprafata_km2:1,nume:'Lunca',total:2400},
    {id:'D',populatie:0,suprafata_km2:1,nume:'Sat',total:2400}
  ].map((f,i)=>({...f,geometry:{type:'Polygon',coordinates:[[[i*2200,0],[i*2200+2000,0],[i*2200+2000,1000],[i*2200,1000],[i*2200,0]]]}}));
  function rasterValues(ast,inputs=bands){
    const refs=E.references(ast);if(!refs.length)refs.push('DEM@1');
    const template=inputs[refs[0]];if(!template)throw new E.ExpressionError('unknown-field',refs[0]);
    const shape=r=>r&&Number.isInteger(r.width)&&r.width>0&&Number.isInteger(r.height)&&r.height>0&&r.width*r.height<=4096&&Array.isArray(r.values)&&r.values.length===r.width*r.height&&r.values.every(v=>v===null||typeof v==='number'&&Number.isFinite(v))&&typeof r.crs==='string'&&r.origin?.length===2&&r.step?.length===2&&[...r.origin,...r.step].every(Number.isFinite)&&r.step.every(x=>x!==0);
    if(!shape(template))throw new E.ExpressionError('incompatible-raster');
    for(const name of refs){const r=inputs[name];if(!r)throw new E.ExpressionError('unknown-field',name);if(!shape(r)||r.width!==template.width||r.height!==template.height||r.crs!==template.crs||r.origin.some((v,i)=>v!==template.origin[i])||r.step.some((v,i)=>v!==template.step[i]))throw new E.ExpressionError('incompatible-raster',name);}
    return {width:template.width,height:template.height,results:template.values.map((_,i)=>{
      const r=E.evaluate(ast,name=>inputs[name]?.values[i]===null?E.NODATA:inputs[name]?.values[i]);
      return r.kind==='null'?{...r,kind:'nodata',trace:[...r.trace,'Raster output: NULL → NoData mask']}:r;
    })};
  }
  function fieldValues(ast,rows=features){
    const refs=E.references(ast),allowed=['id','populatie','suprafata_km2','nume','total'];for(const name of refs)if(!allowed.includes(name))throw new E.ExpressionError('unknown-field',name);
    return rows.map(f=>({id:f.id,result:E.evaluate(ast,name=>f[name]===null?E.NULL:f[name])}));
  }
  root.CARTO_CALCULATOR={bands,features,rasterValues,fieldValues};
})(typeof window==='undefined'?globalThis:window);
