/* One viewport canvas for all exercises. Inverse projection only affects display. */
export function createRasterLayer(map,service,onInspect,onError){
  let canvas,context,source='dem',mode='INPUT',showInput=true,showResult=true,sequence=0,timer,attached=false,resultReady=false;
  const layer=new L.Layer();
  async function draw(){
    if(!attached)return;const ticket=++sequence,size=map.getSize();
    // Display resolution is capped; analytical arrays always retain native resolution.
    const scale=Math.min(1,640/Math.max(size.x,size.y)),width=Math.max(1,Math.round(size.x*scale)),height=Math.max(1,Math.round(size.y*scale));
    const sw=map.options.crs.project(map.containerPointToLatLng([0,size.y])),ne=map.options.crs.project(map.containerPointToLatLng([size.x,0]));
    L.DomUtil.setPosition(canvas,map.containerPointToLayerPoint([0,0]));canvas.style.width=`${size.x}px`;canvas.style.height=`${size.y}px`;
    canvas.dataset.pending='true';
    try{
      const image=await service.render({width,height,bounds:[sw.x,sw.y,ne.x,ne.y],source,mode:resultReady?mode:'INPUT',showInput,showResult,dark:document.body.classList.contains('dark')});
      if(ticket!==sequence||!attached)return;canvas.width=width;canvas.height=height;context.putImageData(new ImageData(image.pixels,width,height),0,0);canvas.dataset.pending='false';canvas.dataset.renderMs=image.render_ms.toFixed(1);
    }catch(error){if(ticket===sequence&&attached){canvas.dataset.pending='false';onError(error);}}
  }
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(draw,80);};
  let hoverTimer,inspectionSequence=0;
  async function inspect(latlng){
    const ticket=++inspectionSequence,xy=window.CRS_ENGINE.transform('EPSG:4326','EPSG:3844',[latlng.lng,latlng.lat]);
    try{const info=await service.inspect(...xy);if(attached&&ticket===inspectionSequence)onInspect(info);}catch(error){if(attached)onError(error);}
  }
  const hover=event=>{clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>inspect(event.latlng),120);};
  const click=event=>{clearTimeout(hoverTimer);inspect(event.latlng);};
  layer.onAdd=()=>{
    attached=true;canvas=L.DomUtil.create('canvas','challenge-raster-canvas');canvas.setAttribute('aria-hidden','true');context=canvas.getContext('2d');map.getPane('raster').appendChild(canvas);
    map.on('moveend zoomend resize',schedule);map.on('mousemove',hover);map.on('click',click);schedule();
  };
  layer.onRemove=()=>{attached=false;sequence++;clearTimeout(timer);clearTimeout(hoverTimer);map.off('moveend zoomend resize',schedule);map.off('mousemove',hover);map.off('click',click);canvas.remove();};
  new MutationObserver(schedule).observe(document.body,{attributes:true,attributeFilter:['class']});
  return {layer,setSource(next){source=next;resultReady=false;schedule();},setResult(){resultReady=true;schedule();},show(next,input=true,result=true){mode=next;showInput=input;showResult=result;schedule();},setOpacity(value){if(canvas)canvas.style.opacity=String(value);},inspectCentre:()=>inspect(map.getCenter())};
}
