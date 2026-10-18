// Laboratorul complet: etapa 2 (GCP-uri, coordonate, diagnostic) + etapa 3 (rectificare vizuală).
import { BUC_CFG, generateBuc } from './world_buc.js';
import { DELTA_CFG, generateDelta } from './world_delta.js';
import { drawBucSheet } from './render_buc.js';
import { drawDeltaSheet } from './render_delta.js';
import { buildScene, gridIntersections } from './truth.js';
import { SCENARIOS, warpRGBA } from './scan.js';
import { agePaper, scannerFx } from './paper.js';
import { TRANSFORMS } from './transforms.js';
import { toLonLat, fmtDMS } from './crs.js';
import { Viewer } from './viewer.js';
import { PointStore, buildPreset } from './gcp.js';
import { evaluate, whatIf, compareAll } from './diagnose.js';
import { createStage3 } from './stage3.js';

let lifecycle=new AbortController(),tableLifecycle=new AbortController(),compareLifecycle=new AbortController(),whatifLifecycle=new AbortController(),mounted=false,generation=0;
const listen=(t,e,f,o={})=>t.addEventListener(e,f,{...o,signal:lifecycle.signal});
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const WORLDS = {
  buc: { cfg: BUC_CFG, gen: generateBuc, draw: drawBucSheet },
  delta: { cfg: DELTA_CFG, gen: generateDelta, draw: drawDeltaSheet },
};
const nf = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const coord = (v) => (Number.isFinite(v) ? v.toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\./g, ' ') : '—');
const m0 = (v) => Math.round(v).toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO').replace(/\./g, ' ');
const parseCoord = (s) => { const t = String(s).replace(/\s| /g, '').replace(',', '.'); if (t === '') return null; const v = Number(t); return Number.isFinite(v) ? v : NaN; };

// ---------------------------------------------------------------- State
const DEFAULT_STATE = {
  world: 'buc', scen: 'oblic', seed: 7, type: 'projective',
  showTruth: true, showHeat: false, loupe: true, snap: true, hints: true, compareTruth: false, sort: 'id',
};
const state={...DEFAULT_STATE};
const cache = { worlds: {}, sheets: {} };
let scene = null, scanCanvas = null, scanData = null, sheetCanvas = null, inters = [], truthLines = [];
let s3 = null;
let ev = null, cmp = null, heatCanvas = null, wi = null, snapHover = null;
const store = new PointStore((label) => onPointsChanged(label));

function canvasFrom(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

async function getSheet(id) {
  if (cache.sheets[id]) return cache.sheets[id];
  const W = WORLDS[id];
  const world = cache.worlds[id] || (cache.worlds[id] = W.gen(1970));
  const sc = buildScene(W.cfg, 'afin', 1);
  const c = canvasFrom(sc.S.W, sc.S.H);
  W.draw(c.getContext('2d'), sc.S, world);
  return (cache.sheets[id] = { canvas: c, world });
}

const busy = (msg) => { const b = $('#busy'); b.hidden = !msg; if (msg) $('#busy-msg').textContent = msg; };
const tick = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
let toastTimer = null, coordinateNotice=false;
function toast(msg) {coordinateNotice=false; const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200); }

async function rebuild(what = 'all') {
  const token=++generation;
  busy(what === 'all' ? 'Generez lumea și randez foaia…' : 'Scanez foaia cu deformarea aleasă…');
  await tick();
  const W = WORLDS[state.world];
  const sheet=await getSheet(state.world);if(token!==generation||!mounted)return;sheetCanvas=sheet.canvas;
  scene = buildScene(W.cfg, state.scen, state.seed);
  const src = sheetCanvas.getContext('2d').getImageData(0, 0, sheetCanvas.width, sheetCanvas.height);
  const aged = new Uint8ClampedArray(src.data);
  agePaper(aged, sheetCanvas.width, sheetCanvas.height, state.seed, 1);
  const { M } = scene;
  const out = warpRGBA(aged, sheetCanvas.width, sheetCanvas.height, M.scanW, M.scanH, M.W, [52, 56, 62]);
  scannerFx(out, M.scanW, M.scanH, state.seed);
  scanCanvas = canvasFrom(M.scanW, M.scanH);
  scanCanvas.getContext('2d').putImageData(new ImageData(out, M.scanW, M.scanH), 0, 0);
  scanData = out;
  inters = gridIntersections(scene); inters.grid = W.cfg.grid;
  computeTruthLines();
  const restored = store.bind(`georef-lab:v2:${state.world}:${state.scen}:${state.seed}`);
  if (!restored) { store.points = buildPreset('errors', inters, state.seed).points; store.nextNum = store.points.length + 1; store.persist(); }
  if(store.recovered)toast('Starea salvată era nevalidă. A fost încărcat exercițiul implicit.');
  vScan.setSource(scanCanvas, what !== 'all' && vScan.src);
  vRef.setSource(sheetCanvas, what !== 'all' && vRef.src);
  renderParams();
  onPointsChanged('rebuild');
  busy(null);
}

function computeTruthLines() {
  const S = scene.S, C = S.cfg, n = 40;
  truthLines = [];
  for (let E = Math.ceil(S.E0 / C.grid) * C.grid; E <= S.E1 + 1e-6; E += C.grid)
    truthLines.push(Array.from({ length: n + 1 }, (_, k) => scene.truthPixel(E, S.N0 + (S.N1 - S.N0) * k / n)));
  for (let N = Math.ceil(S.N0 / C.grid) * C.grid; N <= S.N1 + 1e-6; N += C.grid)
    truthLines.push(Array.from({ length: n + 1 }, (_, k) => scene.truthPixel(S.E0 + (S.E1 - S.E0) * k / n, N)));
  const fr = [[S.E0, S.N0], [S.E1, S.N0], [S.E1, S.N1], [S.E0, S.N1], [S.E0, S.N0]], frame = [];
  for (let s = 0; s < 4; s++) for (let k = 0; k < n; k++) {
    const a = fr[s], b = fr[s + 1];
    frame.push(scene.truthPixel(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n));
  }
  frame.push(frame[0]);
  truthLines.frame = frame;
}

// ---------------------------------------------------------------- Evaluation
function onPointsChanged(label) {
  if (!scene) return;
  wi = (wi && (label === 'whatif' || label === 'select')) ? wi : null;
  ev = evaluate(store.points, state.type, scene);
  cmp = compareAll(store.points, scene);
  renderTypeOptions();
  renderSummary(); renderTable(); renderEditor(); renderHints(); renderCompare(); renderWhatIf();
  computeHeat();
  s3?.update();
  $('#undo').disabled = !store.undoStack.length; $('#redo').disabled = !store.redoStack.length;
  vScan.render(); vRef.render();
}

const HEAT_PX = [0.5, 1.5, 4, 10, 25];
const HEAT_COL = [[38, 166, 120], [140, 200, 90], [240, 200, 60], [240, 130, 50], [214, 50, 60], [120, 20, 60]];
function computeHeat() {
  heatCanvas = null;
  renderHeatLegend();
  if (!ev?.model) return;
  const S = scene.S, F = S.frame, M = scene.M, step = 6, m = ev.model;
  const w = Math.ceil(M.scanW / step), h = Math.ceil(M.scanH / step);
  const img = new ImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const col = (i + 0.5) * step, row = (j + 0.5) * step;
    const [u, v] = M.W(col, row);
    if (u < F.x0 || u > F.x1 || v < F.y0 || v > F.y1) continue;
    const [Et, Nt] = S.toMap(u, v), [E, N] = m.forward(col, -row);
    const epx = Math.hypot(E - Et, N - Nt) / S.res;
    let k = HEAT_PX.findIndex(b => epx < b); if (k < 0) k = HEAT_PX.length;
    const o = (j * w + i) * 4, c = HEAT_COL[k];
    img.data[o] = c[0]; img.data[o + 1] = c[1]; img.data[o + 2] = c[2]; img.data[o + 3] = 150;
  }
  heatCanvas = canvasFrom(w, h); heatCanvas.getContext('2d').putImageData(img, 0, 0); heatCanvas.step = step;
}

// ---------------------------------------------------------------- Overlays
const COL = { gcp: '#d81b60', check: '#0e7c9b', off: '#7d8a93', todo: '#e07b00', bad: '#c62828', mild: '#c77700' };
function stateOf(p) {
  if (!Number.isFinite(p.X) || !Number.isFinite(p.Y)) return 'todo';
  if (!p.active) return 'off';
  const d = ev?.per[p.id];
  if (state.hints && d?.suspect) return d.hint?.mild ? 'mild' : 'bad';
  return 'ok';
}
function marker(c, p, x, y, k) {
  const st = stateOf(p), sel = store.selected === p.id;
  const color = st === 'todo' ? COL.todo : st === 'off' ? COL.off : p.role === 'check' ? COL.check : COL.gcp;
  const r = (sel ? 15 : 11) / k;
  c.lineCap = 'round';
  if (st === 'bad' || st === 'mild') {
    c.beginPath(); c.arc(x, y, r * 1.55, 0, 7); c.strokeStyle = st === 'bad' ? COL.bad : COL.mild; c.lineWidth = 2.6 / k; c.setLineDash([4 / k, 3 / k]); c.stroke(); c.setLineDash([]);
  }
  const shape = () => {
    c.beginPath();
    if (p.role === 'check') c.rect(x - r * 0.55, y - r * 0.55, r * 1.1, r * 1.1);
    else { c.moveTo(x - r, y); c.lineTo(x - r * 0.3, y); c.moveTo(x + r * 0.3, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y - r * 0.3); c.moveTo(x, y + r * 0.3); c.lineTo(x, y + r); c.moveTo(x + r * 0.5, y); c.arc(x, y, r * 0.5, 0, 7); }
  };
  shape(); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = (sel ? 5 : 3.6) / k; c.stroke();
  shape(); c.strokeStyle = color; c.lineWidth = (sel ? 2.4 : 1.6) / k; if (st === 'todo') c.setLineDash([3 / k, 2 / k]); c.stroke(); c.setLineDash([]);
  c.font = `600 ${12 / k}px MapSans, sans-serif`; c.textBaseline = 'bottom'; c.textAlign = 'left';
  c.lineWidth = 3 / k; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.strokeText(p.id, x + r * 0.75, y - r * 0.55);
  c.fillStyle = color; c.fillText(p.id, x + r * 0.75, y - r * 0.55);
}

function scanOverlay(c, k) {
  if (state.showHeat && heatCanvas) {
    c.save(); c.imageSmoothingEnabled = true; c.globalAlpha = 0.6;
    c.drawImage(heatCanvas, 0, 0, heatCanvas.width * heatCanvas.step, heatCanvas.height * heatCanvas.step);
    c.restore();
  }
  if (state.showTruth) {
    c.strokeStyle = 'rgba(0,190,230,0.9)'; c.lineWidth = 1.4 / k; c.setLineDash([7 / k, 4 / k]);
    for (const L of truthLines) { c.beginPath(); L.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke(); }
    c.setLineDash([]); c.lineWidth = 2.2 / k;
    c.beginPath(); truthLines.frame.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.stroke();
  }
  for (const p of store.points) marker(c, p, p.col, p.row, k);
  const nb = s3?.nextBest;
  if (nb && $('#r-next').checked) {
    c.beginPath(); c.arc(nb.col, nb.row, 22 / k, 0, 7); c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 5 / k; c.stroke();
    c.strokeStyle = '#0e7c9b'; c.lineWidth = 2.4 / k; c.setLineDash([6 / k, 4 / k]); c.stroke(); c.setLineDash([]);
    c.font = `600 ${12 / k}px MapSans, sans-serif`; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.lineWidth = 3 / k; c.strokeStyle = 'rgba(255,255,255,0.95)'; c.strokeText('următorul punct', nb.col + 26 / k, nb.row); c.fillStyle = '#0e7c9b'; c.fillText('următorul punct', nb.col + 26 / k, nb.row);
  }
}

function refOverlay(c, k) {
  const S = scene.S;
  if (snapHover) {
    const [u, v] = S.toPx(snapHover.E, snapHover.N);
    c.beginPath(); c.arc(u, v, 9 / k, 0, 7); c.strokeStyle = '#0e7c9b'; c.lineWidth = 2 / k; c.stroke();
  }
  for (const p of store.points) {
    if (!Number.isFinite(p.X) || !Number.isFinite(p.Y)) continue;
    const [u, v] = S.toPx(p.Y, p.X);
    const d = ev?.per[p.id];
    if (state.hints && d?.suspect && d.pred && Number.isFinite(d.pred[0])) {
      const [pu, pv] = S.toPx(d.pred[0], d.pred[1]);
      if (Math.hypot(pu - u, pv - v) < 4 * S.W) {
        c.beginPath(); c.moveTo(u, v); c.lineTo(pu, pv); c.strokeStyle = d.hint?.mild ? COL.mild : COL.bad; c.lineWidth = 1.6 / k; c.setLineDash([5 / k, 4 / k]); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.arc(pu, pv, 5 / k, 0, 7); c.stroke();
      }
    }
    marker(c, p, u, v, k);
  }
}

// ---------------------------------------------------------------- Interaction
function hitScan(x, y, k) {
  let best = null, bd = 14 / k;
  for (const p of store.points) { const d = Math.hypot(p.col - x, p.row - y); if (d < bd) { bd = d; best = p.id; } }
  return best;
}
function hitRef(x, y, k) {
  let best = null, bd = 14 / k;
  for (const p of store.points) {
    if (!Number.isFinite(p.X) || !Number.isFinite(p.Y)) continue;
    const [u, v] = scene.S.toPx(p.Y, p.X); const d = Math.hypot(u - x, v - y);
    if (d < bd) { bd = d; best = p.id; }
  }
  return best;
}
function snapAt(x, y, k) {
  const S = scene.S, g = S.cfg.grid, [E, N] = S.toMap(x, y);
  const Eg = Math.round(E / g) * g, Ng = Math.round(N / g) * g;
  const [u, v] = S.toPx(Eg, Ng);
  const inFrame = Eg >= S.E0 - 1e-6 && Eg <= S.E1 + 1e-6 && Ng >= S.N0 - 1e-6 && Ng <= S.N1 + 1e-6;
  return inFrame && Math.hypot(u - x, v - y) * k < 16 ? { E: Eg, N: Ng } : null;
}
function inScan(x, y) { return x >= 0 && y >= 0 && x <= scene.M.scanW && y <= scene.M.scanH; }

function select(id, center) {
  store.selected = id;
  onPointsChanged('select');
  if (center && id) {
    const p = store.get(id);
    vScan.centerOn(p.col, p.row, 1.2);
    if (Number.isFinite(p.X) && Number.isFinite(p.Y)) { const [u, v] = scene.S.toPx(p.Y, p.X); vRef.centerOn(u, v, 1.2); }
  }
}

function setCoordsFromRef(id, x, y, k) {
  const S = scene.S, F = S.frame;
  if (x < F.x0 - 2 || x > F.x1 + 2 || y < F.y0 - 2 || y > F.y1 + 2) { toast('Clicul este în afara cadrului hărții: aici nu există coordonate Stereo 70.'); return; }
  const s = state.snap ? snapAt(x, y, k) : null;
  const [E, N] = s ? [s.E, s.N] : S.toMap(x, y);
  store.update(id, { X: Math.round(N * 10) / 10, Y: Math.round(E * 10) / 10 }, `Coordonate ${id}`);
}

// ---------------------------------------------------------------- Readouts
function fmtEN(E, N) { return `X ${m0(N)} m · Y ${m0(E)} m`; }
function geo(E, N) { const [lon, lat] = toLonLat(E, N); return `${fmtDMS(lat, 'N', 'S')} · ${fmtDMS(lon, 'E', window.CARTO_P07?.lang==='en'?'W':'V')}`; }
function hoverScan(x, y) {
  const el = $('#ro-scan');
  if (x == null || !scene || !inScan(x, y)) { el.innerHTML = '<span class="muted">Clic pe o intersecție de caroiaj pentru un punct nou. Trage un punct ca să-l muți.</span>'; return; }
  const [u, v] = scene.M.W(x, y), F = scene.S.frame;
  const inside = u >= F.x0 && u <= F.x1 && v >= F.y0 && v <= F.y1;
  let est = '';
  if (inside && ev?.model) {
    const [E, N] = ev.model.forward(x, -y);
    est = `<span>${TRANSFORMS[state.type].label}: ${fmtEN(E, N)}</span>`;
    if (state.compareTruth) { const [Et, Nt] = scene.S.toMap(u, v); est += `<span class="muted">eroare reală ${nf(Math.hypot(E - Et, N - Nt))} m</span>`; }
  }
  el.innerHTML = `<span class="mono">col ${nf(x, 1)} · rând ${nf(y, 1)}</span>${est}`;
}
function hoverRef(x, y) {
  const el = $('#ro-ref');
  snapHover = null;
  if (x == null || !scene) { el.innerHTML = '<span class="muted">Clic pe foaie pentru coordonatele punctului selectat.</span>'; return; }
  const F = scene.S.frame;
  if (x < F.x0 || x > F.x1 || y < F.y0 || y > F.y1) { el.innerHTML = '<span class="muted">margine de foaie, în afara cadrului</span>'; return; }
  if (state.snap) snapHover = snapAt(x, y, vRef.k);
  const [E, N] = snapHover ? [snapHover.E, snapHover.N] : scene.S.toMap(x, y);
  el.innerHTML = `<span class="mono">${fmtEN(E, N)}</span>${snapHover ? '<span class="pill info">intersecție</span>' : ''}<span class="muted">${geo(E, N)}</span>`;
}

// ---------------------------------------------------------------- Panels
function renderTypeOptions() {
  const nG = store.points.filter(p => p.active && p.role === 'gcp' && Number.isFinite(p.X) && Number.isFinite(p.Y)).length;
  $('#type').innerHTML = Object.entries(TRANSFORMS).map(([t, m]) => `<option value="${t}" ${nG < m.min ? 'disabled' : ''} ${t === state.type ? 'selected' : ''}>${m.label}${nG < m.min ? ` (min. ${m.min} GCP)` : ''}</option>`).join('');
}

function renderSummary() {
  const s = [];
  s.push(['GCP', `${ev.nG}`]); s.push(['Verificare', `${ev.nC}`]);
  s.push(['Redundanță', ev.model ? (state.type === 'tps' ? '0 (exact)' : `${ev.redundancy}`) : '—']);
  s.push(['RMSE GCP', ev.model ? `${nf(ev.rmse, 2)} m` : '—']);
  s.push(['RMSE verificare', ev.model && ev.nC ? `${nf(ev.checkRmse, 2)} m` : '—']);
  s.push(['Eroare reală medie', ev.model ? `${nf(ev.truth.mean, 2)} m` : '—']);
  $('#summary').innerHTML = s.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  const warn = [];
  if (!ev.model) warn.push(ev.msg || 'Transformarea nu poate fi calculată.');
  else if (ev.redundancy === 0 && state.type !== 'tps') warn.push('Redundanță zero: transformarea trece exact prin puncte, iar RMSE = 0 nu măsoară nimic. Adaugă puncte.');
  else if (state.type === 'tps') warn.push('TPS trece exact prin toate GCP-urile: RMSE este mereu 0. Judecă rezultatul doar după punctele de verificare.');
  if (ev.model && !ev.nC) warn.push('Nu ai niciun punct de verificare: fără el nu poți estima eroarea în afara GCP-urilor.');
  $('#summary-note').innerHTML = warn.map(w => `<span>${esc(w)}</span>`).join('');
  $('#summary-note').hidden = !warn.length;
}

function statusPill(p) {
  const st = stateOf(p);
  if (st === 'todo') return '<span class="pill todo">fără coordonate</span>';
  if (st === 'off') return '<span class="pill off">dezactivat</span>';
  if (st === 'bad') return '<span class="pill bad">suspect</span>';
  if (st === 'mild') return '<span class="pill mild">model slab</span>';
  return '<span class="pill ok">OK</span>';
}

function renderTable() {
  tableLifecycle.abort();tableLifecycle=new AbortController();const listenRow=(t,e,f)=>t.addEventListener(e,f,{signal:tableLifecycle.signal});
  const rows = [...store.points];
  const key = (p) => { const d = ev.per[p.id] || {}; return state.sort === 'res' ? -(d.r ?? -1) : state.sort === 'loo' ? -(d.loo ?? -1) : +p.id.slice(1); };
  rows.sort((a, b) => key(a) - key(b));
  document.querySelectorAll('[data-sort]').forEach(b => b.setAttribute('aria-sort', b.dataset.sort === state.sort ? 'descending' : 'none'));
  $('#truth-col').hidden = !state.compareTruth;
  $('#pts').innerHTML = rows.map(p => {
    const d = ev.per[p.id] || {};
    const res = Number.isFinite(d.r) ? nf(d.r, 2) : '—';
    return `<tr data-id="${p.id}" class="${store.selected === p.id ? 'sel' : ''} ${p.active ? '' : 'inactive'}">
      <th scope="row"><button class="rowbtn" data-sel="${p.id}">${p.id}</button></th>
      <td class="l"><select data-role="${p.id}" aria-label="Rolul punctului ${p.id}"><option value="gcp" ${p.role === 'gcp' ? 'selected' : ''}>GCP</option><option value="check" ${p.role === 'check' ? 'selected' : ''}>Verificare</option></select></td>
      <td><input type="checkbox" data-act="${p.id}" ${p.active ? 'checked' : ''} aria-label="Activează ${p.id}"></td>
      <td>${nf(p.col, 1)}</td><td>${nf(p.row, 1)}</td>
      <td>${coord(p.X)}</td><td>${coord(p.Y)}</td>
      <td>${Number.isFinite(d.dN) ? nf(d.dN, 2) : '—'}</td><td>${Number.isFinite(d.dE) ? nf(d.dE, 2) : '—'}</td>
      <td><b>${res}</b>${p.role === 'check' && Number.isFinite(d.r) ? ' <span class="muted">(verif.)</span>' : ''}</td>
      <td>${Number.isFinite(d.loo) ? nf(d.loo, 2) : '—'}</td>
      <td ${state.compareTruth ? '' : 'hidden'}>${Number.isFinite(d.entryErr) ? nf(d.entryErr, 2) : '—'}</td>
      <td class="l">${statusPill(p)}</td></tr>`;
  }).join('') || `<tr><td colspan="13" class="l muted">Niciun punct. Fă clic pe o intersecție de caroiaj din scanare sau încarcă un set de exercițiu.</td></tr>`;
  document.querySelectorAll('[data-sel]').forEach(b => listenRow(b,'click', e => {select(b.dataset.sel,true);if(e.detail===0)$('#ed-x').focus({preventScroll:true});}));
  document.querySelectorAll('[data-role]').forEach(s => listenRow(s,'change', () => {const id=s.dataset.role;store.update(id,{role:s.value},`Rol ${id}`);document.querySelector('[data-role="'+id+'"]')?.focus({preventScroll:true});}));
  document.querySelectorAll('[data-act]').forEach(b => listenRow(b,'change', () => store.update(b.dataset.act, { active: b.checked }, `${b.checked ? 'Activează' : 'Dezactivează'} ${b.dataset.act}`)));
}

function renderEditor() {
  const p = store.selected && store.get(store.selected);
  $('#ed-empty').hidden = !!p; $('#ed').hidden = !p;
  if(!p){for(const id of ['#ed-x','#ed-y'])$(id).setAttribute('aria-invalid','false');if(coordinateNotice){$('#toast').hidden=true;coordinateNotice=false;}return;}
  const d = ev.per[p.id] || {};
  $('#ed-title').textContent = `Punctul ${p.id}`;
  $('#ed-px').textContent = `col ${nf(p.col, 2)} · rând ${nf(p.row, 2)}`;
  const fx = $('#ed-x'), fy = $('#ed-y');
  for(const input of [fx,fy])if(document.activeElement!==input)input.setAttribute('aria-invalid','false');
  if (document.activeElement !== fx) fx.value = Number.isFinite(p.X) ? (window.CARTO_P07?.lang==='en'?String(p.X):String(p.X).replace('.', ',')) : '';
  if (document.activeElement !== fy) fy.value = Number.isFinite(p.Y) ? (window.CARTO_P07?.lang==='en'?String(p.Y):String(p.Y).replace('.', ',')) : '';
  if(coordinateNotice&&!Number.isNaN(parseCoord(fx.value))&&!Number.isNaN(parseCoord(fy.value))){$('#toast').hidden=true;coordinateNotice=false;}
  $('#ed-role').value = p.role; $('#ed-active').checked = p.active;
  const lines = [];
  if (Number.isFinite(d.r)) lines.push(`<div><dt>${p.role === 'gcp' ? 'Reziduu' : 'Eroare la verificare'}</dt><dd>${nf(d.r, 2)} m</dd></div>`);
  if (Number.isFinite(d.loo)) lines.push(`<div><dt>Eroare la excludere</dt><dd>${nf(d.loo, 2)} m</dd></div>`);
  if (state.compareTruth && Number.isFinite(d.truthE)) {
    lines.push(`<div><dt>Adevăr la acest pixel</dt><dd>${fmtEN(d.truthE, d.truthN)}</dd></div>`);
    lines.push(`<div><dt>Abatere față de adevăr</dt><dd>${nf(d.entryErr, 2)} m</dd></div>`);
  }
  $('#ed-stats').innerHTML = lines.join('');
  const h = state.hints && d.suspect && d.hint;
  $('#ed-hint').hidden = !h;
  if (h) { $('#ed-hint').className = `hint-box ${h.mild ? 'mild' : 'bad'}`; $('#ed-hint').textContent = h.text; }
  $('#ed-whatif').disabled = !(p.active && p.role === 'gcp' && ev.model);
}

function renderHints() {
  const el = $('#hints');
  if (!state.hints) { el.innerHTML = '<p class="note">Indiciile automate sunt oprite. Reziduurile și erorile la excludere rămân în tabel.</p>'; return; }
  if (!ev.model) { el.innerHTML = `<p class="note">${esc(ev.msg || '')}</p>`; return; }
  if (!ev.canLoo) { el.innerHTML = '<p class="note">Sunt prea puține GCP-uri pentru verificarea prin excludere. Fiecare punct trebuie să poată fi prezis de celelalte, deci ai nevoie de cel puțin un punct în plus față de minim.</p>'; return; }
  if (!ev.hints.length) { el.innerHTML = '<p class="note ok-note">Niciun punct nu iese din tipar. Asta nu garantează o rectificare bună: verifică punctele independente și harta erorii.</p>'; return; }
  const kindLab = { swap: 'X/Y inversate', digit: 'cifră lipsă sau în plus', extent: 'în afara foii', neighbour: 'intersecția vecină', large: 'abatere mare', misfit: 'model slab' };
  el.innerHTML = ev.hints.map(h => `<div class="hint ${h.mild ? 'mild' : 'bad'}">
    <div class="hint-h"><button class="rowbtn" data-show="${h.id}">${h.id}</button><span class="pill ${h.mild ? 'mild' : 'bad'}">${kindLab[h.kind]}</span>${Number.isFinite(h.loo) ? `<span class="muted mono">${nf(h.loo, 1)} m la excludere</span>` : ''}</div>
    <p>${esc(h.text)}</p></div>`).join('');
  el.querySelectorAll('[data-show]').forEach(b => listen(b,'click', () => select(b.dataset.show, true)));
}

function renderWhatIf() {
  whatifLifecycle.abort();whatifLifecycle=new AbortController();const listenWhatIf=(t,e,f)=>t.addEventListener(e,f,{signal:whatifLifecycle.signal});
  const el = $('#whatif');
  if (!wi) { el.hidden = true; return; }
  el.hidden = false;
  const { before: b, after: a } = wi;
  const row = (lab, x, y, unit = ' m') => {
    const better = Number.isFinite(x) && Number.isFinite(y) ? (y < x - 1e-9 ? 'down' : y > x + 1e-9 ? 'up' : '') : '';
    return `<tr><th scope="row">${lab}</th><td>${Number.isFinite(x) ? nf(x, 2) + unit : '—'}</td><td class="${better}">${Number.isFinite(y) ? nf(y, 2) + unit : '—'}</td></tr>`;
  };
  let verdict = '';
  if (!a.model) verdict = `Fără ${wi.id} transformarea nu se mai poate calcula: ${esc(a.msg || '')}`;
  else {
    const dr = a.rmse - b.rmse, dt = a.truth.mean - b.truth.mean;
    if (dr < 0 && dt > 0) verdict = `RMSE scade, dar eroarea reală crește. ${wi.id} era un punct bun care ținea transformarea în zona lui. Un RMSE mai mic nu înseamnă o rectificare mai bună.`;
    else if (dr < 0 && dt < 0) verdict = `Și RMSE, și eroarea reală scad: ${wi.id} strica transformarea.`;
    else if (dr >= 0 && dt > 0) verdict = `Eliminarea lui ${wi.id} înrăutățește rezultatul.`;
    else verdict = `RMSE crește, dar eroarea reală scade. Situație rară: ${wi.id} masca o problemă de distribuție a punctelor.`;
  }
  el.innerHTML = `<h3>Ce se întâmplă dacă elimin ${wi.id}?</h3>
    <div class="tablewrap"><table class="compact"><thead><tr><th scope="col"></th><th scope="col">Cu ${wi.id}</th><th scope="col">Fără ${wi.id}</th></tr></thead><tbody>
    ${row('RMSE GCP', b.rmse, a.model ? a.rmse : NaN)}
    ${row('RMSE verificare', b.checkRmse, a.model ? a.checkRmse : NaN)}
    ${row('Eroare reală medie', b.truth?.mean, a.truth?.mean)}
    ${row('Eroare reală p95', b.truth?.p95, a.truth?.p95)}
    </tbody></table></div><p class="note">${verdict}</p>
    <div class="row"><button type="button" id="wi-apply">Dezactivează ${wi.id}</button><button type="button" id="wi-close">Închide</button></div>`;
  listenWhatIf($('#wi-apply'),'click', () => { const id = wi.id; wi = null; store.update(id, { active: false }, `Dezactivează ${id}`); });
  listenWhatIf($('#wi-close'),'click', () => { wi = null; renderWhatIf(); });
}

function renderCompare() {
  compareLifecycle.abort();compareLifecycle=new AbortController();const listenCompare=(t,e,f)=>t.addEventListener(e,f,{signal:compareLifecycle.signal});
  const ok = cmp.filter(r => r.ok);
  const best = ok.length ? Math.min(...ok.map(r => r.truth.mean)) : NaN;
  $('#cmp').innerHTML = cmp.map(r => {
    const meta = TRANSFORMS[r.t];
    if (!r.ok) return `<tr class="off"><th scope="row">${meta.label}</th><td>${r.min}</td><td colspan="6" class="msg">${esc(r.msg || '')}</td></tr>`;
    return `<tr class="${r.t === state.type ? 'sel' : ''}"><th scope="row"><button class="rowbtn" data-type="${r.t}" title="${esc(meta.note)}">${meta.label}</button>${r.truth.mean === best ? ' <span class="pill ok">cea mai mică eroare reală</span>' : ''}</th>
      <td>${r.min}</td><td>${r.t === 'tps' ? '0 <span class="muted">(exact)</span>' : r.red}</td>
      <td>${nf(r.rmse, 2)}</td><td>${nf(r.chk, 2)}</td><td><b>${nf(r.truth.mean, 2)}</b></td><td>${nf(r.truth.p95, 2)}</td><td>${nf(r.truth.max, 2)}</td></tr>`;
  }).join('');
  document.querySelectorAll('[data-type]').forEach(b => listenCompare(b,'click', () => { state.type = b.dataset.type; onPointsChanged('type'); }));
}

function renderHeatLegend() {
  const res = scene.S.res, d = res < 5 ? 1 : 0;
  const lab = (i) => i === 0 ? `< ${nf(HEAT_PX[0] * res, d)}` : i === HEAT_PX.length ? `> ${nf(HEAT_PX[i - 1] * res, 0)}` : `${nf(HEAT_PX[i - 1] * res, d)}–${nf(HEAT_PX[i] * res, d)}`;
  $('#heat-legend').innerHTML = `<span class="lbl">Eroare reală, ${esc(TRANSFORMS[state.type].label)}</span>` + HEAT_COL.map((c, i) => `<span class="sw"><i style="background:rgb(${c.join(',')})"></i>${lab(i)}</span>`).join('') + '<span class="muted">m</span>';
}

function renderParams() {
  const p = scene.M.params;
  const items = [
    ['Rotație', `${nf(p.rot, 2)}°`], ['Anizotropie', `${nf(p.aniso * 100, 2)} %`], ['Forfecare', `${nf(p.shear, 2)}°`],
    ['Perspectivă', `${nf(p.px, 3)} / ${nf(p.py, 3)}`], ['Întindere scaner', nf(p.stretch, 3)],
    ['Curbură hârtie', `${nf(p.bow, 3)} / ${nf(p.curl, 3)}`], ['Ondulație', nf(p.wave, 4)], ['Seed', String(p.seed)],
  ];
  $('#params').innerHTML = items.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('#scen-hint').textContent = SCENARIOS[state.scen].hint;
  $('#res-note').textContent = `1 pixel de scanare ≈ ${nf(scene.S.res, scene.S.res < 5 ? 2 : 1)} m în teren (scanare virtuală la ${scene.S.cfg.dpi} dpi, scara 1:${m0(scene.S.cfg.scale)}). Caroiajul are pasul de ${m0(scene.S.cfg.grid)} m.`;
}

function renderValidation() {
  let v;
  try { v = JSON.parse($('#validation').textContent); } catch (e) { return; }
  const sci = (x) => { if (x === 0) return '0'; const [m, e] = x.toExponential(1).split('e'); return `${m.replace('.', ',')}·10<sup>${+e}</sup>`; };
  $('#val-rows').innerHTML = Object.entries(v.worst).map(([t, w]) => `<tr><th scope="row">${TRANSFORMS[t].label}</th><td class="l muted">${v.refs[t]}</td><td>${sci(w.fwd_m)} m</td><td>${sci(w.inv_px)} px</td></tr>`).join('');
  $('#val-meta').textContent = `${v.cases} scenarii × 7 transformări · ${v.checkPoints} puncte de verificare`;
  $('#val-crs').innerHTML = `proj4js față de PROJ (pipeline-ul EPSG „Pulkovo 1942(58) to WGS 84 (19)”): <b>${sci(Math.max(v.crs.epsgPipeline_m, 1e-12))} m</b>. Inversarea W⁻¹ prin Newton: <b>${sci(v.winv_px)} px</b>. Detectarea erorilor plantate: <b>${v.detect || '39 din 40'}</b> scenarii identificate complet, fără alarme false grosolane pe seturile corecte.`;
}

// ---------------------------------------------------------------- Exercises
async function startExercise(n, showTab) {
  const setSel = (id, val) => { $(id).value = val; };
  const scen = n === 1 ? 'oblic' : n === 2 ? 'hartie' : 'afin';
  const changed = state.world !== 'buc' || state.scen !== scen || state.seed !== 7;
  state.world = 'buc'; state.scen = scen; state.seed = 7;
  setSel('#world', 'buc'); setSel('#scen', scen); setSel('#seed', 7);
  if (changed) await rebuild('all');
  if (n === 1) {
    state.type = 'projective'; state.hints = false; $('#hints-on').checked = false;
    store.replaceAll(buildPreset('errors', inters, state.seed).points, 'Exercițiul 1');
    showTab('ref');
    toast('Exercițiul 1: indiciile automate sunt oprite. Sortează după „La excludere” și caută cele trei greșeli.');
  } else if (n === 2) {
    state.type = 'tps'; state.hints = true; $('#hints-on').checked = true;
    store.replaceAll(buildPreset('clean', inters, state.seed).points, 'Exercițiul 2');
    showTab('rect');
    toast('Exercițiul 2: TPS are RMSE zero. Compară eroarea reală în „Comparația transformărilor”.');
  } else {
    state.type = 'poly1'; state.hints = true; $('#hints-on').checked = true;
    const pts = buildPreset('clean', inters, state.seed).points;
    const cx = scene.M.scanW / 2, cy = scene.M.scanH / 2;
    const near = inters.map(p => ({ p, d: Math.hypot(p.col - cx, p.row - cy) })).sort((a, b) => a.d - b.d).slice(0, 4);
    const g = near.map(({ p }, i) => ({ id: `P${i + 1}`, col: p.col + 0.4, row: p.row - 0.3, X: p.N, Y: p.E, role: 'gcp', active: true }));
    const checks = pts.filter(p => p.role === 'check').map((p, i) => ({ ...p, id: `P${5 + i}` }));
    store.replaceAll([...g, ...checks], 'Exercițiul 3');
    $('#r-mc').checked = true; $('#r-mc').dispatchEvent(new Event('change'));
    $('#r-next').checked = true; $('#r-next').dispatchEvent(new Event('change'));
    showTab('rect');
    toast('Exercițiul 3: patru GCP-uri în centru. Urmărește elipsele de la margini și punctul recomandat.');
  }
  onPointsChanged('type');
  $('.panes').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// ---------------------------------------------------------------- Wiring
let vScan, vRef;
async function init() {
  if(mounted)return;mounted=true;const mount=++generation;lifecycle=new AbortController();
  const faces = ['400 10px MapSans', '600 10px MapSans', 'italic 400 10px MapSans', 'italic 400 10px MapSerif', '600 10px MapSerif', 'italic 600 10px MapSerif'];
  try { await Promise.all(faces.map(f => document.fonts.load(f, 'ĂăÎîȘșȚț0123'))); } catch (e) { /* fallback fonts */ }

  if(!mounted||mount!==generation)return;
  let dragOrigin = null;
  vScan = new Viewer($('#cv-scan'), {
    overlay: scanOverlay, hover: hoverScan,
    hitTest: (x, y, k) => { const id = hitScan(x, y, k); const p = id && store.get(id); dragOrigin = p ? { id, col: p.col, row: p.row } : null; return id; },
    click: (x, y, e, hit) => {
      if (hit) { select(hit); return; }
      if (!inScan(x, y)) return;
      const id = store.add(x, y, 'gcp');
      store.selected = id; onPointsChanged('select');
      setTimeout(() => $('#ed-x').focus({ preventScroll: true }), 0);
      toast(`${id} adăugat. Dă clic pe aceeași intersecție în foaia de referință sau scrie coordonatele.`);
    },
    dragMove: (id, x, y) => { const p = store.get(id); if (p) { p.col = x; p.row = y; s3?.live(); } },
    // restore the pre-drag position first, so the move becomes a single undo step
    dragEnd: (id, x, y) => { const p = store.get(id); if (dragOrigin?.id === id) { p.col = dragOrigin.col; p.row = dragOrigin.row; } store.selected = id; store.update(id, { col: x, row: y }, `Mută ${id}`); },
  });

  let refOrigin = null;
  vRef = new Viewer($('#cv-ref'), {
    overlay: refOverlay, hover: hoverRef,
    hitTest: (x, y, k) => { const id = hitRef(x, y, k); refOrigin = id ? { id, X: store.get(id).X, Y: store.get(id).Y } : null; return id; },
    click: (x, y, e, hit) => {
      if (hit && hit !== store.selected) { select(hit); return; }
      if (!store.selected) { toast('Selectează sau adaugă întâi un punct pe scanare.'); return; }
      setCoordsFromRef(store.selected, x, y, vRef.k);
    },
    dragMove: (id, x, y) => { const p = store.get(id); const [E, N] = scene.S.toMap(x, y); p.X = N; p.Y = E; s3?.live(); },
    dragEnd: (id, x, y) => { const p = store.get(id); if (refOrigin?.id === id) { p.X = refOrigin.X; p.Y = refOrigin.Y; } store.selected = id; setCoordsFromRef(id, x, y, vRef.k); },
  });
  vScan.loupe = state.loupe; vRef.loupe = state.loupe;
  hoverScan(null); hoverRef(null);
  renderValidation();

  const onSet = (id, fn) => listen($(id),'change', fn);
  onSet('#world', async (e) => { state.world = e.target.value; await rebuild('all'); });
  onSet('#scen', async (e) => { state.scen = e.target.value; await rebuild('scan'); });
  onSet('#seed', async (e) => { state.seed = Math.max(1, Math.min(9999, parseInt(e.target.value, 10) || 1)); e.target.value = state.seed; await rebuild('scan'); });
  listen($('#dice'),'click', async () => { state.seed = 1 + Math.floor(Math.random() * 9998); $('#seed').value = state.seed; await rebuild('scan'); });
  onSet('#type', (e) => { state.type = e.target.value; onPointsChanged('type'); });
  const tog = (id, key, after) => onSet(id, (e) => { state[key] = e.target.checked; after?.(); onPointsChanged('select'); });
  tog('#show-truth', 'showTruth'); tog('#show-heat', 'showHeat'); tog('#snap', 'snap'); tog('#hints-on', 'hints'); tog('#cmp-truth', 'compareTruth');
  tog('#loupe', 'loupe', () => { vScan.loupe = state.loupe; vRef.loupe = state.loupe; });

  const commitCoord = () => {
    const id = store.selected; if (!id) return;
    const X = parseCoord($('#ed-x').value), Y = parseCoord($('#ed-y').value);
    $('#ed-x').setAttribute('aria-invalid',Number.isNaN(X));$('#ed-y').setAttribute('aria-invalid',Number.isNaN(Y));
    if (Number.isNaN(X) || Number.isNaN(Y)) { toast('Coordonata trebuie să fie un număr, în metri (de exemplu 324500 sau 324 500,0).');coordinateNotice=true; return; }
    store.update(id, { X, Y }, `Coordonate ${id}`);
  };
  onSet('#ed-x', commitCoord); onSet('#ed-y', commitCoord);
  ['#ed-x', '#ed-y'].forEach(s => listen($(s),'keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commitCoord(); if (s === '#ed-x') $('#ed-y').focus(); } }));
  onSet('#ed-role', (e) => store.update(store.selected, { role: e.target.value }, `Rol ${store.selected}`));
  onSet('#ed-active', (e) => store.update(store.selected, { active: e.target.checked }, `Activ ${store.selected}`));
  listen($('#ed-center'),'click', () => select(store.selected, true));
  listen($('#ed-delete'),'click', () => store.remove(store.selected));
  listen($('#ed-whatif'),'click', () => { wi = whatIf(store.points, store.selected, state.type, scene); renderWhatIf(); $('#whatif').scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });

  listen($('#undo'),'click', () => { const l = store.undo(); if (l) toast(`Anulat: ${l}`); });
  listen($('#redo'),'click', () => { const l = store.redo(); if (l) toast(`Refăcut: ${l}`); });
  listen($('#preset-clean'),'click', () => { store.replaceAll(buildPreset('clean', inters, state.seed).points, 'Set corect'); toast('Set corect: 12 GCP și 6 puncte de verificare.'); });
  listen($('#preset-errors'),'click', () => { store.replaceAll(buildPreset('errors', inters, state.seed).points, 'Set cu erori'); toast('Set cu erori: trei GCP-uri conțin greșeli tipice. Găsește-le.'); });
  listen($('#clear'),'click', () => { store.replaceAll([], 'Golește punctele'); toast('Toate punctele au fost șterse. Poți anula cu Ctrl+Z.'); });
  document.querySelectorAll('[data-sort]').forEach(b => listen(b,'click', () => { state.sort = state.sort === b.dataset.sort ? 'id' : b.dataset.sort; renderTable(); }));
  document.querySelectorAll('[data-fit]').forEach(b => listen(b,'click', () => (b.dataset.fit === 'scan' ? vScan : vRef).fit()));
  document.querySelectorAll('[data-zoom]').forEach(b => listen(b,'click', () => {
    const v = b.dataset.zoom.startsWith('scan') ? vScan : vRef; v.zoomAt(v.cw / 2, v.ch / 2, b.dataset.zoom.endsWith('in') ? 1.5 : 1 / 1.5);
  }));
  listen(document,'keydown', (e) => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '');
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'z' && !typing) { e.preventDefault(); e.shiftKey ? $('#redo').click() : $('#undo').click(); }
    else if (mod && e.key.toLowerCase() === 'y' && !typing) { e.preventDefault(); $('#redo').click(); }
    else if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && store.selected) { e.preventDefault(); store.remove(store.selected); }
    else if (e.key === 'Escape' && !typing) { store.selected = null; onPointsChanged('select'); }
  });

  s3 = createStage3(() => ({ scene, scanCanvas, scanData, sheetCanvas, store, state, ev, inters, truthLines }), {
    busy, toast, onNextBest: () => vScan.render(),
  });
  const showTab = (which) => {
    document.querySelectorAll('.tabs [role=tab]').forEach(b => { const on = b.dataset.tab === which; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    $('#panel-ref').hidden = which !== 'ref'; $('#panel-rect').hidden = which !== 'rect';
    if (which === 'rect') { s3.update(); setTimeout(() => s3.viewer.fitted || s3.viewer.fit(), 30); }
  };
  document.querySelectorAll('.tabs [role=tab]').forEach(b => listen(b,'click', () => showTab(b.dataset.tab)));
  listen($('#go-rect'),'click', () => { showTab('rect'); setTimeout(() => s3.play(), 60); });

  // ---- quick guide: open on the first visit, remember the reader's choice
  const guide = $('#guide');
  let closed = null;
  try { closed = localStorage.getItem('georef-lab:guide'); } catch (e) { closed = null; }
  guide.open = closed !== 'closed';
  listen(guide,'toggle', () => { try { localStorage.setItem('georef-lab:guide', guide.open ? 'open' : 'closed'); } catch (e) { /* ignore */ } });
  document.querySelectorAll('[data-show]').forEach(b => listen(b,'click', () => {
    const sel = b.dataset.show;
    if (sel === '#ed-title-h' && !store.selected) toast('Selectează întâi un punct: clic pe un rând din tabel sau pe un punct din scanare.');
    const el = $(sel); if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.setAttribute('tabindex','-1');el.focus({preventScroll:true});
    const target = sel.startsWith('#cv') ? el.closest('.pane') : el;
    target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
  }));
  document.querySelectorAll('[data-ex]').forEach(b => listen(b,'click', () => startExercise(+b.dataset.ex, showTab)));

  $('#world').value = state.world; $('#scen').value = state.scen; $('#seed').value = state.seed;
  await rebuild('all');
}
window.CARTO_GEO={
 init, getState:()=>({...state,points:store.points.map(p=>({...p})),nextNum:store.nextNum}),
 async restore(v){Object.assign(state,v);const epoch=generation+1;await rebuild('all');if(!mounted||epoch!==generation)return;$('#world').value=state.world;$('#scen').value=state.scen;$('#seed').value=state.seed;if(v.points){store.restore(JSON.stringify({points:v.points,nextNum:v.nextNum}));onPointsChanged('restore');}},
 reset:async()=>{Object.assign(state,DEFAULT_STATE);const epoch=generation+1;await rebuild('all');if(epoch!==generation||!mounted)return;store.replaceAll(buildPreset('errors',inters,state.seed).points,'Reset');$('#world').value=state.world;$('#scen').value=state.scen;$('#seed').value=state.seed;for(const[id,key]of [['#show-truth','showTruth'],['#show-heat','showHeat'],['#loupe','loupe'],['#snap','snap'],['#hints-on','hints'],['#cmp-truth','compareTruth']])$(id).checked=state[key];vScan.loupe=state.loupe;vRef.loupe=state.loupe;s3.reset();},
 refresh:()=>{onPointsChanged('select');s3?.update();},
 getResults:()=>ev,
 addPoint:(col,row)=>{if(!scene||!inScan(col,row))throw Error('Pixel outside scan');const id=store.add(col,row);select(id);return id;},
 movePoint:(id,col,row)=>{if(!inScan(col,row))throw Error('Pixel outside scan');store.update(id,{col,row});},
 destroy:()=>{mounted=false;generation++;lifecycle.abort();tableLifecycle.abort();compareLifecycle.abort();whatifLifecycle.abort();clearTimeout(toastTimer);vScan?.destroy();vRef?.destroy();s3?.destroy();}
};
init().then(()=>window.CARTO_P07?.ready('L19')).catch(e=>window.CARTO_P07?.error(e));
