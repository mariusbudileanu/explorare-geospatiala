// Cartographic rendering of World A (urban plan, 1:10 000).
import { Rand, hashSeed } from './rng.js';
import { pointInPoly } from './geom.js';
import {
  INK, PAPER, SANS, SERIF, tracePoly, fillPoly, strokeLine, font, label, drawFrame, drawMarginalia,
} from './render_common.js';

export const BUC_STYLE = {
  ground: '#fbf7ed', block: '#efe2cf', blockLine: '#7c6a5c', parcel: '#a49384',
  bld: '#8f5c4b', bldLine: '#2c211c', annex: '#c39a85', hall: '#7e7068', tower: '#7a4e40',
  water: '#b7d7ea', waterLine: '#3474ad', waterText: '#1f5a8e',
  green: '#d4e6bf', tree: '#5d8a46', greenText: '#3a6427',
  road: '#f2c04f', contour: '#a96b36',
};

function trees(ctx, S, poly, seed, spacingMm) {
  const st = BUC_STYLE, mm = S.mm;
  const r = new Rand(seed);
  const xs = poly.map(p => p[0]), ys = poly.map(p => p[1]);
  const step = spacingMm * S.res * S.pxPerMm; // metres
  ctx.strokeStyle = st.tree; ctx.lineWidth = mm(0.12);
  for (let E = Math.min(...xs); E < Math.max(...xs); E += step) {
    for (let N = Math.min(...ys); N < Math.max(...ys); N += step) {
      const e = E + r.range(-0.35, 0.35) * step, n = N + r.range(-0.35, 0.35) * step;
      if (!pointInPoly(e, n, poly)) continue;
      const [u, v] = S.toPx(e, n);
      ctx.beginPath(); ctx.arc(u, v, mm(0.55), 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(u, v, mm(0.12), 0, Math.PI * 2); ctx.fillStyle = st.tree; ctx.fill();
    }
  }
}

function lakeFill(ctx, S, poly) {
  const st = BUC_STYLE, mm = S.mm;
  fillPoly(ctx, S, poly, st.water);
  ctx.save();
  ctx.beginPath(); tracePoly(ctx, S, poly); ctx.clip();
  ctx.strokeStyle = 'rgba(52,116,173,0.28)'; ctx.lineWidth = mm(2.2);
  ctx.beginPath(); tracePoly(ctx, S, poly); ctx.stroke();
  ctx.strokeStyle = 'rgba(52,116,173,0.35)'; ctx.lineWidth = mm(0.1);
  ctx.setLineDash([mm(1.2), mm(0.8)]);
  ctx.beginPath(); tracePoly(ctx, S, poly); ctx.lineWidth = mm(1.6); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  fillPoly(ctx, S, poly, null, st.waterLine, mm(0.18));
}

function church(ctx, u, v, mm) {
  ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = mm(0.35);
  ctx.beginPath(); ctx.arc(u, v + mm(0.7), mm(0.7), 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(u, v); ctx.lineTo(u, v - mm(2.2)); ctx.moveTo(u - mm(0.75), v - mm(1.45)); ctx.lineTo(u + mm(0.75), v - mm(1.45)); ctx.stroke();
}

export function drawBucMap(ctx, S, w) {
  const st = BUC_STYLE, mm = S.mm, F = S.frame;
  ctx.save();
  ctx.beginPath(); ctx.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); ctx.clip();
  ctx.fillStyle = st.ground; ctx.fillRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);

  // Contours (beneath everything built)
  for (const c of w.contours) {
    ctx.globalAlpha = c.index ? 0.85 : 0.55;
    strokeLine(ctx, S, c.pts, st.contour, c.index ? mm(0.2) : mm(0.1));
  }
  ctx.globalAlpha = 1;

  // Green spaces
  fillPoly(ctx, S, w.park.poly, st.green, '#7aa25e', mm(0.15));
  trees(ctx, S, w.park.poly, hashSeed('trees-park'), 2.6);
  for (const p of w.park.paths) if (p.length > 1) { strokeLine(ctx, S, p, '#fbf7ed', mm(0.9)); strokeLine(ctx, S, p, '#8c7a5e', mm(0.12), 'round', [mm(0.6), mm(0.5)]); }
  w.squares.forEach((sq, i) => { fillPoly(ctx, S, sq, st.green, '#7aa25e', mm(0.12)); trees(ctx, S, sq, hashSeed('sq', i), 2.4); });

  // Blocks, parcels, buildings
  for (const b of w.blocks) fillPoly(ctx, S, b.poly, st.block, st.blockLine, mm(0.1));
  ctx.strokeStyle = st.parcel; ctx.lineWidth = mm(0.06);
  for (const p of w.parcels) { ctx.beginPath(); tracePoly(ctx, S, p); ctx.stroke(); }
  for (const b of w.buildings) {
    const fill = b.kind === 'anexa' ? st.annex : b.kind === 'hala' ? st.hall : b.kind === 'turn' ? st.tower : st.bld;
    fillPoly(ctx, S, b.poly, fill, st.bldLine, mm(0.07));
    if (b.kind === 'hala') {
      ctx.save(); ctx.beginPath(); tracePoly(ctx, S, b.poly); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = mm(0.08);
      const [u0, v0] = S.toPx(b.poly[0][0], b.poly[0][1]);
      for (let k = -60; k < 60; k++) { ctx.beginPath(); ctx.moveTo(u0 + k * mm(0.8) - mm(30), v0 - mm(30)); ctx.lineTo(u0 + k * mm(0.8) + mm(30), v0 + mm(30)); ctx.stroke(); }
      ctx.restore();
    }
  }
  for (const t of w.tanks) {
    const [u, v] = S.toPx(t.c[0], t.c[1]);
    ctx.beginPath(); ctx.arc(u, v, t.r / S.res, 0, Math.PI * 2); ctx.fillStyle = '#e8ded0'; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = mm(0.15); ctx.stroke();
  }

  // Water
  const rw = w.river.width / S.res;
  strokeLine(ctx, S, w.river.line, st.waterLine, rw + mm(0.5), 'butt');
  strokeLine(ctx, S, w.river.line, st.water, rw, 'butt');
  strokeLine(ctx, S, w.river.line, 'rgba(52,116,173,0.25)', rw * 0.35, 'butt');
  strokeLine(ctx, S, w.stream, st.waterLine, mm(0.32));
  for (const L of w.lakes) lakeFill(ctx, S, L.poly);
  lakeFill(ctx, S, w.park.pond);

  // Railway
  const rl = w.rail.line;
  const ang = w.rail.station.ang, nx = -Math.sin(ang), ny = Math.cos(ang);
  const [sa, sb] = [w.rail.station.a, w.rail.station.b];
  for (const off of w.rail.tracks) {
    const a = [sa[0] + nx * off, sa[1] + ny * off], b = [sb[0] + nx * off, sb[1] + ny * off];
    strokeLine(ctx, S, [a, b], INK, mm(0.18));
  }
  const stB = [[sa[0] + nx * 40, sa[1] + ny * 40], [sa[0] + nx * 40 + (sb[0] - sa[0]) * 0.35, sa[1] + ny * 40 + (sb[1] - sa[1]) * 0.35]];
  const sbPoly = [stB[0], stB[1], [stB[1][0] + nx * 22, stB[1][1] + ny * 22], [stB[0][0] + nx * 22, stB[0][1] + ny * 22]];
  const shift = (p, k) => [p[0] + (sb[0] - sa[0]) * k, p[1] + (sb[1] - sa[1]) * k];
  fillPoly(ctx, S, sbPoly.map(p => shift(p, 0.3)), st.bld, st.bldLine, mm(0.1));
  strokeLine(ctx, S, rl, INK, mm(0.95), 'butt');
  strokeLine(ctx, S, rl, '#ffffff', mm(0.45), 'butt', [mm(2.4), mm(2.4)]);

  // Boulevards: casings first, then fills, so junctions merge
  const bw = 28 / S.res;
  for (const b of w.boulevards) strokeLine(ctx, S, b.line, INK, bw + mm(0.4), 'round');
  for (const b of w.boulevards) strokeLine(ctx, S, b.line, st.road, bw, 'round');
  // Bridge wings
  for (const br of w.bridges) {
    const [a, c] = br;
    const d = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
    const tx = (c[0] - a[0]) / d, ty = (c[1] - a[1]) / d, px = -ty, py = tx;
    for (const side of [-1, 1]) {
      const o = (14 + 4) * side;
      const p0 = [a[0] + px * o - tx * 6, a[1] + py * o - ty * 6], p1 = [c[0] + px * o + tx * 6, c[1] + py * o + ty * 6];
      strokeLine(ctx, S, [p0, p1], INK, mm(0.3), 'butt');
      strokeLine(ctx, S, [p0, [p0[0] + px * 7 * side - tx * 7, p0[1] + py * 7 * side - ty * 7]], INK, mm(0.3));
      strokeLine(ctx, S, [p1, [p1[0] + px * 7 * side + tx * 7, p1[1] + py * 7 * side + ty * 7]], INK, mm(0.3));
    }
  }

  // Point symbols
  for (const c of w.churches) { const [u, v] = S.toPx(c[0], c[1]); church(ctx, u, v, mm); }
  for (const s of w.spots) {
    const [u, v] = S.toPx(s.p[0], s.p[1]);
    ctx.beginPath(); ctx.arc(u, v, mm(0.35), 0, Math.PI * 2); ctx.fillStyle = INK; ctx.fill();
    label(ctx, s.z.toFixed(1).replace('.', ','), u + mm(0.8), v - mm(0.9), { f: font(mm(1.8), { family: SERIF, italic: true }), align: 'left', haloW: mm(0.6), halo: 'rgba(251,247,237,0.9)' });
  }

  // Labels
  for (const l of w.labels) {
    const [u, v] = S.toPx(l.p[0], l.p[1]);
    const a = -(l.ang || 0); // map angle → screen angle (y flips)
    if (l.kind === 'district') label(ctx, l.text, u, v, { f: font(mm(2.7), { weight: 600 }), spacing: mm(0.75), haloW: mm(1.1), halo: 'rgba(251,247,237,0.92)', fill: '#3b302a' });
    if (l.kind === 'street') label(ctx, l.text, u, v, { f: font(mm(1.75), { weight: 600 }), ang: a, fill: INK });
    if (l.kind === 'water') label(ctx, l.text, u, v, { f: font(mm(2.45), { family: SERIF, italic: true }), fill: st.waterText, ang: a });
    if (l.kind === 'river') label(ctx, l.text, u, v, { f: font(mm(2.9), { family: SERIF, italic: true, weight: 600 }), fill: st.waterText, ang: a, spacing: mm(0.6), haloW: mm(0.6), halo: st.water });
    if (l.kind === 'park') label(ctx, l.text, u, v, { f: font(mm(2.4), { family: SERIF, italic: true, weight: 600 }), fill: st.greenText, haloW: mm(0.8), halo: 'rgba(212,230,191,0.95)' });
    if (l.kind === 'poi') label(ctx, l.text, u, v, { f: font(mm(2.1), { weight: 600 }), ang: a, haloW: mm(0.8), halo: 'rgba(251,247,237,0.92)' });
  }
  ctx.restore();
}

export function bucLegend() {
  const st = BUC_STYLE;
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
    { label: 'Râu canalizat', draw: ln(st.water, 3, null, [st.waterLine, 3.5]) },
    { label: 'Lac, iaz', draw: sw(st.water, st.waterLine, 0.18) },
    { label: 'Pârâu', draw: ln(st.waterLine, 0.32) },
    { header: 'CONSTRUCȚII' },
    { label: 'Clădire, bloc de locuințe', draw: sw(st.bld, st.bldLine, 0.07) },
    { label: 'Anexă gospodărească', draw: sw(st.annex, st.bldLine, 0.07) },
    { label: 'Hală industrială', draw: sw(st.hall, st.bldLine, 0.07) },
    { label: 'Cvartal, limită de parcelă', draw: (ctx, x, y, w, h, mm) => { sw(st.block, st.blockLine, 0.1)(ctx, x, y, w, h, mm); ctx.strokeStyle = st.parcel; ctx.lineWidth = mm(0.08); ctx.beginPath(); ctx.moveTo(x + w / 2, y + mm(0.8)); ctx.lineTo(x + w / 2, y + h - mm(0.8)); ctx.stroke(); } },
    { label: 'Biserică', draw: (ctx, x, y, w, h, mm) => church(ctx, x + w / 2, y + h * 0.72, mm) },
    { label: 'Rezervor', draw: (ctx, x, y, w, h, mm) => { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, mm(1.4), 0, 7); ctx.fillStyle = '#e8ded0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = mm(0.15); ctx.stroke(); } },
    { header: 'CĂI DE COMUNICAȚIE' },
    { label: 'Arteră principală', draw: ln(st.road, 2.6, null, [INK, 3]) },
    { label: 'Cale ferată', draw: (ctx, x, y, w, h, mm) => { ln(INK, 0.95)(ctx, x, y, w, h, mm); ln('#fff', 0.45, [2.4, 2.4])(ctx, x, y, w, h, mm); } },
    { header: 'VEGETAȚIE ȘI RELIEF' },
    { label: 'Parc, scuar', draw: (ctx, x, y, w, h, mm) => { sw(st.green, '#7aa25e', 0.12)(ctx, x, y, w, h, mm); ctx.strokeStyle = st.tree; ctx.lineWidth = mm(0.12); for (const k of [0.3, 0.7]) { ctx.beginPath(); ctx.arc(x + w * k, y + h / 2, mm(0.55), 0, 7); ctx.stroke(); } } },
    { label: 'Curbă de nivel normală (2 m)', draw: ln(st.contour, 0.1) },
    { label: 'Curbă principală (10 m)', draw: ln(st.contour, 0.22) },
    { label: 'Punct cotat', draw: (ctx, x, y, w, h, mm) => { ctx.beginPath(); ctx.arc(x + mm(3), y + h / 2, mm(0.35), 0, 7); ctx.fillStyle = INK; ctx.fill(); label(ctx, '74,3', x + mm(4), y + h / 2, { f: font(mm(1.8), { family: SERIF, italic: true }), align: 'left' }); } },
    { header: 'CAROIAJ' },
    { label: 'Caroiaj Stereo 70 la 500 m', draw: (ctx, x, y, w, h, mm) => { ctx.strokeStyle = INK; ctx.lineWidth = mm(0.13); ctx.beginPath(); ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke(); } },
  ];
}

export function drawBucSheet(ctx, S, w) {
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, S.W, S.H);
  drawBucMap(ctx, S, w);
  drawFrame(ctx, S);
  drawMarginalia(ctx, S, bucLegend(), [
    'Proiecție stereografică 1970 (Stereo 70, EPSG:3844) · elipsoid Krasovski 1940 · datum Pulkovo 1942(58)',
    'Caroiaj rectangular la 500 m · etichete: E = coordonata Y (est), N = coordonata X (nord)',
    'Echidistanța curbelor de nivel: 2 m · cote fictive',
    'Geografie fictivă generată procedural. Caroiajul și coordonatele sunt reale.',
  ]);
}
