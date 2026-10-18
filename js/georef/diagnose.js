// Diagnostics on the student's points: residuals, leave-one-out errors, error-pattern hints,
// independent check points, true error against the synthetic ground truth, and "what if".
import { fitTransform, TRANSFORMS } from './transforms.js';

const toFit = (p) => ({ id: p.id, x: p.col, y: -p.row, E: p.Y, N: p.X });
const complete = (p) => Number.isFinite(p.X) && Number.isFinite(p.Y);

// Dense truth sample across the map frame, cached per scene.
export function denseTruth(scene) {
  if (scene._dense) return scene._dense;
  const { S, M } = scene, F = S.frame, out = [];
  for (let a = 0; a <= 32; a++) for (let b = 0; b <= 24; b++) {
    const [E, N] = S.toMap(F.x0 + (F.x1 - F.x0) * a / 32, F.y0 + (F.y1 - F.y0) * b / 24);
    const [col, row] = M.Winv(...S.toPx(E, N));
    out.push({ col, row, E, N });
  }
  return (scene._dense = out);
}

function trueStats(model, scene) {
  const e = denseTruth(scene).map(d => { const [E, N] = model.forward(d.col, -d.row); return Math.hypot(E - d.E, N - d.N); }).sort((a, b) => a - b);
  return { mean: e.reduce((s, v) => s + v, 0) / e.length, p95: e[Math.floor(e.length * 0.95)], max: e[e.length - 1] };
}

function rms(a) { return a.length ? Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length) : NaN; }
function median(a) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : NaN; }

// Classify a suspicious point by comparing what was typed with what the rest of the points predict.
function explain(p, pred, cfg, res) {
  const [Ep, Np] = pred; // predicted E (=Y), N (=X)
  const errNow = Math.hypot(p.Y - Ep, p.X - Np);
  const swapped = Math.hypot(p.X - Ep, p.Y - Np);
  if (swapped < Math.max(0.15 * errNow, 30 * res)) return { kind: 'swap', text: 'Valorile par introduse în câmpurile inversate: X (nord) în locul lui Y (est) și invers.' };
  const span = (v, a, b) => v >= a - (b - a) && v <= b + (b - a);
  if (!span(p.X, cfg.N0, cfg.N1) || !span(p.Y, cfg.E0, cfg.E1)) {
    const which = !span(p.X, cfg.N0, cfg.N1) ? 'X' : 'Y';
    const v = which === 'X' ? p.X : p.Y, ref = which === 'X' ? Np : Ep;
    const digits = String(Math.round(Math.abs(v))).length, want = String(Math.round(Math.abs(ref))).length;
    if (digits !== want) return { kind: 'digit', text: `${which} are ${digits} cifre, dar coordonatele acestei foi au ${want}. Probabil lipsește sau e în plus o cifră.` };
    return { kind: 'extent', text: `${which} este mult în afara foii (${Math.round(v)} m).` };
  }
  const g = cfg.grid, dE = p.Y - Ep, dN = p.X - Np;
  const kE = Math.round(dE / g), kN = Math.round(dN / g);
  if ((kE || kN) && Math.abs(dE - kE * g) < 0.2 * g && Math.abs(dN - kN * g) < 0.2 * g) {
    const parts = [];
    if (kN) parts.push(`${kN > 0 ? '+' : '−'}${Math.abs(kN * g)} m pe X`);
    if (kE) parts.push(`${kE > 0 ? '+' : '−'}${Math.abs(kE * g)} m pe Y`);
    return { kind: 'neighbour', text: `Coordonatele par să fie ale intersecției vecine (${parts.join(', ')}). Verifică eticheta caroiajului sau punctul ales în imagine.` };
  }
  if (errNow < 0.25 * g) return { kind: 'misfit', mild: true, text: 'Punctul nu e bine explicat de transformarea aleasă. Dacă așa apar mai ales puncte de pe margini, deformarea e probabil neliniară: compară cu Projective sau Polynomial 2.' };
  return { kind: 'large', text: 'Abatere mare față de restul punctelor. Verifică poziția în imagine și coordonatele introduse.' };
}

export function evaluate(points, type, scene, opts = {}) {
  const cfg = { ...scene.S.cfg, E0: scene.S.E0, E1: scene.S.E1, N0: scene.S.N0, N1: scene.S.N1 };
  const res = scene.S.res;
  const act = points.filter(p => p.active && complete(p));
  const G = act.filter(p => p.role === 'gcp'), C = act.filter(p => p.role === 'check');
  const meta = TRANSFORMS[type];
  const out = { type, nG: G.length, nC: C.length, min: meta.min, per: {}, hints: [], model: null };
  for (const p of points) {
    const [Et, Nt] = scene.truthMap(p.col, p.row);
    out.per[p.id] = { truthE: Et, truthN: Nt, entryErr: complete(p) ? Math.hypot(p.Y - Et, p.X - Nt) : NaN };
  }
  const m = fitTransform(type, G.map(toFit));
  if (!m.ok) { out.msg = m.msg; return out; }
  out.model = m; out.rmse = m.rmse; out.redundancy = m.redundancy;
  G.forEach((p, i) => Object.assign(out.per[p.id], { dE: m.residuals[i].dE, dN: m.residuals[i].dN, r: m.residuals[i].r }));
  const ce = C.map(p => { const [E, N] = m.forward(p.col, -p.row); const e = Math.hypot(p.Y - E, p.X - N); Object.assign(out.per[p.id], { dE: p.Y - E, dN: p.X - N, r: e }); return e; });
  out.checkRmse = rms(ce);
  out.truth = opts.truth === false ? null : trueStats(m, scene);

  // Leave-one-out: how badly does the rest of the set predict each GCP?
  const canLoo = opts.loo !== false && G.length - 1 >= meta.min && (meta.params == null ? G.length - 1 > meta.min : 2 * (G.length - 1) > meta.params);
  out.canLoo = canLoo;
  if (canLoo) {
    // Iterative elimination: a gross error contaminates every fit it takes part in, so remove the
    // worst offender, recompute, and repeat while redundancy allows.
    const looOf = (set) => set.map(p => {
      const mi = fitTransform(type, set.filter(q => q !== p).map(toFit));
      if (!mi.ok) return { p, loo: NaN };
      const pred = mi.forward(p.col, -p.row);
      return { p, loo: Math.hypot(p.Y - pred[0], p.X - pred[1]), pred };
    });
    const enough = (n) => n - 1 >= meta.min && (meta.params == null ? n - 1 > meta.min : 2 * (n - 1) > meta.params);
    // Phase 1: backward elimination of the worst LOO point, up to a third of the set.
    let W = [...G], L = looOf(W);
    const removed = [];
    const maxOut = Math.floor(G.length / 3);
    while (removed.length < maxOut && enough(W.length - 1)) {
      const fin = L.filter(o => Number.isFinite(o.loo));
      const worst = fin.reduce((a, b) => (!a || b.loo > a.loo ? b : a), null);
      if (!worst) break;
      removed.push(worst.p);
      W = W.filter(q => q !== worst.p);
      L = looOf(W);
    }
    // Phase 2: threshold from the clean set; re-admit removed points that fit the clean model.
    let clean = fitTransform(type, W.map(toFit));
    let thr = Math.max(3.5 * median(L.filter(o => Number.isFinite(o.loo)).map(o => o.loo)), 8 * res);
    const suspects = [];
    for (const p of removed) {
      const pred = clean.ok ? clean.forward(p.col, -p.row) : [NaN, NaN];
      const err = Math.hypot(p.Y - pred[0], p.X - pred[1]);
      if (err > thr) suspects.push({ p, pred, err }); else W.push(p);
    }
    if (W.length !== G.length - suspects.length || suspects.length < removed.length) { L = looOf(W); clean = fitTransform(type, W.map(toFit)); }
    for (const o of L) Object.assign(out.per[o.p.id], { loo: o.loo, pred: o.pred });
    for (const s of suspects) {
      const pred = clean.ok ? clean.forward(s.p.col, -s.p.row) : s.pred;
      const d = out.per[s.p.id];
      Object.assign(d, { loo: Math.hypot(s.p.Y - pred[0], s.p.X - pred[1]), pred, suspect: true });
      d.hint = explain(s.p, pred, cfg, res);
      out.hints.push({ id: s.p.id, ...d.hint, loo: d.loo });
    }
    out.looThr = thr;
    out.cleanModel = clean.ok ? clean : null;
  }
  // Check points are judged by the model fitted without the suspect GCPs (when there were any),
  // so one gross GCP error does not make every check point look wrong.
  const judge = out.cleanModel || m;
  const judgeRmse = out.cleanModel ? out.cleanModel.rmse : out.rmse;
  for (const p of C) {
    const d = out.per[p.id];
    const pj = judge.forward(p.col, -p.row);
    const ej = Math.hypot(p.Y - pj[0], p.X - pj[1]);
    if (ej > Math.max(4 * (judgeRmse || 0), 8 * res)) {
      const pred = pj;
      d.suspect = true; d.hint = explain(p, pred, cfg, res);
      out.hints.push({ id: p.id, ...d.hint, check: true });
    }
  }
  out.hints.sort((a, b) => (b.loo || 0) - (a.loo || 0));
  return out;
}

// "What happens if I remove Pn?" — same transformation, same check points, without that point.
export function whatIf(points, id, type, scene) {
  const before = evaluate(points, type, scene);
  const after = evaluate(points.map(p => (p.id === id ? { ...p, active: false } : p)), type, scene);
  return { id, before, after };
}

// All seven transformations on the student's current points.
export function compareAll(points, scene) {
  return Object.keys(TRANSFORMS).map(t => {
    const ev = evaluate(points, t, scene, { loo: false });
    return { t, ok: !!ev.model, msg: ev.msg, min: ev.min, red: ev.redundancy, rmse: ev.rmse, chk: ev.checkRmse, truth: ev.truth, model: ev.model };
  });
}
