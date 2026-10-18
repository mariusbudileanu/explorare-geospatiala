// Cartographic rendering of World B (delta, 1:100 000).
import { Rand, hashSeed } from './rng.js';
import { pointInPoly } from './geom.js';
import {
  INK, PAPER, SERIF, tracePoly, fillPoly, strokeLine, font, label, drawFrame, drawMarginalia,
} from './render_common.js';

export const DELTA_STYLE = {
  marsh: '#e5ebd6', reed: '#6c8a63', water: '#b3d4ea', waterLine: '#2f6ea7', waterText: '#1f5a8e',
  sea: '#a6cbe5', sand: '#eedfb2', grind: '#f2e8c8', contour: '#a96b36',
  forest: '#bfd6a3', tree: '#4f7c3d', fields: ['#efeac4', '#e6e0ae', '#f3eed6'], road: '#f2c04f',
};

function reeds(ctx, S, w, mm) {
  const st = DELTA_STYLE;
  const r = new Rand(hashSeed('reeds'));
  const stepM = 3.2 * S.res * S.pxPerMm;
  const water = [...w.lakes.map(l => l.poly), ...w.oxbows];
  ctx.strokeStyle = st.reed; ctx.lineWidth = mm(0.1); ctx.lineCap = 'round';
  for (let E = w.cfg.E0; E < w.cfg.E1; E += stepM) for (let N = w.cfg.N0; N < w.cfg.N1; N += stepM * 0.8) {
    const e = E + r.range(-0.4, 0.4) * stepM, n = N + r.range(-0.4, 0.4) * stepM;
    if (pointInPoly(e, n, w.sea) || pointInPoly(e, n, w.polder.poly)) continue;
    if (w.grinds.some(g => pointInPoly(e, n, g.poly))) continue;
    if (water.some(p => pointInPoly(e, n, p))) continue;
    const [u, v] = S.toPx(e, n);
    ctx.beginPath();
    ctx.moveTo(u - mm(0.6), v); ctx.lineTo(u + mm(0.6), v);
    ctx.moveTo(u, v); ctx.lineTo(u, v - mm(0.75));
    ctx.moveTo(u, v); ctx.lineTo(u - mm(0.45), v - mm(0.6));
    ctx.moveTo(u, v); ctx.lineTo(u + mm(0.45), v - mm(0.6));
    ctx.stroke();
  }
}

function forestSymbols(ctx, S, poly, seed, mm) {
  const st = DELTA_STYLE;
  const r = new Rand(seed);
  const stepM = 2.4 * S.res * S.pxPerMm;
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  ctx.strokeStyle = st.tree; ctx.fillStyle = st.tree; ctx.lineWidth = mm(0.12);
  for (let E = Math.min(...xs); E < Math.max(...xs); E += stepM) for (let N = Math.min(...ys); N < Math.max(...ys); N += stepM) {
    const e = E + r.range(-0.3, 0.3) * stepM, n = N + r.range(-0.3, 0.3) * stepM;
    if (!pointInPoly(e, n, poly)) continue;
    const [u, v] = S.toPx(e, n);
    ctx.beginPath(); ctx.arc(u, v - mm(0.35), mm(0.5), 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(u, v + mm(0.15)); ctx.lineTo(u, v + mm(0.55)); ctx.stroke();
  }
}

function water(ctx, S, poly, mm) {
  const st = DELTA_STYLE;
  fillPoly(ctx, S, poly, st.water);
  ctx.save(); ctx.beginPath(); tracePoly(ctx, S, poly); ctx.clip();
  ctx.strokeStyle = 'rgba(47,110,167,0.25)'; ctx.lineWidth = mm(1.8); ctx.beginPath(); tracePoly(ctx, S, poly); ctx.stroke();
  ctx.restore();
  fillPoly(ctx, S, poly, null, st.waterLine, mm(0.15));
}

function lighthouse(ctx, u, v, mm) {
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = mm(0.15);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI) / 4;
    ctx.beginPath(); ctx.moveTo(u + Math.cos(a) * mm(0.9), v + Math.sin(a) * mm(0.9)); ctx.lineTo(u + Math.cos(a) * mm(1.8), v + Math.sin(a) * mm(1.8)); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(u, v, mm(0.6), 0, 7); ctx.fill();
}

function churchDot(ctx, u, v, mm) {
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.25);
  ctx.beginPath(); ctx.moveTo(u, v); ctx.lineTo(u, v - mm(1.8)); ctx.moveTo(u - mm(0.6), v - mm(1.2)); ctx.lineTo(u + mm(0.6), v - mm(1.2)); ctx.stroke();
  ctx.beginPath(); ctx.arc(u, v + mm(0.3), mm(0.45), 0, 7); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
}

export function drawDeltaMap(ctx, S, w) {
  const st = DELTA_STYLE, mm = S.mm, F = S.frame;
  ctx.save();
  ctx.beginPath(); ctx.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); ctx.clip();
  ctx.fillStyle = st.marsh; ctx.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);
  reeds(ctx, S, w, mm);

  // Grinds, relief, forests
  for (const g of w.grinds) fillPoly(ctx, S, g.poly, st.grind, '#c8ab6a', mm(0.12));
  for (const c of w.grindContours) strokeLine(ctx, S, c.pts, st.contour, c.index ? mm(0.2) : mm(0.1));
  w.forests.forEach((f, i) => { fillPoly(ctx, S, f, st.forest); forestSymbols(ctx, S, f, hashSeed('forest', i), mm); });

  // Polder
  const pd = w.polder;
  for (const f of pd.fields) {
    fillPoly(ctx, S, f.poly, st.fields[f.tone]);
    if (f.stripes) {
      ctx.save(); ctx.beginPath(); tracePoly(ctx, S, f.poly); ctx.clip();
      ctx.strokeStyle = 'rgba(140,128,70,0.35)'; ctx.lineWidth = mm(0.08);
      const [a, b, , d] = f.poly;
      for (let k = 0; k <= 1; k += 0.08) {
        const p = [a[0] + (d[0] - a[0]) * k, a[1] + (d[1] - a[1]) * k], q = [b[0] + (d[0] - a[0]) * k, b[1] + (d[1] - a[1]) * k];
        strokeLine(ctx, S, [p, q], 'rgba(140,128,70,0.35)', mm(0.08), 'butt');
      }
      ctx.restore();
    }
  }
  for (const c of pd.canals) strokeLine(ctx, S, c, st.waterLine, mm(0.28), 'butt');
  // Dyke with teeth on the outside
  strokeLine(ctx, S, [...pd.poly, pd.poly[0]], INK, mm(0.35), 'butt');
  const cen = pd.poly.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]);
  for (let k = 0; k < 4; k++) {
    const a = pd.poly[k], b = pd.poly[(k + 1) % 4];
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L;
    if (nx * (cen[0] - a[0]) + ny * (cen[1] - a[1]) > 0) { nx = -nx; ny = -ny; }
    for (let t = 120; t < L; t += 300) {
      const p = [a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L];
      strokeLine(ctx, S, [p, [p[0] + nx * 110, p[1] + ny * 110]], INK, mm(0.22), 'butt');
    }
  }
  { const [u, v] = S.toPx(pd.pump[0], pd.pump[1]); ctx.fillStyle = INK; ctx.fillRect(u - mm(0.9), v - mm(0.9), mm(1.8), mm(1.8)); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(u, v, mm(0.45), 0, 7); ctx.fill(); }

  // Water: lakes, oxbows, canals, branches
  for (const l of w.lakes) water(ctx, S, l.poly, mm);
  for (const o of w.oxbows) water(ctx, S, o, mm);
  for (const c of w.canals) { strokeLine(ctx, S, c, st.waterLine, mm(0.5), 'butt'); strokeLine(ctx, S, c, st.water, mm(0.22), 'butt'); }
  for (const b of w.branches) strokeLine(ctx, S, b.line, st.waterLine, b.width / S.res + mm(0.35), 'round');
  for (const b of w.branches) strokeLine(ctx, S, b.line, st.water, b.width / S.res, 'round');

  // Sea with beach
  strokeLine(ctx, S, w.coast, st.sand, mm(1.6), 'butt');
  fillPoly(ctx, S, w.sea, st.sea);
  ctx.save(); ctx.beginPath(); tracePoly(ctx, S, w.sea); ctx.clip();
  for (const iso of w.isobaths) {
    strokeLine(ctx, S, iso.line, 'rgba(47,110,167,0.55)', mm(0.12), 'butt', [mm(1.2), mm(0.7)]);
    const p = iso.line[Math.floor(iso.line.length * 0.18)];
    const [u, v] = S.toPx(p[0], p[1]);
    label(ctx, String(iso.depth), u, v, { f: font(mm(1.7), { family: SERIF, italic: true }), fill: st.waterText, haloW: mm(0.6), halo: st.sea });
  }
  ctx.restore();
  for (const b of w.branches) if (b.key !== 'main') { // mouths flow into the sea
    const tail = b.line.slice(-25);
    strokeLine(ctx, S, tail, st.sea, b.width / S.res * 0.9, 'round');
  }
  strokeLine(ctx, S, w.coast, st.waterLine, mm(0.22), 'butt');
  // sand stipple
  { const r = new Rand(7); ctx.fillStyle = '#b39a5c';
    for (let i = 0; i < w.coast.length; i += 1) { const p = w.coast[i]; for (let k = 0; k < 2; k++) { const [u, v] = S.toPx(p[0] - r.range(20, 230), p[1] + r.range(-60, 60)); ctx.fillRect(u, v, mm(0.18), mm(0.18)); } } }

  // Harbour and roads
  for (const m of w.moles) strokeLine(ctx, S, m, INK, mm(0.5), 'butt');
  for (const rd of w.roads) {
    if (rd.kind === 'main') { strokeLine(ctx, S, rd.line, INK, mm(0.95)); strokeLine(ctx, S, rd.line, st.road, mm(0.6)); }
    else { strokeLine(ctx, S, rd.line, '#fbf7ed', mm(0.55)); strokeLine(ctx, S, rd.line, INK, mm(0.18), 'butt', [mm(1.4), mm(0.6)]); }
  }

  // Settlements
  for (const v of w.villages) {
    for (const s of v.streets) strokeLine(ctx, S, s, INK, mm(0.18), 'butt');
    for (const h of v.houses) fillPoly(ctx, S, h.poly, INK);
    const [u, vv] = S.toPx(v.church[0], v.church[1]);
    churchDot(ctx, u, vv, mm);
  }
  { const [u, v] = S.toPx(w.lighthouse[0], w.lighthouse[1]); lighthouse(ctx, u, v, mm); }

  ctx.restore();
  // Labels (allowed to cross into sea; still clipped to frame)
  ctx.save(); ctx.beginPath(); ctx.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); ctx.clip();
  for (const l of w.labels) {
    const [u, v] = S.toPx(l.p[0], l.p[1]);
    const a = -(l.ang || 0);
    if (l.kind === 'river') label(ctx, l.text, u, v, { f: font(mm(l.size), { family: SERIF, italic: true, weight: 600 }), fill: st.waterText, ang: a, spacing: mm(0.5), haloW: mm(0.5), halo: st.water });
    if (l.kind === 'lake') label(ctx, l.text, u, v, { f: font(mm(2.5), { family: SERIF, italic: true }), fill: st.waterText });
    if (l.kind === 'grind') label(ctx, l.text, u, v, { f: font(mm(2.3), { weight: 600 }), fill: '#7a5a2a', ang: a, spacing: mm(1.1), haloW: mm(0.8), halo: 'rgba(242,232,200,0.9)' });
    if (l.kind === 'village') label(ctx, l.text, u, v, { f: font(mm(2.4), { weight: 600 }), haloW: mm(0.9), halo: 'rgba(229,235,214,0.95)' });
    if (l.kind === 'town') label(ctx, l.text.toUpperCase(), u, v, { f: font(mm(3), { weight: 600 }), spacing: mm(0.4), haloW: mm(1), halo: 'rgba(229,235,214,0.95)' });
    if (l.kind === 'sea') label(ctx, l.text, u, v, { f: font(mm(4.6), { family: SERIF, italic: true, weight: 600 }), fill: st.waterText, ang: a, spacing: mm(2.4) });
    if (l.kind === 'region') label(ctx, l.text, u, v, { f: font(mm(2.1), { weight: 600 }), fill: '#6b5f2c', ang: a, spacing: mm(0.9), haloW: mm(0.7), halo: 'rgba(239,234,196,0.9)' });
  }
  ctx.restore();
}

export function deltaLegend() {
  const st = DELTA_STYLE;
  const sw = (fill, stroke, lwMm) => (ctx, x, y, w, h, mm) => { ctx.fillStyle = fill; ctx.fillRect(x + mm(1.5), y + mm(0.8), w - mm(3), h - mm(1.6)); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = mm(lwMm); ctx.strokeRect(x + mm(1.5), y + mm(0.8), w - mm(3), h - mm(1.6)); } };
  const ln = (color, lwMm, dash, casing) => (ctx, x, y, w, h, mm) => {
    const yy = y + h / 2;
    if (casing) { ctx.strokeStyle = casing[0]; ctx.lineWidth = mm(casing[1]); ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); }
    ctx.strokeStyle = color; ctx.lineWidth = mm(lwMm); ctx.lineCap = 'butt';
    if (dash) ctx.setLineDash(dash.map(mm));
    ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); ctx.setLineDash([]);
  };
  return [
    { header: 'HIDROGRAFIE' },
    { label: 'Braț, fluviu', draw: ln(st.water, 2.4, null, [st.waterLine, 2.8]) },
    { label: 'Lac, meandru părăsit', draw: sw(st.water, st.waterLine, 0.15) },
    { label: 'Canal', draw: ln(st.water, 0.22, null, [st.waterLine, 0.5]) },
    { label: 'Izobată (m)', draw: (ctx, x, y, w, h, mm) => { ctx.fillStyle = st.sea; ctx.fillRect(x, y, w, h); ln('rgba(47,110,167,0.7)', 0.12, [1.2, 0.7])(ctx, x, y, w, h, mm); } },
    { header: 'VEGETAȚIE ȘI SOL' },
    { label: 'Mlaștină cu stuf', draw: (ctx, x, y, w, h, mm) => { sw(st.marsh)(ctx, x, y, w, h, mm); ctx.strokeStyle = st.reed; ctx.lineWidth = mm(0.1); const u = x + w / 2, v = y + h * 0.65; ctx.beginPath(); ctx.moveTo(u - mm(0.6), v); ctx.lineTo(u + mm(0.6), v); ctx.moveTo(u, v); ctx.lineTo(u, v - mm(0.75)); ctx.moveTo(u, v); ctx.lineTo(u - mm(0.45), v - mm(0.6)); ctx.moveTo(u, v); ctx.lineTo(u + mm(0.45), v - mm(0.6)); ctx.stroke(); } },
    { label: 'Grind nisipos', draw: sw(st.grind, '#c8ab6a', 0.12) },
    { label: 'Pădure', draw: sw(st.forest) },
    { label: 'Teren agricol îndiguit', draw: sw(st.fields[1]) },
    { label: 'Dig de apărare', draw: (ctx, x, y, w, h, mm) => { ln(INK, 0.35)(ctx, x, y, w, h, mm); ctx.lineWidth = mm(0.22); for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 5, y + h / 2); ctx.lineTo(x + k * w / 5, y + h / 2 - mm(1)); ctx.stroke(); } } },
    { label: 'Curbă de nivel (2 m)', draw: ln(st.contour, 0.1) },
    { header: 'LOCALITĂȚI ȘI CĂI' },
    { label: 'Clădiri, străzi', draw: (ctx, x, y, w, h, mm) => { ln(INK, 0.18)(ctx, x, y, w, h, mm); ctx.fillStyle = INK; for (let k = 0; k < 4; k++) ctx.fillRect(x + mm(1.4) + k * mm(2.4), y + h / 2 - mm(1.3), mm(0.7), mm(0.5)); } },
    { label: 'Biserică', draw: (ctx, x, y, w, h, mm) => churchDot(ctx, x + w / 2, y + h * 0.7, mm) },
    { label: 'Far', draw: (ctx, x, y, w, h, mm) => lighthouse(ctx, x + w / 2, y + h / 2, mm) },
    { label: 'Drum principal', draw: ln(st.road, 0.6, null, [INK, 0.95]) },
    { label: 'Drum de pământ', draw: (ctx, x, y, w, h, mm) => { ln('#fbf7ed', 0.55)(ctx, x, y, w, h, mm); ln(INK, 0.18, [1.4, 0.6])(ctx, x, y, w, h, mm); } },
    { label: 'Stație de pompare', draw: (ctx, x, y, w, h, mm) => { ctx.fillStyle = INK; ctx.fillRect(x + w / 2 - mm(0.9), y + h / 2 - mm(0.9), mm(1.8), mm(1.8)); ctx.fillStyle = PAPER; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, mm(0.45), 0, 7); ctx.fill(); } },
    { header: 'CAROIAJ' },
    { label: 'Caroiaj Stereo 70 la 5 km', draw: (ctx, x, y, w, h, mm) => { ctx.strokeStyle = INK; ctx.lineWidth = mm(0.13); ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke(); } },
  ];
}

export function drawDeltaSheet(ctx, S, w) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S.W, S.H);
  drawDeltaMap(ctx, S, w);
  drawFrame(ctx, S);
  drawMarginalia(ctx, S, deltaLegend(), [
    'Proiecție stereografică 1970 (Stereo 70, EPSG:3844) · elipsoid Krasovski 1940 · datum Pulkovo 1942(58)',
    'Caroiaj rectangular la 5 km · etichete: E = coordonata Y (est), N = coordonata X (nord)',
    'Echidistanța curbelor de nivel: 2 m (doar pe grinduri) · izobate în metri · cote fictive',
    'Geografie fictivă generată procedural. Caroiajul și coordonatele sunt reale.',
  ]);
}
