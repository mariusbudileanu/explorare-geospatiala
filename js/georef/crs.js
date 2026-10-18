// Stereo70 exclusively. Reuse the canonical registry/engine; no new projection definitions.
export const toLonLat=(E,N)=>window.CRS_ENGINE.transform('EPSG:3844','EPSG:4326',[E,N]);
export const fromLonLat=(lon,lat)=>window.CRS_ENGINE.transform('EPSG:4326','EPSG:3844',[lon,lat]);
export function fmtDMS(v, pos, neg) {
  const h = v >= 0 ? pos : neg;
  v = Math.abs(v);
  let d = Math.floor(v), m = Math.floor((v - d) * 60), s = Math.round(((v - d) * 60 - m) * 60);
  if (s === 60) { s = 0; m++; }
  if (m === 60) { m = 0; d++; }
  return `${d}°${String(m).padStart(2, '0')}′${String(s).padStart(2, '0')}″${h}`;
}
