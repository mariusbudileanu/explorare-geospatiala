// Shared cartographic rendering: paths, labels, frame, graticule band, grid labels, marginalia.
import { toLonLat, fromLonLat, fmtDMS } from './crs.js';

export const INK = '#1d1a17';
export const PAPER = '#f7f2e6';
export const SANS = 'MapSans, "IBM Plex Sans Condensed", "Arial Narrow", Arial, sans-serif';
export const SERIF = 'MapSerif, "Source Serif 4", Georgia, serif';

export function tracePoly(ctx, S, poly, close = true) {
  for (let i = 0; i < poly.length; i++) {
    const [u, v] = S.toPx(poly[i][0], poly[i][1]);
    if (i === 0) ctx.moveTo(u, v); else ctx.lineTo(u, v);
  }
  if (close) ctx.closePath();
}

export function fillPoly(ctx, S, poly, fill, stroke, lw) {
  ctx.beginPath(); tracePoly(ctx, S, poly, true);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function strokeLine(ctx, S, line, color, lw, cap = 'round', dash = null) {
  ctx.beginPath(); tracePoly(ctx, S, line, false);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = cap; ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}

export function font(size, { family = SANS, weight = 400, italic = false } = {}) {
  return `${italic ? 'italic ' : ''}${weight} ${size.toFixed(2)}px ${family}`;
}

// Text with optional letter spacing, rotation and paper halo.
export function label(ctx, text, x, y, o = {}) {
  const { f, fill = INK, halo = PAPER, haloW = 0, ang = 0, spacing = 0, align = 'center', base = 'middle' } = o;
  ctx.save();
  ctx.translate(x, y);
  let a = ang;
  if (a > Math.PI / 2) a -= Math.PI; else if (a < -Math.PI / 2) a += Math.PI;
  ctx.rotate(a);
  ctx.font = f;
  ctx.textBaseline = base;
  const chars = [...text];
  const widths = chars.map(c => ctx.measureText(c).width);
  const total = spacing ? widths.reduce((s, w) => s + w, 0) + spacing * (chars.length - 1) : ctx.measureText(text).width;
  let x0 = align === 'center' ? -total / 2 : align === 'right' ? -total : 0;
  ctx.textAlign = 'left';
  const draw = (fn) => {
    if (!spacing) { fn(text, x0, 0); return; }
    let cx = x0;
    chars.forEach((c, i) => { fn(c, cx, 0); cx += widths[i] + spacing; });
  };
  if (haloW > 0) {
    ctx.lineJoin = 'round'; ctx.strokeStyle = halo; ctx.lineWidth = haloW;
    draw((t, a1, b1) => ctx.strokeText(t, a1, b1));
  }
  ctx.fillStyle = fill;
  draw((t, a1, b1) => ctx.fillText(t, a1, b1));
  ctx.restore();
  return total;
}

// Positions along an edge where a geographic coordinate crosses multiples of `step`.
function crossings(n, sampleFn, step) {
  const out = [];
  let prev = sampleFn(0);
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const cur = sampleFn(t);
    const k0 = Math.floor(prev.val / step), k1 = Math.floor(cur.val / step);
    if (k0 !== k1) {
      const k = Math.max(k0, k1);
      const target = k * step;
      const f = (target - prev.val) / (cur.val - prev.val);
      out.push({ t: (i - 1 + f) / n, val: target, k });
    }
    prev = cur;
  }
  return out;
}

export function drawFrame(ctx, S) {
  const C = S.cfg, F = S.frame, mm = S.mm;
  const band = mm(1.4), gap = mm(0.0);
  const step = C.graticuleStep;

  // Grid lines inside the map
  ctx.save();
  ctx.beginPath(); ctx.rect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0); ctx.clip();
  ctx.strokeStyle = 'rgba(20,18,16,0.78)'; ctx.lineWidth = mm(0.13);
  for (let E = Math.ceil(S.E0 / C.grid) * C.grid; E <= S.E1; E += C.grid) {
    const [u] = S.toPx(E, 0); ctx.beginPath(); ctx.moveTo(u, F.y0); ctx.lineTo(u, F.y1); ctx.stroke();
  }
  for (let N = Math.ceil(S.N0 / C.grid) * C.grid; N <= S.N1; N += C.grid) {
    const [, v] = S.toPx(0, N); ctx.beginPath(); ctx.moveTo(F.x0, v); ctx.lineTo(F.x1, v); ctx.stroke();
  }
  ctx.restore();

  // Inner neatline
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.25);
  ctx.strokeRect(F.x0, F.y0, F.x1 - F.x0, F.y1 - F.y0);

  // Graticule band: alternating black/white by geographic coordinate
  const edges = [
    { name: 'top', fn: t => ({ E: S.E0 + t * (S.E1 - S.E0), N: S.N1 }), coord: 0 },
    { name: 'bottom', fn: t => ({ E: S.E0 + t * (S.E1 - S.E0), N: S.N0 }), coord: 0 },
    { name: 'left', fn: t => ({ E: S.E0, N: S.N1 - t * (S.N1 - S.N0) }), coord: 1 },
    { name: 'right', fn: t => ({ E: S.E1, N: S.N1 - t * (S.N1 - S.N0) }), coord: 1 },
  ];
  const ticks = {};
  for (const e of edges) {
    const sample = t => { const p = e.fn(t); return { val: toLonLat(p.E, p.N)[e.coord] }; };
    const cr = crossings(600, sample, step);
    ticks[e.name] = cr;
    const pts = [0, ...cr.map(c => c.t), 1];
    for (let i = 0; i < pts.length - 1; i++) {
      const t0 = pts[i], t1 = pts[i + 1];
      const k = Math.floor(sample((t0 + t1) / 2).val / step);
      ctx.fillStyle = ((k % 2) + 2) % 2 === 0 ? INK : '#fffdf6';
      if (e.name === 'top') ctx.fillRect(F.x0 + t0 * (F.x1 - F.x0), F.y0 - gap - band, (t1 - t0) * (F.x1 - F.x0), band);
      if (e.name === 'bottom') ctx.fillRect(F.x0 + t0 * (F.x1 - F.x0), F.y1 + gap, (t1 - t0) * (F.x1 - F.x0), band);
      if (e.name === 'left') ctx.fillRect(F.x0 - gap - band, F.y0 + t0 * (F.y1 - F.y0), band, (t1 - t0) * (F.y1 - F.y0));
      if (e.name === 'right') ctx.fillRect(F.x1 + gap, F.y0 + t0 * (F.y1 - F.y0), band, (t1 - t0) * (F.y1 - F.y0));
    }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.18);
  ctx.strokeRect(F.x0 - band, F.y0 - band, F.x1 - F.x0 + 2 * band, F.y1 - F.y0 + 2 * band);
  const outer = mm(10);
  ctx.lineWidth = mm(0.7);
  ctx.strokeRect(F.x0 - outer, F.y0 - outer, F.x1 - F.x0 + 2 * outer, F.y1 - F.y0 + 2 * outer);

  // Grid labels between band and outer frame
  const big = mm(3.0), small = mm(1.9);
  const gridLabel = (val, x, y, align) => {
    const s = String(Math.round(val));
    const parts = [s.slice(0, 1), s.slice(1, 3), s.slice(3)];
    ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fillStyle = INK;
    const fs = [font(small, { weight: 400 }), font(big, { weight: 600 }), font(small, { weight: 400 })];
    const ws = parts.map((p, i) => { ctx.font = fs[i]; return ctx.measureText(p).width; });
    const tot = ws[0] + ws[1] + ws[2] + mm(0.3);
    let cx = align === 'center' ? x - tot / 2 : align === 'right' ? x - tot : x;
    parts.forEach((p, i) => { ctx.font = fs[i]; ctx.fillText(p, cx, y + (i === 1 ? 0 : -mm(0.05))); cx += ws[i] + (i === 0 ? mm(0.3) : 0); });
    ctx.restore();
  };
  for (let E = Math.ceil(S.E0 / C.grid) * C.grid; E <= S.E1 + 1e-6; E += C.grid) {
    const [u] = S.toPx(E, 0);
    gridLabel(E, u, F.y0 - band - mm(2.2), 'center');
    gridLabel(E, u, F.y1 + band + mm(5.2), 'center');
    ctx.strokeStyle = INK; ctx.lineWidth = mm(0.13);
    ctx.beginPath(); ctx.moveTo(u, F.y0 - band); ctx.lineTo(u, F.y0 - band - mm(1)); ctx.moveTo(u, F.y1 + band); ctx.lineTo(u, F.y1 + band + mm(1)); ctx.stroke();
  }
  for (let N = Math.ceil(S.N0 / C.grid) * C.grid; N <= S.N1 + 1e-6; N += C.grid) {
    const [, v] = S.toPx(0, N);
    gridLabel(N, F.x0 - band - mm(1.4), v + mm(1.0), 'right');
    gridLabel(N, F.x1 + band + mm(1.4), v + mm(1.0), 'left');
    ctx.strokeStyle = INK; ctx.lineWidth = mm(0.13);
    ctx.beginPath(); ctx.moveTo(F.x0 - band, v); ctx.lineTo(F.x0 - band - mm(0.9), v); ctx.moveTo(F.x1 + band, v); ctx.lineTo(F.x1 + band + mm(0.9), v); ctx.stroke();
  }

  // Corner geographic coordinates
  const corners = [
    { E: S.E0, N: S.N1, x: F.x0, y: F.y0, ax: 'right', ay: -1 },
    { E: S.E1, N: S.N1, x: F.x1, y: F.y0, ax: 'left', ay: -1 },
    { E: S.E0, N: S.N0, x: F.x0, y: F.y1, ax: 'right', ay: 1 },
    { E: S.E1, N: S.N0, x: F.x1, y: F.y1, ax: 'left', ay: 1 },
  ];
  for (const c of corners) {
    const [lon, lat] = toLonLat(c.E, c.N);
    const dx = c.ax === 'right' ? -mm(10.5) : mm(10.5);
    const y0 = c.y + c.ay * mm(13.2);
    label(ctx, fmtDMS(lat, 'N', 'S'), c.x + dx, y0 - mm(1.6), { f: font(mm(1.9), { family: SERIF, italic: true }), align: c.ax });
    label(ctx, fmtDMS(lon, 'E', 'V'), c.x + dx, y0 + mm(1.3), { f: font(mm(1.9), { family: SERIF, italic: true }), align: c.ax });
  }
  return ticks;
}

// Meridian convergence at the map centre (degrees, positive = true north east of grid north).
export function convergence(S) {
  const Ec = (S.E0 + S.E1) / 2, Nc = (S.N0 + S.N1) / 2;
  const [lon, lat] = toLonLat(Ec, Nc);
  const [E2, N2] = fromLonLat(lon, lat + 0.02);
  return { gamma: (Math.atan2(E2 - Ec, N2 - Nc) * 180) / Math.PI, lon, lat };
}

export function drawMarginalia(ctx, S, legendItems, notes) {
  const C = S.cfg, F = S.frame, mm = S.mm;
  const cx = (F.x0 + F.x1) / 2;
  // Title block
  label(ctx, 'ROMÂNIA · LUME FICTIVĂ ÎN COORDONATE REALE', F.x0 - mm(10), mm(9), { f: font(mm(2.1), { weight: 600 }), align: 'left', spacing: mm(0.35) });
  label(ctx, `Foaia ${C.sheetNo}`, F.x1 + mm(10), mm(9), { f: font(mm(2.4), { weight: 600 }), align: 'right', spacing: mm(0.2) });
  label(ctx, C.subtitle.toUpperCase(), cx, mm(9), { f: font(mm(2.3), { weight: 400 }), spacing: mm(0.9) });
  label(ctx, C.title, cx, mm(16.5), { f: font(mm(7.2), { family: SERIF, weight: 600 }), spacing: mm(2.2) });

  // Legend panel
  const lx = F.x1 + mm(16), lw = S.W - lx - mm(7);
  let ly = F.y0 - mm(10);
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.25);
  ctx.strokeRect(lx, ly, lw, F.y1 - F.y0 + mm(20));
  ly += mm(7);
  label(ctx, 'LEGENDĂ', lx + lw / 2, ly, { f: font(mm(3), { weight: 600 }), spacing: mm(0.9) });
  ly += mm(6);
  for (const it of legendItems) {
    if (it.header) {
      ly += mm(1.5);
      label(ctx, it.header, lx + mm(4), ly, { f: font(mm(2.1), { weight: 600 }), align: 'left', spacing: mm(0.4) });
      ctx.strokeStyle = 'rgba(29,26,23,0.35)'; ctx.lineWidth = mm(0.12);
      ctx.beginPath(); ctx.moveTo(lx + mm(4), ly + mm(1.8)); ctx.lineTo(lx + lw - mm(4), ly + mm(1.8)); ctx.stroke();
      ly += mm(5);
      continue;
    }
    const bw = mm(11), bh = mm(4.6);
    ctx.save();
    ctx.beginPath(); ctx.rect(lx + mm(4), ly - bh / 2, bw, bh); ctx.clip();
    it.draw(ctx, lx + mm(4), ly - bh / 2, bw, bh, mm);
    ctx.restore();
    label(ctx, it.label, lx + mm(17.5), ly, { f: font(mm(2.15)), align: 'left' });
    ly += mm(6.1);
  }

  // Convergence diagram
  const conv = convergence(S);
  const dy = F.y1 - mm(32), dx = lx + lw / 2;
  const L = mm(20), oy = dy + mm(18);
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.22);
  ctx.beginPath(); ctx.moveTo(dx, oy); ctx.lineTo(dx, oy - L); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(dx, oy - L); ctx.lineTo(dx - mm(0.7), oy - L + mm(1.8)); ctx.lineTo(dx + mm(0.7), oy - L + mm(1.8)); ctx.closePath(); ctx.fillStyle = INK; ctx.fill();
  const gv = (conv.gamma * 4 * Math.PI) / 180; // exaggerated ×4
  const tx = dx + Math.sin(gv) * L, ty = oy - Math.cos(gv) * L;
  ctx.beginPath(); ctx.moveTo(dx, oy); ctx.lineTo(tx, ty); ctx.stroke();
  // five-point star at the true-north end
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? mm(0.55) : mm(1.3), a = -Math.PI / 2 + (k * Math.PI) / 5;
    ctx.lineTo(tx + Math.cos(a) * rr, ty - mm(1.2) + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
  const side = conv.gamma < 0 ? -1 : 1;
  label(ctx, 'N geografic', tx + side * mm(2.2), ty - mm(1.2), { f: font(mm(1.9), { weight: 600 }), align: side < 0 ? 'right' : 'left' });
  label(ctx, 'N rețea', dx - side * mm(2.2), oy - L + mm(1), { f: font(mm(1.9), { weight: 600 }), align: side < 0 ? 'left' : 'right' });
  label(ctx, `Convergența meridianelor în centrul foii: ${conv.gamma >= 0 ? '+' : '−'}${Math.abs(conv.gamma).toFixed(2).replace('.', ',')}°`, lx + mm(4), dy + mm(24), { f: font(mm(1.85)), align: 'left' });
  label(ctx, '(unghiul desenat este exagerat de 4 ori)', lx + mm(4), dy + mm(27.2), { f: font(mm(1.7), { italic: true }), align: 'left' });

  // Scale bar
  const sy = F.y1 + mm(17.5);
  const unit = C.scale >= 50000 ? 1000 : 100; // metres per segment
  const segPx = unit / S.res;
  const nseg = C.scale >= 50000 ? 5 : 5;
  const sx0 = cx - (nseg * segPx) / 2;
  for (let i = -1; i < nseg; i++) {
    const w = i < 0 ? segPx : segPx;
    const x = sx0 + i * segPx;
    if (i < 0) {
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#fffdf6' : INK; ctx.fillRect(x + k * w / 5, sy, w / 5, mm(1.2)); }
    } else { ctx.fillStyle = i % 2 ? '#fffdf6' : INK; ctx.fillRect(x, sy, w, mm(1.2)); }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = mm(0.15); ctx.strokeRect(sx0 - segPx, sy, (nseg + 1) * segPx, mm(1.2));
  for (let i = -1; i <= nseg; i++) {
    const v = Math.abs(i) * unit;
    const txt = unit >= 1000 ? `${v / 1000}` : `${v}`;
    label(ctx, txt, sx0 + i * segPx, sy - mm(1.6), { f: font(mm(1.9)) });
  }
  label(ctx, unit >= 1000 ? 'km' : 'm', sx0 + nseg * segPx + mm(4), sy + mm(0.6), { f: font(mm(1.9)), align: 'left' });
  label(ctx, `SCARA 1:${C.scale.toLocaleString('ro-RO').replace(/\./g, ' ')}`, cx, sy + mm(5.5), { f: font(mm(2.8), { weight: 600 }), spacing: mm(0.6) });

  // Notes
  const nx = F.x0 - mm(10);
  notes.forEach((t, i) => label(ctx, t, nx, F.y1 + mm(16) + i * mm(3.2), { f: font(mm(1.95), { italic: i === notes.length - 1 }), align: 'left' }));
}
