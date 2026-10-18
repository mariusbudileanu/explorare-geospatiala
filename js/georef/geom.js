// Planar geometry helpers (map metres).

export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L = dx * dx + dy * dy;
  let t = L ? ((px - ax) * dx + (py - ay) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export function distToPolyline(px, py, line) {
  let d = Infinity;
  for (let i = 1; i < line.length; i++) {
    const v = distToSeg(px, py, line[i - 1][0], line[i - 1][1], line[i][0], line[i][1]);
    if (v < d) d = v;
  }
  return d;
}

export function distToPolyEdge(px, py, poly) {
  let d = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    d = Math.min(d, distToSeg(px, py, a[0], a[1], b[0], b[1]));
  }
  return d;
}

export function chaikin(pts, iter = 2, closed = false) {
  let p = pts;
  for (let k = 0; k < iter; k++) {
    const q = [];
    const n = p.length;
    if (!closed) q.push(p[0]);
    const lim = closed ? n : n - 1;
    for (let i = 0; i < lim; i++) {
      const a = p[i], b = p[(i + 1) % n];
      q.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
      q.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}

export function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  return Math.abs(a) / 2;
}

export function centroid(poly) {
  let x = 0, y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}

// Clip polygon by half-plane n·p ≥ c (Sutherland–Hodgman).
export function clipHalfPlane(poly, nx, ny, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = nx * a[0] + ny * a[1] - c, db = nx * b[0] + ny * b[1] - c;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

// Clip polygon to a convex polygon shrunk inward by distance d.
export function clipToConvexInset(poly, convex, d) {
  const [cx, cy] = centroid(convex);
  let out = poly;
  for (let i = 0; i < convex.length && out.length; i++) {
    const a = convex[i], b = convex[(i + 1) % convex.length];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0];
    const L = Math.hypot(nx, ny);
    if (L < 1e-9) continue;
    nx /= L; ny /= L;
    if (nx * (cx - a[0]) + ny * (cy - a[1]) < 0) { nx = -nx; ny = -ny; }
    out = clipHalfPlane(out, nx, ny, nx * a[0] + ny * a[1] + d);
  }
  return out;
}

export function polylineLength(line) {
  let s = 0;
  for (let i = 1; i < line.length; i++) s += Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]);
  return s;
}

// Point and tangent angle at fraction t of a polyline's length.
export function alongPolyline(line, t) {
  const L = polylineLength(line) * t;
  let s = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (s + d >= L) {
      const f = d ? (L - s) / d : 0;
      return { p: [a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1])], ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
    }
    s += d;
  }
  const a = line[line.length - 2], b = line[line.length - 1];
  return { p: b, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
}

// Rectangle in a rotated local frame → polygon in world coords.
export function frameRect(ox, oy, ang, u0, v0, u1, v1) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const P = (u, v) => [ox + u * c - v * s, oy + u * s + v * c];
  return [P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1)];
}

// Blob polygon: ellipse with radial noise.
export function blob(cx, cy, a, b, ang, noiseFn, n = 48, amp = 0.25) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = 1 + amp * noiseFn(Math.cos(t), Math.sin(t));
    const x = Math.cos(t) * a * r, y = Math.sin(t) * b * r;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return chaikin(pts, 1, true);
}
