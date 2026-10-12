/* Small deterministic geometry; projected coordinates use the existing CRS engine. */
(function(root){
  'use strict';
  const G=root.CARTO_GEODESIC,C=root.CRS_ENGINE;
  const presets={bucharest:{name:'București',point:[26.106,44.432]},risca:{name:'Rîșca · Suceava',point:[26.22,47.35]},utmEdge:{name:'Lângă limita UTM 34N / 35N',point:[23.96,46.2]}};
  const codes=['EPSG:4326','EPSG:3857','EPSG:3844','EPSG:32634','EPSG:32635'];
  const utmCode=lon=>'EPSG:'+(32600+Math.floor((lon+180)/6)+1);
  function validate(p){G.point(p);if(p[0]<20.3||p[0]>29.7||p[1]<43.7||p[1]>48.25)throw Error('Alege un punct în zona demonstrației: 20,3–29,7° E și 43,7–48,25° N.');return p;}
  function geometry(center,km=10){
    validate(center);if(!Number.isFinite(km)||km<1||km>50)throw Error('Dimensiune între 1 și 50 km.');
    const segment=[center,G.direct(center,45,km*1000)];
    const ring=[-135,-45,45,135].map(az=>G.direct(center,az,km*1000/Math.sqrt(2)));
    return {center,segment,ring,line:G.densify(segment),boundary:G.densify(ring,{closed:true}),reference:{distance:G.inverse(...segment).s12,area:G.area(ring)},km};
  }
  function planarArea(points){const origin=points[0];let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=(a[0]-origin[0])*(b[1]-origin[1])-(b[0]-origin[0])*(a[1]-origin[1]);}return Math.abs(sum)/2;}
  function transform(crs,p){if(!codes.includes(crs))throw Error('CRS neacceptat în laborator.');return C.transform('EPSG:4326',crs,p);}
  function project(crs,geo){
    const boundary=geo.boundary.map(p=>transform(crs,p)),line=geo.line.map(p=>transform(crs,p));
    const endpoints=geo.segment.map(p=>transform(crs,p)),metric=crs!=='EPSG:4326';
    const distance=metric?Math.hypot(endpoints[1][0]-endpoints[0][0],endpoints[1][1]-endpoints[0][1]):null;
    const area=metric?planarArea(boundary):null;
    const warning=crs.startsWith('EPSG:326')&&geo.ring.some(p=>utmCode(p[0])!==crs)?'Forma depășește zona UTM selectată; verifică întinderea și deformarea.':'';
    return {boundary,line,center:transform(crs,geo.center),metrics:{crs,units:metric?'m':'°',distance,area,distanceDelta:metric?distance-geo.reference.distance:null,distancePercent:metric?(distance/geo.reference.distance-1)*100:null,areaPercent:metric?(area/geo.reference.area-1)*100:null,warning}};
  }
  root.CARTO_PROJECTION_LAB_ENGINE={presets,codes,utmCode,validate,geometry,planarArea,transform,project};
})(window);
