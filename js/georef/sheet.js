// Map sheet geometry: map frame (Stereo 70 extent) placed on a paper sheet with margins.
// Sheet pixel coordinates: u to the right, v downward, 0 at the top-left paper edge.

export function makeSheet(cfg) {
  const pxPerMm = cfg.dpi / 25.4;
  const res = (cfg.scale / 1000) / pxPerMm; // metres on the ground per pixel
  const m = cfg.marginsMm;
  const l = m.l * pxPerMm, r = m.r * pxPerMm, t = m.t * pxPerMm, b = m.b * pxPerMm;
  const { E0, E1, N0, N1 } = cfg;
  const fw = (E1 - E0) / res, fh = (N1 - N0) / res;
  const W = Math.round(l + fw + r), H = Math.round(t + fh + b);
  return {
    cfg, E0, E1, N0, N1, res, W, H, pxPerMm,
    mm: (v) => v * pxPerMm,
    frame: { x0: l, y0: t, x1: l + fw, y1: t + fh },
    toPx: (E, N) => [l + (E - E0) / res, t + (N1 - N) / res],
    toMap: (u, v) => [E0 + (u - l) * res, N1 - (v - t) * res],
  };
}
