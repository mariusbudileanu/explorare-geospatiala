// Scan engine: a known, seeded geometric deformation from the scanned image to the clean sheet.
//
// The model is written in the direction W: scan pixel → sheet pixel. This choice makes the two
// expensive operations trivial:
//   • rendering the scan = for every scan pixel, sample the sheet at W(s)  (no inversion needed);
//   • the true error of any estimated transform T at scan pixel s = T(s) − Map(W(s)).
// Only individual GCP truths need W⁻¹, solved per point with Newton iterations.

import { Rand, hashSeed } from './rng.js';

export const SCENARIOS = {
  afin:    { label: 'Afin ușor',          hint: 'Rotire, scări inegale, forfecare. Polynomial 1 o descrie exact.' },
  scanner: { label: 'Scanare neuniformă', hint: 'Viteza scanerului variază pe direcția de avans: întindere pătratică.' },
  hartie:  { label: 'Hârtie curbată',     hint: 'Foaie ondulată și îndoită: deformare locală, neliniară.' },
  oblic:   { label: 'Fotografie oblică',  hint: 'Planul hărții fotografiat din unghi: perspectivă (omografie).' },
};

export function scenarioParams(kind, seed) {
  const r = new Rand(hashSeed('scan', kind, seed));
  const sgn = () => (r.next() < 0.5 ? -1 : 1);
  const p = {
    kind, seed,
    rot: sgn() * r.range(1.5, 4.5), scale: 1, aniso: r.range(-0.02, 0.02), shear: r.range(-0.8, 0.8),
    tx: r.range(-0.02, 0.02), ty: r.range(-0.02, 0.02),
    px: 0, py: 0, stretch: 0, bow: 0, curl: 0, wave: 0, waveF: 3, phase1: r.range(0, 6.28), phase2: r.range(0, 6.28),
  };
  if (kind === 'afin') {
    p.rot = sgn() * r.range(2.5, 6); p.aniso = sgn() * r.range(0.02, 0.05); p.shear = sgn() * r.range(0.6, 1.6);
  } else if (kind === 'scanner') {
    p.stretch = sgn() * r.range(0.05, 0.09);
  } else if (kind === 'hartie') {
    p.bow = sgn() * r.range(0.012, 0.022); p.curl = sgn() * r.range(0.01, 0.02);
    p.wave = r.range(0.004, 0.008); p.waveF = r.range(2.2, 3.4);
  } else if (kind === 'oblic') {
    p.rot = sgn() * r.range(3, 8); p.px = sgn() * r.range(0.07, 0.13); p.py = sgn() * r.range(0.05, 0.11);
  }
  return p;
}

// Build W for given sheet size and scan size.
export function makeScanModel(params, sheetW, sheetH, scanW, scanH) {
  const Ls = Math.max(scanW, scanH) / 2, Lh = Math.max(sheetW, sheetH) / 2;
  const csx = scanW / 2, csy = scanH / 2, chx = sheetW / 2, chy = sheetH / 2;
  const fit = (Ls / Lh) * 1.035; // keep a visible scanner-bed margin
  const th = (params.rot * Math.PI) / 180, sh = Math.tan((params.shear * Math.PI) / 180);
  const sx = fit * params.scale * (1 + params.aniso), sy = fit * params.scale * (1 - params.aniso);
  const c = Math.cos(th), s = Math.sin(th);
  // A = R · Shear · S   (rotation applied last)
  const a11 = c * sx, a12 = c * sh * sy - s * sy;
  const a21 = s * sx, a22 = s * sh * sy + c * sy;
  const { px, py, tx, ty, stretch, bow, curl, wave, waveF, phase1, phase2 } = params;

  const W = (X, Y) => {
    let ax = (X - csx) / Ls, ay = (Y - csy) / Ls;
    // projective part
    const w = 1 + px * ax + py * ay;
    let qx = (a11 * ax + a12 * ay) / w + tx;
    let qy = (a21 * ax + a22 * ay) / w + ty;
    // scanner: carriage speed drift along the scan direction (quadratic in y)
    if (stretch) qy += stretch * (qy * qy - 0.25) * 0.5;
    // paper: bow across the sheet, curled edge, gentle waves
    if (bow) qx += bow * (qy * qy - 0.25);
    if (curl) qy += curl * qx * qx * qx;
    if (wave) {
      qx += wave * Math.sin(waveF * qy * Math.PI + phase1) * Math.cos(waveF * 0.7 * qx * Math.PI);
      qy += wave * Math.sin(waveF * qx * Math.PI + phase2);
    }
    return [chx + qx * Lh, chy + qy * Lh];
  };

  // Linear part inverse for Newton's initial guess
  const det = a11 * a22 - a12 * a21;
  const guess = (u, v) => {
    const qx = (u - chx) / Lh - tx, qy = (v - chy) / Lh - ty;
    const ax = (a22 * qx - a12 * qy) / det, ay = (-a21 * qx + a11 * qy) / det;
    return [csx + ax * Ls, csy + ay * Ls];
  };

  const Winv = (u, v) => {
    let [x, y] = guess(u, v);
    for (let it = 0; it < 40; it++) {
      const [fu, fv] = W(x, y);
      const ru = fu - u, rv = fv - v;
      if (ru * ru + rv * rv < 1e-16) break;
      const h = 0.01;
      const [ux, vx] = W(x + h, y), [uy, vy] = W(x, y + h);
      const j11 = (ux - fu) / h, j12 = (uy - fu) / h, j21 = (vx - fv) / h, j22 = (vy - fv) / h;
      const d = j11 * j22 - j12 * j21;
      x -= (j22 * ru - j12 * rv) / d;
      y -= (-j21 * ru + j11 * rv) / d;
    }
    return [x, y];
  };

  return { params, W, Winv, scanW, scanH, sheetW, sheetH };
}

// Bilinear resampling of an RGBA buffer through a coordinate mapping (dst pixel centre → src coords).
export function warpRGBA(src, sw, sh, dw, dh, mapFn, bed = [46, 48, 52]) {
  const out = new Uint8ClampedArray(dw * dh * 4);
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const [u, v] = mapFn(x + 0.5, y + 0.5);
      const fx = u - 0.5, fy = v - 0.5;
      const o = (y * dw + x) * 4;
      if (fx < -0.5 || fy < -0.5 || fx > sw - 0.5 || fy > sh - 0.5) {
        out[o] = bed[0]; out[o + 1] = bed[1]; out[o + 2] = bed[2]; out[o + 3] = 255;
        continue;
      }
      const x0 = Math.max(0, Math.min(sw - 1, Math.floor(fx))), y0 = Math.max(0, Math.min(sh - 1, Math.floor(fy)));
      const x1 = Math.min(sw - 1, x0 + 1), y1 = Math.min(sh - 1, y0 + 1);
      const ax = Math.max(0, Math.min(1, fx - x0)), ay = Math.max(0, Math.min(1, fy - y0));
      const i00 = (y0 * sw + x0) * 4, i10 = (y0 * sw + x1) * 4, i01 = (y1 * sw + x0) * 4, i11 = (y1 * sw + x1) * 4;
      for (let k = 0; k < 3; k++) {
        const a = src[i00 + k] + ax * (src[i10 + k] - src[i00 + k]);
        const b = src[i01 + k] + ax * (src[i11 + k] - src[i01 + k]);
        out[o + k] = a + ay * (b - a);
      }
      out[o + 3] = 255;
    }
  }
  return out;
}
