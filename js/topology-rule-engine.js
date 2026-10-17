/* Extension of the shared pure geometry engine for the supported teaching fixtures. */
(function(root){
  'use strict';
  const E=root.CARTO_TOPOLOGY_ENGINE,R=root.CARTO_TOPOLOGY_RULES;
  const G=E.geometry,{parts,vertices,endpoints,anchor,validity,equal,covers}=G;
  function evaluate(scene){
    const {rule,target,reference=[],domain}=scene,errors=[];
    const definition=R.byId[rule];if(!definition||!Array.isArray(target)||target.length+reference.length>32||!target.every(f=>definition.types.includes(f.type.replace('Multi','')))||(definition.reference.length>0&&reference.some(f=>!definition.reference.includes(f.type.replace('Multi',''))))||target.concat(reference).reduce((n,f)=>n+vertices(f).length,0)>256)throw Error('Unsupported rule/geometry domain');
    if(target.concat(reference).some(f=>vertices(f).some(p=>Array.isArray(p)&&p.some(x=>typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)>10000))))throw Error('Unsupported coordinate domain: -10000..10000');
    if(target.concat(reference).some(G.ringTangency))throw Error('Unsupported ring tangency: use QGIS/GEOS for this configuration');
    if(!['invalid','multipart'].includes(rule)&&!target.concat(reference).every(validity))throw Error('Invalid operands: run geometry validity first');
    const add=(type,features,location,area=0)=>errors.push({type,affectedFeatureIds:features.map(f=>f.id),location,area});
    if(['covered','point-end','inside'].includes(rule))for(const f of target)for(const p of parts(f))if(!reference.some(r=>rule==='inside'?G.position(p.coordinates,r)==='inside':rule==='point-end'?endpoints(r).some(q=>E.same(q,p.coordinates)):covers(r,p.coordinates)))add(rule==='inside'?'point-outside':'endpoint-mismatch',[f],p.coordinates);
    if(rule==='line-end')for(const f of target)for(const p of endpoints(f))if(!reference.some(r=>covers(r,p)))add('endpoint-mismatch',[f],p);
    if(rule==='duplicates')for(let i=0;i<target.length;i++)for(let j=i+1;j<target.length;j++)if(equal(target[i],target[j]))add('duplicate',[target[i],target[j]],anchor(target[i]));
    if(rule==='invalid')for(const f of target)if(!validity(f))add('invalid-geometry',[f],anchor(f));
    if(rule==='multipart')for(const f of target)if(f.type.startsWith('Multi'))add('multipart',[f],anchor(f));
    const lines=target.flatMap(f=>parts(f).filter(p=>p.type==='LineString').map((p,i)=>({...p,partId:f.id+':'+i})));
    if(rule==='dangles')for(const f of lines)if(!E.same(f.coordinates[0],f.coordinates.at(-1)))for(const p of endpoints(f))if(!lines.some(g=>g.partId!==f.partId&&covers(g,p)))add('dangle',[f],p);
    if(rule==='pseudos'){const seen=[];for(const f of lines)for(const p of endpoints(f)){const linked=lines.filter(g=>!E.same(g.coordinates[0],g.coordinates.at(-1))&&endpoints(g).some(q=>E.same(p,q))),interior=lines.some(g=>covers(g,p)&&!endpoints(g).some(q=>E.same(q,p)));if(linked.length===2&&!interior&&!seen.some(q=>E.same(p,q))){seen.push(p);add('pseudo-node',linked,p);}}}
    if(rule==='contain')for(const f of target)if(!reference.some(p=>parts(p).some(q=>G.position(q.coordinates,f)==='inside')))add('missing-point',[f],anchor(f));
    if(rule==='overlap'||rule==='overlap-with')for(let i=0;i<target.length;i++)for(const g of rule==='overlap-with'?reference:target.slice(i+1)){const hit=G.overlay(target[i],g);if(hit&&G.area(hit)>1e-9)for(const p of parts(hit))add('overlap',[target[i],g],G.rings(p)[0],G.area(p));}
    // Gaps are bounded holes of the polygon union, never unbounded exterior space.
    if(rule==='gaps'&&target.length){let union=target[0];for(const f of target.slice(1))union=G.overlay(union,f,'union');for(const p of parts(union))for(const hole of G.rings(p).slice(1))add('gap',target,hole,G.areaRing(hole));}
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
