// Rectification: resampling the scan into the Stereo 70 map frame, the unwarping animation,
// geometric diagnostics of the estimated transformation, and Monte Carlo uncertainty.
import { fitTransform } from './transforms.js';
import { Rand } from './rng.js';

// Output raster = the map frame of the sheet, north-up, `factor` × the sheet pixel size.
export function frameRaster(S, factor = 1) {
  const res = S.res * factor;
  const w = Math.round((S.E1 - S.E0) / res), h = Math.round((S.N1 - S.N0) / res);
  return { res, w, h, E0: S.E0, N1: S.N1 };
}

// World file for the rectified PNG: pixel size, rotation terms, then the CENTRE of the upper-left pixel.
export function worldFile(R) {
  if(!R||![R.res,R.E0,R.N1].every(Number.isFinite)||R.res<=0)throw Error('Invalid raster frame');
  const f = (v) => v.toFixed(6);
  return [f(R.res), '0.000000', '0.000000', f(-R.res), f(R.E0 + R.res / 2), f(R.N1 - R.res / 2)].join('\n') + '\n';
}

// Inverse-map every output pixel to the scan (map → pixel), using an inverse grid every `step`
// output pixels and bilinear interpolation between grid nodes; then bilinear resampling of the scan.
// Separate from fit RMSE: sampled consistency of the independently fitted inverse.
// Ten pixels is an educational export guard, not a geodetic accuracy standard.
// A two-pixel warning preserves usable approximate polynomial/TPS inverses.
export function inverseConsistency(model, R, sourceProbes = []) {
  let maxMapPixels=0,maxSourcePixels=0,samples=0;
  try {
    if(!model?.forward||!model.inverse||!Number.isFinite(R.res)||R.res<=0)throw Error('Invalid model');
    for(let i=0;i<=32;i++)for(let j=0;j<=24;j++){
      const E=R.E0+R.w*R.res*i/32,N=R.N1-R.h*R.res*j/24;
      const p=model.inverse(E,N),q=model.forward(...p);
      if(![...p,...q].every(Number.isFinite))throw Error('Nonfinite round trip');
      maxMapPixels=Math.max(maxMapPixels,Math.hypot(q[0]-E,q[1]-N)/R.res);samples++;
    }
    for(const p of sourceProbes){const q=model.forward(...p),back=model.inverse(...q);if(![...q,...back].every(Number.isFinite))throw Error('Nonfinite round trip');maxSourcePixels=Math.max(maxSourcePixels,Math.hypot(back[0]-p[0],back[1]-p[1]));samples++;}
  }catch{return {safe:false,warning:true,maxPixels:null,maxMapPixels:null,maxSourcePixels:null,samples,limitPixels:10};}
  const maxPixels=Math.max(maxMapPixels,maxSourcePixels);
  return {safe:maxPixels<=10,warning:maxPixels>2,maxPixels,maxMapPixels,maxSourcePixels,samples,limitPixels:10};
}
export function rectify(scan, scanW, scanH, R, model, step = 8) {
  if(!model?.inverse||model.ok===false||![R.res,R.E0,R.N1,R.w,R.h,step].every(Number.isFinite)||R.res<=0||R.w<1||R.h<1||R.w*R.h>2e7||step<1)throw Error('Invalid rectification');
  if(!inverseConsistency(model,R).safe)throw Error('Inconsistent inverse: rectification rejected');
  const gw = Math.ceil(R.w / step) + 2, gh = Math.ceil(R.h / step) + 2;
  const gx = new Float64Array(gw * gh), gy = new Float64Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const E = R.E0 + i * step * R.res, N = R.N1 - j * step * R.res;
    const [x, yneg] = model.inverse(E, N);
    if(!Number.isFinite(x)||!Number.isFinite(yneg))throw Error('Non-finite inverse: rectification rejected');
    gx[j * gw + i] = x; gy[j * gw + i] = -yneg;
  }
  const out = new Uint8ClampedArray(R.w * R.h * 4);
  for (let v = 0; v < R.h; v++) {
    const fy = (v + 0.5) / step, j = Math.floor(fy), ay = fy - j;
    for (let u = 0; u < R.w; u++) {
      const fx = (u + 0.5) / step, i = Math.floor(fx), ax = fx - i;
      const o00 = j * gw + i, o10 = o00 + 1, o01 = o00 + gw, o11 = o01 + 1;
      const col = (gx[o00] * (1 - ax) + gx[o10] * ax) * (1 - ay) + (gx[o01] * (1 - ax) + gx[o11] * ax) * ay;
      const row = (gy[o00] * (1 - ax) + gy[o10] * ax) * (1 - ay) + (gy[o01] * (1 - ax) + gy[o11] * ax) * ay;
      const sx = col - 0.5, sy = row - 0.5;
      if (!(sx >= 0 && sy >= 0 && sx < scanW - 1 && sy < scanH - 1)) continue;
      const x0 = sx | 0, y0 = sy | 0, bx = sx - x0, by = sy - y0;
      const p00 = (y0 * scanW + x0) * 4, p10 = p00 + 4, p01 = p00 + scanW * 4, p11 = p01 + 4;
      const o = (v * R.w + u) * 4;
      for (let k = 0; k < 3; k++) {
        const a = scan[p00 + k] + bx * (scan[p10 + k] - scan[p00 + k]);
        const b = scan[p01 + k] + bx * (scan[p11 + k] - scan[p01 + k]);
        out[o + k] = a + by * (b - a);
      }
      out[o + 3] = 255;
    }
  }
  return out;
}

// Unwarping animation: a mesh over the scan, each vertex interpolated between its position in a
// plain "scan as photographed" layout (A) and its rectified map position (B). Every triangle is
// drawn with its own affine transform, sampling only its bounding box of the scan.
export function drawMorph(ctx, scanCanvas, scanW, scanH, posA, posB, t, nx = 34, ny = 26) {
  const V = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const c = (i / nx) * scanW, r = (j / ny) * scanH;
    const a = posA(c, r), b = posB(c, r);
    V.push({ c, r, x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t });
  }
  const m0 = ctx.getTransform ? ctx.getTransform() : { a: 1, b: 0 };
  const grow1 = 1.1 / (Math.hypot(m0.a, m0.b) || 1); // ~1 screen pixel of overlap hides seams
  const tri = (p, q, s) => {
    // affine from texture (c,r) to screen (x,y)
    const d = (q.c - p.c) * (s.r - p.r) - (s.c - p.c) * (q.r - p.r);
    if (Math.abs(d) < 1e-9) return;
    const a = ((q.x - p.x) * (s.r - p.r) - (s.x - p.x) * (q.r - p.r)) / d;
    const b = ((q.y - p.y) * (s.r - p.r) - (s.y - p.y) * (q.r - p.r)) / d;
    const c2 = ((s.x - p.x) * (q.c - p.c) - (q.x - p.x) * (s.c - p.c)) / d;
    const d2 = ((s.y - p.y) * (q.c - p.c) - (q.y - p.y) * (s.c - p.c)) / d;
    const e = p.x - a * p.c - c2 * p.r, f = p.y - b * p.c - d2 * p.r;
    const cx = (p.x + q.x + s.x) / 3, cy = (p.y + q.y + s.y) / 3, grow = (P) => {
      const dx = P.x - cx, dy = P.y - cy, L = Math.hypot(dx, dy) || 1; return [P.x + dx / L * grow1, P.y + dy / L * grow1];
    };
    ctx.save();
    ctx.beginPath(); ctx.moveTo(...grow(p)); ctx.lineTo(...grow(q)); ctx.lineTo(...grow(s)); ctx.closePath(); ctx.clip();
    ctx.transform(a, b, c2, d2, e, f);
    const c0 = Math.max(0, Math.floor(Math.min(p.c, q.c, s.c)) - 2), r0 = Math.max(0, Math.floor(Math.min(p.r, q.r, s.r)) - 2);
    const c1 = Math.min(scanW, Math.ceil(Math.max(p.c, q.c, s.c)) + 2), r1 = Math.min(scanH, Math.ceil(Math.max(p.r, q.r, s.r)) + 2);
    ctx.drawImage(scanCanvas, c0, r0, c1 - c0, r1 - r0, c0, r0, c1 - c0, r1 - r0);
    ctx.restore();
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const p00 = V[j * (nx + 1) + i], p10 = V[j * (nx + 1) + i + 1], p01 = V[(j + 1) * (nx + 1) + i], p11 = V[(j + 1) * (nx + 1) + i + 1];
    tri(p00, p10, p11); tri(p00, p11, p01);
  }
}

// Local distortion of the estimated transformation (Tissot-style): Jacobian at a scan pixel,
// in metres of map per pixel of scan, decomposed into principal scales and axis orientation.
export function jacobian(model, col, row, h = 2) {
  const [E0, N0] = model.forward(col, -row);
  const [Ex, Nx] = model.forward(col + h, -row);
  const [Ey, Ny] = model.forward(col, -(row + h));
  // columns: d(map)/d(col), d(map)/d(row)  (row grows downward)
  const a = (Ex - E0) / h, b = (Ey - E0) / h, c = (Nx - N0) / h, d = (Ny - N0) / h;
  // singular values of [[a,b],[c,d]]
  const s1 = a * a + b * b + c * c + d * d;
  const det = a * d - b * c;
  const disc = Math.sqrt(Math.max(0, s1 * s1 / 4 - det * det));
  const smax = Math.sqrt(s1 / 2 + disc), smin = Math.sqrt(Math.max(0, s1 / 2 - disc));
  // direction of the major axis in map space: eigenvector of J Jᵀ
  const p = a * a + b * b, q = a * c + b * d, r = c * c + d * d;
  const ang = 0.5 * Math.atan2(2 * q, p - r); // angle from +E axis
  return { at: [E0, N0], smax, smin, ang, det };
}

// Monte Carlo: refit `n` times with Gaussian click noise σ on the GCP pixel positions and push a
// set of probe pixels through every refit. Returns the cloud of map positions for each probe.
export function monteCarlo(type, gcps, probes, sigma, n = 160, seed = 1) {
  const r = new Rand(seed * 7177 + gcps.length);
  const clouds = probes.map(() => []);
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const g = gcps.map(p => ({ ...p, x: p.x + sigma * r.normal(), y: p.y + sigma * r.normal() }));
    const m = fitTransform(type, g, { inverse: false, residuals: false });
    if (!m.ok) continue;
    ok++;
    probes.forEach((pr, i) => clouds[i].push(m.forward(pr[0], -pr[1])));
  }
  const stats = clouds.map(cl => {
    const n2 = cl.length || 1;
    let mx = 0, my = 0; for (const [x, y] of cl) { mx += x; my += y; } mx /= n2; my /= n2;
    let sxx = 0, syy = 0, sxy = 0; for (const [x, y] of cl) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
    sxx /= n2; syy /= n2; sxy /= n2;
    const tr = sxx + syy, dt = sxx * syy - sxy * sxy, disc = Math.sqrt(Math.max(0, tr * tr / 4 - dt));
    const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
    return { mean: [mx, my], a: Math.sqrt(l1), b: Math.sqrt(l2), ang: 0.5 * Math.atan2(2 * sxy, sxx - syy), trace: tr };
  });
  return { clouds, stats, runs: ok };
}

export function convexHull(pts) {
  const P = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (P.length < 3) return P;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const p of P) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of P.slice().reverse()) { while (hi.length >= 2 && cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
