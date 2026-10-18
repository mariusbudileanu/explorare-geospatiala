// Control-point store: points, roles, undo/redo history, local persistence and exercise presets.
//
// A point: { id, col, row, X, Y, role, active }
//   col,row  position in the scan (pixels, row downward)
//   X, Y     Romanian Stereo 70 notation: X = northing (N), Y = easting (E); null until entered
//   role     'gcp' (used in the fit) or 'check' (independent verification point)

import { Rand, hashSeed } from './rng.js';

export class PointStore {
  constructor(onChange) {
    this.points = []; this.selected = null; this.nextNum = 1;
    this.undoStack = []; this.redoStack = []; this.onChange = onChange; this.key = null;
  }
  snapshot() { return JSON.stringify({ points: this.points, nextNum: this.nextNum }); }
  restore(s) {
    if(typeof s!=='string'||s.length>64000)throw Error('Invalid saved state');
    const o=JSON.parse(s);
    if(!o||!Array.isArray(o.points)||o.points.length>100||!Number.isSafeInteger(o.nextNum)||o.nextNum<1||o.nextNum>100000)throw Error('Invalid saved state');
    const ids=new Set();for(const p of o.points){if(!p||!/^P[1-9]\d{0,5}$/.test(p.id)||ids.has(p.id)||!['gcp','check'].includes(p.role)||typeof p.active!=='boolean'||![p.col,p.row].every(v=>Number.isFinite(v)&&Math.abs(v)<1e6)||![p.X,p.Y].every(v=>v===null||(Number.isFinite(v)&&Math.abs(v)<1e9)))throw Error('Invalid saved point');ids.add(p.id);}
    if(o.points.some(p=>Number(p.id.slice(1))>=o.nextNum))throw Error('Invalid point sequence');
    this.points=o.points.map(p=>({...p}));this.nextNum=o.nextNum;
  }
  // Every mutation goes through commit(): one undo step, persistence, re-evaluation.
  commit(label, fn) {
    const before = this.snapshot();
    fn();
    if (this.snapshot() === before) return;
    this.undoStack.push({ label, state: before });
    if (this.undoStack.length > 200) this.undoStack.shift();
    this.redoStack = [];
    this.persist();
    this.onChange?.(label);
  }
  undo() {
    const u = this.undoStack.pop(); if (!u) return null;
    this.redoStack.push({ label: u.label, state: this.snapshot() });
    this.restore(u.state); this.fixSelection(); this.persist(); this.onChange?.('undo'); return u.label;
  }
  redo() {
    const r = this.redoStack.pop(); if (!r) return null;
    this.undoStack.push({ label: r.label, state: this.snapshot() });
    this.restore(r.state); this.fixSelection(); this.persist(); this.onChange?.('redo'); return r.label;
  }
  fixSelection() { if (!this.points.some(p => p.id === this.selected)) this.selected = null; }
  get(id) { return this.points.find(p => p.id === id); }

  add(col, row, role = 'gcp') {
    if(this.points.length>=100)return this.selected;
    const id = `P${this.nextNum}`;
    this.commit(`Adaugă ${id}`, () => {
      this.points.push({ id, col, row, X: null, Y: null, role, active: true });
      this.nextNum++;
    });
    this.selected = id;
    return id;
  }
  update(id, patch, label) {
    this.commit(label || `Modifică ${id}`, () => { const p = this.get(id); if (p) Object.assign(p, patch); });
  }
  remove(id) {
    this.commit(`Șterge ${id}`, () => { this.points = this.points.filter(p => p.id !== id); });
    if (this.selected === id) this.selected = null;
  }
  replaceAll(points, label) {
    this.selected=null;
    this.commit(label, () => {
      this.points = points;
      this.nextNum = points.reduce((m, p) => Math.max(m, +p.id.slice(1) + 1), 1);
    });
    this.selected = null;
  }

  // Per-scene persistence (one viewer's browser only; failures are ignored)
  bind(key) {
    this.key = key; this.undoStack = []; this.redoStack = []; this.selected = null;
    this.recovered=false;
    let saved = null;
    try { saved = localStorage.getItem(key); } catch (e) { saved = null; }
    if (saved) { try { this.restore(saved); return true; } catch (e) { this.recovered=true; } }
    this.points = []; this.nextNum = 1;
    return false;
  }
  persist() { if (!this.key) return; try { localStorage.setItem(this.key, this.snapshot()); } catch (e) { /* storage unavailable */ } }
}

// Farthest-point selection: a well-spread subset of grid intersections, deterministic.
export function spreadSelect(points, k, exclude = new Set()) {
  const idx = points.map((_, i) => i).filter(i => !exclude.has(i));
  if (k >= idx.length) return idx;
  const cx = idx.reduce((s, i) => s + points[i].col, 0) / idx.length, cy = idx.reduce((s, i) => s + points[i].row, 0) / idx.length;
  let first = idx[0], best = -1;
  for (const i of idx) { const d = Math.hypot(points[i].col - cx, points[i].row - cy); if (d > best) { best = d; first = i; } }
  const sel = [first];
  const dmin = new Map(idx.map(i => [i, Math.hypot(points[i].col - points[first].col, points[i].row - points[first].row)]));
  while (sel.length < k) {
    let bi = -1, bd = -1;
    for (const [i, d] of dmin) if (!sel.includes(i) && d > bd) { bd = d; bi = i; }
    sel.push(bi);
    for (const i of idx) dmin.set(i, Math.min(dmin.get(i), Math.hypot(points[i].col - points[bi].col, points[i].row - points[bi].row)));
  }
  return sel;
}

// Exercise presets built from true grid intersections with simulated click noise.
// kind: 'clean' (12 GCP + 6 check) or 'errors' (same layout, three GCPs carry classic mistakes)
export function buildPreset(kind, intersections, seed, sigma = 0.6) {
  const r = new Rand(hashSeed('preset', kind, seed));
  const nG = 12, nC = 6;
  const gi = spreadSelect(intersections, nG);
  const ci = spreadSelect(intersections, nC, new Set(gi));
  const mk = (i, role, n) => {
    const p = intersections[i];
    return { id: `P${n}`, col: p.col + sigma * r.normal(), row: p.row + sigma * r.normal(), X: p.N, Y: p.E, role, active: true, _truth: true };
  };
  const pts = [...gi.map((i, k) => mk(i, 'gcp', k + 1)), ...ci.map((i, k) => mk(i, 'check', nG + k + 1))];
  const notes = [];
  if (kind === 'errors') {
    const grid = intersections.grid;
    const order = r.shuffle([1, 3, 5, 6, 7, 9, 10]).slice(0, 3);
    const [a, b, c] = order.map(k => pts[k]);
    // 1. X and Y typed in swapped fields
    [a.X, a.Y] = [a.Y, a.X]; notes.push({ id: a.id, kind: 'swap' });
    // 2. one digit dropped from X (northing)
    const s = String(Math.round(b.X)); b.X = +(s.slice(0, 3) + s.slice(4)); notes.push({ id: b.id, kind: 'digit' });
    // 3. coordinates of the neighbouring intersection (one grid step on Y)
    c.Y = c.Y + grid; notes.push({ id: c.id, kind: 'neighbour' });
  }
  pts.forEach(p => delete p._truth);
  return { points: pts, notes };
}
