// The seven QGIS Georeferencer transformations, estimated from GCPs.
//
// Coordinate convention (same as QGIS .points files):
//   source = georeferencing pixel frame: x = column, y = −row (y grows upward, like the map).
//   target = Stereo 70 map frame: E (easting, "Y" in Romanian notation), N (northing, "X").
// Working with y = −row is what lets a rotation-only model (Helmert) map an image whose rows
// grow downward onto a map whose northings grow upward without a reflection.

import { lstsq, solve, eigSym, inv3 } from './linalg.js';

export const TRANSFORMS = {
  linear:     { label: 'Linear',            min: 2,  params: 4,  note: 'Translație + scări pe X și Y, fără rotație. În QGIS scrie doar un world file.' },
  helmert:    { label: 'Helmert',           min: 2,  params: 4,  note: 'Translație, rotație, scară unică (similaritate).' },
  poly1:      { label: 'Polynomial 1',      min: 3,  params: 6,  note: 'Afină: translație, rotație, scări diferite, forfecare.' },
  projective: { label: 'Projective',        min: 4,  params: 8,  note: 'Omografie: perspectiva unui plan. Liniile drepte rămân drepte.' },
  poly2:      { label: 'Polynomial 2',      min: 6,  params: 12, note: 'Polinom de gradul 2: curburi simple.' },
  poly3:      { label: 'Polynomial 3',      min: 10, params: 20, note: 'Polinom de gradul 3: curburi complexe, risc mare la extrapolare.' },
  tps:        { label: 'Thin Plate Spline', min: 10, params: null, note: 'Interpolare exactă prin toate GCP-urile; reziduurile sunt mereu zero.' },
};

function normalizer(pts) {
  const n = pts.length;
  let mx = 0, my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= n; my /= n;
  let s = 0;
  for (const [x, y] of pts) s += (x - mx) ** 2 + (y - my) ** 2;
  s = Math.sqrt(s / (2 * n)) || 1;
  return {
    mx, my, s,
    fwd: (x, y) => [(x - mx) / s, (y - my) / s],
    back: (x, y) => [x * s + mx, y * s + my],
  };
}

function polyTerms(order) {
  const t = [];
  for (let d = 0; d <= order; d++) for (let j = 0; j <= d; j++) t.push([d - j, j]);
  return t;
}

function polyEval(terms, coef, x, y) {
  let s = 0;
  for (let k = 0; k < terms.length; k++) s += coef[k] * x ** terms[k][0] * y ** terms[k][1];
  return s;
}

// Fit a 2D polynomial mapping in normalized space. Returns evaluator or null.
function fitPoly(order, src, dst) {
  const ns = normalizer(src), nd = normalizer(dst);
  const terms = polyTerms(order);
  const A = src.map(([x, y]) => { const [u, v] = ns.fwd(x, y); return terms.map(([i, j]) => u ** i * v ** j); });
  const bx = [], by = [];
  for (const [X, Y] of dst) { const [u, v] = nd.fwd(X, Y); bx.push(u); by.push(v); }
  const r = lstsq(A, [bx, by]);
  if (!r.x) return { ok: false, cond: r.cond };
  const [cx, cy] = r.x;
  return {
    ok: true, cond: r.cond,
    apply: (x, y) => { const [u, v] = ns.fwd(x, y); return nd.back(polyEval(terms, cx, u, v), polyEval(terms, cy, u, v)); },
  };
}

function fitProjective(src, dst) {
  const ns = normalizer(src), nd = normalizer(dst);
  const rows = [];
  for (let i = 0; i < src.length; i++) {
    const [x, y] = ns.fwd(...src[i]);
    const [X, Y] = nd.fwd(...dst[i]);
    rows.push([x, y, 1, 0, 0, 0, -X * x, -X * y, -X]);
    rows.push([0, 0, 0, x, y, 1, -Y * x, -Y * y, -Y]);
  }
  const AtA = Array.from({ length: 9 }, () => new Array(9).fill(0));
  for (const r of rows) for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) AtA[i][j] += r[i] * r[j];
  const { values, vectors } = eigSym(AtA);
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const k = order[0][1];
  const h = vectors.map(r => r[k]);
  const gap = order[1][0] / Math.max(order[0][0], 1e-300);
  // Denormalize: H = Nd^-1 · Hn · Ns
  const Ns = [1 / ns.s, 0, -ns.mx / ns.s, 0, 1 / ns.s, -ns.my / ns.s, 0, 0, 1];
  const NdInv = [nd.s, 0, nd.mx, 0, nd.s, nd.my, 0, 0, 1];
  const H = mul3(NdInv, mul3(h, Ns));
  const s = H[8]; for (let i = 0; i < 9; i++) H[i] /= s;
  const Hi = inv3(H);
  const degenerate = !Hi || order[1][0] < 1e-12 * order[8][0];
  return { H, Hi, degenerate, gap };
}

function mul3(a, b) {
  const r = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) r[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return r;
}

const applyH = (H, x, y) => {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
};

function tpsU(r2) { return r2 === 0 ? 0 : r2 * Math.log(r2) * 0.5; } // r² log r

function fitTPS(src, dst) {
  const ns = normalizer(src), nd = normalizer(dst);
  const P = src.map(p => ns.fwd(...p));
  const V = dst.map(p => nd.fwd(...p));
  const n = P.length, m = n + 3;
  const A = Array.from({ length: m }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const dx = P[i][0] - P[j][0], dy = P[i][1] - P[j][1];
      A[i][j] = tpsU(dx * dx + dy * dy);
    }
    A[i][n] = A[n][i] = 1;
    A[i][n + 1] = A[n + 1][i] = P[i][0];
    A[i][n + 2] = A[n + 2][i] = P[i][1];
  }
  const bx = new Array(m).fill(0), by = new Array(m).fill(0);
  for (let i = 0; i < n; i++) { bx[i] = V[i][0]; by[i] = V[i][1]; }
  const sol = solve(A, [bx, by]);
  if (!sol) return { ok: false };
  const [wx, wy] = sol;
  return {
    ok: true,
    apply: (x, y) => {
      const [u, v] = ns.fwd(x, y);
      let X = wx[n] + wx[n + 1] * u + wx[n + 2] * v;
      let Y = wy[n] + wy[n + 1] * u + wy[n + 2] * v;
      for (let i = 0; i < n; i++) {
        const dx = u - P[i][0], dy = v - P[i][1];
        const k = tpsU(dx * dx + dy * dy);
        X += wx[i] * k; Y += wy[i] * k;
      }
      return nd.back(X, Y);
    },
  };
}

// gcps: [{ x, y, E, N }] with x = column, y = −row.
export function fitTransform(type, gcps, opts = {}) {
  if(!TRANSFORMS[type]||!Array.isArray(gcps))return {ok:false,type,n:0,msg:"Configurație nevalidă."};
  const wantInverse = opts.inverse !== false;
  const meta = TRANSFORMS[type];
  const n = gcps.length;
  const base = { type, n, min: meta.min, redundancy: null, ok: false };
  if (n < meta.min) return { ...base, msg: `Necesită minimum ${meta.min} GCP-uri (sunt ${n}).` };
  if (!gcps.every(g => g && [g.x,g.y,g.E,g.N].every(Number.isFinite))) return {...base,msg:'Coordonate nefinite sau incomplete.'};
  if (gcps.length>100) return {...base,msg:'Maximum 100 puncte de control.'};
  const separated=key=>new Set(gcps.map(g=>key.map(k=>g[k]).join(','))).size===gcps.length;
  if (!separated(['x','y']) || !separated(['E','N'])) return {...base,msg:'Configurație degenerată: puncte coincidente.'};
  const src = gcps.map(g => [g.x, g.y]);
  const dst = gcps.map(g => [g.E, g.N]);
  let forward, inverse, params = {}, cond = null;

  if (type === 'linear') {
    const ns = normalizer(src), nd = normalizer(dst);
    const fx = lstsq(src.map(([x, y]) => [1, ns.fwd(x, y)[0]]), [dst.map(([E, N]) => nd.fwd(E, N)[0])]);
    const fy = lstsq(src.map(([x, y]) => [1, ns.fwd(x, y)[1]]), [dst.map(([E, N]) => nd.fwd(E, N)[1])]);
    if (!fx.x || !fy.x) return { ...base, msg: 'Configurație degenerată (puncte aliniate pe X sau pe Y).' };
    const [a0, a1] = fx.x[0], [b0, b1] = fy.x[0];
    // Back to original units: E = E0 + sx·x ; N = N0 + sy·y
    const sx = a1 * nd.s / ns.s, sy = b1 * nd.s / ns.s;
    const E0 = nd.mx + nd.s * a0 - sx * ns.mx, N0 = nd.my + nd.s * b0 - sy * ns.my;
    if (![sx,sy,E0,N0].every(Number.isFinite) || Math.min(Math.abs(sx),Math.abs(sy))<1e-12 || Math.max(Math.abs(sx/sy),Math.abs(sy/sx))>1e12) return {...base,msg:"Transformare neinversabilă sau instabilă."};
    forward = (x, y) => [E0 + sx * x, N0 + sy * y];
    inverse = (E, N) => [(E - E0) / sx, (N - N0) / sy];
    params = { E0, N0, sx, sy };
    cond = Math.max(fx.cond, fy.cond);
  } else if (type === 'helmert') {
    const ns = normalizer(src), nd = normalizer(dst);
    const A = [], b = [];
    for (let i = 0; i < n; i++) {
      const [x, y] = ns.fwd(...src[i]);
      const [X, Y] = nd.fwd(...dst[i]);
      A.push([1, 0, x, -y]); b.push(X);
      A.push([0, 1, y, x]); b.push(Y);
    }
    const r = lstsq(A, [b]);
    if (!r.x) return { ...base, msg: 'Configurație degenerată (puncte suprapuse).' };
    const [ta, tb, c, d] = r.x[0];
    const k = nd.s / ns.s;
    const C = c * k, D = d * k;
    const E0 = nd.mx + nd.s * ta - (C * ns.mx - D * ns.my);
    const N0 = nd.my + nd.s * tb - (D * ns.mx + C * ns.my);
    forward = (x, y) => [E0 + C * x - D * y, N0 + D * x + C * y];
    const det = C * C + D * D;
    if (![E0,N0,det].every(Number.isFinite) || det<1e-24) return {...base,msg:"Transformare neinversabilă sau instabilă."};
    inverse = (E, N) => { const u = E - E0, v = N - N0; return [(C * u + D * v) / det, (-D * u + C * v) / det]; };
    params = { E0, N0, scale: Math.sqrt(det), rotationDeg: Math.atan2(D, C) * 180 / Math.PI };
    cond = r.cond;
  } else if (type === 'projective') {
    const p = fitProjective(src, dst);
    if (p.degenerate) return { ...base, msg: 'Configurație degenerată (trei puncte coliniare sau suprapuse).' };
    forward = (x, y) => applyH(p.H, x, y);
    inverse = (E, N) => applyH(p.Hi, E, N);
    params = { H: p.H };
    cond = 1 / p.gap;
  } else if (type.startsWith('poly')) {
    const order = +type.slice(4);
    const f = fitPoly(order, src, dst);
    const g = wantInverse ? fitPoly(order, dst, src) : { ok: true, apply: null }; // GDAL-style: inverse estimated separately
    if (!f.ok || !g.ok) return { ...base, msg: 'Configurație degenerată pentru acest grad (puncte prea aliniate).' };
    forward = f.apply; inverse = g.apply; cond = f.cond;
    if (order === 1) {
      const [E0, N0] = forward(0, 0), [E1, N1] = forward(1, 0), [E2, N2] = forward(0, 1);
      params = { E0, N0, a: E1 - E0, b: E2 - E0, d: N1 - N0, e: N2 - N0 };
    }
  } else if (type === 'tps') {
    const f = fitTPS(src, dst), g = wantInverse ? fitTPS(dst, src) : { ok: true, apply: null };
    if (!f.ok || !g.ok) return { ...base, msg: 'Sistem singular (GCP-uri duplicate).' };
    forward = f.apply; inverse = g.apply;
  }

  // Validate finite predictions and non-singular local mapping at control support.
  for(const g of gcps){
    const f=forward(g.x,g.y),back=inverse?.(g.E,g.N);
    if(!f.every(Number.isFinite)||(wantInverse&&(!back||!back.every(Number.isFinite))))return {...base,msg:'Transformare neinversabilă sau instabilă.'};
    const h=Math.max(1e-3,Math.abs(g.x)*1e-7,Math.abs(g.y)*1e-7),fx=forward(g.x+h,g.y),fy=forward(g.x,g.y+h);
    const a=(fx[0]-f[0])/h,b=(fy[0]-f[0])/h,c=(fx[1]-f[1])/h,d=(fy[1]-f[1])/h;
    const norm=Math.hypot(a,b,c,d),det=a*d-b*c;
    if(!Number.isFinite(det)||!norm||Math.abs(det)<1e-12*norm*norm)return {...base,msg:'Transformare neinversabilă sau instabilă.'};
  }
  if (opts.residuals === false) return { ...base, ok: true, forward, inverse, params, cond };
  const residuals = gcps.map(gc => {
    const [E, N] = forward(gc.x, gc.y);
    const dE = gc.E - E, dN = gc.N - N;
    return { dE, dN, r: Math.hypot(dE, dN) };
  });
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r.r * r.r, 0) / n);
  const redundancy = meta.params == null ? 0 : 2 * n - meta.params;
  return { ...base, ok: true, forward, inverse, params, residuals, rmse, cond, redundancy };
}
