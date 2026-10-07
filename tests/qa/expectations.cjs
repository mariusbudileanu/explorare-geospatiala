'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '../..');
function manifest() {
  const context = {window: {}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'data/content-manifest.js'), 'utf8'), context);
  return JSON.parse(JSON.stringify(context.window.CARTO_CONTENT));
}
function playwright() {
  return require(process.env.CODEX_NODE_MODULES ? path.join(process.env.CODEX_NODE_MODULES, 'playwright') : 'playwright');
}
function browserOptions() {
  return {headless: true, ...(process.env.QA_BROWSER_PATH ? {executablePath: process.env.QA_BROWSER_PATH} : {})};
}

// These destinations are the intended homepage entry points, independent of DOM order.
const homeDestinations = [
  'coordinates.html', 'projection-intro.html',
  'geospatial-data.html#vector-lab', 'geospatial-data.html#raster-lab',
  'tutorials/index.html', 'challenges.html'
];
function checkHomeDestinations(actual) {
  assert.equal(new Set(actual).size, actual.length, 'Duplicate homepage CTA');
  assert.deepEqual([...actual].sort(), [...homeDestinations].sort(), 'Homepage CTA destination set');
}

const laboratoryDestinations = {
  'gis-lab': 'gis-lab.html', 'styling-labeling': 'styling-labeling.html',
  'transparency-blending': 'transparency-blending.html', 'raster-styling': 'raster-styling.html',
  topology: 'topology.html', 'formats-interoperability': 'formats-interoperability.html',
  challenges: 'challenges.html'
};
function checkNavigation(groups, activeLinks, content, base, currentURL) {
  const byId = new Map(content.lessons.map(lesson => [lesson.id, lesson]));
  assert.equal(byId.size, content.lessons.length, 'Duplicate manifest lesson ID');
  const ids = content.groups.flatMap(group => group.lessons);
  assert.equal(new Set(ids).size, ids.length, 'Duplicate manifest navigation membership');
  assert.deepEqual([...ids].sort(), [...byId.keys()].sort(), 'All manifest lessons belong to navigation');
  const lab = content.groups.find(group => group.id === 'gis-lab');
  assert.ok(lab, 'Laborator GIS group is required');
  for (const [id, href] of Object.entries(laboratoryDestinations)) {
    assert.equal(byId.get(id)?.href, href, 'Required laboratory destination: ' + id);
    assert.ok(lab.lessons.includes(id), 'Required laboratory group membership: ' + id);
  }
  const expected = content.groups.map(group => ({
    label: group.label,
    links: group.lessons.map(id => {
      const lesson = byId.get(id);
      assert.ok(lesson, 'Unknown navigation lesson: ' + id);
      return {href: new URL(lesson.href, base).href,
        text: (lesson.editorial_number ? lesson.editorial_number + ' ' : '') + lesson.title};
    })
  }));
  assert.deepEqual(groups, expected, 'Exact navigation groups, ordering, labels and destinations');
  const hrefs = groups.flatMap(group => group.links.map(link => link.href));
  assert.equal(new Set(hrefs).size, hrefs.length, 'Duplicate navigation destination');
  const current = new URL(currentURL);
  const currentDestinations = hrefs.filter(href => {
    const target = new URL(href);
    return target.origin === current.origin && target.pathname === current.pathname &&
      target.searchParams.get('id') === current.searchParams.get('id');
  });
  assert.equal(currentDestinations.length, 1, 'Current route identifies exactly one navigation lesson');
  assert.deepEqual(activeLinks, currentDestinations, 'Exactly the current page is marked active');
}
async function inspectNavigation(page, content, base) {
  const state = await page.locator('#chapter-nav').evaluate(nav => ({
    groups: [...nav.querySelectorAll('.nav-group')].map(group => ({
      label: group.querySelector('summary').textContent.trim(),
      links: [...group.querySelectorAll('a')].map(link => ({href: link.href, text: link.textContent.trim()}))
    })),
    activeLinks: [...nav.querySelectorAll('a[aria-current="page"]')].map(link => link.href)
  }));
  checkNavigation(state.groups, state.activeLinks, content, base, page.url());
  return state;
}

const sourceRoles = {boundary: 'Contur UAT', schools: 'Puncte școlare',
  censusGrid: 'Grid vectorial de populație', primaryCare: 'Medicină de familie',
  secondaryCare: 'Cabinete și ambulatorii', hospitals: 'Spitale',
  dem: 'Model digital al elevației', forestLoss: 'An de pierdere forestieră'};
// Pin the documented links by dataset ID so accidental loss from the registry fails too.
const documentedSourceLinks = {
  'sector1/schools': 'https://data.gov.ro/dataset/reteaua-scolara-2022-2023',
  'risca/forestLoss': 'https://globalnaturewatch.org/map/www.globalnaturewatch.org'
};
function checkSourceCards(cards, registry) {
  assert.deepEqual(Object.keys(registry.sector1).sort(),
    ['boundary', 'schools', 'censusGrid', 'primaryCare', 'secondaryCare', 'hospitals'].sort(),
    'Required Sector 1 datasets');
  assert.deepEqual(Object.keys(registry.risca).sort(),
    ['boundary', 'dem', 'forestLoss', 'rasterMetadata'].sort(), 'Required Rîșca datasets');
  const entries = ['sector1', 'risca'].flatMap(area => Object.entries(registry[area])
    .filter(([id]) => id !== 'rasterMetadata').map(([id, entry]) => ({area, id, entry})));
  const titles = entries.map(({entry}) => entry.display_name);
  assert.equal(new Set(titles).size, titles.length, 'Dataset display names must identify cards uniquely');
  assert.equal(new Set(cards.map(card => card.title)).size, cards.length, 'Duplicate dataset resource card');
  assert.deepEqual(cards.map(card => card.title).sort(), [...titles].sort(), 'Exact dataset resource card set');
  for (const {area, id, entry} of entries) {
    const key = area + '/' + id, card = cards.find(card => card.title === entry.display_name);
    if (documentedSourceLinks[key]) assert.equal(entry.source?.url, documentedSourceLinks[key], 'Documented source URL: ' + key);
    const source = entry.source?.url;
    const links = source?.startsWith('https://') ? [source] : [];
    assert.deepEqual(card.links.map(link => link.href), links, 'Source link for ' + key);
    for (const link of card.links) {
      assert.equal(new URL(link.href).protocol, 'https:', 'HTTPS source for ' + key);
      assert.equal(link.target, '_blank', 'External source target for ' + key);
      assert.ok(link.rel.split(/\s+/).includes('noopener') && link.rel.split(/\s+/).includes('noreferrer'), 'Safe external source for ' + key);
      assert.ok(link.text.includes(entry.display_name), 'Accessible source dataset name for ' + key);
    }
    if (!links.length) assert.ok(card.text.includes('Adresa produsului original necesită confirmare.'), 'Neutral undocumented source: ' + key);
    const vintage = entry.source_year ? 'An: ' + entry.source_year : entry.source_version_attribute ? 'Atribut versiune: ' + entry.source_version_attribute : 'Versiune de confirmat';
    const license = typeof entry.license === 'object' ? entry.license.id.replace('CC-BY-', 'CC BY ') : 'Licență de confirmat';
    assert.deepEqual(card.chips, ['Rol: ' + sourceRoles[id], vintage, entry.crs, license], 'Role/version/CRS/license for ' + key);
    const label = entry.source?.label === 'needs_confirmation' ? 'Sursă exactă de confirmat' : entry.source?.label;
    assert.ok(card.text.includes(label + '.'), 'Documented source attribution for ' + key);
  }
}
async function inspectSourceCards(page, registry) {
  const count = Object.entries(registry.sector1).length + Object.keys(registry.risca).filter(id => id !== 'rasterMetadata').length;
  await page.waitForFunction(count => document.querySelectorAll('.resource-card[data-category="Provocări GIS"]').length === count, count);
  const cards = await page.locator('.resource-card[data-category="Provocări GIS"]').evaluateAll(nodes => nodes.map(card => ({
    title: card.querySelector('h3').textContent,
    chips: [...card.querySelectorAll('.meta-chip')].map(chip => chip.textContent),
    links: [...card.querySelectorAll('a')].map(link => ({href: link.href, text: link.textContent.trim(), target: link.target, rel: link.rel})),
    text: card.textContent
  })));
  checkSourceCards(cards, registry);
  return cards;
}

module.exports = {root, manifest, playwright, browserOptions, homeDestinations,
  checkHomeDestinations, checkNavigation, inspectNavigation, checkSourceCards, inspectSourceCards};
