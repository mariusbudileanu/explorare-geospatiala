// Zoom/pan canvas viewer with click vs. drag separation, point dragging and a precision loupe.
//
// Callbacks receive source-image coordinates (pixels of the scan or of the sheet):
//   overlay(ctx, k)        draw on top of the image (ctx already in source coordinates)
//   hover(x, y)            pointer moved (null when it leaves)
//   click(x, y, ev)        a press-and-release that did not move more than a few screen pixels
//   hitTest(x, y, k)       returns a draggable item id near (x, y) or null
//   dragMove(id, x, y)     an item is being dragged
//   dragEnd(id, x, y)      drag finished

export class Viewer {
  constructor(el, cb = {}) {
    this.el = el; this.ctx = el.getContext('2d');window.CARTO_P07?.canvas(this.ctx); this.cb = cb;
    this.src = null; this.k = 1; this.ox = 0; this.oy = 0;
    this.loupe = false; this.mouse = null; this.crosshairCursor = false;
    this.abort=new AbortController();const listen=(t,e,f,o={})=>t.addEventListener(e,f,{...o,signal:this.abort.signal});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(el);
    listen(el,'wheel', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      this.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    }, { passive: false });

    let press = null;
    const toSrc = (e) => { const r = el.getBoundingClientRect(); const sx = e.clientX - r.left, sy = e.clientY - r.top; return { sx, sy, x: (sx - this.ox) / this.k, y: (sy - this.oy) / this.k }; };
    listen(el,'pointerdown', (e) => {
      if (e.button !== 0 || !this.src || this.dead) return;
      const p = toSrc(e);
      const hit = this.cb.hitTest?.(p.x, p.y, this.k) ?? null;
      press = { ...p, ox: this.ox, oy: this.oy, moved: false, hit, cx: e.clientX, cy: e.clientY };
      el.setPointerCapture(e.pointerId);
    });
    listen(el,'pointermove', (e) => {
      const p = toSrc(e);
      this.mouse = p;
      if (press) {
        const d = Math.hypot(e.clientX - press.cx, e.clientY - press.cy);
        if (d > 4) press.moved = true;
        if (press.moved) {
          if (press.hit != null) { this.cb.dragMove?.(press.hit, p.x, p.y); el.classList.add('dragging'); }
          else { this.ox = press.ox + e.clientX - press.cx; this.oy = press.oy + e.clientY - press.cy; el.classList.add('grabbing'); }
        }
      }
      if (this.src) this.cb.hover?.(p.x, p.y);
      this.render();
    });
    const end = (e, cancelled) => {
      if (!press) return;
      const p = toSrc(e);
      if (!cancelled) {
        if (press.moved && press.hit != null) this.cb.dragEnd?.(press.hit, p.x, p.y);
        else if (!press.moved) this.cb.click?.(p.x, p.y, e, press.hit);
      }
      press = null; el.classList.remove('grabbing', 'dragging');
      this.render();
    };
    listen(el,'pointerup', (e) => end(e, false));
    listen(el,'pointercancel', (e) => end(e, true));
    listen(el,'pointerleave', () => { this.mouse = null; this.cb.hover?.(null); this.render(); });
    listen(el,'dblclick', (e) => { e.preventDefault(); this.fit(); });
  }
  destroy(){this.abort.abort();this.observer.disconnect();cancelAnimationFrame(this._raf);this.src=null;this.cb={};this.dead=true;}
  resize() {
    if(this.dead)return;
    const dpr = window.devicePixelRatio || 1, r = this.el.getBoundingClientRect();
    this.el.width = Math.max(1, Math.round(r.width * dpr)); this.el.height = Math.max(1, Math.round(r.height * dpr));
    this.cw = r.width; this.ch = r.height;
    if (!this.fitted) this.fit(); else this.render();
  }
  // lw/lh: logical size of the source in overlay coordinates (lets a half-resolution raster stand in)
  setSource(c, keepView, lw, lh) {
    const sizeChanged = this.lw !== (lw || c?.width) || this.lh !== (lh || c?.height);
    this.src = c; this.lw = lw || c?.width; this.lh = lh || c?.height;
    if (!keepView || sizeChanged && !this.fitted) this.fit(); else this.render();
  }
  fit() {
    if (!this.src || !this.cw) return;
    this.k = Math.min(this.cw / this.lw, this.ch / this.lh) * 0.98;
    this.ox = (this.cw - this.lw * this.k) / 2; this.oy = (this.ch - this.lh * this.k) / 2;
    this.fitted = true; this.render();
  }
  zoomAt(x, y, f) {
    const k = Math.max(0.05, Math.min(24, this.k * f));
    this.ox = x - ((x - this.ox) * k) / this.k; this.oy = y - ((y - this.oy) * k) / this.k; this.k = k; this.render();
  }
  centerOn(x, y, minK) {
    if (minK && this.k < minK) this.k = minK;
    this.ox = this.cw / 2 - x * this.k; this.oy = this.ch / 2 - y * this.k; this.render();
  }
  render() {
    if (this._raf||this.dead) return;
    this._raf = requestAnimationFrame(() => { this._raf = null; this.draw(); });
  }
  draw() {
    if(this.dead)return;
    const c = this.ctx, dpr = window.devicePixelRatio || 1;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, this.el.width, this.el.height);
    if (!this.src) return;
    c.setTransform(this.k * dpr, 0, 0, this.k * dpr, this.ox * dpr, this.oy * dpr);
    c.imageSmoothingEnabled = this.k * this.lw / this.src.width < 2; c.imageSmoothingQuality = 'high';
    if (!this.cb.drawBase?.(c, this.k)) c.drawImage(this.src, 0, 0, this.lw, this.lh);
    c.save(); this.cb.overlay?.(c, this.k); c.restore();
    if (this.loupe && this.mouse) this.drawLoupe(c, dpr);
  }
  // Magnified view around the cursor, with a fine crosshair at the exact hotspot.
  drawLoupe(c, dpr) {
    const { sx, sy, x, y } = this.mouse;
    const R = 78, mag = 6; // loupe radius (screen px) and magnification relative to the current view
    const zk = this.k * mag;
    let cx = sx + R + 24, cy = sy - R - 24;
    if (cx + R > this.cw) cx = sx - R - 24;
    if (cy - R < 0) cy = sy + R + 24;
    c.save();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.closePath();
    c.fillStyle = '#20262b'; c.fill();
    c.save(); c.clip();
    c.setTransform(zk * dpr, 0, 0, zk * dpr, (cx - x * zk) * dpr, (cy - y * zk) * dpr);
    c.imageSmoothingEnabled = zk * this.lw / this.src.width < 3;
    if (!this.cb.drawBase?.(c, zk)) c.drawImage(this.src, 0, 0, this.lw, this.lh);
    this.cb.overlay?.(c, zk);
    c.restore();
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.strokeStyle = 'rgba(255,255,255,0.95)'; c.lineWidth = 3;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = 'rgba(20,32,42,0.9)'; c.lineWidth = 1;
    c.beginPath(); c.arc(cx, cy, R + 1.5, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#ff2d7a'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx - R, cy); c.lineTo(cx - 6, cy); c.moveTo(cx + 6, cy); c.lineTo(cx + R, cy);
    c.moveTo(cx, cy - R); c.lineTo(cx, cy - 6); c.moveTo(cx, cy + 6); c.lineTo(cx, cy + R); c.stroke();
    c.fillStyle = 'rgba(20,32,42,0.85)'; c.fillRect(cx - 30, cy + R - 22, 60, 16);
    c.fillStyle = '#fff'; c.font = '600 11px MapSans, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(`×${(zk / this.k).toFixed(1)}`, cx, cy + R - 14);
    c.restore();
  }
}
