/* Full-file decoding, native-grid analysis and display warping stay off the UI thread. */
importScripts('../vendor/geotiff.js','../vendor/proj4.js','raster-engine.js');
let engine,displayProject;
const grids={};let context;
async function decode(buffer,expected){
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),n=>n.toString(16).padStart(2,'0')).join('');
  if(buffer.byteLength!==expected.size_bytes||digest!==expected.sha256)throw Error('Fișierul raster nu corespunde amprentei verificate.');
  const tiff=await GeoTIFF.fromArrayBuffer(buffer),image=await tiff.getImage(0),keys=image.getGeoKeys(),fd=image.fileDirectory;
  let affine;
  if(fd.ModelTransformation){const m=fd.ModelTransformation;affine=[m[3],m[0],m[1],m[7],m[4],m[5]];}
  else {const [x,y]=image.getOrigin(),[a,e]=image.getResolution();affine=[x,a,0,y,0,e];}
  const nodata=image.getGDALNoData();
  if(keys.ProjectedCSTypeGeoKey!==expected.epsg||keys.ProjLinearUnitsGeoKey!==9001||keys.GTRasterTypeGeoKey!==1||expected.epsg!==3844||image.getWidth()!==expected.width||image.getHeight()!==expected.height||image.getSamplesPerPixel()!==1||nodata!==expected.nodata||affine.some((v,i)=>Math.abs(v-expected.affine_transform[i])>1e-8))throw Error('CRS, grilă, unități sau NoData diferite de metadatele verificate.');
  const values=(await image.readRasters({samples:[0]}))[0];
  return {width:image.getWidth(),height:image.getHeight(),affine,nodata,values};
}
async function handle(event){
  const {token,type,payload}=event.data;
  try{
    let result;
    if(type==='load'){
      const {source,buffer,metadata,boundary,definition}=payload;
      if(!context){proj4.defs('EPSG:3844',definition);const toMetric=proj4('EPSG:4326','EPSG:3844');displayProject=proj4('EPSG:3857','EPSG:3844');context={metadata,polygons:boundary.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map(p=>p.map(r=>r.map(xy=>toMetric.forward(xy))))};}
      if(!grids[source]){try{grids[source]=await decode(buffer,metadata.rasters[source]);}catch(error){error.code='RASTER_DECODE';throw error;}}
      engine=GISRaster.create(grids.dem,grids.forestLoss,context.metadata,context.polygons);result=engine.summary;
    }else if(type==='summary')result=engine.summary;
    else if(type==='init'&&!payload)result=engine.summary;
    else if(type==='init'){
      const {metadata,boundary,dem,forest,definition}=payload;
      proj4.defs('EPSG:3844',definition);
      const toMetric=proj4('EPSG:4326','EPSG:3844');displayProject=proj4('EPSG:3857','EPSG:3844');
      const polygons=boundary.features.flatMap(f=>f.geometry.type==='MultiPolygon'?f.geometry.coordinates:[f.geometry.coordinates]).map(p=>p.map(r=>r.map(xy=>toMetric.forward(xy))));
      const grids=await Promise.all([decode(dem,metadata.rasters.dem),decode(forest,metadata.rasters.forestLoss)]);
      engine=GISRaster.create(...grids,metadata,polygons);result=engine.summary;
    }else{
      if(!engine)throw Error('Rasterele nu sunt încă pregătite.');
      if(type==='analyze')result=engine.analyze(payload.id,payload.params);
      else if(type==='inspect')result=engine.inspect(payload.x,payload.y);
      else if(type==='samples')result=engine.samples(payload);
      else if(type==='render'){const start=performance.now(),pixels=engine.render(payload,displayProject);result={pixels,width:payload.width,height:payload.height,render_ms:performance.now()-start};postMessage({token,result},[pixels.buffer]);return;}
      else throw Error('Operație raster necunoscută.');
    }
    postMessage({token,result});
  }catch(error){postMessage({token,error:error.message||String(error),code:error.code});}
}
// Serialize decode/load with analysis: requests always see complete native grids.
let queue=Promise.resolve();onmessage=event=>{queue=queue.then(()=>handle(event));};
