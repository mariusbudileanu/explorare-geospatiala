/* Native-grid workbench adapter. L20 owns expression parsing/evaluation; GISRaster
 * owns Horn and affine area. No I/O, no implicit reprojection/resampling. */
(function(root){
  'use strict';
  const E=root.CARTO_EXPRESSION,C=root.CARTO_CALCULATOR;
  function compatible(inputs){
    const entries=Object.entries(inputs),base=entries[0]?.[1];if(!base)throw Error('missing-band');
    const shape=g=>g&&Number.isInteger(g.width)&&Number.isInteger(g.height)&&g.width>0&&g.height>0&&g.width*g.height<=1000000&&g.values?.length===g.width*g.height&&g.mask?.length===g.values.length&&g.affine?.length===6&&g.affine.every(Number.isFinite)&&typeof g.crs==='string'&&['Float32','Float64','Byte','UInt8','Int16'].includes(g.dataType)&&root.GISRaster.area(g.affine)>0;
    if(!shape(base))throw Error('invalid-grid');
    for(const [,g] of entries)if(!shape(g)||g.width!==base.width||g.height!==base.height||g.crs!==base.crs||g.affine.some((v,i)=>v!==base.affine[i]))throw Error('incompatible-grid');
    // The L20 adapter supports axis-aligned affine steps. Rotation is rejected.
    if(base.affine[2]!==0||base.affine[4]!==0)throw Error('rotated-grid');return base;
  }
  function expression(ast,inputs){
    const refs=E.references(ast),selected=Object.fromEntries((refs.length?refs:['DEM@1']).map(k=>{if(!inputs[k])throw Error('unknown-field: '+k);return [k,inputs[k]];})),base=compatible(selected),size=base.values.length,values=new Float64Array(size),mask=new Uint8Array(size),errorMask=new Uint8Array(size);let errorCount=0;
    const nodes=n=>!n||typeof n!=='object'?0:1+Object.values(n).reduce((s,v)=>s+(Array.isArray(v)?v.flat(Infinity).reduce((a,x)=>a+nodes(x),0):nodes(v)),0);
    if(nodes(ast)>40)throw Error('expression-complexity');
    for(let start=0;start<size;start+=512){const end=Math.min(size,start+512),bands={};
      for(const [k,g] of Object.entries(selected))bands[k]={width:end-start,height:1,crs:g.crs,origin:[0,0],step:[1,-1],values:Array.from(g.values.slice(start,end),(v,i)=>g.mask[start+i]?v:null)};
      const results=C.rasterValues(ast,bands).results;
      for(let i=0;i<results.length;i++){const r=results[i],at=start+i;if(r.kind==='value'&&(typeof r.value==='number'&&Number.isFinite(r.value)||typeof r.value==='boolean')){values[at]=Number(r.value);mask[at]=1;}else if(r.kind==='error'||r.kind==='value'){errorCount++;errorMask[at]=1;}}
    }
    return {...base,values,mask,dataType:'Float64',errorCount,errorMask};
  }
  function run(grid,metadata,request={}){
    const {source='dem',operation='threshold',threshold=500,slope=10,yearA=2013,yearB=2014,custom='"DEM@1" + 10'}=request;
    if(!['dem','forestLoss'].includes(source)||!Number.isFinite(threshold)||threshold<0||threshold>1500||!Number.isFinite(slope)||slope<0||slope>90||typeof custom!=='string'||custom.length>160)throw Error('invalid-parameter');
    compatible({source:grid});if(grid.crs!=='EPSG:3844'||metadata.rasters[source]?.coordinate_units!=='metre')throw Error('metric-grid-required');const inputs={},area=root.GISRaster.area(grid.affine);let formula,intermediates=[],yearCounts=null,units='0/1';
    if(source==='dem'){
      if(!['threshold','arithmetic','conditional','terrain','expression'].includes(operation))throw Error('invalid-operation');
      inputs['DEM@1']=grid;
      if(operation==='terrain'){const horn=root.GISRaster.horn(grid);inputs['SLOPE@1']={...grid,values:Float64Array.from(horn.values,x=>Number.isFinite(x)?x*180/Math.PI:0),mask:Uint8Array.from(horn.values,x=>Number.isFinite(x)?1:0),dataType:'Float64'};}
      formula=operation==='threshold'?`"DEM@1" >= ${threshold}`:operation==='arithmetic'?'"DEM@1" + 10':operation==='conditional'?`IF("DEM@1" >= ${threshold}, 1, 2)`:operation==='terrain'?`("DEM@1" >= ${threshold}) AND ("SLOPE@1" >= ${slope})`:custom;
      if(operation==='terrain')intermediates=[{name:'elevation-mask',grid:expression(E.compile(`"DEM@1" >= ${threshold}`),inputs)},{name:'slope-mask',grid:expression(E.compile(`"SLOPE@1" >= ${slope}`),inputs)}];
      units=operation==='arithmetic'?'m':operation==='expression'?'expression-defined':operation==='conditional'?'class 1/2':'0/1';
    }else{
      if(!['year','combined','comparison'].includes(operation)||!Number.isInteger(yearA)||!Number.isInteger(yearB))throw Error('invalid-operation');
      const spec=metadata.rasters.forestLoss;if(spec.semantic_nodata?.value!==0||spec.semantic_nodata.status!=='verified_dataset_definition')throw Error('unverified-zero-semantics');
      const map=spec.value_to_year;if(map.status!=='verified_dataset_definition')throw Error('unverified-years');
      const code=y=>{const codes=Object.entries(map.mapping).filter(([,year])=>year===y).map(([k])=>Number(k));if(codes.length!==1)throw Error('unsupported-year');return codes[0];};
      const a=code(operation==='combined'?2013:yearA),b=code(operation==='combined'?2014:yearB),mask=Uint8Array.from(grid.mask,(valid,i)=>valid&&grid.values[i]!==0?1:0);
      for(let i=0;i<mask.length;i++)if(mask[i]&&!Object.hasOwn(map.mapping,grid.values[i]))throw Error('unmapped-year');
      inputs['LOSS@1']={...grid,mask};
      const left=expression(E.compile(`"LOSS@1" = ${a}`),inputs),right=expression(E.compile(`"LOSS@1" = ${b}`),inputs);intermediates=[{name:'year-'+map.mapping[a],grid:left},{name:'year-'+map.mapping[b],grid:right}];
      formula=operation==='year'?`"LOSS@1" = ${a}`:`("LOSS@1" = ${a}) OR ("LOSS@1" = ${b})`;
      yearCounts={a:{year:map.mapping[a],count:Array.from(left.values).reduce((s,v,i)=>s+(left.mask[i]&&v===1?1:0),0)},b:{year:map.mapping[b],count:Array.from(right.values).reduce((s,v,i)=>s+(right.mask[i]&&v===1?1:0),0)}};
    }
    const ast=E.compile(formula),output=expression(ast,inputs),summary=summarize(output,area);
    return {source,operation,grid,inputs,output,ast,formula,intermediates,summary,yearCounts,units,area};
  }
  function summarize(g,area){let valid=0,selected=0,min=null,max=null;for(let i=0;i<g.values.length;i++)if(g.mask[i]){valid++;const v=g.values[i];if(v===1)selected++;min=min===null?v:Math.min(min,v);max=max===null?v:Math.max(max,v);}return {valid,nodata:g.values.length-valid-(g.errorCount||0),selected,selectedM2:selected*area,selectedHA:selected*area/10000,min,max,errors:g.errorCount||0};}
  function view(result,pixel=0){
    const {grid,inputs,output,ast}=result;if(!Number.isInteger(pixel)||pixel<0||pixel>=grid.values.length)throw Error('pixel-range');
    const cells=[];for(let r=0;r<12;r++)for(let c=0;c<16;c++)cells.push(Math.min(grid.height-1,Math.floor((r+.5)*grid.height/12))*grid.width+Math.min(grid.width-1,Math.floor((c+.5)*grid.width/16)));
    const at=(g,i)=>g.mask[i]?g.values[i]:null;
    let explain=E.evaluate(ast,k=>inputs[k].mask[pixel]?inputs[k].values[pixel]:E.NODATA);
    if(explain.kind==='value'&&typeof explain.value!=='number'&&typeof explain.value!=='boolean')explain={...explain,kind:'error',code:'raster-numeric-type'};
    const stages=result.intermediates.map(s=>({name:s.name,summary:summarize(s.grid,result.area),values:cells.map(i=>at(s.grid,i)),selectedValue:at(s.grid,pixel)}));
    return {source:result.source,operation:result.operation,formula:result.formula,summary:result.summary,units:result.units,pixelArea:result.area,yearCounts:result.yearCounts,shape:{width:grid.width,height:grid.height,crs:grid.crs,affine:grid.affine,dataType:grid.dataType},preview:{width:16,height:12,indices:cells,input:cells.map(i=>at(result.source==='forestLoss'?inputs['LOSS@1']:grid,i)),output:cells.map(i=>at(output,i)),errors:cells.map(i=>Boolean(output.errorMask?.[i]))},stages,inspect:{pixel,row:Math.floor(pixel/grid.width),col:pixel%grid.width,xy:root.GISRaster.world(grid.affine,pixel%grid.width+.5,Math.floor(pixel/grid.width)+.5),inputs:Object.fromEntries(Object.entries(inputs).map(([k,g])=>[k,at(g,pixel)])),output:at(output,pixel),explain},limits:'preview-nearest-at-native-centres; summaries-full-grid'};
  }
  root.CARTO_P04_RASTER={compatible,expression,run,view};
})(typeof self!=='undefined'?self:globalThis);
