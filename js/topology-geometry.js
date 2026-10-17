/* Cartesian educational geometry kernel; not GEOS/DE-9IM. Straight segments,
 * simple polygon rings, holes, disjoint multipolygons. Absolute tolerance 1e-9.
 * Accepts both legacy flat rings and standard GeoJSON. Overlay uses local Turf;
 * planar shoelace area is in squared input units, never Turf's geographic area.
 */
(function(root){
  'use strict';
  const E=root.CARTO_TOPOLOGY_ENGINE,eps=1e-9;
  const rings=f=>typeof f.coordinates?.[0]?.[0]==='number'?[f.coordinates]:f.coordinates;
  function parts(f){
    if(!f||!['Point','MultiPoint','LineString','MultiLineString','Polygon','MultiPolygon'].includes(f.type)||!Array.isArray(f.coordinates))throw Error('Unsupported geometry');
    return f.type.startsWith('Multi')?f.coordinates.map(coordinates=>({...f,type:f.type.slice(5),coordinates})):[f];
  }
  const vertices=f=>parts(f).flatMap(p=>p.type==='Point'?[p.coordinates]:p.type==='Polygon'?rings(p).flat():p.coordinates);
  const endpoints=f=>parts(f).flatMap(p=>p.type==='LineString'?[p.coordinates[0],p.coordinates.at(-1)]:[]);
  const anchor=f=>vertices(f).find(p=>Array.isArray(p)&&p.every(Number.isFinite))||null;
  const areaRing=r=>Math.abs(r.slice(1).reduce((s,b,i)=>s+r[i][0]*b[1]-b[0]*r[i][1],0))/2;
  const area=f=>parts(f).reduce((s,p)=>s+areaRing(rings(p)[0])-rings(p).slice(1).reduce((a,r)=>a+areaRing(r),0),0);
  const edges=r=>r.slice(1).map((b,i)=>[r[i],b]);
  const ringHits=(a,b)=>edges(a).flatMap(x=>edges(b).map(y=>E.segmentIntersection(...x,...y)).filter(Boolean));
  function position(point,f){
    const ps=parts(f).map(p=>{const rs=rings(p),outer=E.pointPosition(point,rs[0]);if(outer!=='inside')return outer;
      for(const h of rs.slice(1)){const w=E.pointPosition(point,h);if(w==='boundary')return 'boundary';if(w==='inside')return 'outside';}return 'inside';
    });return ps.includes('inside')?'inside':ps.includes('boundary')?'boundary':'outside';
  }
  const geo=f=>({type:'Feature',properties:{},geometry:{type:f.type,coordinates:f.type==='Polygon'?rings(f):f.type==='MultiPolygon'?parts(f).map(rings):f.coordinates}});
  const fromGeo=g=>({id:'overlay',layer:'A',type:g.type,coordinates:g.type==='Polygon'&&g.coordinates.length===1?g.coordinates[0]:g.coordinates});
  function overlay(a,b,method='intersect'){
    if(!root.turf)throw Error('Local Turf overlay unavailable');
    const r=root.turf[method](root.turf.featureCollection([geo(a),geo(b)]));return r?fromGeo(r.geometry):null;
  }
  function validity(f){
    try{
      const ps=parts(f),v=vertices(f);if(!ps.length||!v.length||v.length>256||!v.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return false;
      for(const p of ps){
        if(p.type==='LineString'&&(p.coordinates.length<2||p.coordinates.every(q=>E.same(q,p.coordinates[0]))))return false;
        if(p.type==='Polygon'){
          const rs=rings(p);if(!rs.length||!rs.every(r=>r.length>=4&&E.same(r[0],r.at(-1))&&r.slice(1).every((q,i)=>!E.same(q,r[i]))&&E.polygonValidity({...p,coordinates:r}).valid))return false;
          for(let i=1;i<rs.length;i++){
            if(E.pointPosition(rs[i][0],rs[0])!=='inside'||ringHits(rs[i],rs[0]).length)return false;
            for(let j=1;j<i;j++)if(ringHits(rs[i],rs[j]).length||E.pointPosition(rs[i][0],rs[j])!=='outside'||E.pointPosition(rs[j][0],rs[i])!=='outside')return false;
          }
        }
      }
      if(f.type==='MultiPolygon')for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
        if(ringHits(rings(ps[i])[0],rings(ps[j])[0]).some(h=>h.type==='line'))return false;
        const hit=overlay(ps[i],ps[j]);if(hit&&area(hit)>eps)return false;
      }
      return true;
    }catch{return false;}
  }
  function normalizeLine(r,closed=false){
    let p=r.map(x=>x.slice());if(closed)p.pop();let changed=true;
    while(changed&&p.length>(closed?3:2)){changed=false;for(let i=closed?0:1;i<(closed?p.length:p.length-1);i++)if(E.onSegment(p[i],p[(i+p.length-1)%p.length],p[(i+1)%p.length])){p.splice(i,1);changed=true;break;}}
    if(!closed)return [JSON.stringify(p),JSON.stringify(p.slice().reverse())].sort()[0];
    return p.flatMap((_,i)=>[JSON.stringify(p.slice(i).concat(p.slice(0,i))),JSON.stringify(p.slice(i).concat(p.slice(0,i)).reverse())]).sort()[0];
  }
  function equal(a,b){
    if(a.type!==b.type)return false;
    if(a.type==='Point')return E.same(a.coordinates,b.coordinates);
    const key=f=>parts(f).map(p=>p.type==='Point'?JSON.stringify(p.coordinates):p.type==='LineString'?normalizeLine(p.coordinates):normalizeLine(rings(p)[0],true)+'|'+rings(p).slice(1).map(r=>normalizeLine(r,true)).sort().join('|')).sort();return JSON.stringify(key(a))===JSON.stringify(key(b));
  }
  const covers=(f,p)=>parts(f).some(g=>g.type==='Point'?E.same(g.coordinates,p):g.type==='Polygon'?position(p,g)!=='outside':edges(g.coordinates).some(([a,b])=>E.onSegment(p,a,b)));
  function ringTangency(f){
    try{return parts(f).filter(p=>p.type==='Polygon').some(p=>{const rs=rings(p);return rs.some((r,i)=>rs.slice(i+1).some(s=>{const hits=ringHits(r,s);return hits.length&&hits.every(h=>h.type==='point'&&!h.proper);}));});}catch{return false;}
  }
  E.geometry={rings,parts,vertices,endpoints,anchor,areaRing,area,position,overlay,validity,equal,covers,ringTangency};
})(typeof window==='undefined'?globalThis:window);
