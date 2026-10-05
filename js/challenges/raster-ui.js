import {esc,fmt} from './challenge-ui.js';
const $=id=>document.getElementById(id);
export function renderRasterControls(challenge,data){
  const {metadata,summary}=data,years=summary.years;
  const options=selected=>years.map(y=>`<option value="${y}" ${y===selected?'selected':''}>${y}</option>`).join('');
  const units='<label for="raster-unit">Unitate de pantă</label><select id="raster-unit"><option value="degrees">Grade (°)</option><option value="percent">Procente (%)</option></select>';
  const threshold='<label for="raster-threshold">Prag de pantă · <span id="raster-threshold-unit">grade</span></label><input type="number" id="raster-threshold" min="0" max="89.99" step="any" value="15" required><label for="raster-threshold-slider">Ajustează pragul de pantă</label><input type="range" id="raster-threshold-slider" min="0" max="89.99" step="0.01" value="15">';
  const range=`<label for="raster-from">De la anul</label><select id="raster-from">${options(2013)}</select><label for="raster-to">Până la anul (inclusiv)</label><select id="raster-to">${options(2014)}</select>`;
  $('challenge-data-list').innerHTML=challenge.datasets.filter(id=>id!=='rasterMetadata').map(id=>id==='boundary'?'<li>Contur UAT Rîșca · mască la centrul pixelului</li>':`<li>${id==='dem'?'DEM':'Pierdere forestieră'} · ${metadata.rasters[id].width} × ${metadata.rasters[id].height} pixeli · ${fmt(metadata.rasters[id].pixel_width,5)} × ${fmt(metadata.rasters[id].pixel_height,5)} m · NoData: nedeclarat</li>`).join('');
  $('challenge-controls').innerHTML=(['R1','R2','R6'].includes(challenge.id)?units:'')+(['R2','R6'].includes(challenge.id)?threshold:'')+(challenge.id==='R3'?`<label for="raster-year">Anul pierderii</label><select id="raster-year">${options(2013)}</select>`:challenge.id==='R4'?`<fieldset><legend>Ani incluși · exemplu: 2013 + 2014</legend><div class="raster-years">${years.map(y=>`<label><input type="checkbox" name="raster-year" value="${y}" ${[2013,2014].includes(y)?'checked':''}> ${y}</label>`).join('')}</div></fieldset>`:['R5','R6'].includes(challenge.id)?range:'')+'<p class="small">Rasterele decodificate sunt reutilizate când schimbi anii sau pragul. Resetarea readuce parametrii inițiali.</p>';
  if($('raster-unit'))$('raster-unit').dataset.previous='degrees';
}
export function rasterParams(){
  const params={unit:$('raster-unit')?.value,threshold:Number($('raster-threshold')?.value??15),year:Number($('raster-year')?.value),years:[...document.querySelectorAll('[name="raster-year"]:checked')].map(i=>Number(i.value)),from:Number($('raster-from')?.value),to:Number($('raster-to')?.value)};
  if($('raster-threshold')&&!$('raster-threshold').checkValidity())throw Error('Introdu un prag în intervalul afișat.');
  if($('raster-from')&&params.from>params.to)throw Error('Anul de început trebuie să fie mai mic sau egal cu anul final.');
  if(document.querySelector('[name="raster-year"]')&&!params.years.length)throw Error('Selectează cel puțin un an.');
  return params;
}
export function syncRasterControls(event){
  const threshold=$('raster-threshold'),slider=$('raster-threshold-slider');
  if(event.target.id==='raster-unit'&&threshold){
    const previous=event.target.dataset.previous,value=Number(threshold.value),unit=event.target.value;
    const converted=previous===unit?value:unit==='percent'?Math.tan(value*Math.PI/180)*100:Math.atan(value/100)*180/Math.PI;
    threshold.max=slider.max=unit==='degrees'?'89.99':'10000';threshold.value=String(converted);slider.value=String(converted);$('raster-threshold-unit').textContent=unit==='degrees'?'grade':'procente';
  }
  if(event.target.id==='raster-unit')event.target.dataset.previous=event.target.value;
  if(event.target===threshold)slider.value=threshold.value;
  if(event.target===slider)threshold.value=slider.value;
}
export function renderPixel(info){
  const text=info.elevation===null&&info.forestCode===null?'Centrul pixelului este în afara măștii UAT sau nu are date valide.':`DEM: ${info.elevation===null?'necunoscut':fmt(info.elevation,2)+' m'} · Pantă DEM: ${info.slopeDegrees===null?'vecinătate incompletă':fmt(info.slopeDegrees,3)+'° / '+fmt(info.slopePercent,3)+'%'} · Forestier: ${info.forestCode===null?'NoData sau în afara măștii UAT':info.year?`cod ${info.forestCode} → ${info.year}`:'NoData'}${info.alignedSlopeDegrees!==null?' · Pantă la centrul pixelului forestier (R6): '+fmt(info.alignedSlopeDegrees,3)+'° / '+fmt(info.alignedSlopePercent,3)+'%':''}`;
  $('raster-pixel-info').textContent=text;
}
export function renderAnnualChart(series,intersection=false){
  const host=$('raster-annual-chart');host.hidden=!series?.length;if(!series?.length){host.innerHTML='';return;}
  const w=Math.max(400,series.length*42+80),h=260,left=62,bottom=218,top=25,plotWidth=w-left-20,max=Math.max(1,...series.map(r=>r.ha)),step=plotWidth/series.length;
  const bars=series.map((r,i)=>{
    const x=left+step*i+step*.18,barWidth=step*.64,y=bottom-(bottom-top)*r.ha/max;
    return `<g><title>${r.year}: ${fmt(r.ha,3)} ha${intersection?'; peste prag: '+fmt(r.steepHa,3)+' ha':''}</title><rect class="annual-total" x="${x}" y="${y}" width="${barWidth}" height="${bottom-y}"/>${intersection?`<rect class="annual-steep" x="${x}" y="${bottom-(bottom-top)*r.steepHa/max}" width="${barWidth}" height="${(bottom-top)*r.steepHa/max}"/>`:''}${series.length<=12||i%3===0||i===series.length-1?`<text x="${x+barWidth/2}" y="240" text-anchor="middle">${r.year}</text>`:''}</g>`;
  }).join('');
  host.innerHTML=`<h3>Pierdere forestieră anuală</h3><p class="small">Suprafață (ha) · ${intersection?'albastru: total anual; portocaliu: partea peste prag.':'valorile provin din raster, pentru anii selectați.'} Valorile complete sunt în tabel.</p><div class="annual-chart-scroll" ${series.length>6?'tabindex="0" role="region" aria-label="Grafic anual; derulează orizontal dacă este necesar"':''}><svg style="min-width:${series.length>6?'480':'0'}px" viewBox="0 0 ${w} ${h}" role="img" aria-labelledby="annual-chart-title annual-chart-desc"><title id="annual-chart-title">Suprafețe anuale de pierdere forestieră</title><desc id="annual-chart-desc">${esc(series.map(r=>`${r.year}: ${fmt(r.ha,3)} hectare${intersection?', peste prag '+fmt(r.steepHa,3)+' hectare':''}`).join('; '))}</desc>${[0,.5,1].map(f=>`<line x1="${left}" x2="${w-20}" y1="${bottom-f*(bottom-top)}" y2="${bottom-f*(bottom-top)}"/><text x="${left-8}" y="${bottom-f*(bottom-top)+4}" text-anchor="end">${fmt(max*f,1)}</text>`).join('')}${bars}</svg></div>`;
}
