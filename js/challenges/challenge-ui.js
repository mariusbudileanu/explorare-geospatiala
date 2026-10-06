import {renderRasterControls,renderAnnualChart} from './raster-ui.js';
export const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fmt=(value,digits=0)=>Number.isFinite(value)?new Intl.NumberFormat('ro-RO',{maximumFractionDigits:digits}).format(value):'Nedefinit';
const $=id=>document.getElementById(id);
export function renderCatalog(config,done,active) {
  const groups=[{id:'vector',label:'VECTOR · Sectorul 1',prefix:'V',note:'Școli, populație și servicii medicale.'},{id:'raster',label:'RASTER · Rîșca',prefix:'R',note:'Relief, pantă și pierdere forestieră.'}];
  $('challenge-catalog').innerHTML=groups.map(group=>`<section class="challenge-catalog-section" aria-labelledby="catalog-${group.id}"><h3 id="catalog-${group.id}">${group.label}</h3><p class="small">${group.note}</p><div class="challenge-card-grid">${config.challenges.filter(c=>c.id.startsWith(group.prefix)).map(c=>`<button class="challenge-card" type="button" data-challenge="${c.id}" aria-pressed="${c.id===active}"><span class="eyebrow">${c.id} · ${esc(c.level)}</span><strong>${esc(c.index_title||c.title)}</strong><span class="challenge-completion">${done.includes(c.id)?'✓ Parcursă':'De explorat'}</span></button>`).join('')}</div></section>`).join('');
}
export function renderChallenge(challenge,config,data) {
  $('challenge-id').textContent=`${challenge.id} · ${challenge.level}`;$('challenge-title').textContent=challenge.title;
  $('challenge-question').textContent=challenge.question;$('challenge-data-note').textContent=challenge.data_note;
  $('challenge-method-question').textContent=challenge.method_question;$('challenge-method-note').textContent=challenge.method_note;
  $('challenge-methods').innerHTML='<option value="">Alege metoda potrivită…</option>'+challenge.methods.map(m=>`<option value="${m.id}">${esc(m.label)}</option>`).join('');
  $('challenge-feedback').textContent='';$('challenge-results').hidden=true;$('challenge-controls').innerHTML='';
  $('challenge-links').innerHTML=challenge.links.map(link=>`<a class="outline-button" href="${esc(link.href)}">${esc(link.label)} →</a>`).join('');
  $('raster-tools').hidden=challenge.kind!=='raster';$('raster-annual-chart').hidden=true;
  $('challenge-coordinate-note').textContent=challenge.kind==='raster'?'Rastere EPSG:3844, unități metrice. Analiza respectă grilele sursă; afișarea este reproiectată în Web Mercator.':'Vectori WGS 84 (EPSG:4326).';
  if(challenge.kind==='raster'){renderRasterControls(challenge,data);return;}
  $('challenge-data-list').innerHTML=challenge.datasets.map(id=>`<li>${esc(({boundary:'Contur Sector 1',schools:'Școli',censusGrid:'Grid populație',primaryCare:'Medicină de familie',secondaryCare:'Cabinete / ambulatorii',hospitals:'Spitale'})[id])} · ${data[id].features.length} înregistrări</li>`).join('');
  if(['V1','V2','V3'].includes(challenge.id)){
    const selected=config.school_ids.map(id=>data.schools.features.find(f=>f.properties.fid===id));
    $('challenge-controls').innerHTML=`<details class="challenge-inspection"><summary>Inspectează cele opt școli și valorile sursă</summary><div class="challenge-table-wrap"><table><caption>Set fix de școli · date 2022–2023</caption><thead><tr><th scope="col">Școală</th><th scope="col">fid</th><th scope="col">Elevi</th></tr></thead><tbody>${selected.map(f=>`<tr><th scope="row">${esc(f.properties[config.fields.schoolName])}</th><td>${f.properties.fid}</td><td>${fmt(f.properties[config.fields.pupils])}</td></tr>`).join('')}</tbody></table></div></details>${challenge.id!=='V1'?'<p class="small">Distanță fixă: 1 km. Cele opt buffere sunt reunite înainte de ponderare.</p>':''}`;
  }else if(challenge.id==='V4'){
    $('challenge-controls').innerHTML='<p>Distanță fixă: <strong>1 km</strong> în jurul fiecărui cabinet. Analiza folosește toate punctele furnizate.</p>';
  }else{
    const choices=config.school_ids.map(id=>data.schools.features.find(f=>f.properties.fid===id));
    $('challenge-controls').innerHTML=`<label for="challenge-origin">Școala de plecare</label><select id="challenge-origin">${choices.map(f=>`<option value="${f.properties.fid}">${esc(f.properties[config.fields.schoolName])} · fid ${f.properties.fid}</option>`).join('')}</select>`;
    if(challenge.id==='V6')$('challenge-controls').insertAdjacentHTML('beforeend',`<label for="challenge-source">Tip de unitate</label><select id="challenge-source"><option value="secondaryCare">Cabinet / ambulatoriu de specialitate</option><option value="hospitals">Spital</option></select><fieldset><legend>Criterii susținute de date</legend><div id="challenge-criteria"></div></fieldset><label for="challenge-logic">Combină criteriile</label><select id="challenge-logic"><option value="AND">AND · toate criteriile</option><option value="OR">OR · cel puțin un criteriu</option></select><p class="small">Contractele, serviciile prezente și numărul de paturi au semnificații diferite. NULL rămâne necunoscut.</p>`);
  }
}
export function renderCriteria(config,source) {
  $('challenge-criteria').innerHTML=config.medical_criteria[source].map((c,index)=>`<label><input type="checkbox" name="medical-criterion" value="${esc(c.field)}" ${index<2?'checked':''}><span>${esc(c.label)}</span></label>`).join('');
}
export function readParams(){return {origin_id:Number($('challenge-origin')?.value),source:$('challenge-source')?.value,logic:$('challenge-logic')?.value,criteria:[...document.querySelectorAll('[name="medical-criterion"]:checked')].map(i=>i.value)};}
export function renderLegend(items) {
  const unique=[...new Map(items.map(item=>[item.label,item])).values()];
  $('challenge-legend').innerHTML=unique.map(item=>`<li><span class="legend-symbol ${item.style||''}" ${item.color?`style="background:${item.color};border-color:${item.color}"`:''} aria-hidden="true"></span>${esc(item.label)}</li>`).join('');
}
export function renderResult(result,id) {
  $('challenge-results').hidden=false;$('challenge-result-type').textContent=result.type_label||(result.kind==='EXACT'?'EXACT · în raport cu tabelul sursă':'ESTIMAT · ponderare la suprafață');
  $('challenge-results').dataset.resultKind=result.kind;
  renderAnnualChart(result.series,id==='R6');
  $('challenge-metrics').innerHTML=result.metrics.map(m=>`<article><span>${esc(m.label)}</span><strong>${fmt(m.value,m.digits)} <small>${esc(m.unit)}</small></strong></article>`).join('');
  $('challenge-warnings').innerHTML=result.warnings.map(w=>`<p>${esc(w)}</p>`).join('');$('challenge-warnings').hidden=!result.warnings.length;
  $('challenge-interpretation').innerHTML=result.interpretation.map(p=>`<p>${esc(p)}</p>`).join('');
  $('challenge-table').innerHTML=result.table?`<details ${id==='V1'||result.kind==='RASTER'?'open':''}><summary>${result.kind==='RASTER'?'Valorile anuale':id==='V1'?'Școlile incluse în sumă':'Inspectează toate unitățile eligibile'} (${result.table.rows.length})</summary><div class="challenge-table-wrap"><table><caption>${esc(result.table.caption||(id==='V1'?'Valori sursă pentru suma elevilor':'Servicii documentat eligibile, ordonate după distanță'))}</caption><thead><tr>${result.table.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${result.table.rows.map(row=>`<tr>${row.map((cell,i)=>`<${i===0?'th scope="row"':'td'}>${esc(cell)}</${i===0?'th':'td'}>`).join('')}</tr>`).join('')}</tbody></table></div></details>`:'';
  $('challenge-comparison').hidden=id!=='V3'&&id!=='V4';
  if(id==='V3'||id==='V4'){
    const [a,b]=result.metrics,denom=id==='V3'?Math.max(a.value,b.value):a.value+b.value;
    $('challenge-comparison').innerHTML=[a,b].map(m=>`<div class="comparison-row"><span>${esc(m.label)}</span><div class="comparison-track"><span style="width:${denom>0?m.value/denom*100:0}%"></span></div><strong>${fmt(m.value)}</strong></div>`).join('');
  }
}
