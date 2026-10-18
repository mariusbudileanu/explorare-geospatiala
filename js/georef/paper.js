// Radiometric degradation: aged paper (in sheet space) and scanner effects (in scan space).
// None of this changes geometry; it only makes the document look like a real scan.
import { Rand, Noise2D, hashSeed } from './rng.js';

// Low-frequency field sampled on a coarse grid and bilinearly interpolated (fast for megapixel images).
function coarseField(w, h, cell, fn) {
  const gw = Math.ceil(w / cell) + 2, gh = Math.ceil(h / cell) + 2;
  const g = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) g[j * gw + i] = fn(i * cell, j * cell);
  return (x, y) => {
    const fx = x / cell, fy = y / cell, i = fx | 0, j = fy | 0, ax = fx - i, ay = fy - j;
    const o = j * gw + i;
    const a = g[o] + ax * (g[o + 1] - g[o]), b = g[o + gw] + ax * (g[o + gw + 1] - g[o + gw]);
    return a + ay * (b - a);
  };
}

export function agePaper(data, w, h, seed, amount = 1) {
  if (amount <= 0) return;
  const nz = new Noise2D(hashSeed('paper', seed));
  const r = new Rand(hashSeed('paper-r', seed));
  const tone = coarseField(w, h, 24, (x, y) => nz.fbm(x / 900, y / 900, 4));
  const blot = coarseField(w, h, 12, (x, y) => nz.fbm(x / 260 + 40, y / 260 + 40, 3));
  const foldsX = [w / 2], foldsY = [h / 2];
  const stains = Array.from({ length: 4 }, () => ({ x: r.range(0.1, 0.9) * w, y: r.range(0.1, 0.9) * h, rad: r.range(30, 90), ring: r.next() < 0.5 }));
  const spots = Array.from({ length: 70 }, () => ({ x: r.next() * w, y: r.next() * h, rad: r.range(1.2, 4) }));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const t = tone(x, y), b = blot(x, y);
      // yellowing: stronger near edges and in blotches
      const ex = Math.min(x, w - x) / w, ey = Math.min(y, h - y) / h;
      const edge = Math.max(0, 0.06 - Math.min(ex, ey)) / 0.06;
      let k = 1 - amount * (0.035 + 0.04 * t + 0.05 * Math.max(0, b - 0.2) + 0.12 * edge * edge);
      // folds: dark crease with a light ridge beside it
      for (const fx of foldsX) { const d = x - fx; k *= 1 - amount * 0.16 * Math.exp(-(d * d) / 3) + amount * 0.05 * Math.exp(-((d - 4) ** 2) / 12); }
      for (const fy of foldsY) { const d = y - fy; k *= 1 - amount * 0.16 * Math.exp(-(d * d) / 3) + amount * 0.05 * Math.exp(-((d - 4) ** 2) / 12); }
      const grain = (((x * 73856093) ^ (y * 19349663)) & 1023) / 1023 - 0.5;
      data[o] = data[o] * k + grain * 7 * amount + 3 * amount;
      data[o + 1] = data[o + 1] * k * 0.99 + grain * 7 * amount;
      data[o + 2] = data[o + 2] * k * 0.93 + grain * 7 * amount - 4 * amount;
    }
  }
  const tint = (cx, cy, rad, fn) => {
    for (let y = Math.max(0, (cy - rad) | 0); y < Math.min(h, cy + rad); y++) for (let x = Math.max(0, (cx - rad) | 0); x < Math.min(w, cx + rad); x++) {
      const d = Math.hypot(x - cx, y - cy) / rad;
      if (d > 1) continue;
      const s = fn(d) * amount, o = (y * w + x) * 4;
      data[o] -= 10 * s; data[o + 1] -= 22 * s; data[o + 2] -= 38 * s;
    }
  };
  for (const s of stains) tint(s.x, s.y, s.rad, d => (s.ring ? Math.exp(-((d - 0.9) ** 2) / 0.004) * 0.9 + 0.12 : 0.35 * (1 - d * d)));
  for (const s of spots) tint(s.x, s.y, s.rad, d => 0.7 * (1 - d));
}

export function scannerFx(data, w, h, seed) {
  const r = new Rand(hashSeed('scanner', seed));
  const lampPhase = r.range(0, 6.28);
  for (let y = 0; y < h; y++) {
    const lamp = 1 - 0.035 * (1 + Math.sin(y / h * 3.1 + lampPhase)) / 2;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const vx = (x / w - 0.5) * 2, vy = (y / h - 0.5) * 2;
      const vig = 1 - 0.06 * (vx * vx + vy * vy);
      const n = (r.next() - 0.5) * 9;
      const k = lamp * vig;
      data[o] = data[o] * k + n; data[o + 1] = data[o + 1] * k + n; data[o + 2] = data[o + 2] * k + n;
    }
  }
}
