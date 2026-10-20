const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function loadModel() {
  const context = {window:{}}; vm.createContext(context);
  for (const file of ['data/content-manifest.js','data/learning-model.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  return context.window;
}
async function browserServer(options={}) {
  const {chromium} = require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES,'playwright') : 'playwright');
  const server = http.createServer((req,res)=>{
    const relative = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/explorare-geospatiala\/|^\//,'') || 'index.html';
    const file = path.resolve(root,relative);
    if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.png':'image/png','.tif':'image/tiff'}[path.extname(file)]||'application/octet-stream';
    fs.readFile(file,(error,buffer)=>{if(error){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':type});res.end(buffer);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {browser=await chromium.launch({headless:true,executablePath:process.env.QA_BROWSER_PATH||undefined,...options});}
  catch(error){server.close();throw error;}
  return {browser,base:`http://127.0.0.1:${server.address().port}/explorare-geospatiala/`,close:async()=>{await browser.close();await new Promise(resolve=>server.close(resolve));}};
}
module.exports={fs,path,root,loadModel,browserServer};
