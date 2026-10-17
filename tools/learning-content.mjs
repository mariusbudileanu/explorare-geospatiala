/** Generate progressive learning additions from the shared runtime renderers. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function buildLearning(root,{check=false}={}) {
  const context={window:{}};vm.createContext(context);
  for(const file of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js','data/p01-content.js','data/p02-content.js','data/p03-content.js','data/diagnostic-scenes.js','js/diagnostic-content.js','js/learning.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
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
    write(record.href,p03(p02(p01(insert(html,id,''),id),id),id));
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
    write(file,p03(p02(p01(insert(assets(html,prefix),id,prefix),id),id),id));
  }
}
