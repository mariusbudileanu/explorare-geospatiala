/* Projection-only differential in native geodetic coordinates. Never differentiates
 * the datum operation. Columns are projected metres per native ground metre E/N.
 * Central differences h and h/2, ellipsoid curvature radii, then singular values.
 * PROJ get_factors fixtures independently test both axes, area and angular distortion.
 */
(function(root){
  'use strict';
  const rad=Math.PI/180,ellipsoids={WGS84:[6378137,298.257223563],krass:[6378245,298.3],GRS80:[6378137,298.257222101]};
  function factors(code,point){
    if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>=85)throw Error('domain');
    const crs=root.CRS_ENGINE.byId[code];if(!crs)throw Error('crs');
    if(code==='EPSG:4326')return {angular:true,units:'°',point:[...point]};
    const definition=crs.proj4.replace(/\s*\+towgs84=[^\s]+/g,''),ellps=crs.datum==='Pulkovo 1942(58)'?'krass':code==='EPSG:3035'?'GRS80':'WGS84';
    const native='+proj=longlat +ellps='+ellps+' +no_defs',helmert=crs.proj4.match(/\+towgs84=[^\s]+/)?.[0]||'';
    const p=root.proj4('EPSG:4326',native+' '+helmert,point),[a,rf]=ellipsoids[ellps],e2=2/rf-1/(rf*rf),phi=p[1]*rad;
    const w=Math.sqrt(1-e2*Math.sin(phi)**2),east=a/w*Math.cos(phi),north=a*(1-e2)/w**3;
    // Calling the projection itself avoids an implicit datum conversion entirely.
    const projection=new root.proj4.Proj(definition);
    const project=q=>{const p=projection.forward({x:q[0]*rad,y:q[1]*rad});return [p.x,p.y];};
    function differential(h){
      const x0=project([p[0]-h/rad,p[1]]),x1=project([p[0]+h/rad,p[1]]),y0=project([p[0],p[1]-h/rad]),y1=project([p[0],p[1]+h/rad]);
      return [(x1[0]-x0[0])/(2*h*east),(y1[0]-y0[0])/(2*h*north),(x1[1]-x0[1])/(2*h*east),(y1[1]-y0[1])/(2*h*north)];
    }
    const coarse=differential(1e-5),j=differential(5e-6);
    if(!j.every(Number.isFinite)||Math.max(...j.map((v,i)=>Math.abs(v-coarse[i])))>1e-5)throw Error('unstable');
    const [x,y,z,wj]=j,det=x*wj-y*z,s1=x*x+z*z,s2=y*y+wj*wj,cross=x*y+z*wj;
    const delta=Math.hypot(s1-s2,2*cross),major=Math.sqrt((s1+s2+delta)/2),minor=Math.abs(det)/major;
    if(!(minor>0)||major/minor>100||major>15||det<=0)throw Error('unstable');
    return {angular:false,units:'m/m',point:p,jacobian:j,major,minor,east:Math.sqrt(s1),north:Math.sqrt(s2),area:Math.abs(det),angle:2*Math.asin(Math.min(1,(major-minor)/(major+minor)))/rad,ellipsoid:ellps,
      outside:code==='EPSG:3844'?(point[0]<20.3||point[0]>29.7||point[1]<43.7||point[1]>48.25):code.startsWith('EPSG:326')?(point[1]<0||point[1]>84||Math.abs(point[0]-crs.central_meridian)>3):code==='EPSG:3035'?(point[0]<-35||point[0]>45||point[1]<24||point[1]>85):false};
  }
  root.CARTO_DISTORTION={factors};
})(typeof window==='undefined'?globalThis:window);
