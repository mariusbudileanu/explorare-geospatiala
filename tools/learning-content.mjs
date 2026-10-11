/** Generate progressive learning additions from the shared runtime renderers. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export function buildLearning(root,{check=false}={}) {
  const context={window:{}};vm.createContext(context);
  for(const file of ['data/content-manifest.js','data/glossary.js','data/learning-model.js','data/learning-pages.js','js/learning.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  const {CARTO_CONTENT:manifest,CARTO_LEARNING:model,CARTO_LEARNING_UI:ui,CARTO_LEARNING_PAGES:pages}=context.window;
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
    const body=page.body.replace('{{levels}}',ui.levels()).replace('{{stages}}',ui.stages()).replace('{{inventory}}',ui.inventory()).replace('{{glossary}}',ui.glossary());
    let html=assets(template,'').replace(/<title>[\s\S]*?<\/title>/,`<title>${page.title} · Explorare geospațială</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${page.description}">`).replace('data-page="gis-lab" data-page-id="gis-lab"',`data-page="learning" data-page-id="${id}"`);
    html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,`<main id="main-content" class="learning-main"><div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> → <a href="learning-path.html">Parcurs recomandat</a></div><section class="lesson-hero"><span class="eyebrow">CONSOLIDARE · ÎNVĂȚARE ȘI APLICARE</span><h1>${page.title}</h1><p class="lead">${page.description}</p></section>${body}${footer}</main>`);
    if(!html.includes('data/glossary.js'))html=html.replace('<script src="data/content-manifest.js" defer></script>','<script src="data/content-manifest.js" defer></script>\n<script src="data/glossary.js" defer></script>');
    html=html.replace('</head>',`<link rel="canonical" href="https://mariusbudileanu.github.io/explorare-geospatiala/${record.href}">\n</head>`);
    write(record.href,insert(html,id,''));
  }
  const files=fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat(fs.readdirSync(path.join(root,'tutorials')).filter(f=>f.endsWith('.html')).map(f=>'tutorials/'+f));
  for(const file of files){
    if(Object.values(pages).some(p=>manifest.lessons.find(l=>l.title===p.title)?.href===file))continue;
    const original=fs.readFileSync(path.join(root,file),'utf8'),prefix=file.startsWith('tutorials/')?'../':'';
    const item=manifest.lessons.find(l=>l.href===file),id=item?.id;
    // Query-selected lessons receive the same markup after their existing renderer.
    let html=id==='coordinates'?original.replace('<body>','<body data-page-id="coordinates">'):original;
    if(/^T0[1-6]$/.test(id))html=html.replace(/(<div class="tutorial-meta"><span>)[^<]+/, '$1'+model.levels[model.items[id].level].label);
    if(id==='tutorials')html=html.replace(/(<div class="workshop-card-top"><span class="workshop-id">)(T0[1-6])(<\/span><span>)[^<]+( · [^<]+<\/span>)/g,(_,a,key,b,d)=>a+key+b+model.levels[model.items[key].level].label+d);
    write(file,insert(assets(html,prefix),id,prefix));
  }
}
