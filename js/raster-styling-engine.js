/* Styling only: decoded grids and validity masks come from the existing raster service. */
(function(root){
  'use strict';
  const clamp=x=>Math.max(0,Math.min(1,x)),rgb=hex=>hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16));
  function interpolate(colors,t){const stops=colors.map(rgb),position=clamp(t)*(stops.length-1),i=Math.min(stops.length-2,Math.floor(position)),f=position-i;return stops[i].map((v,c)=>Math.round(v+(stops[i+1][c]-v)*f));}
  function illumination(gx,gy,azimuth,altitude){
    if(!Number.isFinite(gx)||!Number.isFinite(gy))return null;
    const az=azimuth*Math.PI/180,alt=altitude*Math.PI/180;
    return 255*Math.max(0,(-gx*Math.cos(alt)*Math.sin(az)-gy*Math.cos(alt)*Math.cos(az)+Math.sin(alt))/Math.hypot(gx,gy,1));
  }
  function create(demData,forestData,metadata,summary){
    const dem=demData.grid,forest=forestData.grid,statistics=demData.statistics,derivatives=demData.derivatives,D=root.CARTO_RASTER_STYLING,B=root.CARTO_BLEND_ENGINE;
    const mapping=metadata.rasters.forestLoss.value_to_year.mapping,years=summary.annual.filter(row=>row.count>0).map(row=>row.year),cache=new Map(),views=new Map();
    function limits(s={}){const p=Number(s.cut||2);return s.limits==='cut'?{min:statistics.quantiles[p],max:statistics.quantiles[100-p],label:'Cumulative count cut · '+p+'–'+(100-p)+'%'}:{min:statistics.min,max:statistics.max,label:'Min / max'};}
    function spec(id,s){return id==='R0'?{type:s.source==='dem'?'color':'thematic',source:s.source,ramp:'terrain',palette:'warm',limits:'minmax',opacity:100}:id==='R1'?{...s,type:'gray'}:id==='R2'?{...s,type:'gray',enhancement:'stretch',gradient:'normal'}:id==='R3'?{...s,type:'color'}:id==='R4'?{...s,type:'hillshade'}:id==='R5'?{...s,type:'composite',limits:'minmax',azimuth:315,altitude:45}:{...s,type:'thematic',source:'forestLoss'};}
    function view(source){
      if(views.has(source))return views.get(source);const grid=source==='forestLoss'?forest:dem,width=B.width,height=Math.round(width*grid.height*Math.hypot(grid.affine[2],grid.affine[5])/(grid.width*Math.hypot(grid.affine[1],grid.affine[4]))),indices=new Int32Array(width*height),background=new Uint8ClampedArray(width*height*4),normals=grid===dem?new Float64Array(width*height*3):null;
      for(let r=0;r<height;r++)for(let c=0;c<width;c++){const p=r*width+c;indices[p]=Math.floor((r+.5)*grid.height/height)*grid.width+Math.floor((c+.5)*grid.width/width);background.set([238,242,240,255],p*4);}
      if(normals)for(let p=0;p<indices.length;p++){const i=indices[p],gx=derivatives.east[i],gy=derivatives.north[i],length=Math.hypot(gx,gy,1);normals[p*3]=-gx/length;normals[p*3+1]=-gy/length;normals[p*3+2]=1/length;}
      const result={width,height,indices,background,grid,normals};views.set(source,result);return result;
    }
    function palette(name){return new Map(years.map((year,i)=>[year,interpolate(D.palettes[name].colors,years.length===1?0:i/(years.length-1))]));}
    function remember(key,value){if(cache.size>=24)cache.delete(cache.keys().next().value);cache.set(key,value);return value;}
    function base(s){
      const {opacity,compare,...baseState}=s,key='base:'+JSON.stringify(baseState);if(cache.has(key))return cache.get(key);
      const v=view(s.source||'dem'),image=new Uint8ClampedArray(v.width*v.height*4),range=limits(s),colors=s.type==='thematic'?palette(s.palette):null;
      const stops=s.type==='color'?D.ramps[s.ramp].colors.map(rgb):null;
      const az=(s.azimuth??315)*Math.PI/180,alt=(s.altitude??45)*Math.PI/180,light=[Math.cos(alt)*Math.sin(az),Math.cos(alt)*Math.cos(az),Math.sin(alt)];
      for(let p=0;p<v.indices.length;p++){
        const i=v.indices[p];if(!v.grid.mask[i])continue;const value=v.grid.values[i],offset=p*4;let color,gray;
        if(s.type==='hillshade'){const n=p*3;if(!Number.isFinite(v.normals[n]))continue;gray=255*Math.max(0,v.normals[n]*light[0]+v.normals[n+1]*light[1]+v.normals[n+2]*light[2]);}
        else if(s.type==='thematic'){color=colors.get(mapping[value]);if(!color)continue;}
        else if(s.type==='generic-forest')gray=255*clamp((value-forest.min)/(forest.max-forest.min||1));
        else {const t=clamp((value-range.min)/(range.max-range.min||1));if(s.type==='color'){const position=t*(stops.length-1),stop=Math.min(stops.length-2,Math.floor(position)),fraction=position-stop;color=stops[stop].map((v,c)=>Math.round(v+(stops[stop+1][c]-v)*fraction));}else {gray=s.enhancement==='none'?Math.max(0,Math.min(255,Math.trunc(value))):255*t;if(s.gradient==='inverse')gray=255-gray;}}
        image[offset]=color?color[0]:gray;image[offset+1]=color?color[1]:gray;image[offset+2]=color?color[2]:gray;image[offset+3]=255;
      }
      return remember(key,image);
    }
    function render(s){
      const key='result:'+JSON.stringify(s);if(cache.has(key))return cache.get(key);const v=view(s.source||'dem');let pixels;
      if(s.type==='composite'){
        const bottom=base({type:'color',ramp:s.ramp,limits:s.limits,cut:s.cut}),top=base({type:'hillshade',azimuth:s.azimuth,altitude:s.altitude});
        // The exact shared compositor used by Transparență & blending; no parallel math.
        pixels=B.compose(B.compose(v.background,bottom),top,s.mode,s.opacity/100);
      }else pixels=B.compose(v.background,base(s),'normal',['thematic','generic-forest'].includes(s.type)?(s.opacity??100)/100:1);
      return remember(key,{pixels,width:v.width,height:v.height});
    }
    function sample(s,col,row){
      const grid=s.source==='forestLoss'?forest:dem,c=Math.max(0,Math.min(grid.width-1,col)),r=Math.max(0,Math.min(grid.height-1,row)),index=r*grid.width+c,xy=root.GISRaster.world(grid.affine,c+.5,r+.5),value=grid.mask[index]?grid.values[index]:null;
      return {index,col:c,row:r,xy,value,year:value===null?null:mapping[value]??null,hillshade:grid===dem&&value!==null?illumination(derivatives.east[index],derivatives.north[index],s.azimuth??315,s.altitude??45):null};
    }
    return {dem,forest,statistics,derivatives,years,mapping,limits,spec,view,palette,base,render,sample,cacheSize:()=>cache.size,blendCompose:B.compose};
  }
  root.CARTO_RASTER_STYLE_ENGINE={create,interpolate,illumination};
})(window);
