/* Bounded P03 adapters. Existing classification, Horn, lighting, geometry and
 * expression engines remain authoritative. All fixtures here are synthetic. */
(function(root){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
  function requireValue(test){if(!test)throw Error('Invalid parameter / Parametru invalid');}
  const scale={
    convert(value,denominator,direction='ground'){
      requireValue(finite(value,0,1e8)&&finite(denominator,1000,1000000)&&['ground','map'].includes(direction));
      // ground: metres -> map millimetres; map: millimetres -> ground metres.
      return direction==='ground'?value*1000/denominator:value*denominator/1000;
    },
    print(denominator,widthMM,dpi){
      requireValue(finite(denominator,1000,1000000)&&finite(widthMM,10,1000)&&finite(dpi,36,1200));
      return {pixels:Math.round(widthMM/25.4*dpi),pixelMM:25.4/dpi,groundPixelM:25.4/dpi*denominator/1000,extentM:widthMM*denominator/1000};
    },
    surface:Array.from({length:144},(_,i)=>{const x=i%12,y=Math.floor(i/12);return 100+2*x+3*y+((x===5&&y===5)?80:0);}),
    grid(factor,method='mean'){
      requireValue([1,2,3,4,6].includes(factor)&&['mean','nearest'].includes(method));
      const size=12/factor,values=[];
      for(let y=0;y<12;y+=factor)for(let x=0;x<12;x+=factor){
        const block=[];for(let r=0;r<factor;r++)for(let c=0;c<factor;c++)block.push(scale.surface[(y+r)*12+x+c]);
        values.push(method==='mean'?block.reduce((a,b)=>a+b,0)/block.length:scale.surface[(y+Math.floor(factor/2))*12+x+Math.floor(factor/2)]);
      }
      return {size,cellM:10*factor,count:values.length,values};
    },
    // Fixed source geometry: display extent and selection change, not vertices.
    features:Array.from({length:16},(_,i)=>({id:i+1,x:(i%4-1.5)*220,y:(Math.floor(i/4)-1.5)*220,width:20+(i%4)*30}))
  };
  const distributions={uniform:[10,20,30,40,50,60,70,80,90,100,110,null],skew:[1,1,2,2,3,3,4,6,9,20,60,null],outlier:[10,12,14,16,18,20,22,24,26,28,1000,null],ties:[5,5,5,5,10,10,10,20,20,20,20,null],constant:Array(12).fill(7),rate:[10,20,30,40,50,60,70,80,90,100,110,null]};
  const denominators=[100,100,200,100,500,100,1000,200,100,1000,100,0];
  function classification(values,method,k,rate=false){
    requireValue(Array.isArray(values)&&values.length===12&&values.every(v=>v===null||finite(v,-1e6,1e6))&&['equal','quantile','jenks'].includes(method)&&Number.isInteger(k)&&k>=1&&k<=7&&typeof rate==='boolean');
    return root.CARTO_CLASSIFY.classify(values,{method,classes:k,denominators:rate?denominators:null,scale:rate?1000:1});
  }
  function terrainGrid(scene='plane',zFactor=1,hole=false){
    requireValue(['plane','hill','flat','categories'].includes(scene)&&finite(zFactor,.1,5)&&typeof hole==='boolean');
    const width=7,height=7,values=Array.from({length:49},(_,i)=>{const x=i%7,y=Math.floor(i/7);return scene==='categories'?1+(x>3?1:0):zFactor*(scene==='flat'?100:scene==='plane'?100+3*x-6*y:100+80*Math.exp(-((x-3)**2+(y-3)**2)/4));});
    const mask=new Uint8Array(49).fill(1);if(hole)mask[24]=0;
    return {width,height,values:Float64Array.from(values),mask,affine:[0,30,0,210,0,-30],nodata:null};
  }
  function terrain(scene,zFactor,hole,azimuth=315,altitude=45){
    requireValue(finite(azimuth,0,360)&&finite(altitude,0,90));
    const grid=terrainGrid(scene,zFactor,hole);
    // Category codes have no physical gradient, including in the programmatic API.
    if(scene==='categories')return {grid,gradients:null,degrees:Array(49).fill(null),percent:Array(49).fill(null),aspect:Array(49).fill(null),shade:Array(49).fill(null)};
    const g=root.GISRaster.horn(grid,true),aspect=[],shade=[],degrees=[],percent=[];
    for(let i=0;i<49;i++){
      const gx=g.east[i],gy=g.north[i],valid=Number.isFinite(g.values[i]);
      degrees.push(valid?g.values[i]*180/Math.PI:null);percent.push(valid?Math.tan(g.values[i])*100:null);
      aspect.push(!valid||Math.hypot(gx,gy)<1e-12?null:(Math.atan2(-gx,-gy)*180/Math.PI+360)%360);
      shade.push(valid?root.CARTO_RASTER_STYLE_ENGINE.illumination(gx,gy,azimuth,altitude):null);
    }
    return {grid,gradients:g,degrees,percent,aspect,shade};
  }
  function resample(grid,method='nearest',categorical=false){
    requireValue(['nearest','bilinear'].includes(method)&&(!categorical||method==='nearest'));
    requireValue(grid?.width===7&&grid?.height===7&&grid.values?.length===49&&grid.mask?.length===49&&JSON.stringify(grid.affine)==='[0,30,0,210,0,-30]');
    const values=Array.from(grid.values,(v,i)=>grid.mask[i]?v:NaN),out=[];
    // 12x12 output, spanning the same 210m square. Strict 4-centre bilinear support.
    for(let r=0;r<12;r++)for(let c=0;c<12;c++){
      const x=(c+.5)*210/12,y=210-(r+.5)*210/12;
      if(method==='bilinear'){const v=root.GISRaster.bilinear(grid,values,x,y);out.push(Number.isFinite(v)?v:null);}
      else {const [u,v]=root.GISRaster.cell(grid.affine,x,y),i=Math.floor(v)*7+Math.floor(u);out.push(grid.mask[i]?grid.values[i]:null);}
    }
    return out;
  }
  const rectangle=(id,x,y,w,h,properties={})=>({id,type:'Polygon',coordinates:[[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]],properties});
  const vectorScenes={
    normal:{polygons:[rectangle('A',26,44,.02,.02,{population:100,category:'a'}),rectangle('B',26.015,44.005,.02,.02,{population:null,category:'b'})],boundary:rectangle('Z',26.01,43.995,.02,.025),points:[{id:'P1',type:'Point',coordinates:[26.005,44.01],properties:{value:10}},{id:'P2',type:'Point',coordinates:[26.02,44.01],properties:{value:null}},{id:'P3',type:'Point',coordinates:[26.01,44.02],properties:{value:30}}]},
    empty:{polygons:[rectangle('A',26,44,.01,.01,{population:100,category:'a'})],boundary:rectangle('Z',26.04,44.04,.01,.01),points:[{id:'P1',type:'Point',coordinates:[26,44],properties:{}}]},
    touch:{polygons:[rectangle('A',26,44,.01,.01,{population:100})],boundary:rectangle('Z',26.01,44,.01,.01),points:[{id:'P1',type:'Point',coordinates:[26.01,44.005],properties:{value:0}}]},
    multipart:{polygons:[{id:'M',type:'MultiPolygon',coordinates:[[[[26,44],[26.01,44],[26.01,44.01],[26,44.01],[26,44]]],[[[26.03,44],[26.04,44],[26.04,44.01],[26.03,44.01],[26.03,44]]]],properties:{population:200}}],boundary:rectangle('Z',26.005,43.995,.03,.02),points:[{id:'P1',type:'Point',coordinates:[26.007,44.007],properties:{value:10}}]},
    invalid:{polygons:[{id:'X',type:'Polygon',coordinates:[[26,44],[26.02,44.02],[26,44.02],[26.02,44],[26,44]],properties:{}}],boundary:rectangle('Z',26,44,.03,.03),points:[{id:'P1',type:'Point',coordinates:[26,44],properties:{}}]}
  };
  const operations=['attribute','spatial','buffer','clip','intersect','join','nearest','derive'];
  // Fixtures are immutable computational dependencies of cache keys.
  function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
  freeze(vectorScenes);freeze(scale.features);freeze(scale.surface);freeze(distributions);freeze(denominators);
  const cache=new Map();
  function vector({scene='normal',operation='clip',distance=500,predicate='inside',expression='"population" >= 100'}={}){
    requireValue(Object.hasOwn(vectorScenes,scene)&&operations.includes(operation)&&finite(distance,1,2000)&&['inside','covered'].includes(predicate)&&typeof expression==='string');
    const key=JSON.stringify([scene,operation,distance,predicate,expression]);if(cache.has(key))return copy(cache.get(key));
    const data=copy(vectorScenes[scene]),G=root.CARTO_TOPOLOGY_ENGINE.geometry,T=root.turf,E=root.CARTO_EXPRESSION;
    requireValue([...data.polygons,data.boundary,...data.points].every(f=>G.validity(f)));
    const geo=f=>({type:'Feature',properties:f.properties||{},geometry:{type:f.type,coordinates:f.type==='Polygon'?G.rings(f):f.coordinates}});
    const area=f=>f?T.area(geo(f)):0;
    const inside=(p,f)=>{const pos=G.position(p.coordinates,f);return predicate==='inside'?pos==='inside':pos!=='outside';};
    let output=[],unknown=0;
    const evaluate=(ast,f)=>{const r=E.evaluate(ast,k=>k==='area_m2'?area(f):Object.hasOwn(f.properties,k)?f.properties[k]===null?E.NULL:f.properties[k]:undefined);if(r.kind==='error')throw Error(r.code);return r;};
    if(operation==='attribute'||operation==='derive'){
      const ast=E.compile(expression);
      // Fail missing references, even when no record would otherwise be selected.
      for(const f of data.polygons){const result=evaluate(ast,f);if(operation==='attribute'){requireValue(result.kind!=='value'||typeof result.value==='boolean');if(root.GISVector.truth([result.kind==='value'?result.value:null],'AND')===true)output.push(f);else if(result.kind!=='value')unknown++;}else output.push({...f,properties:{...f.properties,derived:result.kind==='value'?result.value:null},trace:result.trace});}
    }else if(operation==='spatial')output=data.points.filter(p=>inside(p,data.boundary));
    else if(operation==='buffer')output=data.points.map(p=>{const f=T.circle(geo(p),distance/1000,{units:'kilometers',steps:64});return {id:p.id,type:f.geometry.type,coordinates:f.geometry.coordinates,properties:{radius_m:distance}};});
    else if(operation==='clip'||operation==='intersect')output=data.polygons.map(f=>{const g=G.overlay(f,data.boundary);return g?{...g,id:f.id,properties:{...f.properties,...(operation==='intersect'?{boundary_id:data.boundary.id}:{})}}:null;}).filter(Boolean);
    else if(operation==='join')output=data.polygons.map(f=>{const matched=data.points.filter(p=>inside(p,f)),known=matched.filter(p=>typeof p.properties.value==='number'&&Number.isFinite(p.properties.value));return {...f,properties:{...f.properties,point_count:matched.length,known_count:known.length,unknown_count:matched.length-known.length,sum_known:known.length?known.reduce((s,p)=>s+p.properties.value,0):null}};});
    else if(operation==='nearest')output=data.points.map(p=>{const choices=data.points.filter(q=>q.id!==p.id).map(q=>({id:q.id,distance_m:T.distance(geo(p),geo(q),{units:'meters'})})).sort((a,b)=>a.distance_m-b.distance_m||a.id.localeCompare(b.id));return {...p,properties:{...p.properties,nearest:choices[0]?.id??null,distance_m:choices[0]?.distance_m??null}};});
    const result={input:data,output,inputCount:['spatial','buffer','nearest'].includes(operation)?data.points.length:data.polygons.length,outputCount:output.length,excluded:operation==='attribute'?data.polygons.filter(f=>!output.some(o=>o.id===f.id)).map(f=>f.id):operation==='spatial'?data.points.filter(f=>!output.some(o=>o.id===f.id)).map(f=>f.id):[],unknown,inputArea:data.polygons.reduce((s,f)=>s+area(f),0),outputArea:output.filter(f=>f.type.includes('Polygon')).reduce((s,f)=>s+area(f),0)};
    if(cache.size>=16)cache.delete(cache.keys().next().value);cache.set(key,copy(result));return result;
  }
  root.CARTO_P03_MODEL={scale,distributions,denominators,classification,terrainGrid,terrain,resample,vector,vectorScenes,operations,cacheSize:()=>cache.size,copy};
})(typeof window==='undefined'?globalThis:window);
