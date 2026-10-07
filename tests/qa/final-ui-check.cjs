// UI regression: use QA_BASE_URL for the local project-pages preview.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const {root,manifest,playwright,browserOptions,inspectNavigation,homeDestinations,checkHomeDestinations}=require('./expectations.cjs');
process.chdir(root);
const {chromium}=playwright();
const out = path.join(root, 'tmp/qa/final-ui');
fs.mkdirSync(out, {recursive:true});
const sandbox = {window:{}}; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/content-manifest.js'), 'utf8'), sandbox);
const routes = [...new Set(sandbox.window.CARTO_CONTENT.lessons.map(item => item.href))];
const destinations=homeDestinations;
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4183/explorare-geospatiala/', failures = [], measurements = [];
let checks = 0;
function check(value, message) { checks++; if (!value) failures.push(message); }
async function inspect(page, label) {
  const result = await page.evaluate(() => ({
    undefined: /\bundefined\b/.test(document.body.innerText),
    badge: document.body.innerText.includes('MVP 1'),
    overflow: document.documentElement.scrollWidth > innerWidth + 1
  }));
  for (const [key, value] of Object.entries(result)) check(!value, `${label}: ${key}`);
}
async function openNav(page) {
  if (await page.locator('body').evaluate(e => e.classList.contains('nav-collapsed'))) await page.locator('#nav-toggle').click();
  await page.waitForTimeout(100);
}
(async () => {
  const browser = await chromium.launch(browserOptions());
  try {
    const all = await browser.newPage({viewport:{width:1440,height:960}});
    all.on('pageerror', error => failures.push(error.message));
    for (const route of routes) { await all.goto(base + route); await inspect(all, route); }
    await all.close();
    for (const width of [1440,1024,768,390]) for (const dark of [false,true]) {
      const label = `${width}-${dark?'dark':'light'}`;
      const context = await browser.newContext({viewport:{width,height:960}, reducedMotion:'reduce'});
      await context.addInitScript(dark => localStorage.setItem('cartografie-theme',dark?'dark':'light'), dark);
      const page = await context.newPage();
      page.on('pageerror', error => failures.push(`${label}: ${error.message}`));
      page.on('console', message => {if (message.type()==='error') failures.push(`${label}: ${message.text()}`);});
      page.on('response', response => {if(response.url().startsWith(base) && response.status()>=400) failures.push(`${label}: HTTP ${response.status()} ${response.url()}`);});
      await page.goto(base + 'index.html'); await inspect(page,label+' home');
      const sizes = await page.locator('.home-actions > a').evaluateAll(links => links.map(link => {
        const r = link.getBoundingClientRect(), style = getComputedStyle(link);
        return {width:r.width,height:r.height,padding:style.padding,radius:style.borderRadius,font:style.font,textInset:link.firstElementChild.getBoundingClientRect().left-r.left,arrowInset:r.right-link.lastElementChild.getBoundingClientRect().right,href:link.getAttribute('href'),overflow:link.scrollWidth>link.clientWidth+1};
      }));
      checkHomeDestinations(sizes.map(s=>s.href));checks++;
      await inspectNavigation(page,manifest(),base);checks++;
      check(sizes.every(s=>Math.abs(s.width-sizes[0].width)<1&&Math.abs(s.height-sizes[0].height)<1&&s.padding===sizes[0].padding&&s.radius===sizes[0].radius&&s.font===sizes[0].font&&!s.overflow),label+' uniform CTA dimensions');
      check(sizes.every(s=>Math.abs(s.textInset-sizes[0].textInset)<1&&Math.abs(s.arrowInset-sizes[0].arrowInset)<1),label+' text and arrow alignment');
      measurements.push({label,ctas:sizes});
      await page.locator('.home-actions').screenshot({path:path.join(out,label+'-ctas.png')});
      for (const destination of destinations) {
        await page.goto(base+'index.html');
        await page.locator(`.home-actions > a[href="${destination}"]`).click();
        await page.waitForURL(base+destination);
        await inspect(page,label+' destination '+destination);
        if(destination==='challenges.html')await page.waitForFunction(()=>!document.querySelector('#challenge-run').disabled);
        if (destination.includes('#vector-lab')||destination.includes('#raster-lab')) {
          const position=await page.locator(destination.includes('#vector-lab')?'#vector-lab':'#raster-lab').evaluate(e=>({top:e.getBoundingClientRect().top,header:document.querySelector('.topbar').getBoundingClientRect().bottom}));
          check(position.top>=position.header-1&&position.top<400,label+' processing anchor visible '+JSON.stringify(position));
        }
      }
      await page.goto(base+'lesson.html?id=about'); await inspect(page,label+' about');
      check(JSON.stringify(await page.locator('.next-card strong').allTextContents())===JSON.stringify(['Privire de ansamblu','Resurse']),label+' about card titles');
      await page.goto(base+'projection-intro.html');
      for(const projection of ['mercator','eqearth','lambert-cyl']) {
        await page.locator('#dist-projection').selectOption(projection);
        const line=await page.locator('#dist-svg').evaluate(svg=>{
          const eq=svg.querySelector('.equator'),box=eq.getBBox(),style=getComputedStyle(eq),meridian=svg.querySelector('.meridian');
          const paths=[...svg.querySelectorAll('path')];
          return {length:eq.getTotalLength(),x:box.x,y:box.y,width:box.width,height:box.height,stroke:style.stroke,grid:getComputedStyle(svg.querySelector('.grid')).stroke,meridian:meridian.getTotalLength(),inside:box.x>=0&&box.x+box.width<=650,order:paths.indexOf(eq)>paths.findLastIndex(p=>p.classList.contains('grid'))&&paths.indexOf(eq)<paths.findIndex(p=>p.classList.contains('test-circle'))};
        });
        check(line.length>300&&Math.abs(line.y-170)<.01&&line.height<.01&&line.inside&&line.stroke!==line.grid&&line.meridian>80&&line.order,label+' true equator '+projection+' '+JSON.stringify(line));
        await page.locator('#dist-equator').uncheck(); check(await page.locator('#dist-svg .equator').count()===0,label+' equator off '+projection);
        await page.locator('#dist-equator').check();
        await page.locator('#dist-grid').uncheck(); check(await page.locator('#dist-svg .grid').count()===0&&await page.locator('#dist-svg .equator').count()===1,label+' independent grid '+projection); await page.locator('#dist-grid').check();
        await page.locator('#dist-meridian').uncheck(); check(await page.locator('#dist-svg .meridian').count()===0,label+' meridian toggle'); await page.locator('#dist-meridian').check();
        await page.locator('#dist-circles').uncheck(); check(await page.locator('#dist-svg .test-circle').count()===0,label+' circle toggle'); await page.locator('#dist-circles').check();
        await page.locator('#dist-svg').screenshot({path:path.join(out,label+'-'+projection+'.png')});
      }
      await inspect(page,label+' projections');
      await page.goto(base+'index.html'); await openNav(page);
      await page.locator('#sidebar').evaluate(sidebar=>{const target=sidebar.querySelector('a[href="tutorials/t01.html"]');sidebar.scrollTop+=target.getBoundingClientRect().top-sidebar.getBoundingClientRect().top-sidebar.clientHeight/2;});
      for(const route of ['tutorials/t01.html','tutorials/t02.html']) {
        const before=await page.locator('#sidebar').evaluate(e=>e.scrollTop);
        check(before>500,label+' start near lower chapters');
        await page.locator(`#chapter-nav a[href$="${route}"]`).click(); await page.waitForURL(base+route); await openNav(page);
        const after=await page.locator('#sidebar').evaluate(e=>{const a=e.querySelector('[aria-current=page]'),r=a.getBoundingClientRect(),b=e.getBoundingClientRect();return {top:e.scrollTop,max:e.scrollHeight-e.clientHeight,activeTop:r.top-b.top,activeBottom:r.bottom-b.top,height:e.clientHeight,main:scrollY};});
        check(Math.abs(after.top-Math.min(before,after.max))<2,label+' sidebar restoration '+JSON.stringify({before,after}));
        check(after.activeTop>=0&&after.activeBottom<=after.height,label+' active visible');
        check(after.main===0,label+' main scroll untouched');
        measurements.push({label,route,before,after});
      }
      const collapse=await page.locator('#chapter-nav .nav-group').last().locator('summary');
      await collapse.click();
      const folded=await page.locator('#sidebar').evaluate(e=>({top:e.scrollTop,max:e.scrollHeight-e.clientHeight}));
      check(folded.top>500,label+' collapse stays low');
      await collapse.click();
      check(Math.abs(await page.locator('#sidebar').evaluate(e=>e.scrollTop)-folded.top)<2,label+' expand does not jump');
      await page.locator('#nav-toggle').click(); await openNav(page);
      check(await page.locator('#sidebar').evaluate(e=>e.scrollTop)>500,label+' drawer reopen position');
      await page.locator('#nav-toggle').click();
      await page.locator('#search').fill('Buffer'); await page.locator('#search').press('ArrowDown');
      check(await page.evaluate(()=>!!document.activeElement.closest('#search-results')),label+' keyboard search');
      await page.goto(base+'tutorials/t01.html');
      const opener=page.locator('.tutorial-image-button').first(); await opener.click(); await page.keyboard.press('Escape');
      check(!await page.locator('#tutorial-dialog').evaluate(e=>e.open)&&await opener.evaluate(e=>document.activeElement===e),label+' modal Escape/focus');
      const previous=await page.locator('body').evaluate(e=>e.classList.contains('dark')); await page.locator('#theme-toggle').click();
      check(await page.locator('body').evaluate(e=>e.classList.contains('dark'))!==previous,label+' theme toggle');
      await context.close(); console.log('Completed '+label);
    }
  } finally { await browser.close(); }
  const result={routes:routes.length,checks,failures,measurements};
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({routes:routes.length,checks,failures},null,2)); if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
