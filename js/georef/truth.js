// Ground truth helpers: link scan pixels, sheet pixels and Stereo 70 through the known model.
import { makeSheet } from './sheet.js';
import { makeScanModel, scenarioParams } from './scan.js';

export const SCAN_PAD = 1.06; // scanner bed is 6 % larger than the sheet

export function buildScene(cfg, scenario, seed) {
  const S = makeSheet(cfg);
  const scanW = Math.round(S.W * SCAN_PAD), scanH = Math.round(S.H * SCAN_PAD);
  const params = scenarioParams(scenario, seed);
  const M = makeScanModel(params, S.W, S.H, scanW, scanH);
  return {
    S, M,
    // scan pixel (col,row) → true Stereo 70
    truthMap: (col, row) => { const [u, v] = M.W(col, row); return S.toMap(u, v); },
    // Stereo 70 → true scan pixel (col,row)
    truthPixel: (E, N) => { const [u, v] = S.toPx(E, N); return M.Winv(u, v); },
  };
}

// Grid intersections inside the map frame, with their true scan positions.
export function gridIntersections(scene) {
  const { S } = scene, C = S.cfg;
  const pts = [];
  let i = 0;
  for (let E = Math.ceil(S.E0 / C.grid) * C.grid; E <= S.E1 + 1e-6; E += C.grid, i++) {
    let j = 0;
    for (let N = Math.ceil(S.N0 / C.grid) * C.grid; N <= S.N1 + 1e-6; N += C.grid, j++) {
      const [col, row] = scene.truthPixel(E, N);
      pts.push({ E, N, col, row, i, j });
    }
  }
  return pts;
}
