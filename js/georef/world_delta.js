// World B — „Delta”: a fictional river delta at 1:100 000, placed over the Danube Delta in Stereo 70.
import { contours } from '../vendor/p07-d3.js';
import { Rand, Noise2D, hashSeed } from './rng.js';
import { pointInPoly, chaikin, frameRect, blob, centroid, polyArea, alongPolyline, distToPolyline } from './geom.js';

export const DELTA_CFG = {
  id: 'delta',
  title: 'DELTA SĂLCIILOR',
  subtitle: 'Hartă topografică sintetică',
  scale: 100000,
  E0: 835000, E1: 875000, N0: 398000, N1: 428000,
  dpi: 150,             // 1 px = 16.93 m on the ground
  grid: 5000,
  contour: 2, contourIndex: 10,
  sheetNo: 'GL-D-07',
  graticuleStep: 1 / 60, // 1′ bands
  marginsMm: { l: 24, r: 64, t: 32, b: 30 },
};

export function generateDelta(seed = 1970) {
  const C = DELTA_CFG;
  const r = new Rand(hashSeed('delta', seed));
  const nz = new Noise2D(hashSeed('delta-noise', seed));
  const W = C.E1 - C.E0, H = C.N1 - C.N0;
  const toEN = ([x, y]) => [C.E0 + x, C.N0 + y];

  // ---------- Coast ----------
  const mouths = { north: 25000, middle: 16300, south: 5200 };
  const coastX = (y) => 33800 + 1200 * nz.fbm(y / 8000 + 11, 1.3, 3)
    + 1300 * Math.exp(-(((y - mouths.north) / 2600) ** 2))
    + 700 * Math.exp(-(((y - mouths.middle) / 1500) ** 2))
    + 1600 * Math.exp(-(((y - mouths.south) / 3000) ** 2));
  const coast = [];
  for (let y = -1500; y <= H + 1500; y += 150) coast.push([coastX(y), y]);
  const coastLine = chaikin(coast, 2);
  const seaPoly = [...coastLine, [W + 5000, H + 1500], [W + 5000, -1500]];
  const isobaths = [2, 5, 10, 20].map((d, i) => ({
    depth: d,
    line: chaikin(coast.map(([x, y]) => [x + [500, 1600, 3300, 5800][i] + 400 * nz.noise(y / 5000 + i * 3, 7), y]), 2),
  }));

  // ---------- Branches ----------
  const split = [8600, 15100];
  const meander = (pts, amp, period, step, key) => {
    const out = [];
    let s = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const a = pts[k], b = pts[k + 1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const tx = (b[0] - a[0]) / L, ty = (b[1] - a[1]) / L;
      const n = Math.ceil(L / step);
      for (let i = 0; i < n; i++) {
        const t = (i / n) * L;
        const fade = Math.min(1, (s + t) / 2500);
        const off = amp * fade * nz.fbm((s + t) / period + key, key * 1.7, 3);
        out.push([a[0] + tx * t - ty * off, a[1] + ty * t + tx * off]);
      }
      s += L;
    }
    out.push(pts[pts.length - 1]);
    return chaikin(out, 3);
  };
  const main = meander([[-1500, 15600], [4000, 15900], split], 500, 5200, 150, 1);
  const north = meander([split, [14000, 20500], [24000, 23600], [coastX(mouths.north) + 600, mouths.north]], 1100, 5200, 150, 2);
  const middle = meander([split, [20000, 16100], [coastX(mouths.middle) + 900, mouths.middle]], 180, 3500, 150, 3);
  const south = meander([split, [14000, 10500], [21000, 8000], [coastX(mouths.south) + 700, mouths.south]], 1500, 4200, 150, 4);
  const branches = [
    { key: 'main', line: main, width: 480, name: 'Fluviul Mare' },
    { key: 'north', line: north, width: 330, name: 'Brațul Sălciilor' },
    { key: 'middle', line: middle, width: 170, name: 'Canalul Drept' },
    { key: 'south', line: south, width: 280, name: 'Brațul Cotit' },
  ];

  // Old meanders cut off by the straightened middle branch (oxbow lakes)
  const oxbows = [];
  for (const [x0, side] of [[13000, 1], [18500, -1], [26500, 1]]) {
    const q = middle.reduce((b, p) => (Math.abs(p[0] - x0) < Math.abs(b[0] - x0) ? p : b));
    const R = r.range(700, 1000), cx = q[0], cy = q[1] + side * R * 0.55;
    const outer = [], inner = [];
    for (let t = 0.18; t <= 0.82; t += 0.02) {
      const a = side > 0 ? Math.PI * t : -Math.PI * t;
      outer.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.75]);
      inner.push([cx + Math.cos(a) * (R - 110), cy + Math.sin(a) * (R - 110) * 0.75]);
    }
    oxbows.push(chaikin([...outer, ...inner.reverse()], 1, true));
  }

  // ---------- Polder (dyked agricultural enclosure) ----------
  const pc = [6600, 6400], pAng = 0.21, pu = 4500, pv = 3000;
  const polder = frameRect(pc[0], pc[1], pAng, -pu, -pv, pu, pv);
  const polderCanals = [];
  for (let u = -pu + 1000; u < pu - 1; u += 1000) polderCanals.push(frameRect(pc[0], pc[1], pAng, u, -pv + 150, u, pv - 150).slice(0, 2));
  polderCanals.push(frameRect(pc[0], pc[1], pAng, -pu + 150, 0, pu - 150, 0).slice(0, 2));
  const pump = frameRect(pc[0], pc[1], pAng, pu, 0, pu, 0)[0];
  const polderFields = [];
  for (let u = -pu; u < pu - 1; u += 1000) for (const [v0, v1] of [[-pv, 0], [0, pv]]) {
    polderFields.push({ poly: frameRect(pc[0], pc[1], pAng, u + 60, v0 + 60, u + 940, v1 - 60), stripes: r.next() < 0.5, tone: r.int(0, 2) });
  }

  // ---------- Grinds (sand ridges) ----------
  const grinds = [
    { c: [28400, 20200], a: 6200, b: 1700, ang: 1.25, name: 'GRINDUL NISIPOS' },
    { c: [23600, 11600], a: 4700, b: 1500, ang: 0.95, name: 'GRINDUL STEJARILOR' },
  ].map((g, i) => ({ ...g, poly: blob(g.c[0], g.c[1], g.a, g.b, g.ang, (u, v) => nz.noise(u * 1.6 + 40 + i * 9, v * 1.6), 72, 0.2) }));

  // ---------- Raster helpers ----------
  const step = 100, gw = Math.ceil(W / step) + 1, gh = Math.ceil(H / step) + 1;
  const idx = (x, y) => { const i = Math.round(x / step), j = Math.round(gh - 1 - y / step); return (i < 0 || j < 0 || i >= gw || j >= gh) ? -1 : j * gw + i; };
  const nearWater = new Float32Array(gw * gh).fill(1e9);
  const stamp = (line, rad) => {
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1], b = line[k];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (step / 2)));
      for (let t = 0; t <= n; t++) {
        const x = a[0] + (b[0] - a[0]) * t / n, y = a[1] + (b[1] - a[1]) * t / n;
        const R = Math.ceil(rad / step) + 1;
        const ci = Math.round(x / step), cj = Math.round(gh - 1 - y / step);
        for (let dj = -R; dj <= R; dj++) for (let di = -R; di <= R; di++) {
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
          const d = Math.hypot(di, dj) * step;
          if (d <= rad) { const o = j * gw + i; nearWater[o] = Math.min(nearWater[o], d); }
        }
      }
    }
  };
  for (const b of branches) stamp(b.line, b.width / 2 + 450);

  // ---------- Lakes ----------
  const named = [
    { c: [15200, 21600], R: 2300, name: 'Lacul Stuful Mare' },
    { c: [17600, 4600], R: 1900, name: 'Lacul Plaurului' },
    { c: [30200, 9800], R: 1500, name: 'Lacul Bălții Albe' },
    { c: [21500, 27400], R: 1400, name: 'Lacul Cotul Lung' },
  ];
  const F = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * step, y = (gh - 1 - j) * step;
    let v = 0.8 * nz.fbm(x / 4200 + 5, y / 4200 + 5, 4) + 0.45 * nz.fbm(x / 1300 + 21, y / 1300 + 4, 3) - 0.2;
    for (const L of named) v += 0.75 * Math.exp(-(((x - L.c[0]) ** 2 + (y - L.c[1]) ** 2) / (L.R * L.R)));
    if (nearWater[j * gw + i] < 1e8) v -= 1;
    if (x > coastX(y) - 900) v -= 1;
    if (pointInPoly(x, y, polder) || grinds.some(g => pointInPoly(x, y, g.poly))) v -= 1;
    F[j * gw + i] = v;
  }
  const lakeSet = contours().size([gw, gh]).thresholds([0.12]).smooth(true)(F)[0];
  const lakes = [];
  for (const poly of lakeSet.coordinates) {
    const ring = chaikin(poly[0].map(([i, j]) => [i * step, (gh - 1 - j) * step]), 2, true);
    const area = polyArea(ring);
    if (area < 60000) continue;
    lakes.push({ poly: ring, area });
  }
  for (const L of named) {
    const hit = lakes.find(l => pointInPoly(L.c[0], L.c[1], l.poly));
    if (hit) { hit.name = L.name; hit.labelAt = L.c; }
  }
  for (const l of lakes) stamp(l.poly, 250);

  // ---------- Canals between lakes and branches ----------
  const canals = [];
  const bigLakes = [...lakes].sort((a, b) => b.area - a.area).slice(0, 6);
  for (const l of bigLakes) {
    const c = centroid(l.poly);
    let best = null;
    for (const b of branches) for (const p of b.line) {
      const d = Math.hypot(p[0] - c[0], p[1] - c[1]);
      if (!best || d < best.d) best = { p, d };
    }
    if (best && best.d < 9000) canals.push([c, best.p]);
  }
  for (const c of canals) stamp(c, 120);

  // ---------- Grind relief and forests ----------
  const Z = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * step, y = (gh - 1 - j) * step;
    let z = 0.4;
    for (const g of grinds) {
      const c = Math.cos(g.ang), s = Math.sin(g.ang);
      const u = ((x - g.c[0]) * c + (y - g.c[1]) * s) / g.a, v = (-(x - g.c[0]) * s + (y - g.c[1]) * c) / g.b;
      const d = u * u + v * v;
      if (d < 1.2) z = Math.max(z, 0.4 + 11 * Math.max(0, 1 - d) * (0.65 + 0.5 * nz.fbm(x / 900, y / 900, 3)));
    }
    Z[j * gw + i] = z;
  }
  const grindContours = [];
  for (const cs of contours().size([gw, gh]).thresholds([2, 4, 6, 8, 10]).smooth(true)(Z)) {
    for (const poly of cs.coordinates) for (const ring of poly) {
      grindContours.push({ z: cs.value, index: cs.value % C.contourIndex === 0, pts: chaikin(ring.map(([i, j]) => [i * step, (gh - 1 - j) * step]), 1, true) });
    }
  }
  const forests = [];
  const FF = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * step, y = (gh - 1 - j) * step;
    FF[j * gw + i] = Z[j * gw + i] > 3 ? nz.fbm(x / 1800 + 70, y / 1800, 3) : -1;
  }
  for (const poly of contours().size([gw, gh]).thresholds([0.05]).smooth(true)(FF)[0].coordinates) {
    const ring = chaikin(poly[0].map(([i, j]) => [i * step, (gh - 1 - j) * step]), 2, true);
    if (polyArea(ring) > 300000) forests.push(ring);
  }

  // ---------- Settlements ----------
  const villages = [];
  const villageSpecs = [
    { b: north, t: 0.36, side: 1, name: 'Stufărișu', n: 46 },
    { b: north, t: 0.72, side: -1, name: 'Vadu Pescarilor', n: 38 },
    { b: south, t: 0.42, side: 1, name: 'Cotul Mic', n: 34 },
    { b: south, t: 0.8, side: -1, name: 'Plaurul Nou', n: 30 },
    { b: main, t: 0.86, side: -1, name: 'Furca Mare', n: 70, town: true },
    { b: middle, t: 0.95, side: 1, name: 'Port Sălcii', n: 110, town: true },
  ];
  for (const v of villageSpecs) {
    const { p, ang } = alongPolyline(v.b, v.t);
    const nx = -Math.sin(ang) * v.side, ny = Math.cos(ang) * v.side;
    const tx = Math.cos(ang), ty = Math.sin(ang);
    const off = v.town ? 720 : 520;
    const len = v.town ? 3200 : 2400;
    const houses = [];
    const street = [[p[0] + nx * off - tx * len / 2, p[1] + ny * off - ty * len / 2], [p[0] + nx * off + tx * len / 2, p[1] + ny * off + ty * len / 2]];
    const rows = v.town ? [-260, -110, 110, 260] : [-75, 75];
    const streets = [street];
    if (v.town) for (const o of [-185, 185]) streets.push(street.map(q => [q[0] + nx * o, q[1] + ny * o]));
    for (let k = 0; k < v.n; k++) {
      const s = r.range(-len / 2 + 80, len / 2 - 80), row = r.pick(rows);
      const c = [p[0] + nx * (off + row) + tx * s, p[1] + ny * (off + row) + ty * s];
      if (houses.some(h => Math.hypot(h.c[0] - c[0], h.c[1] - c[1]) < 85)) continue;
      if (branches.some(b => distToPolyline(c[0], c[1], b.line) < b.width / 2 + 90)) continue;
      if (lakes.some(l => pointInPoly(c[0], c[1], l.poly)) || c[0] > coastX(c[1]) - 150) continue;
      houses.push({ c, poly: frameRect(c[0], c[1], ang, -32, -22, 32, 22) });
    }
    const church = [p[0] + nx * (off + 200) + tx * 120, p[1] + ny * (off + 200) + ty * 120];
    villages.push({ ...v, b: undefined, center: [p[0] + nx * (off + (v.town ? 620 : 420)), p[1] + ny * (off + (v.town ? 620 : 420))], houses, streets, church, ang });
  }
  // Harbour moles and lighthouse at the middle mouth
  const mouthEnd = middle[middle.length - 1];
  const mouthPrev = middle[middle.length - 12];
  const mAng = Math.atan2(mouthEnd[1] - mouthPrev[1], mouthEnd[0] - mouthPrev[0]);
  const moles = [-1, 1].map(sd => {
    const ox = -Math.sin(mAng) * sd * 140, oy = Math.cos(mAng) * sd * 140;
    const a = [mouthEnd[0] - Math.cos(mAng) * 900 + ox, mouthEnd[1] - Math.sin(mAng) * 900 + oy];
    return [a, [mouthEnd[0] + Math.cos(mAng) * 1500 + ox, mouthEnd[1] + Math.sin(mAng) * 1500 + oy]];
  });
  const lighthouse = moles[1][1];

  // Roads: along the main river to Furca Mare, the polder dyke road, a sand track on the grind
  const furca = villages.find(v => v.name === 'Furca Mare');
  const roads = [
    { kind: 'main', line: chaikin([[-1500, 13900], [3000, 14200], [6200, 14100], furca.streets[0][0]], 2) },
    { kind: 'dirt', line: chaikin([polder[3], polder[2], polder[1]], 0) },
    { kind: 'dirt', line: chaikin([[19600, 7000], [23600, 11600], [26700, 14800]], 2) },
    { kind: 'dirt', line: chaikin([[25200, 15800], [28400, 20200], [31000, 24600]], 2) },
  ];

  // ---------- Labels ----------
  const labels = [];
  for (const b of branches) {
    const t = b.key === 'main' ? 0.42 : b.key === 'middle' ? 0.55 : b.key === 'north' ? 0.55 : 0.6;
    const { p, ang } = alongPolyline(b.line, t);
    labels.push({ kind: 'river', text: b.name, p, ang, size: b.key === 'main' ? 3.4 : 2.9 });
  }
  for (const l of lakes) if (l.name) labels.push({ kind: 'lake', text: l.name, p: l.labelAt });
  for (const g of grinds) labels.push({ kind: 'grind', text: g.name, p: g.c, ang: g.ang });
  for (const v of villages) labels.push({ kind: v.town ? 'town' : 'village', text: v.name, p: v.center });
  labels.push({ kind: 'sea', text: 'MAREA NEAGRĂ', p: [W - 1800, H * 0.5], ang: Math.PI / 2 });
  labels.push({ kind: 'region', text: 'INCINTA ÎNDIGUITĂ LUNCA NOUĂ', p: [pc[0], pc[1] + 300], ang: pAng });

  const P = (poly) => poly.map(toEN);
  return {
    cfg: C,
    sea: P(seaPoly), coast: P(coastLine),
    isobaths: isobaths.map(i => ({ depth: i.depth, line: P(i.line) })),
    branches: branches.map(b => ({ ...b, line: P(b.line) })),
    oxbows: oxbows.map(P),
    lakes: lakes.map(l => ({ ...l, poly: P(l.poly), labelAt: l.labelAt && toEN(l.labelAt) })),
    canals: canals.map(P),
    polder: { poly: P(polder), canals: polderCanals.map(P), fields: polderFields.map(f => ({ ...f, poly: P(f.poly) })), pump: toEN(pump), ang: pAng },
    grinds: grinds.map(g => ({ ...g, poly: P(g.poly), c: toEN(g.c) })),
    grindContours: grindContours.map(c => ({ ...c, pts: P(c.pts) })),
    forests: forests.map(P),
    villages: villages.map(v => ({ ...v, center: toEN(v.center), church: toEN(v.church), houses: v.houses.map(h => ({ c: toEN(h.c), poly: P(h.poly) })), streets: v.streets.map(P) })),
    moles: moles.map(P), lighthouse: toEN(lighthouse),
    roads: roads.map(rd => ({ ...rd, line: P(rd.line) })),
    labels: labels.map(l => ({ ...l, p: toEN(l.p) })),
    stats: { lakes: lakes.length, forests: forests.length, villages: villages.length, grindContours: grindContours.length },
  };
}
