/** Generate progressive learning additions from the shared runtime renderers. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function buildLearning(root,{check=false}={}) {
  const context={window:{}};vm.createContext(context);
  for(const file of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js','data/p01-content.js','data/p02-content.js','data/p03-content.js','data/p04-content.js','data/p05-content.js','data/p06-content.js','data/diagnostic-scenes.js','js/diagnostic-content.js','js/learning.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  const {CARTO_CONTENT:manifest,CARTO_LEARNING:model,CARTO_LEARNING_UI:ui,CARTO_LEARNING_PAGES:pages}=context.window;
  context.window.CARTO_QGIS_LINKS=JSON.parse(fs.readFileSync(path.join(root,'data/qgis-links.json'),'utf8'));
  const qgisLinks=context.window.CARTO_QGIS_LINKS.links;
  const p01=(html,id)=>{
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;if(!['L03','L10','L13'].includes(lab))return html;
    html=html.replace(/<!-- p01:start -->[\s\S]*?<!-- p01:end -->/g,'');
    const section='<!-- p01:start -->'+context.window.CARTO_P01_CONTENT.section(lab)+'<!-- p01:end -->';
    html=html.replace('<!-- learning-tail:start -->',section+'<!-- learning-tail:start -->');
    const scripts=['data/p01-content.js','js/v3-lab.js',...(lab==='L03'?['js/projection-distortion.js']:lab==='L13'?['data/data-registry.js','js/quality-model.js']:[]),'js/p01-labs.js'];
    if(!html.includes('css/p01-labs.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/p01-labs.css">\n</head>');
    // Reinsert owned scripts in dependency order, including on legacy static pages.
    for(const script of scripts){const tag=`<script src="${script}" defer></script>`;html=html.replaceAll(tag+'\r\n','').replaceAll(tag+'\n','').replaceAll(tag,'');}
    html=html.replace('</head>',scripts.map(script=>`<script src="${script}" defer></script>`).join('\n')+'\n</head>');
    return html;
  };
  const qgisMarkup=html=>html.replace(/\{\{qgis:([\w-]+)\}\}/g,(_,id)=>{const s=qgisLinks.find(s=>s.id===id&&s.verified);if(!s)throw Error('Unknown QGIS source: '+id);return `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a>`;});
  const p02=(html,id)=>{
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;
    if(id==='geospatial-data'){
      html=html.replace(/<!-- p02-chapter:start -->[\s\S]*?<!-- p02-chapter:end -->/g,'');
      return html.replace('<!-- learning-tail:start -->','<!-- p02-chapter:start --><section class="lesson-section"><h2>Aplică modelul vectorial</h2><p><a href="topology.html#v3-L09">L09 · Topologie completă</a>: verifică relațiile puncte–linii–poligoane, găurile și regulile modelului pe scene editabile.</p></section><!-- p02-chapter:end --><!-- learning-tail:start -->');
    }
    if(id==='digital-companion'){
      html=html.replace(/<!-- p02-hub:start -->[\s\S]*?<!-- p02-hub:end -->/g,'');
      return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,`<!-- p02-hub:start --><section class="lesson-section"><h2>Laboratoare v3 · P02</h2><p>Măsurare, reguli topologice și expresii GIS, cu date sintetice editabile.</p><ul>${manifest.companion.packages.map(key=>{const l=manifest.lessons.find(l=>l.id===key);return `<li><a href="${l.href}${key==='topology'?'#v3-L09':''}">${l.lab_id} · ${l.title}</a></li>`;}).join('')}</ul></section><!-- p02-hub:end -->$&`);
    }
    if(!['L04','L09','L20'].includes(lab))return html;
    if(lab==='L09'){
      html=html.replace(/<!-- p02:start -->[\s\S]*?<!-- p02:end -->/g,'');
      html=html.replace('<!-- learning-tail:start -->','<!-- p02:start -->'+context.window.CARTO_P02_CONTENT.section(lab)+'<!-- p02:end --><!-- learning-tail:start -->');
      // Extend the existing rule engine before any legacy topology controller runs.
      html=html.replace(/<script src="(?:js\/vendor\/turf.min.js|js\/topology-geometry.js)" defer><\/script>\s*/g,'');
      html=html.replace('<script src="js/topology-rule-engine.js" defer></script>','<script src="js/vendor/turf.min.js" defer></script><script src="js/topology-geometry.js" defer></script><script src="js/topology-rule-engine.js" defer></script>');
    }
    const scripts=['data/p02-content.js','js/v3-lab.js',...(lab==='L04'?['js/vendor/proj4.js','data/crs-registry.js','js/crs-engine.js','js/vendor/geographiclib-geodesic.min.js','js/geodesic-adapter.js','js/projection-lab-engine.js','js/topology-engine.js','js/topology-geometry.js','js/measurement-model.js','js/compare-core.js']:lab==='L20'?['js/gis-expression.js','js/calculator-model.js']:['data/p02-topology-scenes.js']),'js/p02-labs.js'];
    for(const script of scripts)html=html.replace(new RegExp(`<script src="${script.replaceAll('.','\\.')}" defer></script>\\s*`,'g'),'');
    if(!html.includes('css/p01-labs.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/p01-labs.css">\n</head>');
    if(!html.includes('css/p02-labs.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/p02-labs.css">\n</head>');
    return html.replace('</head>',scripts.map(p=>`<script src="${p}" defer></script>`).join('\n')+'\n</head>');
  };
  const p03=(html,id)=>{
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;
    html=html.replace(/<!-- p03-links:start -->[\s\S]*?<!-- p03-links:end -->/g,'');
    if(id==='digital-companion')return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,`<!-- p03-links:start --><section class="lesson-section"><h2>Laboratoare v3 · P03</h2><p>Scară, clasificare, teren și procesare vectorială pe modele controlate.</p><ul>${manifest.companion.p03.map(key=>{const l=manifest.lessons.find(l=>l.id===key);return `<li><a href="${l.href}#v3-${l.lab_id}">${l.lab_id} · ${l.title}</a></li>`;}).join('')}</ul></section><!-- p03-links:end -->$&`);
    if(id==='geospatial-data')html=html.replace('<!-- learning-tail:start -->','<!-- p03-links:start --><section class="lesson-section"><h2>Calculează pe grila raster</h2><p><a href="raster-styling.html#v3-L11">L11 · Raster Styling &amp; Terrain</a>: inspectează Horn 3×3, NoData și resampling pe un teren sintetic metric.</p></section><!-- p03-links:end --><!-- learning-tail:start -->');
    if(!['L01','L05','L11','L14'].includes(lab))return html;
    if(lab!=='L01'){
      html=html.replace(/<!-- p03:start -->[\s\S]*?<!-- p03:end -->/g,'');
      html=html.replace('<!-- learning-tail:start -->','<!-- p03:start -->'+context.window.CARTO_P03_CONTENT.section(lab)+'<!-- p03:end --><!-- learning-tail:start -->');
    }
    const scripts=['data/p03-content.js','js/v3-lab.js',...(lab==='L05'?['js/compare-core.js','js/classification-engine.js']:lab==='L11'?['js/challenges/raster-engine.js','js/raster-styling-engine.js']:lab==='L14'?['js/vendor/turf.min.js','js/topology-engine.js','js/topology-geometry.js','js/challenges/challenge-vector.js','js/gis-expression.js']:[]),'js/p03-models.js','js/p03-labs.js'];
    // Existing engines stay in their original dependency order. Only new adapters
    // are appended; duplicate engine declarations are never introduced.
    for(const script of scripts)if(!html.includes(`src="${script}"`))html=html.replace('</head>',`<script src="${script}" defer></script>\n</head>`);
    for(const css of ['css/p01-labs.css','css/p03-labs.css'])if(!html.includes(css))html=html.replace('</head>',`<link rel="stylesheet" href="${css}">\n</head>`);
    return html;
  };
  const p04=(html,id)=>{
    html=html.replace(/<!-- p04-links:start -->[\s\S]*?<!-- p04-links:end -->/g,'');
    if(id==='digital-companion')return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,`<!-- p04-links:start --><section class="lesson-section"><h2>Laboratoare v3 · P04</h2><p>Generalizare, metode tematice și calcule raster inspectabile.</p><ul>${manifest.companion.p04.map(key=>{const l=manifest.lessons.find(l=>l.id===key);return `<li><a href="${l.href}#v3-${l.lab_id}">${l.lab_id} · ${l.title}</a></li>`;}).join('')}</ul></section><!-- p04-links:end -->$&`);
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;if(!['L02','L06','L15'].includes(lab))return html;
    const scripts=['data/p04-content.js','js/v3-lab.js',...(lab==='L15'?['js/vendor/proj4.js','data/crs-registry.js','js/crs-engine.js','js/gis-expression.js']:['js/vendor/turf.min.js','js/topology-engine.js','js/topology-geometry.js','js/compare-core.js',...(lab==='L02'?['data/topology-lab.js','data/topology-rules.js','js/topology-rule-engine.js','js/p03-models.js']:['data/demo/method-datasets.js','js/method-demos.js','js/classification-engine.js']),'js/p04-cartography.js']),'js/p04-labs.js'];
    for(const script of scripts)if(!html.includes(`src="${script}"`))html=html.replace('</head>',`<script src="${script}" defer></script>\n</head>`);
    for(const css of ['css/p01-labs.css','css/p03-labs.css','css/p04-labs.css'])if(!html.includes(css))html=html.replace('</head>',`<link rel="stylesheet" href="${css}">\n</head>`);
    return html;
  };
  const p05=(html,id)=>{
    html=html.replace(/<!-- p05-links:start -->[\s\S]*?<!-- p05-links:end -->/g,'');
    if(id==='digital-companion')return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,`<!-- p05-links:start --><section class="lesson-section"><h2>Laboratoare v3 · P05</h2><p>Design cartografic, statistici spațiale și accesibilitate pe rețele.</p><ul>${manifest.companion.p05.map(key=>{const l=manifest.lessons.find(l=>l.id===key);return `<li><a href="${l.href}#${l.lab_id==='L07'?'map-design-studio':'v3-'+l.lab_id}">${l.lab_id} · ${l.title}</a></li>`;}).join('')}</ul></section><!-- p05-links:end -->$&`);
    if(['analysis','geospatial-data','method-choropleth'].includes(id))html=html.replace('<!-- learning-tail:start -->','<!-- p05-links:start --><section class="lesson-section"><h2>Verifică suportul și accesibilitatea</h2><p><a href="spatial-statistics.html#v3-L16">L16 · Agregare și MAUP</a> · <a href="network-accessibility.html#v3-L17">L17 · Costuri și rețele</a></p></section><!-- p05-links:end --><!-- learning-tail:start -->');
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;if(!['L07','L16','L17'].includes(lab))return html;
    if(lab==='L07'){
      html=html.replace(/<!-- p05:start -->[\s\S]*?<!-- p05:end -->/g,'');
      html=html.replace('<div id="design-experiment"','<!-- p05:start -->'+context.window.CARTO_P05_CONTENT.section('L07')+'<!-- p05:end --><div id="design-experiment"');
      // P05 model is available to the persistent existing studio renderer at init.
      html=html.replaceAll('<script src="js/p05-models.js" defer></script>\n','').replace('<script src="js/cartography-view.js" defer></script>','<script src="js/p05-models.js" defer></script>\n<script src="js/cartography-view.js" defer></script>');
      html=html.replace(/(<script src="js\/p05-models.js" defer><\/script>\s*){2}/g,'$1');
    }
    for(const script of ['data/p05-content.js','js/v3-lab.js',...(lab==='L07'?[]:['js/classification-engine.js','js/p05-models.js','js/compare-core.js']),'js/p05-labs.js'])if(!html.includes(`src="${script}"`))html=html.replace('</head>',`<script src="${script}" defer></script>\n</head>`);
    for(const css of ['css/p01-labs.css','css/p05-labs.css'])if(!html.includes(css))html=html.replace('</head>',`<link rel="stylesheet" href="${css}">\n</head>`);
    return html;
  };
  const p06=(html,id)=>{
    html=html.replace(/<!-- p06-links:start -->[\s\S]*?<!-- p06-links:end -->/g,'');
    const links='<a href="map-diagnostics.html#v3-L08">L08 · Diagnostic controlat</a> · <a href="spatial-decision.html#v3-L18">L18 · Decizie multicriterială</a>';
    if(id==='digital-companion')return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,`<!-- p06-links:start --><section class="lesson-section"><h2>Laboratoare v3 · P06</h2><p>Inspectează metodele, corectează controlat și compară decizii explicite.</p><p>${links}</p></section><!-- p06-links:end -->$&`);
    if(['analysis','data-quality','spatial-statistics','network-accessibility','learning-path','final-project'].includes(id))html=html.replace('<!-- learning-tail:start -->',`<!-- p06-links:start --><section class="lesson-section"><h2>De la analiză la diagnostic și decizie</h2><p>${links}. Prerechizitele sunt recomandări, nu condiții de acces.</p></section><!-- p06-links:end --><!-- learning-tail:start -->`);
    const lab=manifest.lessons.find(l=>l.id===id)?.lab_id;if(!['L08','L18'].includes(lab))return html;
    if(lab==='L08'){html=html.replace(/<!-- p06:start -->[\s\S]*?<!-- p06:end -->/g,'');html=html.replace('<!-- learning-tail:start -->','<!-- p06:start -->'+context.window.CARTO_P06_CONTENT.section(lab)+'<!-- p06:end --><!-- learning-tail:start -->');}
    for(const script of ['data/p06-content.js','js/v3-lab.js',...(lab==='L18'?['js/classification-engine.js','js/p05-models.js','js/compare-core.js']:[]),'js/gis-expression.js','js/p06-models.js','js/p06-labs.js'])if(!html.includes(`src="${script}"`))html=html.replace('</head>',`<script src="${script}" defer></script>\n</head>`);
    if(!html.includes('css/p06-labs.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/p06-labs.css">\n</head>');return html;
  };
  for(const id of Object.keys(model.items))if(!manifest.lessons.some(l=>l.id===id))throw Error('Learning item missing in manifest: '+id);
  const write=(relative,html)=>{const file=path.join(root,relative);if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==html)throw Error('Stale generated learning content: '+relative);}else fs.writeFileSync(file,html);};
  // Shared IDs map the short teaching cards to the existing detailed catalog.
  // CSV remains a supplemental import card, not a tenth detailed format.
  vm.runInContext(fs.readFileSync(path.join(root,'data/formats-lab.js'),'utf8'),context);
  const shortFormats=JSON.parse(fs.readFileSync(path.join(root,'data/geospatial-formats.json'),'utf8'));
  for(const item of shortFormats){const canonical=context.window.CARTO_FORMATS.byId[item.id];if(canonical){item.catalog_id=canonical.id;item.name=canonical.name;}}
  write('data/geospatial-formats.json',JSON.stringify(shortFormats,null,2)+'\n');
  write('data/geospatial-formats.js',"'use strict';\nwindow.CARTO_GEOSPATIAL_FORMATS = "+JSON.stringify(shortFormats)+';\n');
  // The legacy workshop catalogue and visible labels derive their level from this model.
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/tutorial-catalog.json'),'utf8'));
  for(const workshop of catalog)workshop.level=model.levels[model.items[workshop.id].level].label;
  write('data/tutorial-catalog.json',JSON.stringify(catalog,null,2)+'\n');
  const strip=html=>html.replace(/<!-- learning-(intro|tail|home):start -->[\s\S]*?<!-- learning-\1:end -->/g,'');
  const mark=(kind,html)=>`<!-- learning-${kind}:start -->${html}<!-- learning-${kind}:end -->`;
  const assets=(html,prefix)=>{
    if(!html.includes('css/learning.css'))html=html.replace('</head>',`<link rel="stylesheet" href="${prefix}css/learning.css">\n</head>`);
    if(!html.includes('data/learning-model.js')){
      const shell=html.includes('js/site.js')?'site':'app';
      html=html.replace(`<script src="${prefix}js/${shell}.js" defer></script>`,`<script src="${prefix}data/learning-model.js" defer></script>\n<script src="${prefix}js/${shell}.js" defer></script>\n<script src="${prefix}js/learning.js" defer></script>`);
    }
    return html;
  };
  const p07=(html,id)=>{
    html=html.replace(/<!-- p07-links:start -->[\s\S]*?<!-- p07-links:end -->/g,'');
    const links=id==='digital-companion'||id==='geospatial-data'?'<h2>Laboratoare v3 · P07</h2><p><a href="zarr-cloud-data.html">L12 · Zarr Cloud Data Lab</a> · <a href="georeferencing-lab.html">L19 · Georeferențiere Stereo 70</a></p>':id==='formats-interoperability'?'<h2>Experimentează după F5/F6</h2><p><a href="zarr-cloud-data.html">L12 · Zarr: snapshot offline și acces modelat</a></p>':id==='projection-crs-lab'?'<h2>Aplică coordonatele proiectate</h2><p><a href="georeferencing-lab.html">L19 · Două hărți fictive în Stereo 70</a></p>':'';
    if(!links)return html;const block='<!-- p07-links:start --><section class="lesson-section">'+links+'</section><!-- p07-links:end -->';
    return html.replace(/<footer\b[^>]*class="[^"]*site-footer[^"]*"/,block+'$&');
  };
  const insert=(html,id,prefix)=>{
    html=strip(html);
    if(id==='home')return html.replace(/(<section class="overview-section")/,mark('home',ui.companionHome()+ui.home())+'$1');
    if(id==='digital-companion')return html;
    if(!model.items[id])return html;
    const main=html.match(/<main\b[^>]*>[\s\S]*?<\/main>/)?.[0];if(!main)throw Error('Missing main: '+id);
    // The older coordinates page calls its opening section "intro".
    let next=main.replace(/<(section|header)\b[^>]*>[\s\S]*?<\/\1>/,block=>block.includes('<h1>')?block+mark('intro',ui.intro(id,prefix)):block);
    if(next===main)throw Error('Missing hero: '+id);
    const tail=mark('tail',ui.tail(id,prefix));
    if(next.includes('site-footer'))next=next.replace(/<footer\b[^>]*class="[^"]*site-footer[^\"]*"/,tail+'$&');else next=next.replace('</main>',tail+'</main>');
    return html.replace(main,next);
  };
  const template=strip(fs.readFileSync(path.join(root,'gis-lab.html'),'utf8'));
  const footer=template.match(/<footer\b[^>]*class="[^"]*site-footer[^"]*"[\s\S]*?<\/footer>/)[0];
  for(const [id,page] of Object.entries(pages)){
    const record=manifest.lessons.find(l=>l.id===id);
    const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    let body=page.body.replace('{{levels}}',ui.levels()).replace('{{stages}}',ui.stages()).replace('{{inventory}}',ui.inventory()).replace('{{glossary}}',ui.glossary());
    body=body.replace('{{companion-hub}}',ui.companionHub());
    if(body.includes('{{diagnostic-content}}'))body=body.replace('{{diagnostic-content}}',context.window.CARTO_DIAGNOSTIC_CONTENT.content());
    body=body.replace(/\{\{qgis:([\w-]+)\}\}/g,(_,id)=>{const source=JSON.parse(fs.readFileSync(path.join(root,'data/qgis-links.json'),'utf8')).links.find(s=>s.id===id&&s.verified);if(!source)throw Error('Unknown QGIS source: '+id);return `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(source.title)}; se deschide într-o filă nouă">${escape(source.title)} ↗</a>`;});
    if(body.includes('{{projection-crs-sources}}')){const registry=JSON.parse(fs.readFileSync(path.join(root,'data/crs-registry.json'),'utf8'));body=body.replace('{{projection-crs-sources}}','<ul>'+registry.crs.filter(c=>[4326,3857,3844,32634,32635].includes(c.epsg)).map(c=>`<li><a href="${escape(c.source_url)}" target="_blank" rel="noopener noreferrer">${escape(c.id)} · ${escape(c.name)} ↗</a></li>`).join('')+'</ul>');}
    let html=assets(template,'').replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title} · Explorare geospațială</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${page.description}">`).replace('data-page="gis-lab" data-page-id="gis-lab"',`data-page="learning" data-page-id="${id}"`);
    html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,`<main id="main-content" class="learning-main"><div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> → <a href="learning-path.html">Parcurs recomandat</a></div><section class="lesson-hero"><span class="eyebrow">${page.eyebrow||'CONSOLIDARE · ÎNVĂȚARE ȘI APLICARE'}</span><h1>${page.title}</h1><p class="lead">${page.description}</p></section>${body}${footer}</main>`);
    if(!html.includes('data/glossary.js'))html=html.replace('<script src="data/content-manifest.js" defer></script>','<script src="data/content-manifest.js" defer></script>\n<script src="data/glossary.js" defer></script>');
    html=html.replace('</head>',`${(page.styles||[]).map(p=>`<link rel="stylesheet" href="${p}">`).join('\n')}\n${(page.scripts||[]).map(p=>`<script src="${p}" defer></script>`).join('\n')}\n<link rel="canonical" href="https://mariusbudileanu.github.io/explorare-geospatiala/${record.href}">\n</head>`);
    write(record.href,p07(p06(p05(p04(p03(p02(p01(insert(html,id,''),id),id),id),id),id),id),id));
  }
  const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat(fs.readdirSync(path.join(root,'tutorials')).filter(f=>f.endsWith('.html')).map(f=>'tutorials/'+f));
  for(const file of files){
    if(Object.values(pages).some(p=>manifest.lessons.find(l=>l.title===p.title)?.href===file))continue;
    const original=fs.readFileSync(path.join(root,file),'utf8'),prefix=file.startsWith('tutorials/')?'../':'';
    const item=manifest.lessons.find(l=>l.href===file),id=item?.id;
    // Query-selected lessons receive the same markup after their existing renderer.
    let html=id==='coordinates'?original.replace('<body>','<body data-page-id="coordinates">'):original;
    if(id==='styling-labeling'){
      html=html.replace(/<!-- map-design-entry:start -->[\s\S]*?<!-- map-design-entry:end -->/,'');
      html=html.replace(/<!-- map-design:start -->[\s\S]*?<!-- map-design:end -->/,'');
      html=html.replace('<!-- learning-tail:start -->',`<!-- map-design:start -->${qgisMarkup(context.window.CARTO_DESIGN_PROSE)}<!-- map-design:end --><!-- learning-tail:start -->`);
      if(!html.includes('css/cartography-labs.css'))html=html.replace('</head>','<link rel="stylesheet" href="css/cartography-labs.css">\n'+['js/compare-core.js','js/classification-engine.js','data/cartography-scenes.js','js/cartography-view.js','js/cartography-labs.js'].map(p=>`<script src="${p}" defer></script>`).join('\n')+'\n</head>');
    }
    if(/^T0[1-6]$/.test(id)){
      const level=model.levels[model.items[id].level].label;
      html=html.replace(/(<div class="tutorial-meta"><span>)[^<]+/, '$1'+level);
      // Preserve the legacy explanation, but derive its level from the badge's source.
      let sections=0;
      html=html.replace(/<article class="tutorial-step\b[\s\S]*?<\/article>/g,block=>{
        if(!/<h3>[^<]*nivel de dificultate<\/h3>/i.test(block))return block;
        sections++;
        return block.replace(/(<p>(?:Nivelul (?:tutorialului )?este )?<strong>)[^<]+(<\/strong>)/, '$1'+level+'$2');
      });
      if(sections!==1)throw Error('Missing or duplicate workshop level section: '+id);
    }
    if(id==='tutorials')html=html.replace(/(<div class="workshop-card-top"><span class="workshop-id">)(T0[1-6])(<\/span><span>)[^<]+( · [^<]+<\/span>)/g,(_,a,key,b,d)=>a+key+b+model.levels[model.items[key].level].label+d);
    write(file,p07(p06(p05(p04(p03(p02(p01(insert(assets(html,prefix),id,prefix),id),id),id),id),id),id),id));
  }
}
