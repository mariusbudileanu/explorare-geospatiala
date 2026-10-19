/* L04: bounded editable geometries, lon/lat input; WGS84 geodesic edges.
 * Existing GeographicLib/CRS/projection-area helpers are the numeric authority.
 * Projected line distances use straight endpoint chords; polygon area/perimeter
 * use the same geodesic boundary densified at <=250 m. Holes subtract area and
 * add boundary length, irrespective of ring orientation. No geographic planar m².
 */
(function(root){
  'use strict';
  const G=root.CARTO_GEODESIC,P=root.CARTO_PROJECTION_LAB_ENGINE;
  const presets={
    segment:{type:'distance',coordinates:[[26.106,44.432],[26.116,44.432]]},
    polyline:{type:'line',coordinates:[[26.106,44.432],[26.12,44.44],[26.14,44.43]]},
    polygon:{type:'polygon',coordinates:[[[26.1,44.4],[26.2,44.4],[26.18,44.46],[26.1,44.45],[26.1,44.4]]]},
    hole:{type:'polygon',coordinates:[[[26.1,44.4],[26.2,44.4],[26.2,44.5],[26.1,44.5],[26.1,44.4]],[[26.12,44.42],[26.14,44.42],[26.14,44.44],[26.12,44.44],[26.12,44.42]]]},
    north:{type:'distance',coordinates:[[26.106,55],[26.116,55]]}
  };
  const codes=P.codes;
  const copy=g=>JSON.parse(JSON.stringify(g));
  function validate(geometry){
    if(!geometry||!['distance','line','polygon'].includes(geometry.type))throw Error('geometry');
    const rs=geometry.type==='polygon'?geometry.coordinates:[geometry.coordinates];
    if(!Array.isArray(rs)||!rs.length||rs.length>3||rs.some(r=>!Array.isArray(r)||r.length>16||r.length<(geometry.type==='polygon'?4:2)))throw Error('vertices');
    for(const r of rs)for(const p of r){G.point(p);if(p[0]<10||p[0]>35||p[1]<35||p[1]>60)throw Error('domain: 10–35° E / 35–60° N');}
    let total=0;for(const r of rs)for(let i=1;i<r.length;i++){const d=G.inverse(r[i-1],r[i]).s12;if(d>1000000)throw Error('edge limit: 1000 km');total+=d;}if(total>3000000)throw Error('boundary limit: 3000 km');
    if(geometry.type==='distance'&&rs[0].length!==2)throw Error('two points required');
    if(geometry.type==='polygon'&&!root.CARTO_TOPOLOGY_ENGINE.geometry.validity({type:'Polygon',coordinates:rs})){
      const unsupported=root.CARTO_TOPOLOGY_ENGINE.geometry.ringTangency({type:'Polygon',coordinates:rs});
      const error=Error(unsupported?'unsupported touching rings; not necessarily OGC-invalid':'invalid polygon / holes');
      if(unsupported)error.code='unsupported-rings';throw error;
    }
    return copy(geometry);
  }
  function measure(input,crs){
    const g=validate(input);if(!codes.includes(crs))throw Error('crs');
    const polygon=g.type==='polygon',rs=polygon?g.coordinates:[g.coordinates],metric=crs!=='EPSG:4326';
    const length=r=>r.slice(1).reduce((s,p,i)=>s+G.inverse(r[i],p).s12,0);
    const geoLength=rs.reduce((s,r)=>s+length(r),0),geoArea=polygon?G.area(rs[0])-rs.slice(1).reduce((s,r)=>s+G.area(r),0):null;
    const boundaries=rs.map(r=>polygon?G.densify(r.slice(0,-1),{closed:true,maxStep:250}):r);
    const projected=boundaries.map(r=>r.map(p=>P.transform(crs,p)));
    const flatLength=r=>r.slice(1).reduce((s,p,i)=>s+Math.hypot(p[0]-r[i][0],p[1]-r[i][1]),0)+(polygon?Math.hypot(r[0][0]-r.at(-1)[0],r[0][1]-r.at(-1)[1]):0);
    const planarLength=metric?projected.reduce((s,r)=>s+flatLength(r),0):null;
    const planarArea=metric&&polygon?P.planarArea(projected[0])-projected.slice(1).reduce((s,r)=>s+P.planarArea(r),0):null;
    const crsInfo=root.CRS_ENGINE.byId[crs],points=rs.flat();
    const outside=crs.startsWith('EPSG:326')?points.some(p=>Math.abs(p[0]-crsInfo.central_meridian)>3):crs==='EPSG:3844'?points.some(p=>p[0]<20.3||p[0]>29.7||p[1]<43.7||p[1]>48.25):false;
    return {geometry:g,projected,crs,metric,geodesicLength:geoLength,geodesicArea:geoArea,planarLength,planarArea,lengthDelta:metric?planarLength-geoLength:null,areaDelta:planarArea===null?null:planarArea-geoArea,lengthPercent:metric&&geoLength>0?(planarLength/geoLength-1)*100:null,areaPercent:planarArea!==null&&geoArea>0?(planarArea/geoArea-1)*100:null,outside,units:{length:'m',area:'m²',coordinates:metric?'m':'°'},reference:G.reference};
  }
  root.CARTO_MEASUREMENT={presets,codes,copy,validate,measure};
})(typeof window==='undefined'?globalThis:window);
