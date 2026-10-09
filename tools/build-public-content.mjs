/** Build static recovery content and the textual search index from the existing renderers.
 * Usage: node tools/build-public-content.mjs [--check]
 * Requires Playwright and a Chromium executable (QA_BROWSER_PATH); no runtime dependency.
 */
import fs from 'node:fs';
import {buildWorkshops} from './workshop-content.mjs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES,'playwright') : 'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const check=process.argv.includes('--check');
buildWorkshops(root,{check});
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'data/content-manifest.js'),'utf8'),context);
const manifest=context.window.CARTO_CONTENT;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write=(relative,content)=>{const p=path.join(root,relative);if(check){if(fs.readFileSync(p,'utf8')!==content){if(relative==='data/search-index.js'){const decode=text=>JSON.parse(text.slice(text.indexOf(' = ')+3).replace(/;\s*$/,''));const old=decode(fs.readFileSync(p,'utf8')),next=decode(content);for(const r of next){const prev=old.find(x=>x.id===r.id);if(JSON.stringify(prev)!==JSON.stringify(r))console.error('Changed search content: '+r.id+' '+JSON.stringify({added:r.paragraphs.filter(x=>!prev?.paragraphs.includes(x)),removed:prev?.paragraphs.filter(x=>!r.paragraphs.includes(x))}));}}throw Error('Generated file is stale: '+relative);}}else fs.writeFileSync(p,content);};
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/data-registry.json'),'utf8'));
write('data/data-registry.js','/* Generated from data-registry.json. */\nwindow.CARTO_DATA_REGISTRY = '+JSON.stringify(registry,null,2)+';\n');
const server=http.createServer((req,res)=>{
 const rel=decodeURIComponent(new URL(req.url,'http://preview.invalid').pathname).replace(/^\/explorare-geospatiala\//,'')||'index.html';
 const p=path.resolve(root,rel);
 if(!p.startsWith(root+path.sep)||!(/^(assets|css|js|data|tutorials)\//.test(rel)||/^[^/]+\.html$/.test(rel))){res.writeHead(404).end();return;}
 const type={'.js':'text/javascript','.html':'text/html; charset=utf-8','.json':'application/json','.css':'text/css','.geojson':'application/geo+json','.svg':'image/svg+xml','.tif':'image/tiff'}[path.extname(p)]||'application/octet-stream';
 fs.readFile(p,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':type});res.end(b);});
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`;
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_PATH?{executablePath:process.env.QA_BROWSER_PATH}:{})});
try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const generated=new Map();let licenseSummary='';
 for(const [file,route,selector] of [['about.html','lesson.html?id=about','#lesson-root'],['resources.html','resources.html','#resources-root']]){
  await page.goto(base+route);if(file==='resources.html')await page.waitForFunction(()=>document.querySelectorAll('.resource-card[data-category="Provocări GIS"]').length===9);
  const html=await page.locator(selector).innerHTML();if(!html.includes('<h1>'))throw Error('Incomplete '+file);
  generated.set(file,html);if(file==='about.html')licenseSummary=await page.locator('.license-summary').evaluate(e=>e.outerHTML);
 }
 for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.html')).concat(fs.readdirSync(path.join(root,'tutorials')).filter(f=>f.endsWith('.html')).map(f=>'tutorials/'+f))){
  let html=fs.readFileSync(path.join(root,file),'utf8');
  if(generated.has(file)){const id=file==='about.html'?'lesson-root':'resources-root';html=html.replace(new RegExp(`(<main[^>]+id="${id}"[^>]*>)[\\s\\S]*?</main>`),(_,open)=>open+generated.get(file)+'</main>');}
  // Static navigation is also generated from the manifest, never maintained separately.
  const prefix=file.startsWith('tutorials/')?'../':'';
  const nav=manifest.groups.map(g=>`<details class="nav-group" open><summary>${esc(g.label)}</summary>${g.lessons.map(id=>{const l=manifest.lessons.find(x=>x.id===id);return `<a class="nav-item" href="${prefix}${esc(l.href)}">${l.editorial_number?esc(l.editorial_number)+' ':''}${esc(l.title)}</a>`;}).join('')}</details>`).join('');
  html=html.replace(/(<nav[^>]+id="chapter-nav"[^>]*>)[\s\S]*?<\/nav>/,(_,open)=>open+nav+'</nav>');
  if(file==='about.html')html=html.replace(/(<meta name="description" content=")[^"]*/, '$1Resursă educațională de cartografie și GIS pentru licență și master; autor, metodologie, licențe și citare.');
  if(file==='resources.html')html=html.replace('class="resource-filters"','class="resource-filters" hidden');
  if(!html.includes('class="license-summary"'))html=html.replace(/(<footer[^>]*class="[^"]*site-footer[^"]*"[^>]*>)[\s\S]*?<\/footer>/,block=>block.replace('</footer>',licenseSummary.replace(/href="(?!https:)([^"]*)"/g,(_,href)=>`href="${prefix}${href}"`)+'</footer>'));
  write(file,html);
 }
 const records=[];
 for(const lesson of manifest.lessons){
  await page.goto(base+lesson.href);
  if(lesson.id==='resources')await page.waitForFunction(()=>document.querySelectorAll('.resource-card[data-category="Provocări GIS"]').length===9);
  const record=await page.locator('main').evaluate(main=>{
   const paragraphs=[...main.querySelectorAll('h2,h3,p,li,dt,dd,th,td,figcaption')].filter(e=>!e.closest('footer,nav,dialog,noscript,.runtime-notice,[aria-live],.feedback')).map(e=>e.textContent.replace(/\s+/g,' ').trim()).filter(t=>t.length>3);
   const description=main.querySelector('.lead')?.textContent.replace(/\s+/g,' ').trim()||main.querySelector('h1')?.textContent.trim();
   return {description,paragraphs:[...new Set(paragraphs)]};
  });
  records.push({id:lesson.id,href:lesson.href,description:record.description||lesson.title,paragraphs:record.paragraphs});
 }
 if(errors.length)throw Error([...new Set(errors)].join('\n'));
 write('data/search-index.js','/* Generated from rendered educational content; do not edit by hand. */\nwindow.CARTO_SEARCH_INDEX = '+JSON.stringify(records,null,2)+';\n');
 console.log(`${check?'Verified':'Generated'} About, Resources, static navigation and ${records.length} textual search records.`);
} finally {await browser.close();await new Promise(r=>server.close(r));}
