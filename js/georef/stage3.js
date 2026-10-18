// Etapa 3 — rectificarea vizuală: imaginea rectificată live, animația de dezdoire, cortina,
// vectorii de eroare, grila de deformare, indicatoarele Tissot, incertitudinea Monte Carlo,
// punctul recomandat, curba RMSE față de eroarea reală și exportul PNG + world file.
import { Viewer } from './viewer.js';
import { TRANSFORMS, fitTransform } from './transforms.js';
import { evaluate } from './diagnose.js';
import { frameRaster, rectify, worldFile, drawMorph, jacobian, monteCarlo, convexHull } from './rectify.js';

const $ = (s) => document.querySelector(s);
const nf = (v, d = 1) => (Number.isFinite(v) ? v.toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const cssVar = (n) => getComputedStyle(document.querySelector('#p07-app')).getPropertyValue(n).trim() || '#888';

export function createStage3(get, hooks) {
  let dead=false;const abort=new AbortController();const listen=(t,e,f,o={})=>t.addEventListener(e,f,{...o,signal:abort.signal});
  const defaultView = {
    mode: 'curtain', curtain: 0.5, blend: 0.5, flicker: false, flickOn: false,
    vectors: true, grid: false, tissot: false, mc: false, next: true, exag: 20, sigma: 0.7,
  };
  const R3={...defaultView};
  let rectCanvas = null, Rfull = null, model = null, liveModel = null, morph = null;
  let probes = null, mc = null, nextBest = null, hullPts = null, mcKey = '';
  let fullTimer = null, liveRaf = null, flickTimer = null, pulseRaf = null, series = [];

  const v = new Viewer($('#cv-rect'), {
    overlay: (c, k) => overlay(c, k),
    drawBase: (c, k) => base(c, k),
    hover: (x, y) => hover(x, y),
    hitTest: (x, y, k) => (R3.mode === 'curtain' && rectCanvas && Math.abs(x - R3.curtain * Rfull.w) * k < 12 ? 'curtain' : null),
    dragMove: (id, x) => { if (id === 'curtain') { R3.curtain = Math.max(0, Math.min(1, x / Rfull.w)); v.render(); } },
    dragEnd: () => {},
    click: () => {},
  });

  // ------------------------------------------------------------ geometry helpers
  const toR = (E, N) => [(E - Rfull.E0) / Rfull.res, (Rfull.N1 - N) / Rfull.res];
  const gcpsOf = (pts) => pts.filter(p => p.active && p.role === 'gcp' && Number.isFinite(p.X) && Number.isFinite(p.Y)).map(p => ({ id: p.id, x: p.col, y: -p.row, E: p.Y, N: p.X }));

  function buildProbes() {
    const { scene } = get(), S = scene.S;
    const grid = [];
    for (let a = 1; a < 12; a++) for (let b = 1; b < 9; b++) {
      const E = S.E0 + (S.E1 - S.E0) * a / 12, N = S.N0 + (S.N1 - S.N0) * b / 9;
      const [col, row] = scene.truthPixel(E, N);
      grid.push({ E, N, col, row });
    }
    const tissot = [];
    for (let a = 1; a < 8; a++) for (let b = 1; b < 6; b++) {
      const E = S.E0 + (S.E1 - S.E0) * a / 8, N = S.N0 + (S.N1 - S.N0) * b / 6;
      tissot.push(scene.truthPixel(E, N));
    }
    const { scanW, scanH } = scene.M, defo = [];
    const nL = 22;
    for (let i = 0; i <= nL; i++) { const c = scanW * i / nL; defo.push(Array.from({ length: 31 }, (_, k) => [c, scanH * k / 30])); }
    for (let j = 0; j <= Math.round(nL * scanH / scanW); j++) { const r = scanH * j / Math.round(nL * scanH / scanW); defo.push(Array.from({ length: 41 }, (_, k) => [scanW * k / 40, r])); }
    probes = { grid, tissot, defo };
  }

  // ------------------------------------------------------------ rendering of the raster
  function renderRaster(m, factor) {
    const { scene, scanData } = get();
    const R = frameRaster(scene.S, factor);
    let data;try{data=rectify(scanData, scene.M.scanW, scene.M.scanH, R, m, 8);}
    catch(error){model=null;rectCanvas=null;for(const id of ['#x-png','#x-pgw','#x-copy','#r-play','#go-rect'])$(id).disabled=true;v.setSource(null);$('#rect-empty').hidden=false;$('#rect-empty').textContent='Transformare nevalidă în domeniul de export.';hooks.toast('Transformare nevalidă în domeniul de export.');throw error;}
    const c = document.createElement('canvas'); c.width = R.w; c.height = R.h;
    c.getContext('2d').putImageData(new ImageData(data, R.w, R.h), 0, 0);
    return c;
  }

  function setModel(m) { model = m; }

  let rasterKey = '', chartKey = '', lastScene = null;
  const tabVisible = () => $('#tab-rect').classList.contains('on');
  function update() {
    const { scene, ev, store, state } = get();
    if (!probes || probes.scene !== scene) { buildProbes(); probes.scene = scene; }
    if (lastScene !== scene) { lastScene = scene; rasterKey = ''; mcKey = ''; v.fitted = false; }
    Rfull = frameRaster(scene.S, 1);
    model = ev?.model || null;
    for(const id of ["#x-png","#x-pgw","#x-copy","#r-play","#go-rect"])$(id).disabled=!model;
    liveModel = null;
    $('#rect-empty').hidden = !!model;
    const key = JSON.stringify([state.type, gcpsOf(store.points).map(p => [p.x, p.y, p.E, p.N])]);
    const ck = key + '|' + store.undoStack.length;
    if (ck !== chartKey) { chartKey = ck; renderChart(); }
    if (!model) { rectCanvas = null; rasterKey = ''; v.setSource(null); renderInfo(); return; }
    runMC();
    renderInfo();
    if (!tabVisible() || key === rasterKey) { v.render(); return; }
    rasterKey = key;
    // quick low-resolution first, the full resolution a moment later
    try{rectCanvas = renderRaster(model, 2);}catch{return;}
    v.setSource(rectCanvas, v.fitted, Rfull.w, Rfull.h);
    clearTimeout(fullTimer);
    const m = model;
    fullTimer = setTimeout(() => { if (model === m) { try{rectCanvas = renderRaster(m, 1); v.setSource(rectCanvas, true, Rfull.w, Rfull.h);}catch{return;} } }, 150);
  }

  // Live update while a point is dragged: refit only the active transformation.
  function live() {
    if (liveRaf) return;
    liveRaf = requestAnimationFrame(() => {
      liveRaf = null;
      const { store, state } = get();
      const m = fitTransform(state.type, gcpsOf(store.points));
      if (!m.ok) return;
      liveModel = m; rasterKey = '';
      if (!$('#tab-rect').classList.contains('on')) return;
      try{rectCanvas = renderRaster(m, 3);}catch{return;}
      v.setSource(rectCanvas, true, Rfull.w, Rfull.h);
    });
  }

  // ------------------------------------------------------------ Monte Carlo + next point
  function runMC() {
    const { store, state, scene, inters } = get();
    const g = gcpsOf(store.points);
    const key = JSON.stringify([state.type, R3.sigma, g.map(p => [p.x, p.y, p.E, p.N])]);
    if (key === mcKey && mc) return;
    mcKey = key; mc = null; nextBest = null; hullPts = null;
    if (!model || g.length < TRANSFORMS[state.type].min + 1) { renderInfo(); return; }
    const used = store.points.map(p => [p.col, p.row]);
    const cands = inters.filter(c => used.every(([x, y]) => Math.hypot(x - c.col, y - c.row) > 40));
    const lines = get().truthLines.map(L => L.filter((_, i) => i % 2 === 0));
    const flat = [...probes.grid.map(p => [p.col, p.row]), ...cands.map(c => [c.col, c.row]), ...lines.flat()];
    const res = monteCarlo(state.type, g, flat, R3.sigma, 120, state.seed);
    const nG = probes.grid.length, nC = cands.length;
    mc = {
      grid: res.stats.slice(0, nG),
      cands: cands.map((c, i) => ({ ...c, ...res.stats[nG + i] })),
      lines: [], runs: res.runs,
    };
    let off = nG + nC;
    for (const L of lines) { mc.lines.push({ clouds: res.clouds.slice(off, off + L.length), stats: res.stats.slice(off, off + L.length) }); off += L.length; }
    if (mc.cands.length) nextBest = mc.cands.reduce((a, b) => (b.trace > a.trace ? b : a));
    hullPts = convexHull(g.map(p => model.forward(p.x, p.y)));
    renderInfo();
    hooks.onNextBest?.(nextBest);
  }

  // ------------------------------------------------------------ drawing
  function base(c, k) {
    const { sheetCanvas, scene, scanCanvas } = get();
    if (morph) {
      const S = scene.S, M = scene.M, m = morph.model;
      const s = Math.min(Rfull.w / M.scanW, Rfull.h / M.scanH);
      const ox = (Rfull.w - M.scanW * s) / 2, oy = (Rfull.h - M.scanH * s) / 2;
      drawMorph(c, scanCanvas, M.scanW, M.scanH,
        (col, row) => [ox + col * s, oy + row * s],
        (col, row) => { const [E, N] = m.forward(col, -row); return toR(E, N); }, morph.t);
      return true;
    }
    if (!rectCanvas) return true;
    const F = scene.S.frame;
    const showRef = R3.mode === 'flicker' && R3.flickOn;
    if (showRef) { c.drawImage(sheetCanvas, F.x0, F.y0, Rfull.w, Rfull.h, 0, 0, Rfull.w, Rfull.h); return true; }
    c.drawImage(rectCanvas, 0, 0, Rfull.w, Rfull.h);
    if (R3.mode === 'blend') {
      c.save(); c.globalAlpha = R3.blend; c.drawImage(sheetCanvas, F.x0, F.y0, Rfull.w, Rfull.h, 0, 0, Rfull.w, Rfull.h); c.restore();
    }
    if (R3.mode === 'curtain') {
      const x = R3.curtain * Rfull.w;
      c.save(); c.beginPath(); c.rect(0, 0, x, Rfull.h); c.clip();
      c.drawImage(sheetCanvas, F.x0, F.y0, Rfull.w, Rfull.h, 0, 0, Rfull.w, Rfull.h);
      c.restore();
    }
    return true;
  }

  function arrow(c, x0, y0, x1, y1, k, color) {
    const L = Math.hypot(x1 - x0, y1 - y0);
    if (L * k < 1.5) { c.beginPath(); c.arc(x0, y0, 1.6 / k, 0, 7); c.fillStyle = color; c.fill(); return; }
    const ux = (x1 - x0) / L, uy = (y1 - y0) / L, h = Math.min(9 / k, L * 0.45);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
    c.moveTo(x1, y1); c.lineTo(x1 - ux * h - uy * h * 0.5, y1 - uy * h + ux * h * 0.5);
    c.moveTo(x1, y1); c.lineTo(x1 - ux * h + uy * h * 0.5, y1 - uy * h - ux * h * 0.5);
    c.strokeStyle = color; c.stroke();
  }

  function overlay(c, k) {
    if (morph || !rectCanvas) { if (morph) drawMorphLabel(c, k); return; }
    const { scene } = get();
    const m = liveModel || model;
    if (!m) return;
    const X = R3.exag;
    if (R3.mode === 'curtain') {
      const x = R3.curtain * Rfull.w;
      c.strokeStyle = '#fff'; c.lineWidth = 4 / k; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, Rfull.h); c.stroke();
      c.strokeStyle = '#14202a'; c.lineWidth = 1.5 / k; c.stroke();
      c.beginPath(); c.arc(x, Rfull.h / 2, 13 / k, 0, 7); c.fillStyle = '#fff'; c.fill(); c.stroke();
      c.beginPath(); // small double arrow drawn as paths (no font dependency)
      for (const sgn of [-1, 1]) { c.moveTo(x + sgn * 3 / k, Rfull.h / 2); c.lineTo(x + sgn * 8 / k, Rfull.h / 2); c.moveTo(x + sgn * 8 / k, Rfull.h / 2); c.lineTo(x + sgn * 5 / k, Rfull.h / 2 - 3 / k); c.moveTo(x + sgn * 8 / k, Rfull.h / 2); c.lineTo(x + sgn * 5 / k, Rfull.h / 2 + 3 / k); }
      c.stroke();
      c.textBaseline = 'middle';
      c.font = `600 ${12 / k}px MapSans, sans-serif`;
      const tag = (t, xx, al) => { c.textAlign = al; c.lineWidth = 3 / k; c.strokeStyle = 'rgba(255,255,255,.95)'; c.strokeText(t, xx, 16 / k); c.fillStyle = '#14202a'; c.fillText(t, xx, 16 / k); };
      tag('Referință', x - 10 / k, 'right'); tag('Rectificat', x + 10 / k, 'left');
    }
    if (R3.grid) {
      c.strokeStyle = 'rgba(120,60,200,0.75)'; c.lineWidth = 1.1 / k;
      for (const L of probes.defo) { c.beginPath(); L.forEach(([col, row], i) => { const [E, N] = m.forward(col, -row); const [x, y] = toR(E, N); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke(); }
    }
    if (R3.mc && mc && !liveModel) {
      // spaghetti: each refit's version of the true grid lines, deviations exaggerated
      c.lineWidth = 0.8 / k; c.strokeStyle = 'rgba(216,27,96,0.06)';
      const runs = Math.min(45, mc.lines[0]?.clouds[0]?.length || 0);
      for (let r = 0; r < runs; r++) {
        for (const L of mc.lines) {
          c.beginPath();
          L.clouds.forEach((cl, i) => { const mean = L.stats[i].mean, p = cl[r]; const [x, y] = toR(mean[0] + X * (p[0] - mean[0]), mean[1] + X * (p[1] - mean[1])); i ? c.lineTo(x, y) : c.moveTo(x, y); });
          c.stroke();
        }
      }
      // 95 % ellipses
      c.strokeStyle = '#d81b60'; c.lineWidth = 1.5 / k;
      for (const s of mc.grid) {
        const [x, y] = toR(...s.mean);
        const a = 2.45 * s.a * X / Rfull.res, b = 2.45 * s.b * X / Rfull.res;
        c.beginPath(); c.ellipse(x, y, Math.max(a, 0.6 / k), Math.max(b, 0.6 / k), -s.ang, 0, Math.PI * 2); c.stroke();
      }
      if (hullPts && hullPts.length > 2) {
        c.setLineDash([8 / k, 5 / k]); c.strokeStyle = 'rgba(20,32,42,0.85)'; c.lineWidth = 1.6 / k;
        c.beginPath(); hullPts.forEach(([E, N], i) => { const [x, y] = toR(E, N); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); c.stroke(); c.setLineDash([]);
      }
    }
    if (R3.tissot) {
      const J = probes.tissot.map(([col, row]) => jacobian(m, col, row));
      const sbar = J.reduce((s, j) => s + Math.sqrt(Math.abs(j.det)), 0) / J.length;
      const R0 = 0.028 * Rfull.w;
      for (const j of J) {
        const [x, y] = toR(...j.at);
        const Xt = 1 + (X - 1) / 4; // Tissot uses a gentler factor: scale ratios compound quickly
        const a = R0 * Math.pow(j.smax / sbar, Xt), b = R0 * Math.pow(j.smin / sbar, Xt); // multiplicative exaggeration keeps shrinking and growing symmetric
        c.beginPath(); c.ellipse(x, y, a, b, -j.ang, 0, Math.PI * 2);
        c.fillStyle = 'rgba(232,140,30,0.18)'; c.fill(); c.strokeStyle = 'rgba(190,100,10,0.95)'; c.lineWidth = 1.5 / k; c.stroke();
        c.beginPath(); c.arc(x, y, R0, 0, Math.PI * 2); c.setLineDash([3 / k, 3 / k]); c.strokeStyle = 'rgba(20,32,42,0.45)'; c.lineWidth = 1 / k; c.stroke(); c.setLineDash([]);
      }
    }
    if (R3.vectors) {
      c.lineWidth = 1.8 / k;
      for (const p of probes.grid) {
        const [E, N] = m.forward(p.col, -p.row);
        const [x0, y0] = toR(E, N), [x1, y1] = toR(E + X * (p.E - E), N + X * (p.N - N));
        const e = Math.hypot(p.E - E, p.N - N) / scene.S.res;
        arrow(c, x0, y0, x1, y1, k, e < 1.5 ? '#1d8a5a' : e < 4 ? '#c77700' : '#c62828');
      }
    }
    if (R3.next && nextBest && !liveModel) {
      const [E, N] = (m.forward(nextBest.col, -nextBest.row));
      const [x, y] = toR(E, N);
      const t = reduced() ? 0.5 : (performance.now() % 1600) / 1600;
      for (const ph of [0, 0.5]) {
        const q = (t + ph) % 1;
        c.beginPath(); c.arc(x, y, (10 + 26 * q) / k, 0, 7); c.strokeStyle = `rgba(14,124,155,${0.9 * (1 - q)})`; c.lineWidth = 2.4 / k; c.stroke();
      }
      c.beginPath(); c.arc(x, y, 5 / k, 0, 7); c.fillStyle = '#0e7c9b'; c.fill();
    }
  }

  function drawMorphLabel() {}

  function hover(x, y) {
    const el = $('#ro-rect');
    const m = liveModel || model;
    if (x == null || !m || !Rfull) { el.innerHTML = '<span class="muted">Imaginea rectificată, în cadrul hărții Stereo 70.</span>'; return; }
    const E = Rfull.E0 + x * Rfull.res, N = Rfull.N1 - y * Rfull.res;
    if (x < 0 || y < 0 || x > Rfull.w || y > Rfull.h) { el.innerHTML = '<span class="muted">în afara cadrului</span>'; return; }
    const { scene } = get();
    // where this map position comes from in the scan, and what is truly there
    const [cx, cyn] = m.inverse(E, N);
    const [Et, Nt] = scene.truthMap(cx, -cyn);
    const e = Math.hypot(Et - E, Nt - N);
    el.innerHTML = `<span class="mono">X ${Math.round(N).toLocaleString('ro-RO').replace(/\./g, ' ')} m · Y ${Math.round(E).toLocaleString('ro-RO').replace(/\./g, ' ')} m</span><span class="muted">din scanare: col ${nf(cx, 1)} · rând ${nf(-cyn, 1)}</span><span>eroare reală aici: <b>${nf(e, 2)} m</b></span>`;
  }

  // ------------------------------------------------------------ animation
  function playMorph() {
    if (!model) return;
    const m = model, dur = reduced() ? 0 : 1600, t0 = performance.now();
    morph = { model: m, t: 0 };
    v.fit();
    const step = (now) => {
      const u = dur ? Math.min(1, (now - t0) / dur) : 1;
      morph.t = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      v.draw();
      if (!dead && u < 1) requestAnimationFrame(step);
      else { setTimeout(() => { morph = null; v.render(); }, 250); }
    };
    requestAnimationFrame(step);
  }

  function pulse() {
    cancelAnimationFrame(pulseRaf);
    const loop = () => { if(dead)return; if (R3.next && nextBest && !reduced() && $('#tab-rect').classList.contains('on')) v.render(); pulseRaf = requestAnimationFrame(loop); };
    pulseRaf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ info, chart, export
  function renderInfo() {
    const el = $('#rect-info');
    const { state } = get();
    const parts = [];
    if (mc) parts.push(`Incertitudine din ${mc.runs} reajustări cu σ = ${nf(R3.sigma, 1)} px. Elipsele arată zona de 95 %.`);
    else if (model) parts.push(`Pentru incertitudine și punctul recomandat ai nevoie de cel puțin ${TRANSFORMS[state.type].min + 1} GCP-uri.`);
    if (nextBest) parts.push(`Punctul recomandat: intersecția X ${Math.round(nextBest.N).toLocaleString('ro-RO').replace(/\./g, ' ')} · Y ${Math.round(nextBest.E).toLocaleString('ro-RO').replace(/\./g, ' ')}, unde incertitudinea este cea mai mare (±${nf(2.45 * Math.sqrt(nextBest.trace), 2)} m).`);
    el.textContent = parts.join(' ');
  }

  // History: RMSE GCP, RMSE of check points and true error after every recorded step.
  function computeSeries() {
    const { store, state, scene } = get();
    const states = [...store.undoStack.map(u => ({ label: u.label, pts: JSON.parse(u.state).points })), { label: 'acum', pts: store.points }];
    // undo entries hold the state BEFORE their action; label each point with the action that produced it
    const steps = states.map((s, i) => ({ pts: s.pts, label: i === 0 ? 'început' : states[i - 1].label }));
    steps[steps.length - 1].label = states.length > 1 ? states[states.length - 2].label : 'acum';
    return steps.slice(-60).map((s, i) => {
      const e = evaluate(s.pts, state.type, scene, { loo: false });
      return { i, label: s.label, nG: e.nG, rmse: e.model ? e.rmse : NaN, chk: e.model ? e.checkRmse : NaN, truth: e.model ? e.truth.mean : NaN };
    });
  }

  let chartHover = null;
  function renderChart() {
    series = computeSeries();
    drawChart();
  }
  function drawChart() {
    const cv = $('#cv-chart');
    const dpr = window.devicePixelRatio || 1, r = cv.getBoundingClientRect();
    if (!r.width) return;
    cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const W = r.width, H = r.height, padL = 74, padR = 120, padT = 14, padB = 30;
    c.clearRect(0, 0, W, H);
    const ink = cssVar('--ink'), muted = cssVar('--muted'), line = cssVar('--line');
    const dark = (document.documentElement.dataset.theme === 'dark') || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
    const COLS = dark ? ['#2a9fc6', '#8e72e0', '#ec4a87'] : ['#0a7fa8', '#6b4fbf', '#d81b60'];
    const vals = series.flatMap(s => [s.rmse, s.chk, s.truth]).filter(x => Number.isFinite(x) && x > 0);
    if (!vals.length) { c.fillStyle = muted; c.font = '14px MapSans, sans-serif'; c.fillText('Graficul apare după primele puncte cu coordonate.', padL, H / 2); return; }
    let lo = Math.pow(10, Math.floor(Math.log10(Math.min(...vals)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...vals))));
    if (hi / lo < 100) hi = lo * 100;
    const n = series.length;
    const X = (i) => padL + (n <= 1 ? (W - padL - padR) / 2 : i * (W - padL - padR) / (n - 1));
    const Y = (v) => padT + (1 - (Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo))) * (H - padT - padB);
    c.font = '12px MapSans, sans-serif'; c.textBaseline = 'middle';
    for (let d = Math.log10(lo); d <= Math.log10(hi) + 1e-9; d++) {
      const y = Y(Math.pow(10, d));
      c.strokeStyle = line; c.lineWidth = 1; c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
      c.fillStyle = muted; c.textAlign = 'right';
      const v = Math.pow(10, d); c.fillText(v >= 1 ? `${v.toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO')} m` : `${v.toLocaleString(window.CARTO_P07?.lang==='en'?'en-GB':'ro-RO')} m`, padL - 6, y);
    }
    c.textAlign = 'center'; c.fillStyle = muted;
    c.fillText('pașii sesiunii, de la stânga la dreapta', (padL + W - padR) / 2, H - 10);
    const defs = [['rmse', 'RMSE GCP', [], 2], ['chk', 'RMSE verificare', [6, 4], 2], ['truth', 'Eroare reală medie', [], 3]];
    const labelsY = [];
    defs.forEach(([key, name, dash, w], ci) => {
      c.strokeStyle = COLS[ci]; c.lineWidth = w; c.setLineDash(dash); c.lineJoin = 'round';
      c.beginPath(); let started = false;
      series.forEach((s, i) => { const v = s[key]; if (!(v > 0)) { started = false; return; } const x = X(i), y = Y(v); if (!started) { c.moveTo(x, y); started = true; } else c.lineTo(x, y); });
      c.stroke(); c.setLineDash([]);
      const last = [...series].reverse().find(s => s[key] > 0);
      if (last) {
        const x = X(series.indexOf(last)), y = Y(last[key]);
        c.beginPath(); c.arc(x, y, 4, 0, 7); c.fillStyle = COLS[ci]; c.fill(); c.strokeStyle = cssVar('--panel'); c.lineWidth = 2; c.stroke();
        labelsY.push({ y, name, val: last[key], col: COLS[ci] });
      }
    });
    labelsY.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labelsY.length; i++) if (labelsY[i].y - labelsY[i - 1].y < 30) labelsY[i].y = labelsY[i - 1].y + 30;
    c.textAlign = 'left';
    for (const L of labelsY) {
      c.fillStyle = ink; c.font = '600 12px MapSans, sans-serif'; c.fillText(L.name, W - padR + 10, L.y - 7);
      c.fillStyle = muted; c.font = '12px MapSans, sans-serif'; c.fillText(`${nf(L.val, 2)} m`, W - padR + 10, L.y + 8);
      c.fillStyle = L.col; c.fillRect(W - padR + 2, L.y - 1, 6, 3);
    }
    if (chartHover != null && series[chartHover]) {
      const s = series[chartHover], x = X(chartHover);
      c.strokeStyle = muted; c.lineWidth = 1; c.beginPath(); c.moveTo(x, padT); c.lineTo(x, H - padB); c.stroke();
      const tip = $('#chart-tip');
      tip.hidden = false;
      tip.innerHTML = `<b>${s.label}</b><span>${s.nG} GCP</span><span>RMSE GCP ${nf(s.rmse, 2)} m</span><span>RMSE verificare ${nf(s.chk, 2)} m</span><span>Eroare reală ${nf(s.truth, 2)} m</span>`;
      const left = Math.min(Math.max(8, x + 12), W - 190);
      tip.style.left = `${left}px`; tip.style.top = '8px';
    } else $('#chart-tip').hidden = true;
    cv.onpointermove = (e) => {
      const rr = cv.getBoundingClientRect(), x = e.clientX - rr.left;
      let best = null, bd = 1e9; series.forEach((s, i) => { const d = Math.abs(X(i) - x); if (d < bd) { bd = d; best = i; } });
      chartHover = best; drawChart();
    };
    cv.onpointerleave = () => { chartHover = null; drawChart(); };
    // the divergence sentence
    const last = series[series.length - 1];
    const note = $('#chart-note');
    if (last && last.rmse >= 0 && last.truth > 0) {
      const ratio = last.truth / Math.max(last.rmse, 1e-6);
      note.textContent = last.rmse < 1e-6 ? 'RMSE este zero, deci nu spune nimic despre calitatea rectificării: uită-te la eroarea reală și la punctele de verificare.'
        : ratio > 3 ? `Eroarea reală este de ${nf(ratio, 1)} ori mai mare decât RMSE: punctele sunt potrivite bine, dar spațiul dintre ele nu.`
          : 'RMSE și eroarea reală sunt apropiate: reziduurile spun, de data aceasta, adevărul despre rectificare.';
    } else note.textContent = '';
  }

  async function exportPNG() {
    if(!get().ev?.model){hooks.toast('Transformare nevalidă: export indisponibil.');return;}
    if (!model) return;
    const state={...get().state}, sceneAtStart=get().scene, modelAtStart=model;
    hooks.busy('Rectific la rezoluție completă pentru export…');
    await new Promise(r => setTimeout(r, 30));
    if(dead||get().scene!==sceneAtStart||model!==modelAtStart){hooks.busy(null);return;}
    let c;try{c=renderRaster(modelAtStart,1);}catch{hooks.busy(null);return;}
    const name = `rectificat_${state.world}_${state.scen}_${state.seed}_${state.type}`;
    const blob = await new Promise(r => c.toBlob(r, 'image/png'));
    hooks.busy(null);
    await saveFile(`${name}.png`, blob);
  }
  async function exportPGW() {
    if(!get().ev?.model){hooks.toast('Transformare nevalidă: export indisponibil.');return;}
    if (!model) return;
    const { state } = get();
    const name = `rectificat_${state.world}_${state.scen}_${state.seed}_${state.type}`;
    await saveFile(`${name}.pgw`, worldFile(frameRaster(get().scene.S, 1)), `${name}.pgw.txt`);
  }
  async function saveFile(filename, data, fallbackName) {
    let dl = null;
    try { dl = window.claude?.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
    if (dl) {
      try { await dl.save({ filename, data }); hooks.toast(`Salvat: ${filename}`); return; }
      catch (e) {
        if (e?.code === 'rejected_extension' && fallbackName) {
          try { await dl.save({ filename: fallbackName, data }); hooks.toast(`Salvat ca ${fallbackName}. Redenumește-l în ${filename} lângă PNG.`); } catch (e2) { if (e2?.code !== 'declined') hooks.toast('Salvarea nu este disponibilă aici. Copiază textul world file-ului.'); }
          return;
        }
        if (e?.code === 'declined') return;
        hooks.toast('Salvarea nu este disponibilă în această vizualizare. Folosește fișierul HTML autonom.');
        return;
      }
    }
    try {
      const url = URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type: 'text/plain' }));
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) { hooks.toast('Descărcarea nu a pornit.'); }
  }

  function renderExport() {
    const { scene } = get();
    const R = frameRaster(scene.S, 1);
    $('#pgw').textContent = worldFile(R);
    $('#export-note').textContent = `${R.w} × ${R.h} px, pixel ${nf(R.res, 4)} m, nord în sus. În QGIS: Strat → Adaugă strat raster, apoi setează CRS-ul EPSG:3844. Fișierul .pgw trebuie să aibă același nume ca PNG-ul și să stea în același dosar.`;
  }

  // ------------------------------------------------------------ wiring
  const onSet = (id, fn) => listen($(id),'change', fn);
  const toggle = (id, key) => onSet(id, (e) => { R3[key] = e.target.checked; if (key === 'mc') runMC(); v.render(); });
  toggle('#r-vectors', 'vectors'); toggle('#r-grid', 'grid'); toggle('#r-tissot', 'tissot'); toggle('#r-mc', 'mc'); toggle('#r-next', 'next');
  onSet('#r-mode', (e) => {
    R3.mode = e.target.value; $('#r-blend-wrap').hidden = R3.mode !== 'blend';
    clearInterval(flickTimer);
    if (R3.mode === 'flicker') flickTimer = setInterval(() => { R3.flickOn = !R3.flickOn; v.render(); }, reduced() ? 1400 : 650);
    v.render();
  });
  listen($('#r-blend'),'input', (e) => { R3.blend = +e.target.value; v.render(); });
  listen($('#r-exag'),'input', (e) => { R3.exag = Math.round(Math.pow(10, +e.target.value)); $('#r-exag-v').textContent = `×${R3.exag}`; v.render(); });
  listen($('#r-sigma'),'input', (e) => { R3.sigma = +e.target.value; $('#r-sigma-v').textContent = `${nf(R3.sigma, 1)} px`; });
  listen($('#r-sigma'),'change', () => { runMC(); v.render(); });
  listen($('#r-play'),'click', playMorph);
  listen($('#r-fit'),'click', () => v.fit());
  listen($('#x-png'),'click', exportPNG);
  listen($('#x-pgw'),'click', exportPGW);
  listen($('#x-copy'),'click', async () => {
    const txt = $('#pgw').textContent;
    try { await navigator.clipboard.writeText(txt); hooks.toast('World file copiat.'); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($('#pgw')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); hooks.toast('Textul este selectat: apasă Ctrl+C.'); }
  });
  listen(window,'resize', () => drawChart());
  function reset(){
    clearInterval(flickTimer);Object.assign(R3,defaultView);mcKey='';rasterKey='';
    for(const[id,key]of [['#r-vectors','vectors'],['#r-grid','grid'],['#r-tissot','tissot'],['#r-mc','mc'],['#r-next','next']])$(id).checked=R3[key];
    $('#r-mode').value=R3.mode;$('#r-blend').value=R3.blend;$('#r-blend-wrap').hidden=true;$('#r-exag').value=Math.log10(R3.exag);$('#r-exag-v').textContent='×'+R3.exag;$('#r-sigma').value=R3.sigma;$('#r-sigma-v').textContent=nf(R3.sigma,1)+' px';
    if(get().scene){update();renderExport();}
  }
  reset();pulse();

  return {
    reset,
    update: () => { update(); renderExport(); },
    live, play: playMorph, viewer: v, get nextBest() { return nextBest; },
    destroy:()=>{dead=true;abort.abort();v.destroy();clearTimeout(fullTimer);clearInterval(flickTimer);cancelAnimationFrame(liveRaf);cancelAnimationFrame(pulseRaf);rectCanvas=null;model=null;},
    redraw: () => { v.render(); drawChart(); },
  };
}
