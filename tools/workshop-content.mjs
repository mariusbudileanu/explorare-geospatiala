/** Generate workshop additions from the existing inventory, public registry and workshop contract.
 * Existing procedural HTML is the base; reviewed overrides/core live in the existing contract.
 * Original screenshots retain their identity and explicit scope; no private input or runtime build.
 */
import fs from 'node:fs';
import path from 'node:path';
export function buildWorkshops(root,{check=false}={}) {
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
 const qgis=read('data/qgis-links.json').links;
 const contract=read('data/workshop-reproducibility.json'),inventory=read('data/tutorial-dataset-inventory.json').datasets,registry=read('data/data-registry.json').datasets;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const external=(url,label)=>url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'Sursă de confirmat; nu este o condiție de finalizare.';
 const reviseSteps=(html,t)=>{
  for(const [number,revision] of Object.entries(t.step_revisions||{})){
   const pattern=new RegExp(`<article class="tutorial-step\\b[^>]*id="section-${number}"[^>]*>[\\s\\S]*?<\\/article>`);
   if(!pattern.test(html))throw Error('Missing procedural step '+t.id+'/'+number);
   html=html.replace(pattern,block=>{
    if(revision.title)block=block.replace(/<h3>[^<]*<\/h3>/,`<h3>${esc(revision.title)}</h3>`);
    if(revision.body_html){
     const codes=[...block.matchAll(/<div class="tutorial-code"[\s\S]*?<\/pre><\/div>/g)].map((m,i)=>revision.code_values?.[i+1]?m[0].replace(/(<code[^>]*>)[\s\S]*?(<\/code>)/,(_,open,close)=>open+esc(revision.code_values[i+1])+close):m[0]);
     const figureMap=new Map();
     for(const match of block.matchAll(/<figure\b[^>]*class="tutorial-figure"[\s\S]*?<\/figure>/g)){
      const identity=match[0].match(/data-enlarge="([^"]+)"/)?.[1];
      if(!identity)throw Error('Missing screenshot identity '+t.id+'/'+number);
      figureMap.set(identity,match[0]);
     }
     const figures=[...figureMap.values()].join('');
     let body=revision.body_html.replace(/\{\{code:(\d+)\}\}/g,(_,index)=>{if(!codes[Number(index)-1])throw Error('Missing code block '+t.id+'/'+number+'/'+index);return codes[Number(index)-1];});
     for(let i=0;i<codes.length;i++)if(!revision.body_html.includes('{{code:'+(i+1)+'}}'))throw Error('Procedural code anchor would be lost '+t.id+'/'+number);
     if(revision.expression)body=body.replace(/(<pre><code[^>]*>)[\s\S]*?(<\/code><\/pre>)/,(_,open,close)=>open+esc(t.expressions[revision.expression])+close);
     const start=block.indexOf('<div class="tutorial-prose">');
     if(start<0)throw Error('Missing procedural body '+t.id+'/'+number);
     // Figures are siblings of tutorial-prose, never part of its closing div.
     block=block.slice(0,start)+'<div class="tutorial-prose">'+body+'</div>'+figures+'</article>';
    }
    for(const [before,after] of revision.replace||[]){
     if(!block.includes(before)&&!block.includes(after))throw Error('Unknown procedural text '+t.id+'/'+number);
     block=block.replaceAll(before,after);
    }
    if(revision.note){block=block.replace(/<p class="workshop-review-note">[\s\S]*?<\/p>/g,'');block=block.replace('</article>',`<p class="workshop-review-note">${revision.note}</p></article>`);}
    return block;
   });
  }
  return html;
 };
 const core=t=>t.introductory_core?`<!-- workshop-core:start --><section id="t01-core" class="tutorial-core lesson-section" data-learning-segment="T01@core"><span class="eyebrow">T01 · NUCLEU INTRODUCTIV</span><h2>${esc(t.introductory_core.title)}</h2><p>${esc(t.introductory_core.description)}</p>${t.introductory_core.steps.map(step=>`<article id="${esc(step.id)}" class="tutorial-core-step"><h3>${esc(step.title)}</h3>${step.action_html}<p><strong>Rezultat verificabil:</strong> ${esc(step.result)}</p></article>`).join('')}<p>Prima hartă este încheiată după verificarea celor două exporturi. <a href="#section-12">Filtrele</a>, <a href="#section-14">expresia CASE</a>, valorile numerice și etichetele sunt aprofundări opționale. <a href="#section-1">Pașii de referință</a> păstrează numerotarea inițială.</p></section><!-- workshop-core:end -->`:'';
 const ids=new Set(registry.map(d=>d.id));
 const card=(d,t)=>{
  if(!ids.has(d.registry_id))throw Error('Unknown registry ID: '+d.dataset_id);
  const r=registry.find(r=>r.id===d.registry_id),optional=t.optional_dataset_ids.includes(d.dataset_id);
  const edition=r.workshop_editions?.[t.id]||r.edition||'Ediție exactă necunoscută; consemnează release-ul ales.';
  return `<article class="dataset-card" data-dataset-id="${esc(d.dataset_id)}" data-registry-id="${esc(r.id)}"><span class="source-tag qgis-tag">${d.type==='raster'?'RASTER':'VECTOR'} · ${esc(d.format)}${optional?' · OPȚIONAL':''}</span><h3>${esc(d.role_ro)}</h3><p><strong>Nume folosit în pașii/capturile existente:</strong> <code>${esc(d.filename)}</code>. Numele descărcării poate diferi; identifică stratul după rol și schemă.</p><dl><div><dt>Furnizor</dt><dd>${esc(r.provider)}</dd></div><div><dt>Straturi</dt><dd>${d.layers.map(esc).join('<br>')}</dd></div><div><dt>Format / CRS originale</dt><dd>${esc(r.original_format)} · ${/^\d+$/.test(r.original_crs)?'EPSG:':''}${esc(r.original_crs)}</dd></div><div><dt>Rezoluție / scară</dt><dd>${esc(r.resolution_or_scale||'Nespecificată / neconfirmată')}</dd></div><div><dt>Ediția folosită / identificată</dt><dd>${esc(edition)}</dd></div><div><dt>Perioadă / acces consemnat</dt><dd>${esc(r.temporal_coverage||'Perioadă neconfirmată')} · ${esc(r.accessed||'Data accesării copiei necunoscută')} (registru; nu data creării copiei din captură)</dd></div><div><dt>Licență</dt><dd>${esc(r.license_name)}; detaliile și atribuirea rămân în registru.</dd></div></dl>${r.workshop_raster_properties?.[t.id]?`<p class="small"><strong>NoData în originalul verificat:</strong> ${r.workshop_raster_properties[t.id].nodata_tag===null?'tag TIFF absent; validitatea se verifică prin datamask, separat de codul 0/no-loss':esc(r.workshop_raster_properties[t.id].nodata_tag)}. Copia istorică și subsetul aplicației sunt distincte.</p>`:''}${r.access_requirements?`<p class="small"><strong>Condiții de acces:</strong> ${esc(r.access_requirements)}</p>`:''}${d.verification?`<p class="workshop-verification" data-verification="${esc(d.verification.scope)}"><strong>Verificarea datelor:</strong> ${esc(d.verification.summary)}</p>`:''}<div class="data-source-note">${external(r.official_source,'Sursa oficială')}${r.access_url&&r.access_url!==r.official_source?' · '+external(r.access_url,'Acces la furnizor'):''}${r.download_documentation_url?' · '+external(r.download_documentation_url,'Descărcarea ediției documentate'):''} · <a href="../resources.html#data-${esc(r.id)}">Vezi metadatele complete →</a></div></article>`;
 };
 for(const [id,settings] of Object.entries(contract.workshops)){
  const t={...settings,id},file='tutorials/'+id.toLowerCase()+'.html';let html=fs.readFileSync(path.join(root,file),'utf8');
  // The shared learning renderer owns this fragment; preserve it through core regeneration.
  const scopeNavigation=html.match(/<!-- learning-scope:start --><nav[^>]*data-learning-scope="T01@core"[\s\S]*?<!-- learning-scope:end -->/)?.[0]||'';
  html=html.replace(/<!-- workshop-core:start -->[\s\S]*?<!-- workshop-core:end -->/g,'');
  html=html.replace(/<a href="#t01-core" data-workshop-core-link>[^<]*<\/a>/g,'');
  if(t.introductory_core)html=html.replace('<nav aria-label="Secțiunile tutorialului">','<nav aria-label="Secțiunile tutorialului"><a href="#t01-core" data-workshop-core-link>Prima hartă după proprietate</a>');
  html=reviseSteps(html,t);
  // Source screenshots remain historical illustrations, never evidence for the new core.
  if(id==='T01')html=html.replace(/<figure\b[^>]*class="tutorial-figure"[\s\S]*?<\/figure>/g,figure=>{
   const record=read('data/tutorial-screenshots.json').find(record=>record.tutorial_id===id&&figure.includes(record.filename));
   if(!record?.usage_note)return figure;
   const caption=record.caption_ro+' '+record.usage_note;
   return figure.replace(/data-level="[^"]+"/,'data-level="optional"').replace(/data-caption="[^"]*"/,'data-caption="'+esc(caption)+'"').replace(/(<figcaption[^>]*>)[\s\S]*?(<\/figcaption>)/,(_,open,close)=>open+esc(caption)+close);
  });
  const data=t.dataset_ids.map(key=>{const d=inventory.find(d=>d.dataset_id===key);if(!d)throw Error('Unknown source '+key);return card(d,t);}).join('');
  const extra=t.supplementary_registry_ids.map(key=>{const r=registry.find(d=>d.id===key);if(!r)throw Error('Unknown supplement');return `<p class="workshop-boundary-source" data-registry-id="${esc(key)}"><strong>Limită alternativă dacă pachetul nu o include:</strong> ${esc(r.provider)} · ${esc(r.original_format)} · EPSG:${esc(r.original_crs)} · ediție declarată: ${esc(r.edition||'necunoscută')}, identitatea copiei istorice neconfirmată · ${esc(r.license_name)}. ${external(r.official_source,'Catalogul limitelor administrative')} · <a href="../resources.html#data-${esc(key)}">Metadate și condiții de utilizare</a>.</p>`;}).join('');
  const head=`<section class="tutorial-overview" id="ce-vei-invata"><span class="eyebrow">CE VEI ÎNVĂȚA</span><h2>Competențe în acest atelier</h2><ul>${t.objectives.map(v=>`<li>${esc(v)}</li>`).join('')}</ul></section><section class="workshop-requirements" id="de-ce-ai-nevoie"><h2>De ce ai nevoie</h2><p><strong>QGIS ${esc(contract.qgis_target)}</strong>; comenzile sunt prezentate conform interfeței în engleză. Datele se descarcă de la furnizori, nu dintr-un pachet al platformei. Nu este necesară participarea la un curs pentru pașii de bază.</p><p><strong>CRS de lucru:</strong> ${esc(t.working_crs)}</p><p><strong>Organizare locală recomandată:</strong> <code>atelier_${id}/data_raw/</code> pentru originale, <code>data_processed/</code> pentru produse derivate, <code>project/</code> pentru proiectul propriu și <code>output/</code> pentru exporturi. Nu suprascrie datele originale; salvează separat produsele procesării și notează sursa, numele fișierului, ediția, data descărcării și parametrii utilizați.</p></section><section class="tutorial-data" id="date-pentru-exercitiu"><span class="eyebrow">DATELE EXERCIȚIULUI</span><h2>Surse originale și fișiere de lucru</h2><p>Numele istorice de mai jos sunt repere pentru pașii existenți, nu fișiere livrate separat. O copie locală de curs este opțională. Edițiile și datele de acces din registru nu garantează identitatea copiei istorice din capturi. Pentru surse revizuite, consemnează ediția aleasă: valorile, schema sau numărul obiectelor pot varia; metoda rămâne reproductibilă dacă adaptezi câmpurile după documentație.</p>${id==='T06'?'<p>Comparația principală cere DEM, Forest Loss și masca Suceava. Ariile protejate și hidrografia sunt context opțional; unitățile de relief/landforms sunt extensii. Lipsa unui strat de context nu blochează rezultatul T06_03. Proveniența unor copii istorice rămâne neconfirmată.</p>':''}<div class="dataset-grid">${data}</div>${extra}</section><section class="workshop-preparation" id="pregatirea-datelor"><h2>Pregătirea datelor</h2><ol>${t.prepare.map(p=>`<li>${esc(p)}</li>`).join('')}</ol>${id==='T06'?'<p class="workshop-official-docs">'+['raster-clip-mask','raster-hillshade'].map(key=>{const doc=qgis.find(d=>d.id===key);if(!doc)throw Error('Missing official documentation');return external(doc.url,doc.title);}).join(' · ')+'</p>':''}<div class="tutorial-callout"><strong>Afișare versus reproiecție</strong><p>Set Layer CRS atribuie o interpretare coordonatelor existente; nu le transformă. Folosește această comandă numai dacă știi din sursă că tagul lipsește/este greșit. Export → Save Features As… / Reproject Layer transformă vectorii; Warp / Clip Raster by Mask Layer cu Target CRS transformă rasterele. CRS-ul proiectului controlează afișarea, nu rescrie datele.</p>${['T05','T06'].includes(id)?'<p><a href="../projection-crs-lab.html">Compară măsurătorile în Laborator Proiecții &amp; CRS →</a></p>':''}</div></section>`;
  const pattern=/<section class="tutorial-overview"[\s\S]*?(?=<section class="tutorial-source-flow")/;
  if(!pattern.test(html))throw Error('Missing workshop boundary '+id);html=html.replace(pattern,head);
  if(t.introductory_core)html=html.replace('<section class="tutorial-source-flow"',core(t).replace('</section><!-- workshop-core:end -->',scopeNavigation+'</section><!-- workshop-core:end -->')+'<section class="tutorial-source-flow"');
  const result=`<section class="tutorial-result" id="verifica-rezultatul"><span class="eyebrow">VERIFICĂ REZULTATUL</span><h2>Checkpoint-uri și rezultat de referință</h2><ol class="workshop-checkpoints">${t.checks.map(p=>`<li>${esc(p)}</li>`).join('')}</ol><h3>Rezultat de referință</h3><p class="workshop-reference">${esc(t.reference)}</p><h3>Limita de interpretare</h3><p class="workshop-interpretation">${esc(t.limit)}</p>${id==='T06'?'<p><strong>T06_04 — layout opțional:</strong> pașii §23–25 pot produce exporturile PNG/PDF, dar comparația raster este finalizată la T06_03. Nu există un fișier de proiect ori un layout distribuit.</p>':'<p>Deschide exporturile PNG și PDF cerute în pașii existenți; verifică titlul, legenda, scara, sursele și nota metodologică.</p>'}</section>`;
  html=html.replace(/<section class="tutorial-result"[\s\S]*?(?=<section class="tutorial-links")/,result);
  // Keep wide schema tables usable on mobile even when JavaScript is unavailable.
  const tableWrapper='<div class="tutorial-table-scroll" tabindex="0" role="region" aria-label="Tabel de atelier, cu derulare orizontală">';
  html=html.replace(/<table\b[\s\S]*?<\/table>/g,(table,offset)=>html.slice(0,offset).endsWith(tableWrapper)?table:tableWrapper+table+'</div>');
  if(check){if(html!==fs.readFileSync(path.join(root,file),'utf8'))throw Error('Stale workshop additions: '+id);}else fs.writeFileSync(path.join(root,file),html);
 }
}
