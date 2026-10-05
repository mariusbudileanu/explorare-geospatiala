import {esc} from './challenge-ui.js';
import {createRasterLayer} from './raster-layer.js';
export function createChallengeMap(element,config,rasterService,onInspect,onError) {
  const map=L.map(element,{preferCanvas:false,scrollWheelZoom:false,zoomSnap:0.25,zoomDelta:0.5,zoomAnimation:false,markerZoomAnimation:false,fadeAnimation:false}).setView([44.5,26.05],11);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  for(const [index,button] of [...map.zoomControl.getContainer().querySelectorAll('a')].entries()){
    button.tabIndex=0;
    button.setAttribute('aria-label',index===0?'Mărește harta':'Micșorează harta');button.title=button.getAttribute('aria-label');
    button.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();button.click();}});
  }
  map.attributionControl.addAttribution('Date: Observatorul Urban Metropolitan București / ADIZMB · CC BY 4.0; contur/grid: termeni de confirmat');
  map.createPane('boundary');map.getPane('boundary').style.zIndex=410;
  map.createPane('points');map.getPane('points').style.zIndex=460;
  map.createPane('raster');map.getPane('raster').style.zIndex=350;map.getPane('raster').style.pointerEvents='none';
  const raster=createRasterLayer(map,rasterService,onInspect,onError);
  const input=L.layerGroup(),result=L.layerGroup();let boundary=null,inputLegend=[],resultLegend=[],mode='INPUT',isRaster=false,rasterLegend=[];
  const colors=()=>{
    const s=getComputedStyle(document.body);return {target:s.getPropertyValue('--teal').trim(),zone:s.getPropertyValue('--blue').trim(),covered:s.getPropertyValue('--blue').trim(),outside:document.body.classList.contains('dark')?'#efa890':'#9f422c',facility:s.getPropertyValue('--blue').trim(),nearest:document.body.classList.contains('dark')?'#f1ce79':'#805d11',connection:s.getPropertyValue('--ink').trim(),source:s.getPropertyValue('--muted').trim(),boundary:s.getPropertyValue('--ink').trim()};
  };
  function add(group,data,style,label) {
    const color=colors()[style]||colors().source;
    const numbered=style==='target';
    const geo=L.geoJSON(data,{pane:style==='boundary'?'boundary':undefined,
      style:feature=>({color,weight:style==='boundary'?2:style==='connection'?3:1.5,fillColor:color,fillOpacity:style==='boundary'?0:style==='zone'?0.09:0.23,dashArray:style==='covered'&&feature.properties?.fraction<1-1e-6?'3 3':['zone','outside','connection'].includes(style)?'6 4':undefined}),
      pointToLayer:(feature,latlng)=>{
        if(numbered) {
          const n=config.school_ids.indexOf(feature.properties.fid)+1;
          const name=feature.properties[config.fields.schoolName]||label;
          return L.marker(latlng,{pane:'points',title:`${name} · fid ${feature.properties.fid}`,alt:`${name} · fid ${feature.properties.fid}`,icon:L.divIcon({className:'challenge-pin',html:`<span>${n||'•'}</span>`,iconSize:[28,28],iconAnchor:[14,14]})});
        }
        return L.circleMarker(latlng,{pane:'points',color,fillColor:color,fillOpacity:style==='source'?0.45:0.9,radius:style==='nearest'?10:style==='source'?4:6,weight:style==='nearest'?3:1.5});
      },
      onEachFeature:(feature,leaf)=>{
        const p=feature.properties||{},name=p.service_label||p[config.fields.schoolName]||p[config.fields.hospitalName]||label;
        const keys=[config.fields.id,config.fields.pupils,config.fields.population,config.fields.under15,'Pediatrie','Pediatrie (paturi)','Cardiologie','Contract Ecograf','CT - Computer Tomograf','UPU - Unitate Primiri Urgențe'];
        const names={[config.fields.population]:'Populație totală',[config.fields.under15]:'Populație sub 15 ani'};
        const rows=keys.filter(k=>Object.hasOwn(p,k)).map(k=>`<dt>${esc(names[k]||k)}</dt><dd>${esc(p[k]===null?'Necunoscut (NULL)':p[k])}</dd>`).join('');
        leaf.bindPopup(`<strong>${esc(name)}</strong><dl class="challenge-popup">${rows}</dl>${p.fraction!==undefined?`<p>Fracție de suprafață: ${(p.fraction*100).toFixed(1)}%</p>`:''}`);
        leaf.on('add',()=>{const node=leaf.getElement?.();if(!node||node.tagName==='IMG'||numbered)return;node.setAttribute('tabindex','0');node.setAttribute('role','button');node.setAttribute('aria-label',`${name} · fid ${p.fid??''}`);node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();leaf.openPopup();}});});
      }
    });geo._challengeStyle=style;group.addLayer(geo);
  }
  function show(next=mode,showInput=true,showResult=true) {
    mode=next;map.removeLayer(input);map.removeLayer(result);
    if(isRaster){input.addTo(map);raster.show(next,showInput,showResult);return [inputLegend[0],...(next==='INPUT'||next==='COMPARE'&&showInput?inputLegend.slice(1):[]),...(next!=='INPUT'&&(next!=='COMPARE'||showResult)?rasterLegend:[])];}
    if(mode==='INPUT'||mode==='COMPARE'&&showInput)input.addTo(map);
    if(mode==='RESULT'||mode==='COMPARE'&&showResult)result.addTo(map);
    return [...(map.hasLayer(input)?inputLegend:[]),...(map.hasLayer(result)?resultLegend:[])];
  }
  function refreshColors(){
    for(const group of [input,result])group.eachLayer(geo=>{
      const color=colors()[geo._challengeStyle]||colors().source;
      geo.setStyle({color,fillColor:color});
    });
  }
  new MutationObserver(refreshColors).observe(document.body,{attributes:true,attributeFilter:['class']});
  return {
    setInput(data){isRaster=false;if(map.hasLayer(raster.layer))map.removeLayer(raster.layer);map.attributionControl.removeAttribution('Rîșca · subseturi didactice; surse și termeni de confirmat');map.attributionControl.addAttribution('Date: Observatorul Urban Metropolitan București / ADIZMB · CC BY 4.0; contur/grid: termeni de confirmat');input.clearLayers();result.clearLayers();resultLegend=[];inputLegend=[];boundary=data.boundary;
      add(input,boundary,'boundary','Contur Sector 1');inputLegend.push({style:'boundary',label:'Contur Sector 1'});
      const labels={schools:'Școli',censusGrid:'Grid populație',primaryCare:'Medicină de familie',secondaryCare:'Cabinete / ambulatorii',hospitals:'Spitale'};
      for(const [id,dataset] of Object.entries(data)){if(id==='boundary')continue;add(input,dataset,'source',labels[id]);inputLegend.push({style:'source',label:`${labels[id]} · ${dataset.features.length} înregistrări`});}
      if(data.schools){const selected=data.schools.features.filter(f=>config.school_ids.includes(f.properties.fid));add(input,{type:'FeatureCollection',features:selected},'target','Opt școli selectate');inputLegend.push({style:'target',label:'Opt școli · marcaje numerotate'});}
      this.fit();return show('INPUT');
    },
    setRasterInput(prepared,source){isRaster=true;input.clearLayers();result.clearLayers();boundary=prepared.boundary;rasterLegend=[];
      const dem=prepared.summary.dem,colors=['#215d38','#559b52','#a9c779','#e5d194','#bb9571','#806359'],years=['#4477aa','#ee6677','#228833','#ccbb44','#66ccee','#aa3377'];
      add(input,boundary,'boundary','Contur Rîșca');inputLegend=[{style:'boundary',label:'Contur Rîșca'},...(source==='dem'?colors.map((color,i)=>({color,label:`DEM: ${(dem.min+i*(dem.max-dem.min)/6).toFixed(0)}–${(dem.min+(i+1)*(dem.max-dem.min)/6).toFixed(0)} m`})):prepared.summary.years.map((year,i)=>({color:years[i%years.length],label:String(year)})))];
      map.attributionControl.removeAttribution('Date: Observatorul Urban Metropolitan București / ADIZMB · CC BY 4.0; contur/grid: termeni de confirmat');
      map.attributionControl.addAttribution('Rîșca · subseturi didactice; surse și termeni de confirmat');
      raster.setSource(source);if(!map.hasLayer(raster.layer))raster.layer.addTo(map);this.fit();return show('INPUT');
    },
    setResult(output){result.clearLayers();resultLegend=[];if(boundary)add(result,boundary,'boundary','Contur Sector 1');
      if(isRaster){rasterLegend=output.raster.legend;raster.setResult();return show('RESULT');}
      for(const item of output.layers){add(result,item.data,item.style,item.label);resultLegend.push({style:item.style,label:item.label});}
      return show('RESULT');
    },
    show,setOpacity:value=>raster.setOpacity(value),inspectCentre:()=>raster.inspectCentre(),fit(){if(boundary){const bounds=L.geoJSON(boundary).getBounds();map.fitBounds(bounds,{paddingTopLeft:[22,22],paddingBottomRight:[22,44],animate:false});}},
    resize(){map.invalidateSize({animate:false});this.fit();}
  };
}
