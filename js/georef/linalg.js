// Small dense linear algebra, enough for georeferencing problems (n ≤ a few hundred).

// Least squares A x = b via Householder QR. A: array of rows (m × n). b: array (m) or array of columns.
// Returns { x: [cols][n], cond, rankDeficient }.
export function lstsq(A, Bcols) {
  const m = A.length, n = A[0].length;
  if (m < n) return { x: null, cond: Infinity, rankDeficient: true };
  const R = A.map(r => Float64Array.from(r));
  const B = Bcols.map(c => Float64Array.from(c));
  const diag = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let norm = 0;
    for (let i = k; i < m; i++) norm += R[i][k] * R[i][k];
    norm = Math.sqrt(norm);
    if (norm === 0) { diag[k] = 0; continue; }
    const alpha = R[k][k] > 0 ? -norm : norm;
    const v = new Float64Array(m - k);
    v[0] = R[k][k] - alpha;
    for (let i = k + 1; i < m; i++) v[i - k] = R[i][k];
    let vnorm2 = 0;
    for (let i = 0; i < v.length; i++) vnorm2 += v[i] * v[i];
    if (vnorm2 === 0) { diag[k] = alpha; continue; }
    for (let j = k; j < n; j++) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i - k] * R[i][j];
      s = (2 * s) / vnorm2;
      for (let i = k; i < m; i++) R[i][j] -= s * v[i - k];
    }
    for (const b of B) {
      let s = 0;
      for (let i = k; i < m; i++) s += v[i - k] * b[i];
      s = (2 * s) / vnorm2;
      for (let i = k; i < m; i++) b[i] -= s * v[i - k];
    }
    diag[k] = R[k][k];
  }
  let dmax = 0, dmin = Infinity;
  for (let k = 0; k < n; k++) {
    const d = Math.abs(diag[k]);
    dmax = Math.max(dmax, d); dmin = Math.min(dmin, d);
  }
  const cond = dmin === 0 ? Infinity : dmax / dmin;
  const rankDeficient = !(cond < 1e12);
  if (rankDeficient) return { x: null, cond, rankDeficient };
  const X = B.map(b => {
    const x = new Float64Array(n);
    for (let k = n - 1; k >= 0; k--) {
      let s = b[k];
      for (let j = k + 1; j < n; j++) s -= R[k][j] * x[j];
      x[k] = s / R[k][k];
    }
    return Array.from(x);
  });
  return { x: X, cond, rankDeficient };
}

// Solve square system A X = B (B given as list of columns) with partial pivoting.
// Returns list of solution columns, or null if singular.
export function solve(Ain, cols) {
  const n = Ain.length;
  const A = Ain.map(r => Float64Array.from(r));
  const B = cols.map(c => Float64Array.from(c));
  for (let k = 0; k < n; k++) {
    let p = k, pv = Math.abs(A[k][k]);
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > pv) { pv = Math.abs(A[i][k]); p = i; }
    if (pv < 1e-14) return null;
    if (p !== k) {
      [A[p], A[k]] = [A[k], A[p]];
      for (const b of B) { const t = b[p]; b[p] = b[k]; b[k] = t; }
    }
    for (let i = k + 1; i < n; i++) {
      const f = A[i][k] / A[k][k];
      if (f === 0) continue;
      for (let j = k; j < n; j++) A[i][j] -= f * A[k][j];
      for (const b of B) b[i] -= f * b[k];
    }
  }
  const X = B.map(b => {
    const x = new Float64Array(n);
    for (let k = n - 1; k >= 0; k--) {
      let s = b[k];
      for (let j = k + 1; j < n; j++) s -= A[k][j] * x[j];
      x[k] = s / A[k][k];
    }
    return Array.from(x);
  });
  return X;
}

// Symmetric eigen-decomposition (cyclic Jacobi). Returns { values, vectors } with vectors as columns.
export function eigSym(Sin) {
  const n = Sin.length;
  const S = Sin.map(r => Float64Array.from(r));
  const V = Array.from({ length: n }, (_, i) => { const r = new Float64Array(n); r[i] = 1; return r; });
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += S[i][j] * S[i][j];
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(S[p][q]) < 1e-300) continue;
      const theta = (S[q][q] - S[p][p]) / (2 * S[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) {
        const skp = S[k][p], skq = S[k][q];
        S[k][p] = c * skp - s * skq; S[k][q] = s * skp + c * skq;
      }
      for (let k = 0; k < n; k++) {
        const spk = S[p][k], sqk = S[q][k];
        S[p][k] = c * spk - s * sqk; S[q][k] = s * spk + c * sqk;
      }
      for (let k = 0; k < n; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq;
      }
    }
  }
  return { values: Array.from({ length: n }, (_, i) => S[i][i]), vectors: V };
}

export function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-300) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det,
          B / det, (a * i - c * g) / det, -(a * f - c * d) / det,
          C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}
