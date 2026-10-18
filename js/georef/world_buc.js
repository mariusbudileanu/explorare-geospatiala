// World A — „Zarea”: a fictional urban plan at 1:10 000, placed over Bucharest in Stereo 70.
// All geometry is generated in local metres (x east, y north) and stored in Stereo 70 (E, N).

import { Delaunay } from '../vendor/p07-d3.js';
import { contours } from '../vendor/p07-d3.js';
import { Rand, Noise2D, hashSeed } from './rng.js';
import {
  pointInPoly, distToPolyline, distToPolyEdge, chaikin, clipToConvexInset,
  polyArea, frameRect, blob, centroid, polylineLength,
} from './geom.js';

export const BUC_CFG = {
  id: 'buc',
  title: 'ZAREA',
  subtitle: 'Plan topografic sintetic',
  scale: 10000,
  E0: 585000, E1: 589000, N0: 323500, N1: 326500,
  dpi: 150,             // virtual scan resolution → 1 px = 1.693 m on the ground
  grid: 500,
  gridSplit: 3,         // label digits: small prefix / big middle / small suffix
  contour: 2, contourIndex: 10,
  sheetNo: 'GL-B-01',
  graticuleStep: 15 / 3600,  // 15″ bands on the frame
  marginsMm: { l: 24, r: 64, t: 32, b: 30 },
};

const DISTRICT_NAMES = ['SALCÂMII NOI', 'LIVEZILOR', 'MORILE VECHI', 'OLARILOR', 'CĂRĂUȘILOR', 'HANUL ROȘU',
  'CRÂNGUL CU TEI', 'ZAREA', 'PLOPII ÎNALȚI', 'FÂNTÂNIȚA', 'VIILE NOI', 'TÂRGUL DE FÂN'];
const STREET_NAMES = ['Bd. Fântânilor', 'Calea Olarilor', 'Șos. Morii Vechi', 'Str. Cărăușilor', 'Bd. Zării',
  'Calea Livezilor', 'Str. Hanul Roșu', 'Bd. Teilor', 'Șos. Viilor', 'Str. Podului', 'Calea Târgului', 'Bd. Salcâmilor'];

export function generateBuc(seed = 1970) {
  const C = BUC_CFG;
  const r = new Rand(hashSeed('buc', seed));
  const nz = new Noise2D(hashSeed('buc-noise', seed));
  const W = C.E1 - C.E0, H = C.N1 - C.N0;
  const toEN = ([x, y]) => [C.E0 + x, C.N0 + y];

  // ---------- Hydrography ----------
  const river = [];
  for (let x = -300; x <= W + 300; x += 60) river.push([x, 1150 + 350 * (x / W) + 160 * nz.fbm(x / 1100 + 3.1, 0.7, 3)]);
  const riverLine = chaikin(river, 3);
  const riverW = 44;

  const stream = [];
  for (let x = -300; x <= W + 300; x += 80) stream.push([x, 2620 - 160 * (x / W) + 140 * nz.fbm(x / 1300 + 9.3, 4.2, 3)]);
  const streamLine = chaikin(stream, 3);
  const yOnStream = (x) => { let best = streamLine[0]; for (const p of streamLine) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; };
  const lakes = [
    { c: [620, yOnStream(620)], a: 330, b: 120, name: 'Lacul Plopilor' },
    { c: [1880, yOnStream(1880)], a: 430, b: 165, name: 'Lacul Mare al Teilor' },
    { c: [3260, yOnStream(3260)], a: 300, b: 115, name: 'Lacul Sălciilor' },
  ].map((L, i) => {
    const dx = 40, y1 = yOnStream(L.c[0] + dx), y0 = yOnStream(L.c[0] - dx);
    const ang = Math.atan2(y1 - y0, 2 * dx);
    const poly = blob(L.c[0], L.c[1], L.a, L.b, ang, (u, v) => nz.noise(u * 1.3 + i * 7, v * 1.3 + 2), 56, 0.22);
    return { ...L, poly };
  });

  // Park with its own pond
  const parkC = [2650, 1880];
  const parkPoly = frameRect(parkC[0], parkC[1], 0.14, -330, -215, 330, 215).map(p => p);
  const parkPond = blob(parkC[0] + 60, parkC[1] - 20, 140, 75, 0.5, (u, v) => nz.noise(u + 30, v + 30), 40, 0.25);
  const parkPaths = [];
  for (let k = 0; k < 4; k++) {
    const pts = [];
    const a0 = r.range(0, Math.PI * 2);
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const ang = a0 + t * r.range(1.2, 2.4);
      const rad = 170 + 120 * Math.sin(t * Math.PI + k);
      pts.push([parkC[0] + Math.cos(ang) * rad * 1.4, parkC[1] + Math.sin(ang) * rad * 0.85]);
    }
    parkPaths.push(chaikin(pts, 2).filter(p => pointInPoly(p[0], p[1], parkPoly)));
  }

  // ---------- Railway ----------
  const railA = [-300, 260], railB = [W + 300, 960];
  const railLine = [railA, railB];
  const railTracks = [-24, -12, 12, 24];
  const station = { x0: 1050, x1: 1850 };

  // ---------- Masks ----------
  const inLake = (x, y, m = 0) => lakes.some(L => pointInPoly(x, y, L.poly) || (m > 0 && distToPolyEdge(x, y, L.poly) < m));
  const nearRiver = (x, y, m) => distToPolyline(x, y, riverLine) < riverW / 2 + m;
  const nearStream = (x, y, m) => distToPolyline(x, y, streamLine) < m;
  const nearRail = (x, y, m) => distToPolyline(x, y, railLine) < m;
  const inPark = (x, y, m = 0) => pointInPoly(x, y, parkPoly) || (m > 0 && distToPolyEdge(x, y, parkPoly) < m);
  const blocked = (x, y) => inLake(x, y, 25) || nearRiver(x, y, 28) || nearStream(x, y, 18) || nearRail(x, y, 45) || inPark(x, y, 18);

  // ---------- Districts (Voronoi) ----------
  const seeds = [];
  let guard = 0;
  while (seeds.length < 12 && guard++ < 5000) {
    const p = [r.range(-200, W + 200), r.range(-200, H + 200)];
    if (seeds.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) > 950)) seeds.push(p);
  }
  const vor = Delaunay.from(seeds).voronoi([-600, -600, W + 600, H + 600]);
  const districts = seeds.map((s, i) => {
    const poly = vor.cellPolygon(i).slice(0, -1);
    let type;
    if (s[1] < 900 && r.next() < 0.75) type = 'industrial';
    else type = r.next() < 0.5 ? 'blocuri' : 'vechi';
    const ang = r.range(-0.6, 0.6);
    const bu = type === 'vechi' ? r.range(130, 175) : type === 'blocuri' ? r.range(190, 250) : r.range(220, 320);
    const bv = type === 'vechi' ? r.range(75, 100) : type === 'blocuri' ? r.range(120, 170) : r.range(150, 220);
    return { i, seed: s, poly, type, ang, bu, bv, sw: type === 'vechi' ? 11 : 15, name: DISTRICT_NAMES[i % DISTRICT_NAMES.length] };
  });

  // Boulevards = Voronoi edges (unique), split into pieces that avoid lakes and the park
  const edgeKey = (a, b) => [a, b].map(p => p.map(v => v.toFixed(2)).join(',')).sort().join('|');
  const seen = new Set();
  const boulevards = [];
  for (const d of districts) {
    for (let k = 0; k < d.poly.length; k++) {
      const a = d.poly[k], b = d.poly[(k + 1) % d.poly.length];
      const key = edgeKey(a, b);
      if (seen.has(key)) continue;
      seen.add(key);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1) continue;
      // keep only edges that are interior (not on the outer bounding box)
      const onBox = (p) => Math.abs(p[0] + 600) < 1e-6 || Math.abs(p[1] + 600) < 1e-6 || Math.abs(p[0] - W - 600) < 1e-6 || Math.abs(p[1] - H - 600) < 1e-6;
      if (onBox(a) && onBox(b)) continue;
      const n = Math.ceil(L / 10);
      let piece = [];
      const pieces = [];
      for (let t = 0; t <= n; t++) {
        const p = [a[0] + (b[0] - a[0]) * t / n, a[1] + (b[1] - a[1]) * t / n];
        if (inLake(p[0], p[1], 10) || inPark(p[0], p[1], 0)) {
          if (piece.length > 1) pieces.push(piece);
          piece = [];
        } else piece.push(p);
      }
      if (piece.length > 1) pieces.push(piece);
      for (const pc of pieces) boulevards.push({ line: [pc[0], pc[pc.length - 1]], len: Math.hypot(pc[pc.length - 1][0] - pc[0][0], pc[pc.length - 1][1] - pc[0][1]) });
    }
  }
  // Bridges where boulevards cross the river
  const bridges = [];
  for (const b of boulevards) {
    const [a, c] = b.line;
    const n = Math.ceil(b.len / 5);
    let inR = false, start = null;
    for (let t = 0; t <= n; t++) {
      const p = [a[0] + (c[0] - a[0]) * t / n, a[1] + (c[1] - a[1]) * t / n];
      const now = nearRiver(p[0], p[1], 6);
      if (now && !inR) start = p;
      if (!now && inR && start) bridges.push([start, p]);
      inR = now;
    }
  }

  // ---------- Blocks and buildings ----------
  const blocks = [], buildings = [], parcels = [], squares = [], churches = [], tanks = [];
  for (const d of districts) {
    const c = Math.cos(d.ang), s = Math.sin(d.ang);
    const toLocal = (x, y) => [(x - d.seed[0]) * c + (y - d.seed[1]) * s, -(x - d.seed[0]) * s + (y - d.seed[1]) * c];
    let umin = Infinity, umax = -Infinity, vmin = Infinity, vmax = -Infinity;
    for (const p of d.poly) { const [u, v] = toLocal(p[0], p[1]); umin = Math.min(umin, u); umax = Math.max(umax, u); vmin = Math.min(vmin, v); vmax = Math.max(vmax, v); }
    for (let i = Math.floor(umin / d.bu); i <= Math.ceil(umax / d.bu); i++) {
      for (let j = Math.floor(vmin / d.bv); j <= Math.ceil(vmax / d.bv); j++) {
        const u0 = i * d.bu + d.sw / 2, u1 = (i + 1) * d.bu - d.sw / 2;
        const v0 = j * d.bv + d.sw / 2, v1 = (j + 1) * d.bv - d.sw / 2;
        const rect = frameRect(d.seed[0], d.seed[1], d.ang, u0, v0, u1, v1);
        const clipped = clipToConvexInset(rect, d.poly, 22);
        if (clipped.length < 3) continue;
        const area = polyArea(clipped);
        if (area < 0.28 * (u1 - u0) * (v1 - v0) || area < 2500) continue;
        const [cx, cy] = centroid(clipped);
        if (cx < -100 || cy < -100 || cx > W + 100 || cy > H + 100) continue;
        if (clipped.some(p => blocked(p[0], p[1])) || blocked(cx, cy)) continue;
        const block = { poly: clipped, type: d.type };
        const roll = r.next();
        if (roll < 0.05 && d.type !== 'industrial') { squares.push(clipped); continue; }
        blocks.push(block);
        const inside = (poly) => poly.every(p => pointInPoly(p[0], p[1], clipped));
        const B = (a0, b0, a1, b1) => frameRect(d.seed[0], d.seed[1], d.ang, a0, b0, a1, b1);
        const addB = (poly, kind = 'b') => { if (inside(poly)) { buildings.push({ poly, kind }); return true; } return false; };

        if (d.type === 'vechi') {
          const depth = Math.min((v1 - v0) / 2, 38);
          for (const side of [0, 1]) {
            let u = u0;
            while (u < u1 - 10) {
              const w = Math.min(r.range(14, 23), u1 - u);
              const pv0 = side === 0 ? v0 : v1 - depth, pv1 = side === 0 ? v0 + depth : v1;
              const parcel = B(u, pv0, u + w, pv1);
              if (inside(parcel)) parcels.push(parcel);
              const bw = w * r.range(0.55, 0.82), bd = r.range(9, 15), set = r.range(0, 3);
              const bu0 = u + r.range(0.5, w - bw - 0.5);
              const b = side === 0 ? B(bu0, v0 + set, bu0 + bw, v0 + set + bd) : B(bu0, v1 - set - bd, bu0 + bw, v1 - set);
              addB(b);
              if (r.next() < 0.35) {
                const aw = bw * 0.5, ad = r.range(5, 8);
                const a = side === 0 ? B(bu0, v0 + set + bd + 4, bu0 + aw, v0 + set + bd + 4 + ad) : B(bu0, v1 - set - bd - 4 - ad, bu0 + aw, v1 - set - bd - 4);
                addB(a, 'anexa');
              }
              u += w;
            }
          }
          if (r.next() < 0.07) churches.push(centroid(clipped));
        } else if (d.type === 'blocuri') {
          const pat = r.next();
          const dep = 13;
          if (pat < 0.4) {
            addB(B(u0 + 8, v0 + 8, u1 - 8, v0 + 8 + dep));
            addB(B(u0 + 8, v1 - 8 - dep, u1 - 8, v1 - 8));
            if (r.next() < 0.6) addB(B(u0 + 8, v0 + 30, u0 + 8 + dep, v1 - 30));
          } else if (pat < 0.8) {
            const n = Math.floor((u1 - u0 - 20) / 38);
            for (let k = 0; k < n; k++) {
              const a0 = u0 + 14 + k * 38;
              addB(B(a0, v0 + 14, a0 + dep, v1 - 14));
            }
          } else {
            for (let a = u0 + 16; a < u1 - 36; a += 46) for (let b = v0 + 16; b < v1 - 36; b += 46) addB(B(a, b, a + 20, b + 20), 'turn');
          }
        } else {
          let a = u0 + 10;
          while (a < u1 - 40) {
            const w = Math.min(r.range(45, 120), u1 - 10 - a);
            const h = r.range(0.45, 0.8) * (v1 - v0 - 20);
            addB(B(a, v0 + 10, a + w, v0 + 10 + h), 'hala');
            a += w + r.range(12, 25);
          }
          if (r.next() < 0.4) {
            const tc = B(u1 - 30, v1 - 30, u1 - 30, v1 - 30)[0];
            for (let k = 0; k < 3; k++) tanks.push({ c: [tc[0] - k * 26 * Math.cos(d.ang), tc[1] - k * 26 * Math.sin(d.ang)], r: 10 });
          }
        }
      }
    }
  }

  // ---------- Relief (only as reference contours; flat lowland plain) ----------
  const step = 25, gw = Math.ceil(W / step) + 1, gh = Math.ceil(H / step) + 1;
  const Z = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * step, y = (gh - 1 - j) * step;
    const dr = distToPolyline(x, y, riverLine), ds = distToPolyline(x, y, streamLine);
    Z[j * gw + i] = 74 + 0.0035 * y + 3.2 * nz.fbm(x / 1400 + 50, y / 1400 + 50, 3)
      - 6.5 * Math.exp(-((dr / 420) ** 2)) - 4.5 * Math.exp(-((ds / 300) ** 2));
  }
  let zmin = Infinity, zmax = -Infinity;
  for (const z of Z) { zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); }
  const thresholds = [];
  for (let t = Math.ceil(zmin / C.contour) * C.contour; t <= zmax; t += C.contour) thresholds.push(t);
  const contourSets = contours().size([gw, gh]).thresholds(thresholds).smooth(true)(Z);
  const contourLines = [];
  for (const cs of contourSets) for (const poly of cs.coordinates) for (const ring of poly) {
    const pts = ring.map(([i, j]) => [i * step, (gh - 1 - j) * step]);
    contourLines.push({ z: cs.value, pts: chaikin(pts, 1, true), index: cs.value % C.contourIndex === 0 });
  }
  const zAt = (x, y) => {
    const i = Math.max(0, Math.min(gw - 1, Math.round(x / step))), j = Math.max(0, Math.min(gh - 1, Math.round(gh - 1 - y / step)));
    return Z[j * gw + i];
  };
  const spots = [];
  guard = 0;
  while (spots.length < 14 && guard++ < 2000) {
    const p = [r.range(150, W - 150), r.range(150, H - 150)];
    if (blocked(p[0], p[1])) continue;
    if (spots.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 500)) continue;
    spots.push({ p, z: zAt(p[0], p[1]) });
  }

  // ---------- Labels ----------
  const labels = [];
  for (const d of districts) {
    const [cx, cy] = centroid(d.poly);
    if (cx > 200 && cx < W - 200 && cy > 150 && cy < H - 150 && !blocked(cx, cy)) labels.push({ kind: 'district', text: d.name, p: [cx, cy] });
  }
  const longB = boulevards.filter(b => b.len > 520).sort((a, b) => b.len - a.len).slice(0, 9);
  longB.forEach((b, i) => {
    const [a, c] = b.line;
    const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
    if (mid[0] < 100 || mid[0] > W - 100 || mid[1] < 80 || mid[1] > H - 80) return;
    labels.push({ kind: 'street', text: STREET_NAMES[i % STREET_NAMES.length], p: mid, ang: Math.atan2(c[1] - a[1], c[0] - a[0]) });
  });
  lakes.forEach(L => labels.push({ kind: 'water', text: L.name, p: L.c, ang: 0 }));
  labels.push({ kind: 'park', text: 'Parcul Grădinilor', p: [parkC[0] - 120, parkC[1] + 120] });
  const riverLabelAt = riverLine[Math.floor(riverLine.length * 0.3)];
  const riverLabelNext = riverLine[Math.floor(riverLine.length * 0.3) + 4];
  labels.push({ kind: 'river', text: 'Râul Sălcii', p: riverLabelAt, ang: Math.atan2(riverLabelNext[1] - riverLabelAt[1], riverLabelNext[0] - riverLabelAt[0]) });
  const stAng = Math.atan2(railB[1] - railA[1], railB[0] - railA[0]);
  const stMidX = (station.x0 + station.x1) / 2;
  const stMidY = railA[1] + (stMidX - railA[0]) * Math.tan(stAng);
  labels.push({ kind: 'poi', text: 'Gara Zarea', p: [stMidX, stMidY - 70], ang: stAng });

  // ---------- Convert everything to Stereo 70 ----------
  const P = (poly) => poly.map(toEN);
  return {
    cfg: C,
    river: { line: P(riverLine), width: riverW },
    stream: P(streamLine),
    lakes: lakes.map(L => ({ ...L, c: toEN(L.c), poly: P(L.poly) })),
    park: { poly: P(parkPoly), pond: P(parkPond), paths: parkPaths.map(P) },
    rail: { line: P(railLine), tracks: railTracks, station: { a: toEN([station.x0, railA[1] + (station.x0 - railA[0]) * Math.tan(stAng)]), b: toEN([station.x1, railA[1] + (station.x1 - railA[0]) * Math.tan(stAng)]), ang: stAng } },
    boulevards: boulevards.map(b => ({ line: P(b.line), len: b.len })),
    bridges: bridges.map(P),
    blocks: blocks.map(b => ({ ...b, poly: P(b.poly) })),
    buildings: buildings.map(b => ({ ...b, poly: P(b.poly) })),
    parcels: parcels.map(P),
    squares: squares.map(P),
    churches: churches.map(toEN),
    tanks: tanks.map(t => ({ c: toEN(t.c), r: t.r })),
    contours: contourLines.map(c => ({ ...c, pts: P(c.pts) })),
    spots: spots.map(s => ({ p: toEN(s.p), z: s.z })),
    labels: labels.map(l => ({ ...l, p: toEN(l.p) })),
    stats: { districts: districts.length, blocks: blocks.length, buildings: buildings.length, boulevards: boulevards.length, riverLen: polylineLength(riverLine) },
  };
}
