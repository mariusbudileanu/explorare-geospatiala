/** Generate progressive learning additions from the shared runtime renderers. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function buildLearning(root,{check=false}={}) {
  const context={window:{}};vm.createContext(context);
  for(const file of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js','js/learning.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  const {CARTO_CONTENT:manifest,CARTO_LEARNING:model,CARTO_LEARNING_UI:ui,CARTO_LEARNING_PAGES:pages}=context.window;
  const qgisLinks=JSON.parse(fs.readFileSync(path.join(root,'data/qgis-links.json'),'utf8')).links;
  const qgisMarkup=html=>html.replace(/\{\{qgis:([\w-]+)\}\}/g,(_,id)=>{const s=qgisLinks.find(s=>s.id===id&&s.verified);if(!s)throw Error('Unknown QGIS source: '+id);return `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title} ↗</a>`;});
  for(const id of Object.keys(model.items))if(!manifest.lessons.some(l=>l.id===id))throw Error('Learning item missing in manifest: '+id);
  const write=(relative,html)=>{const file=path.join(root,relative);if(check){if(!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==html)throw Error('Stale generated learning content: '+relative);}else fs.writeFileSync(file,html);};
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
    if(id==='home')return html.replace(/(<section class="overview-section")/,mark('home',ui.home())+'$1');
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
    body=body.replace(/\{\{qgis:([\w-]+)\}\}/g,(_,id)=>{const source=JSON.parse(fs.readFileSync(path.join(root,'data/qgis-links.json'),'utf8')).links.find(s=>s.id===id&&s.verified);if(!source)throw Error('Unknown QGIS source: '+id);return `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escape(source.title)}; se deschide într-o filă nouă">${escape(source.title)} ↗</a>`;});
    if(body.includes('{{projection-crs-sources}}')){const registry=JSON.parse(fs.readFileSync(path.join(root,'data/crs-registry.json'),'utf8'));body=body.replace('{{projection-crs-sources}}','<ul>'+registry.crs.filter(c=>[4326,3857,3844,32634,32635].includes(c.epsg)).map(c=>`<li><a href="${escape(c.source_url)}" target="_blank" rel="noopener noreferrer">${escape(c.id)} · ${escape(c.name)} ↗</a></li>`).join('')+'</ul>');}
    let html=assets(template,'').replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title} · Explorare geospațială</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${page.description}">`).replace('data-page="gis-lab" data-page-id="gis-lab"',`data-page="learning" data-page-id="${id}"`);
    html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,`<main id="main-content" class="learning-main"><div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> → <a href="learning-path.html">Parcurs recomandat</a></div><section class="lesson-hero"><span class="eyebrow">${page.eyebrow||'CONSOLIDARE · ÎNVĂȚARE ȘI APLICARE'}</span><h1>${page.title}</h1><p class="lead">${page.description}</p></section>${body}${footer}</main>`);
    if(!html.includes('data/glossary.js'))html=html.replace('<script src="data/content-manifest.js" defer></script>','<script src="data/content-manifest.js" defer></script>\n<script src="data/glossary.js" defer></script>');
    html=html.replace('</head>',`${(page.styles||[]).map(p=>`<link rel="stylesheet" href="${p}">`).join('\n')}\n${(page.scripts||[]).map(p=>`<script src="${p}" defer></script>`).join('\n')}\n<link rel="canonical" href="https://mariusbudileanu.github.io/explorare-geospatiala/${record.href}">\n</head>`);
    write(record.href,insert(html,id,''));
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
      html=html.replace('<nav class="lab-mode"',`<!-- map-design-entry:start -->${context.window.CARTO_DESIGN_ENTRY}<!-- map-design-entry:end --><nav class="lab-mode"`);
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
    write(file,insert(assets(html,prefix),id,prefix));
  }
}
