/* WGS84 measurement only. Coordinate transformations remain in CRS_ENGINE. */
(function(root){
  'use strict';
  const geod=root.geodesic.Geodesic.WGS84;
  function point(p){if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||Math.abs(p[0])>180||Math.abs(p[1])>90)throw Error('Coordonate geografice invalide: longitudine, latitudine.');return p;}
  function inverse(a,b){point(a);point(b);return geod.Inverse(a[1],a[0],b[1],b[0]);}
  function direct(p,azimuth,metres){point(p);if(!Number.isFinite(azimuth)||!Number.isFinite(metres)||metres<0)throw Error('Parametri geodezici invalizi.');const r=geod.Direct(p[1],p[0],azimuth,metres);return [r.lon2,r.lat2];}
  function area(ring){if(ring.length<3)throw Error('Un poligon cere minimum trei puncte.');const polygon=geod.Polygon(false);for(const p of ring){point(p);polygon.AddPoint(p[1],p[0]);}return Math.abs(polygon.Compute(false,true).area);}
  function densify(points,{closed=false,maxStep=250}={}){
    if(!Number.isFinite(maxStep)||maxStep<=0)throw Error('Pas de densificare invalid.');
    const result=[];for(let i=0;i<(closed?points.length:points.length-1);i++){
      const a=points[i],b=points[(i+1)%points.length],r=inverse(a,b),n=Math.max(1,Math.ceil(r.s12/maxStep));
      if(n>10000)throw Error('Geometria depășește demonstrația locală.');
      for(let j=0;j<n;j++)result.push(j===0?a:direct(a,r.azi1,r.s12*j/n));
    }
    if(!closed)result.push(points[points.length-1]);return result;
  }
  root.CARTO_GEODESIC={inverse,direct,area,densify,point,reference:'Elipsoid WGS 84; GeographicLib geodesic 2.2.0'};
})(window);
