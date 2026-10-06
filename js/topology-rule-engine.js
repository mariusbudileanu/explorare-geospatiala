/* Extension of the shared pure geometry engine for the supported teaching fixtures. */
(function(root){
  'use strict';
  const E=root.CARTO_TOPOLOGY_ENGINE,R=root.CARTO_TOPOLOGY_RULES;
  const parts=f=>f.type.startsWith('Multi')?f.coordinates.map(coordinates=>({...f,type:f.type.slice(5),coordinates})):[f];
  const vertices=f=>parts(f).flatMap(p=>p.type==='Point'?[p.coordinates]:p.coordinates);
  const endpoints=f=>parts(f).flatMap(p=>p.type==='LineString'?[p.coordinates[0],p.coordinates.at(-1)]:[]);
  const anchor=f=>vertices(f).find(p=>p?.every(Number.isFinite))||null;
  function validity(f){const g=f.coordinates;if(f.type.startsWith('Multi'))return parts(f).every(p=>validity(p));if(!vertices(f).every(p=>p?.length===2&&p.every(Number.isFinite)))return false;if(f.type==='Point')return g.length===2;if(f.type==='LineString')return g.length>=2&&g.some(p=>!E.same(p,g[0]));return E.polygonValidity(f).valid;}
  function equal(a,b){if(a.type!==b.type)return false;if(a.type==='Point')return E.same(a.coordinates,b.coordinates);if(a.type==='Polygon')return E.rectangle(a).every((v,i)=>v===E.rectangle(b)[i]);const A=a.coordinates,B=b.coordinates;return A.length===B.length&&(A.every((p,i)=>E.same(p,B[i]))||A.every((p,i)=>E.same(p,B[B.length-1-i])));}
  function covers(f,p){return parts(f).some(g=>g.type==='Point'?E.same(g.coordinates,p):g.type==='Polygon'?E.pointPosition(p,g.coordinates)!=='outside':g.coordinates.slice(1).some((b,i)=>E.onSegment(p,g.coordinates[i],b)));}
  function evaluate(scene){
    const {rule,target,reference=[],domain}=scene,errors=[];
    const add=(type,features,location,area=0)=>errors.push({type,affectedFeatureIds:features.map(f=>f.id),location,area});
    if(['covered','point-end','inside'].includes(rule))for(const f of target)if(!reference.some(r=>rule==='inside'?parts(r).some(p=>E.pointPosition(f.coordinates,p.coordinates)==='inside'):rule==='point-end'?endpoints(r).some(p=>E.same(p,f.coordinates)):covers(r,f.coordinates)))add(rule==='inside'?'point-outside':'endpoint-mismatch',[f],f.coordinates);
    if(rule==='line-end')for(const f of target)for(const p of endpoints(f))if(!reference.some(r=>covers(r,p)))add('endpoint-mismatch',[f],p);
    if(rule==='duplicates')for(let i=0;i<target.length;i++)for(let j=i+1;j<target.length;j++)if(equal(target[i],target[j]))add('duplicate',[target[i],target[j]],anchor(target[i]));
    if(rule==='invalid')for(const f of target)if(!validity(f))add('invalid-geometry',[f],f.type==='Polygon'?E.polygonValidity(f).location:anchor(f));
    if(rule==='multipart')for(const f of target)if(f.type.startsWith('Multi'))add('multipart',[f],anchor(f));
    if(rule==='dangles')for(const f of target)for(const p of endpoints(f))if(!target.some(g=>g.id!==f.id&&covers(g,p)))add('dangle',[f],p);
    if(rule==='pseudos'){const seen=[];for(const f of target)for(const p of endpoints(f)){const linked=target.filter(g=>endpoints(g).some(q=>E.same(p,q)));if(linked.length===2&&!seen.some(q=>E.same(p,q))){seen.push(p);add('pseudo-node',linked,p);}}}
    if(rule==='contain')for(const f of target)if(!reference.some(p=>E.pointPosition(p.coordinates,f.coordinates)==='inside'))add('missing-point',[f],E.ring(E.rectangle(f)));
    if(rule==='overlap'||rule==='overlap-with')for(let i=0;i<target.length;i++)for(const g of rule==='overlap-with'?reference:target.slice(i+1)){const hit=E.rectangleIntersection(E.rectangle(target[i]),E.rectangle(g));if(hit.area>0)add('overlap',[target[i],g],E.ring(hit.box),hit.area);}
    if(rule==='gaps'&&domain){const checks=E.introductionCheck({features:target,domain});for(const e of checks.errors.filter(e=>e.type==='gap')){const box=e.location,area=(box[1][0]-box[0][0])*(box[2][1]-box[1][1]);add('gap',target.filter(f=>E.rectangleIntersection(E.rectangle(f),[box[0][0],box[0][1],box[2][0],box[2][1]]).exists),e.location,area);}}
    return {valid:errors.length===0,rule,errors,affectedFeatureIds:[...new Set(errors.flatMap(e=>e.affectedFeatureIds))],area:errors.reduce((s,e)=>s+e.area,0)};
  }
  const bounds=f=>{const v=vertices(f);return [Math.min(...v.map(p=>p[0])),Math.min(...v.map(p=>p[1])),Math.max(...v.map(p=>p[0])),Math.max(...v.map(p=>p[1]))];};
  function validate(rules,extent='full',mode='all'){
    const data=R.checker,view=data.extents[mode==='all'?'full':extent],within=f=>E.rectangleIntersection(bounds(f),view).exists;
    return rules.filter(r=>r.enabled).flatMap(r=>{const layer=data.layers[r.layer],ref=data.layers[r.other],target=layer.features.filter(within),reference=(ref?.features||[]).filter(within),domain=layer.domain;
      return evaluate({rule:r.rule,target,reference,domain:r.rule==='gaps'&&domain&&domain[0]>=view[0]&&domain[2]<=view[2]?domain:undefined}).errors.map((error,i)=>({...error,id:r.id+'-'+i,ruleId:r.id,rule:r.rule,layer:r.layer,other:r.other}));});
  }
  Object.assign(E,{ruleChecks:{evaluate,validate,validity,equal,covers,parts,vertices,endpoints,anchor,bounds}});
})(typeof window!=='undefined'?window:globalThis);
