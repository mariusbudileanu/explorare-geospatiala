(function(){
"use strict";
let controller=new AbortController(),mounted=false,coordinateError=false;
function clearCoordinateError(){if(coordinateError){window.CARTO_P07.feedback("");coordinateError=false;}for(const id of ["in-lon","in-lat"])document.getElementById(id)?.setAttribute("aria-invalid","false");}
const listen=(target,type,fn,opts={})=>target.addEventListener(type,fn,{...(typeof opts==="boolean"?{capture:opts}:opts),signal:controller.signal});

/* =====================================================================================
   CONFIG — valori verificate pe store-ul real. Modificați aici dacă reactualizați fișa.
   ===================================================================================== */
const CONFIG = {
  // Geometria cubului (din .zarray și STAC proj:transform)
  NT: 32872, NY: 483, NX: 972,
  X_VEST: 20.13, Y_NORD: 48.36, PAS: 0.01,           // marginile grilei, nu centrele pixelilor
  T0: "1961-01-01",
  URL: "https://storage.svc.uvt-01.eocube.ro/meteo/cube/open-v1",

  // Frontierele last_*_time                                  MODIFICABIL la reactualizare
  FRONTIERE: { max_temp: "2026-10-15", min_temp: "2026-10-16", precipitation: "2026-10-15" },
  VERIFICAT: "2026-10-16",                                    // MODIFICABIL

  // Mediana mărimii comprimate a unui chunk real [90,161,324], în MB, pe sector [rând][coloană]
  MEDIANE_MB: {                                               // MODIFICABIL la reactualizare
    max_temp:      [[3.0498, 7.6629, 2.7626], [6.7993, 9.3689, 5.0071], [3.4856, 6.0617, 4.3958]],
    min_temp:      [[3.0865, 7.4737, 2.6991], [6.8595, 9.2510, 4.9307], [3.4986, 6.1365, 4.5353]],
    precipitation: [[1.4352, 3.0717, 1.0866], [2.9953, 3.6723, 1.8064], [1.4774, 2.4281, 1.6862]],
  },
  VIITOR_MB: 0.0758,
  // Procentul de pixeli valizi (non-NaN) pe sector [rând][coloană], măsurat
  ACOPERIRE: [[31.9, 74.0, 26.1], [75.4, 100.0, 54.2], [29.1, 85.8, 56.7]],                                          // chunk pre-alocat (numai zerouri)

  // Modelul de timp (din benchmark-urile reale: ~11 MB/s, ~0,4 s latență)  MODIFICABIL
  DEBIT_MBs: 11,                 // debit total măsurat (MB/s)
  LATENTA_s: 0.15,               // latența unui „val” de cereri paralele (s)
  CONCURENTA: 10,                // cereri HTTP simultane (ordinul de mărime folosit de zarr/fsspec)
  RAPORT_PRESUPUS: 3.5,          // compresia presupusă pentru layout-urile ipotetice (media măsurată la A)
  ANIM_MIN_s: 2, ANIM_MAX_s: 12, // durata animației (timpul real e comprimat în acest interval)

  // Layout-urile comparate (slide 16). Doar „A” are mărimi comprimate măsurate.   MODIFICABIL
  LAYOUTS: [
    { id: "A", nume: "A — actual", ch: [90, 161, 324], real: true },
    { id: "B", nume: "B — compromis (ipotetic)", ch: [3650, 32, 32], real: false },
    { id: "C", nume: "C — serie de timp (ipotetic)", ch: [32872, 16, 16], real: false },
  ],

  // Timpii măsurați pe laptop (HTTPS, 2026-10-16), afișați lângă estimare      MODIFICABIL
  MASURAT: { punct: "0,5–0,7 s", harta: "2,8–3,9 s", sezon: "0,9–1,1 s", serie: "144–148 s (București)" },

  // Fereastra „un sector” = chunk-ul spațial real (161 × 324 pixeli)
  SECTOR: [161, 324],

  // Localități (lon °E, lat °N)                                  MODIFICABIL: adăugați oricâte
  LOCALITATI: [
    ["București", 26.1025, 44.4268], ["Timișoara", 21.2257, 45.7489], ["Cluj-Napoca", 23.5940, 46.7712],
    ["Iași", 27.6014, 47.1585], ["Constanța", 28.6348, 44.1598], ["Craiova", 23.7949, 44.3302],
    ["Sibiu", 24.1256, 45.7983], ["Brașov", 25.6012, 45.6427], ["Suceava", 26.2539, 47.6514],
  ],

  // Media max_temp la București, măsurată (slide 21)
  MEDIE_BUC: { corecta: 17.78, falsa: 12.99 },

  // Conturul României: Natural Earth 1:50m (domeniu public), simplificat la 178 de puncte [lon, lat]
  CONTUR_RO: [[28.212,45.45],[28.318,45.347],[28.451,45.292],[28.761,45.234],[28.791,45.252],[28.77,45.267],[28.782,45.31],[28.894,45.29],[29.027,45.321],[29.224,45.403],[29.404,45.42],[29.568,45.371],[29.706,45.26],[29.635,44.98],[29.558,44.843],[29.048,44.758],[29.081,44.799],[29.048,44.926],[29.095,44.975],[28.981,44.993],[28.931,44.966],[28.892,44.919],[28.926,44.81],[28.849,44.716],[28.846,44.637],[28.814,44.602],[28.807,44.565],[28.888,44.575],[28.852,44.506],[28.699,44.374],[28.645,44.296],[28.659,43.984],[28.591,43.797],[28.585,43.742],[28.423,43.74],[28.222,43.773],[28.05,43.822],[27.884,43.987],[27.739,43.956],[27.671,43.998],[27.561,44.02],[27.425,44.021],[27.087,44.167],[26.848,44.146],[26.489,44.084],[26.216,44.007],[25.933,43.871],[25.819,43.767],[25.686,43.712],[25.497,43.671],[25.16,43.686],[24.431,43.794],[24.227,43.763],[23.951,43.787],[23.535,43.854],[23.225,43.874],[22.919,43.834],[22.868,43.865],[22.856,43.899],[22.868,43.948],[22.911,43.987],[23.024,44.047],[23.029,44.078],[22.688,44.248],[22.683,44.286],[22.531,44.378],[22.495,44.435],[22.502,44.49],[22.554,44.54],[22.62,44.562],[22.701,44.556],[22.734,44.57],[22.721,44.606],[22.498,44.706],[22.351,44.676],[22.201,44.561],[22.093,44.542],[22.027,44.62],[21.909,44.666],[21.74,44.681],[21.636,44.71],[21.597,44.755],[21.523,44.79],[21.36,44.827],[21.358,44.862],[21.52,44.881],[21.532,44.901],[21.533,44.919],[21.378,44.973],[21.353,45.009],[21.421,45.033],[21.434,45.075],[21.492,45.122],[21.49,45.148],[21.431,45.193],[21.226,45.241],[21.148,45.292],[21.024,45.322],[20.794,45.468],[20.774,45.484],[20.786,45.536],[20.766,45.597],[20.775,45.75],[20.76,45.758],[20.709,45.735],[20.653,45.779],[20.581,45.869],[20.359,45.975],[20.242,46.109],[20.281,46.133],[20.508,46.167],[20.614,46.133],[20.707,46.173],[20.76,46.246],[20.837,46.26],[21.04,46.242],[21.122,46.282],[21.152,46.304],[21.192,46.392],[21.265,46.412],[21.252,46.486],[21.32,46.608],[21.497,46.704],[21.477,46.753],[21.494,46.79],[21.653,46.964],[21.661,47.044],[21.785,47.138],[21.869,47.305],[21.995,47.396],[22.0,47.505],[22.112,47.572],[22.291,47.728],[22.491,47.773],[22.608,47.766],[22.677,47.799],[22.877,47.947],[23.055,48.007],[23.139,48.087],[23.203,48.085],[23.408,47.99],[23.669,47.992],[24.002,47.936],[24.06,47.945],[24.178,47.906],[24.484,47.947],[24.579,47.931],[24.893,47.718],[25.074,47.746],[25.17,47.823],[25.464,47.911],[26.163,47.993],[26.277,48.113],[26.306,48.204],[26.619,48.26],[26.714,48.263],[26.787,48.256],[26.901,48.211],[26.981,48.155],[27.152,47.959],[27.231,47.842],[27.278,47.718],[27.337,47.64],[27.465,47.537],[27.614,47.341],[27.768,47.228],[27.854,47.115],[28.072,46.978],[28.15,46.792],[28.239,46.641],[28.223,46.508],[28.244,46.451],[28.119,46.139],[28.1,45.973],[28.116,45.826],[28.156,45.713],[28.16,45.647],[28.075,45.599]],

  // Colorarea ILUSTRATIVĂ a cubului (date sintetice, nu valori reale)          MODIFICABIL
  TEXTURI: {
    activ: true,                 // false = cubul fără culori
    opacitateFete: 0.5,          // fețele verticale (media anuală sintetică)
    opacitateHarta: 0.92,        // planul hărții din scenariul A
    scara: { max_temp: [-15, 40], min_temp: [-15, 40], precipitation: [0, 12] },        // valori zilnice
    scaraAnuala: { max_temp: [0, 22], min_temp: [-6, 14], precipitation: [0, 5] },     // medii anuale
  },

  // Valorile implicite la deschidere                             MODIFICABIL
  START: { layout: "A", sc: "serie", var: "max_temp", loc: 0, data: "2026-10-15", an: 2025, anot: "JJA" },
};

/* ===================================================================== utilitare */
const $ = (id) => document.getElementById(id);
const MS_ZI = 864e5;
const T0MS = Date.parse(CONFIG.T0 + "T00:00:00Z");
const zi = (s) => Math.round((Date.parse(s + "T00:00:00Z") - T0MS) / MS_ZI);
const data = (i) => new Date(T0MS + i * MS_ZI).toISOString().slice(0, 10);
const ro = (x, d = 0) => x.toLocaleString((window.CARTO_P07.lang === "en" ? "en-GB" : "ro-RO"), { minimumFractionDigits: d, maximumFractionDigits: d });
function fmtB(b) {
  if (b >= 1e9) return ro(b / 1e9, b >= 1e11 ? 0 : 1) + " GB";
  if (b >= 1e6) return ro(b / 1e6, b >= 1e8 ? 0 : 1) + " MB";
  if (b >= 1e3) return ro(b / 1e3, 1) + " KB";
  return ro(b) + " B";
}
const fmtMB = (mb) => fmtB(mb * 1e6);
function fmtT(s) {
  if (s < 60) return ro(s, s < 10 ? 1 : 0) + " s";
  const m = Math.floor(s / 60), r = Math.round(s - m * 60);
  return m + " min " + (r ? r + " s" : "");
}

function anotimp(an, cod) {
  const ultimaFeb = new Date(Date.UTC(an, 2, 0)).toISOString().slice(0, 10);
  return {
    DJF: [`${an - 1}-12-01`, ultimaFeb],
    MAM: [`${an}-03-01`, `${an}-05-31`],
    JJA: [`${an}-06-01`, `${an}-08-31`],
    SON: [`${an}-09-01`, `${an}-11-30`],
  }[cod];
}

/* ===================================================================== starea */
const S = {
  layout: CONFIG.START.layout, sc: CONFIG.START.sc, var: CONFIG.START.var,
  lon: CONFIG.LOCALITATI[CONFIG.START.loc][1], lat: CONFIG.LOCALITATI[CONFIG.START.loc][2],
  nume: CONFIG.LOCALITATI[CONFIG.START.loc][0],
  data: CONFIG.START.data, an: CONFIG.START.an, anot: CONFIG.START.anot,
  filtru: true,
  expl: 0,                      // vederea explodată: 0 = cub întreg … 1 = complet desfăcut
  cursa: false, adv: "C",       // modul cursă: A vs. adversar (B sau C)
  th: -0.62, ph: 0.52,          // unghiurile de vedere (radiani)
};

/* ===================================================================== calculul */
function calcul(layoutId = S.layout) {
  const { NT, NY, NX } = CONFIG;
  const L = CONFIG.LAYOUTS.find((l) => l.id === layoutId);
  const ct = Math.min(L.ch[0], NT), cy = L.ch[1], cx = L.ch[2];
  const nTc = Math.ceil(NT / ct), nYc = Math.ceil(NY / cy), nXc = Math.ceil(NX / cx);
  const itf = zi(CONFIG.FRONTIERE[S.var]);
  const tcf = Math.floor(itf / ct);
  const ix = Math.floor((S.lon - CONFIG.X_VEST) / CONFIG.PAS + 1e-9);
  const iy = Math.floor((CONFIG.Y_NORD - S.lat) / CONFIG.PAS + 1e-9);
  const inGrila = ix >= 0 && ix < NX && iy >= 0 && iy < NY;
  const ixc = Math.min(Math.max(ix, 0), NX - 1), iyc = Math.min(Math.max(iy, 0), NY - 1);
  const it = Math.min(Math.max(zi(S.data), 0), NT - 1);

  let T, Y, X, U, extra = {};
  if (S.sc === "punct") {
    T = [Math.floor(it / ct), Math.floor(it / ct) + 1];
    Y = [Math.floor(iyc / cy), Math.floor(iyc / cy) + 1];
    X = [Math.floor(ixc / cx), Math.floor(ixc / cx) + 1];
    U = { t: [it, it + 1], y: [iyc, iyc + 1], x: [ixc, ixc + 1] };
  } else if (S.sc === "harta") {
    T = [Math.floor(it / ct), Math.floor(it / ct) + 1];
    Y = [0, nYc]; X = [0, nXc];
    U = { t: [it, it + 1], y: [0, NY], x: [0, NX] };
  } else if (S.sc === "sezon") {
    const [a, b] = anotimp(S.an, S.anot);
    const i0 = Math.max(zi(a), 0), i1 = Math.min(zi(b), NT - 1);
    const [sh, sw] = CONFIG.SECTOR;
    const sy = Math.floor(iyc / sh), sx = Math.floor(ixc / sw);
    const Y0 = sy * sh, Y1 = Math.min(Y0 + sh, NY), X0 = sx * sw, X1 = Math.min(X0 + sw, NX);
    T = [Math.floor(i0 / ct), Math.floor(i1 / ct) + 1];
    Y = [Math.floor(Y0 / cy), Math.floor((Y1 - 1) / cy) + 1];
    X = [Math.floor(X0 / cx), Math.floor((X1 - 1) / cx) + 1];
    U = { t: [i0, i1 + 1], y: [Y0, Y1], x: [X0, X1] };
    extra = { a, b, zile: i1 - i0 + 1, sector: `${sy},${sx}` };
  } else {
    const tEnd = S.filtru ? itf : NT - 1;
    T = [0, Math.floor(tEnd / ct) + 1];
    Y = [Math.floor(iyc / cy), Math.floor(iyc / cy) + 1];
    X = [Math.floor(ixc / cx), Math.floor(ixc / cx) + 1];
    U = { t: [0, tEnd + 1], y: [iyc, iyc + 1], x: [ixc, ixc + 1] };
  }

  const nT = T[1] - T[0], nS = (Y[1] - Y[0]) * (X[1] - X[0]);
  const nObj = nT * nS;
  const rawChunk = ct * cy * cx * 4;
  const raw = nObj * rawChunk;
  const util = (U.t[1] - U.t[0]) * (U.y[1] - U.y[0]) * (U.x[1] - U.x[0]) * 4;
  const nViitorT = Math.max(0, T[1] - Math.max(T[0], tcf + 1));
  let mb = null;
  if (L.real) {
    mb = 0;
    const med = CONFIG.MEDIANE_MB[S.var];
    for (let r = Y[0]; r < Y[1]; r++)
      for (let c = X[0]; c < X[1]; c++)
        mb += (nT - nViitorT) * med[r][c] + nViitorT * CONFIG.VIITOR_MB;
  }
  const mbEst = mb !== null ? mb : raw / 1e6 / CONFIG.RAPORT_PRESUPUS;
  const timp = Math.ceil(nObj / CONFIG.CONCURENTA) * CONFIG.LATENTA_s + mbEst / CONFIG.DEBIT_MBs;

  // Cheile S3, în ordinea t, y, x
  const chei = [];
  const total = nObj;
  const cheie = (k) => {
    const t = T[0] + Math.floor(k / nS), rest = k % nS;
    const r = Y[0] + Math.floor(rest / (X[1] - X[0])), c = X[0] + (rest % (X[1] - X[0]));
    return `${S.var}/${t}.${r}.${c}`;
  };
  if (total <= 4) for (let k = 0; k < total; k++) chei.push(cheie(k));
  else chei.push(cheie(0), cheie(1), "…", cheie(total - 1));

  return {
    L, ct, cy, cx, nTc, nYc, nXc, itf, tcf, ix: ixc, iy: iyc, inGrila, it, T, Y, X, U,
    nObj, nT, nS, rawChunk, raw, util, nViitorT, mb, mbEst, timp, chei, extra,
    viitorObj: nViitorT * nS,
  };
}

/* ===================================================================== texturi ilustrative (date SINTETICE) */
const RDYLBU_R = ["#313695", "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090", "#fdae61", "#f46d43", "#d73027", "#a50026"];
const BLUES = ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function culoare(v, val, scara) {
  const [lo, hi] = scara || CONFIG.TEXTURI.scara[v];
  const pal = v === "precipitation" ? BLUES : RDYLBU_R;
  const t = Math.min(1, Math.max(0, (val - lo) / (hi - lo))) * (pal.length - 1);
  const i = Math.min(pal.length - 2, Math.floor(t)), f = t - i;
  const a = hex(pal[i]), b = hex(pal[i + 1]);
  return a.map((c, k) => Math.round(c + (b[k] - c) * f));
}
// ---- date reale (dacă au fost injectate de scriptul de export)
const DATE = (() => { try { return window.CARTO_ANM_SNAPSHOT; } catch (e) { return null; } })();
function decod(o) {
  const bin = atob(o.b64), a = new Float32Array(bin.length);
  for (let i = 0; i < bin.length; i++) { const q = bin.charCodeAt(i); a[i] = q === 255 ? NaN : o.lo + (q / 254) * (o.hi - o.lo); }
  return { v: a, shape: o.shape };
}
const REAL = {};
if (DATE && DATE.vars) for (const [k, v] of Object.entries(DATE.vars)) REAL[k] = { ...v, A: decod(v.anual), Z: decod(v.ultima_zi) };
const GRILA = DATE ? DATE.meta.grila : null;
const areReal = () => !!(REAL[S.var] && GRILA);
// extinderea geografică a grilei reduse (marginile celulelor)
function extindereReala() {
  const [fy, fx] = GRILA.fereastra;
  return { lon0: GRILA.x_vest, lon1: GRILA.x_vest + GRILA.nx * fx * GRILA.pas_px,
           lat0: GRILA.y_nord, lat1: GRILA.y_nord - GRILA.ny * fy * GRILA.pas_px };
}
let INFO_HARTA = "";
function texturaHartaReala(it) {
  const R = REAL[S.var], itf = zi(R.frontiera);
  const [ny, nx] = R.Z.shape;
  let grila, scara, cheie;
  if (it > itf) { cheie = "viitor"; INFO_HARTA = "după frontieră: 0,0 peste tot"; }
  else if (it === itf) {
    const lo = R.ultima_zi.lo, hi = Math.max(R.ultima_zi.hi, lo + (S.var === "precipitation" ? 5 : 10));
    grila = R.Z.v; scara = [lo, hi]; cheie = "ultima";
    INFO_HARTA = `ziua reală ${R.frontiera} (scara zilei ${ro(lo, 1)} … ${ro(hi, 1)})`;
  }
  else {
    const an = +data(it).slice(0, 4), yi = R.ani.indexOf(an);
    if (yi < 0) return null;
    grila = R.A.v.subarray(yi * ny * nx, (yi + 1) * ny * nx);
    scara = CONFIG.TEXTURI.scaraAnuala[S.var]; cheie = "an" + an;
    INFO_HARTA = `media anuală reală ${an}` + (an === R.an_partial ? " (an parțial)" : "");
  }
  const key = `r|${S.var}|${cheie}`;
  if (TEX.has(key)) return TEX.get(key);
  const zero = culoare(S.var, 0, CONFIG.TEXTURI.scaraAnuala[S.var]);
  const t = canvasURL(nx, ny, (i, j) => {
    if (!grila) return zero;
    const v = grila[j * nx + i];
    return Number.isNaN(v) ? null : culoare(S.var, v, scara);
  });
  TEX.set(key, t);
  return t;
}
// fețele verticale reale: diagramă Hovmöller (media anuală pe coloane sau pe rânduri), rândul 0 = 2050
function texturaLateralaReala(ax) {
  const R = REAL[S.var], key = `rl|${S.var}|${ax}`;
  if (TEX.has(key)) return TEX.get(key);
  const [na, ny, nx] = R.A.shape, w = ax === "x" ? nx : ny, h = 90;
  const ultim = R.ani[R.ani.length - 1], scara = CONFIG.TEXTURI.scaraAnuala[S.var];
  const prof = new Map();
  for (let yi = 0; yi < na; yi++) {
    const p = new Float32Array(w);
    for (let c = 0; c < w; c++) {
      let s = 0, n = 0;
      const lungime = ax === "x" ? ny : nx;
      for (let r = 0; r < lungime; r++) {
        const v = ax === "x" ? R.A.v[yi * ny * nx + r * nx + c] : R.A.v[yi * ny * nx + c * nx + r];
        if (!Number.isNaN(v)) { s += v; n++; }
      }
      p[c] = n ? s / n : NaN;
    }
    prof.set(R.ani[yi], p);
  }
  const t = canvasURL(w, h, (i, j) => {
    const an = 2050 - j;
    if (an > ultim) return culoare(S.var, 0, scara);
    const p = prof.get(an);
    if (!p || Number.isNaN(p[i])) return null;
    return culoare(S.var, p[i], scara);
  });
  TEX.set(key, t);
  return t;
}
const gradientCSS = (v) => `linear-gradient(90deg, ${(v === "precipitation" ? BLUES : RDYLBU_R).join(", ")})`;

// relieful sintetic: arcul carpatic și Apusenii, aproximați prin câteva „vârfuri” gaussiene
const MUNTI = [[22.4, 45.2], [22.9, 45.4], [23.6, 45.4], [24.5, 45.55], [25.3, 45.45], [26.1, 45.6], [26.3, 46.0],
  [25.9, 46.5], [25.6, 47.0], [25.2, 47.4], [24.7, 47.7], [24.2, 47.75], [22.8, 46.5], [23.1, 46.65]];
function relief(lon, lat) {
  let r = 0;
  for (const [x, y] of MUNTI) r = Math.max(r, Math.exp(-(((lon - x) * 0.7) ** 2 + (lat - y) ** 2) / 0.17));
  return r;
}
function valoareZi(v, lon, lat, an, doy) {
  const s = Math.sin((2 * Math.PI * (doy - 110)) / 365.25);
  const rel = relief(lon, lat);
  const vreme = 2.5 * Math.sin(doy * 0.21 + an * 1.3) + 1.5 * Math.sin(lon * 0.9 + doy * 0.17) + 0.6 * Math.sin(lon * 3.1 + lat * 1.7);
  const tmax = 16 + 11 * s - 10 * rel + 0.9 * (46 - lat) + 0.03 * (an - 1961) + vreme;
  if (v === "max_temp") return tmax;
  if (v === "min_temp") return tmax - 9 - 2 * rel;
  return Math.max(0, 1.5 + 6 * rel + 2.5 * Math.sin(lon * 1.4 - lat * 2.1 + doy * 0.3) + 1.2 * Math.sin(doy * 0.11 + an));
}
function valoareAn(v, an, c) {
  const t = 16.4 + 0.035 * (an - 1961) + 0.7 * Math.sin(an * 1.7) + 0.4 * Math.sin(an * 0.53) + 1.2 * (c - 0.5);
  if (v === "max_temp") return t;
  if (v === "min_temp") return t - 9.4;
  return 1.65 + 0.3 * Math.sin(an * 1.3) + 0.15 * Math.sin(an * 0.4) + 0.4 * (c - 0.5);
}
function inPoligon(lon, lat, poli) {
  let in_ = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) in_ = !in_;
  }
  return in_;
}
const TEX = new Map();
const cacheSet=TEX.set.bind(TEX);TEX.set=(k,v)=>{if(!TEX.has(k)&&TEX.size>=96)TEX.delete(TEX.keys().next().value);return cacheSet(k,v);};
const TW = 243, TH = 121;            // rezoluția texturii hărții (pas ~0,04°)
let MASCA = null;
function masca() {
  if (MASCA) return MASCA;
  MASCA = new Uint8Array(TW * TH);
  for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const lon = CONFIG.X_VEST + ((i + 0.5) / TW) * CONFIG.NX * CONFIG.PAS;
    const lat = CONFIG.Y_NORD - ((j + 0.5) / TH) * CONFIG.NY * CONFIG.PAS;
    MASCA[j * TW + i] = inPoligon(lon, lat, CONFIG.CONTUR_RO) ? 1 : 0;
  }
  return MASCA;
}
function canvasURL(w, h, fn) {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"), img = ctx.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const rgb = fn(i, j);
    if (!rgb) continue;
    const o = (j * w + i) * 4;
    img.data[o] = rgb[0]; img.data[o + 1] = rgb[1]; img.data[o + 2] = rgb[2]; img.data[o + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { url: cv.toDataURL(), w, h };
}
// harta unei zile: în interiorul României valori sintetice; după frontieră 0,0 peste tot (ca în store)
function texturaHarta(it) {
  const itf = zi(CONFIG.FRONTIERE[S.var]);
  const key = `h|${S.var}|${it > itf ? "viitor" : it}`;
  if (TEX.has(key)) return TEX.get(key);
  const m = masca(), d = data(it), an = +d.slice(0, 4), doy = it - zi(`${an}-01-01`);
  const zero = culoare(S.var, 0);
  const t = canvasURL(TW, TH, (i, j) => {
    if (it > itf) return zero;
    if (!m[j * TW + i]) return null;
    const lon = CONFIG.X_VEST + ((i + 0.5) / TW) * CONFIG.NX * CONFIG.PAS;
    const lat = CONFIG.Y_NORD - ((j + 0.5) / TH) * CONFIG.NY * CONFIG.PAS;
    return culoare(S.var, valoareZi(S.var, lon, lat, an, doy));
  });
  TEX.set(key, t);
  return t;
}
// fețele verticale: media anuală sintetică (rândul 0 = 2050); după frontieră 0,0
function texturaLaterala(ax) {
  const itf = zi(CONFIG.FRONTIERE[S.var]);
  const key = `l|${S.var}|${ax}|${itf}`;
  if (TEX.has(key)) return TEX.get(key);
  const w = 48, h = 90, anF = +CONFIG.FRONTIERE[S.var].slice(0, 4);
  const t = canvasURL(w, h, (i, j) => {
    const an = 2050 - j;
    const c = ax === "x" ? i / (w - 1) : 1 - i / (w - 1);
    return culoare(S.var, an > anF ? 0 : valoareAn(S.var, an, c));
  });
  TEX.set(key, t);
  return t;
}

/* ===================================================================== desenul 3D */
const NS = "http://www.w3.org/2000/svg";
const W = 2.0, Dp = 1.0, H = 1.45;            // dimensiunile cubului în unități-lume
const VB = { w: 640, h: 470, m: 46 };
let PROJ = { s: 1, ox: 0, oy: 0 };

function css(v) { return getComputedStyle(document.getElementById("p07-app")).getPropertyValue(v).trim(); }
function cam() {
  const ct = Math.cos(S.th), st = Math.sin(S.th), cp = Math.cos(S.ph), sp = Math.sin(S.ph);
  return { ct, st, cp, sp, dir: [cp * st, sp, cp * ct] };
}
function P0(x, y, z, k) {
  x -= W / 2; y -= H / 2; z -= Dp / 2;
  const xr = x * k.ct - z * k.st, zr = x * k.st + z * k.ct;
  return [xr, -y * k.cp + zr * k.sp];
}
function P(x, y, z, k) {
  const [a, b] = P0(x, y, z, k);
  return [a * PROJ.s + PROJ.ox, b * PROJ.s + PROJ.oy];
}
function potrivire(k) {
  const pts = [];
  const f = 1 + 0.55 * S.expl;                      // vederea explodată ocupă mai mult spațiu
  for (const x of [0, W]) for (const y of [0, H]) for (const z of [0, Dp])
    pts.push(P0(W / 2 + (x - W / 2) * f, H / 2 + (y - H / 2) * f, Dp / 2 + (z - Dp / 2) * f, k));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  const s = Math.min((VB.w - 2 * VB.m) / w, (VB.h - 2 * VB.m) / h);
  PROJ = { s, ox: VB.w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s, oy: VB.h / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * s };
}
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const pts = (arr) => arr.map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");

function fete(b) {
  const { x0, x1, y0, y1, z0, z1 } = b;
  return [
    { n: [0, 1, 0], umbra: 1.0, p: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, -1, 0], umbra: 0.5, p: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]] },
    { n: [0, 0, 1], umbra: 0.82, p: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
    { n: [0, 0, -1], umbra: 0.82, p: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]] },
    { n: [1, 0, 0], umbra: 0.66, p: [[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]] },
    { n: [-1, 0, 0], umbra: 0.66, p: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
  ];
}
function imagine(g, tex, A, B, D, op) {
  const im = el("image", {
    width: tex.w, height: tex.h, preserveAspectRatio: "none", opacity: op,
    transform: `matrix(${(B[0] - A[0]) / tex.w} ${(B[1] - A[1]) / tex.w} ${(D[0] - A[0]) / tex.h} ${(D[1] - A[1]) / tex.h} ${A[0]} ${A[1]})`,
  }, g);
  im.setAttribute("href", tex.url);
  return im;
}
const lonW = (lon) => ((lon - CONFIG.X_VEST) / (CONFIG.NX * CONFIG.PAS)) * W;
const latW = (lat) => ((CONFIG.Y_NORD - lat) / (CONFIG.NY * CONFIG.PAS)) * Dp;
function contur(g, y, k, cul, w, op, dash) {
  el("polygon", {
    points: pts(CONFIG.CONTUR_RO.map(([lo, la]) => P(lonW(lo), y, latW(la), k))),
    fill: "none", stroke: cul, "stroke-width": w, "stroke-opacity": op, "stroke-linejoin": "round",
    ...(dash ? { "stroke-dasharray": dash } : {}),
  }, g);
}
const vizibila = (f, k) => f.n[0] * k.dir[0] + f.n[1] * k.dir[1] + f.n[2] * k.dir[2] > 1e-6;

function cutie(g, b, k, culoare, opac, contur) {
  for (const f of fete(b)) {
    if (!vizibila(f, k)) continue;
    el("polygon", {
      points: pts(f.p.map((q) => P(...q, k))), fill: culoare, "fill-opacity": (opac * f.umbra).toFixed(3),
      stroke: contur || culoare, "stroke-width": 1, "stroke-linejoin": "round",
    }, g);
  }
}

// conversii index → lume
const wx = (i) => (i / CONFIG.NX) * W;
const wz = (i) => (i / CONFIG.NY) * Dp;
const wy = (i) => (i / CONFIG.NT) * H;

function deseneaza(R, svg = $("cub"), cuLegenda = true) {
  svg.innerHTML = "";
  const k = cam();
  potrivire(k);
  const C = {
    ink: css("--ink"), ink2: css("--ink2"), muted: css("--muted"), line: css("--line"), accent: css("--accent"),
    warn: css("--warn"), ok: css("--ok"), useful: css("--useful"), future: css("--future"), face: css("--face"),
  };
  const g = el("g", {}, svg);
  const OUT = { x0: 0, x1: W, y0: 0, y1: H, z0: 0, z1: Dp };
  const yF = wy(R.itf + 1);
  let exagerat = false;

  const linie = (a, b, cul, w, op, dash) =>
    el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: cul, "stroke-width": w, "stroke-opacity": op, ...(dash ? { "stroke-dasharray": dash } : {}) }, g);
  let EXP = null, sT = 1;
  if (S.expl > 0) EXP = deseneazaExplodat(R, g, k, C);
  else {
  // 1. fețele vizibile ale cubului
  cutie(g, OUT, k, C.face, 0.16, "none");

  // 1b. textura ilustrativă (media anuală sintetică) pe fețele verticale vizibile
  if (CONFIG.TEXTURI.activ) {
    for (const f of fete(OUT)) {
      if (!vizibila(f, k) || f.n[1] !== 0) continue;
      const peX = f.n[2] !== 0, fz = f.n[2] > 0 ? Dp : 0, fx = f.n[0] > 0 ? W : 0;
      const A = peX ? P(0, H, fz, k) : P(fx, H, 0, k);
      const B = peX ? P(W, H, fz, k) : P(fx, H, Dp, k);
      const D = peX ? P(0, 0, fz, k) : P(fx, 0, 0, k);
      if (areReal()) {
        const e = extindereReala();
        const A2 = peX ? P(lonW(e.lon0), H, fz, k) : P(fx, H, latW(e.lat0), k);
        const B2 = peX ? P(lonW(e.lon1), H, fz, k) : P(fx, H, latW(e.lat1), k);
        const D2 = peX ? P(lonW(e.lon0), 0, fz, k) : P(fx, 0, latW(e.lat0), k);
        imagine(g, texturaLateralaReala(peX ? "x" : "z"), A2, B2, D2, CONFIG.TEXTURI.opacitateFete);
      } else {
        imagine(g, texturaLaterala(peX ? "x" : "z"), A, B, D, CONFIG.TEXTURI.opacitateFete);
      }
    }
  }
  // conturul României pe fața de sus (orientare)
  contur(g, H, k, C.ink2, 1, 0.55, "4 3");

  // 2. grila chunk-urilor pe fețele vizibile (cu pas adaptiv)
  const pasT = R.ct / CONFIG.NT * H, pasY = R.cy / CONFIG.NY * Dp, pasX = R.cx / CONFIG.NX * W;
  const salt = (pasLume) => Math.max(1, Math.ceil(5 / (pasLume * PROJ.s)));
  sT = salt(pasT); const sY = salt(pasY), sX = salt(pasX);
  R.saltT = sT;
  for (const f of fete(OUT)) {
    if (!vizibila(f, k)) continue;
    const [nx, ny, nz] = f.n;
    const fx = nx > 0 ? W : 0, fy = ny > 0 ? H : 0, fz = nz > 0 ? Dp : 0;
    if (ny !== 0) {
      for (let i = sX; i < R.nXc; i += sX) linie(P(i * pasX, fy, 0, k), P(i * pasX, fy, Dp, k), C.ink2, 0.8, 0.45);
      for (let i = sY; i < R.nYc; i += sY) linie(P(0, fy, i * pasY, k), P(W, fy, i * pasY, k), C.ink2, 0.8, 0.45);
    } else if (nz !== 0) {
      for (let i = sX; i < R.nXc; i += sX) linie(P(i * pasX, 0, fz, k), P(i * pasX, H, fz, k), C.ink2, 0.8, 0.35);
      for (let i = sT; i < R.nTc; i += sT) linie(P(0, i * pasT, fz, k), P(W, i * pasT, fz, k), C.ink2, 0.6, 0.3);
    } else {
      for (let i = sY; i < R.nYc; i += sY) linie(P(fx, 0, i * pasY, k), P(fx, H, i * pasY, k), C.ink2, 0.8, 0.35);
      for (let i = sT; i < R.nTc; i += sT) linie(P(fx, i * pasT, 0, k), P(fx, i * pasT, Dp, k), C.ink2, 0.6, 0.3);
    }
  }

  // 3. zona pre-alocată (după frontieră) pe fețele laterale vizibile
  for (const f of fete({ x0: 0, x1: W, y0: yF, y1: H, z0: 0, z1: Dp })) {
    if (!vizibila(f, k) || f.n[1] !== 0) continue;
    el("polygon", { points: pts(f.p.map((q) => P(...q, k))), fill: C.future, "fill-opacity": CONFIG.TEXTURI.activ ? 0.18 : 0.35, stroke: "none" }, g);
  }

  // 4. planul frontierei last_*_time
  el("polygon", {
    points: pts([[0, yF, 0], [W, yF, 0], [W, yF, Dp], [0, yF, Dp]].map((q) => P(...q, k))),
    fill: C.ok, "fill-opacity": 0.13, stroke: C.ok, "stroke-width": 1.6,
  }, g);

  // 5. chunk-urile citite (reale = albastru, pre-alocate = roșu); în animație: citite / în zbor / în așteptare
  if (R.nObj > 0) {
    const t0 = R.T[0] * R.ct, t1 = Math.min(R.T[1] * R.ct, CONFIG.NT);
    const tSplit = Math.min(Math.max((R.tcf + 1) * R.ct, t0), t1);
    const SP = { xa: R.X[0] * R.cx, xb: Math.min(R.X[1] * R.cx, CONFIG.NX), za: R.Y[0] * R.cy, zb: Math.min(R.Y[1] * R.cy, CONFIG.NY) };
    const box = (a, b, sp) => {
      let y0 = wy(a), y1 = wy(b);
      const minH = 0.022;
      if (y1 - y0 < minH) { const c = (y0 + y1) / 2; y0 = Math.max(0, c - minH / 2); y1 = Math.min(H, y0 + minH); exagerat = true; }
      return { x0: wx(sp.xa), x1: wx(sp.xb), z0: wz(sp.za), z1: wz(sp.zb), y0, y1 };
    };
    // stil: "lit" = citit, "fly" = cerere în curs, "ghost" = încă necitit
    const seg = (a, b, sp, stil) => {
      if (b <= a) return;
      if (stil === "ghost") { cutie(g, box(a, b, sp), k, C.ink2, 0.05, C.line); return; }
      const op = stil === "fly" ? 0.28 : 0.62, cont = stil === "fly" ? "#e8a700" : null;
      const m = Math.min(Math.max(tSplit, a), b);
      if (m > a) cutie(g, box(a, m, sp), k, C.accent, op, cont || C.accent);
      if (b > m) cutie(g, box(m, b, sp), k, C.warn, op, cont || C.warn);
    };
    const A = R.anim;
    if (!A) {
      seg(t0, t1, SP, "lit");
    } else if (R.nT > 1) {                         // baleiaj în timp (serii, sezoane)
      const td = t0 + ((t1 - t0) * A.done) / R.nObj, tf = t0 + ((t1 - t0) * A.fly) / R.nObj;
      seg(tf, t1, SP, "ghost"); seg(t0, td, SP, "lit"); seg(td, tf, SP, "fly");
    } else if (R.nS <= 64) {                        // celule spațiale (harta unei zile)
      const nx = R.X[1] - R.X[0];
      for (let q = 0; q < R.nS; q++) {
        const r = R.Y[0] + Math.floor(q / nx), c = R.X[0] + (q % nx);
        const sp = { xa: c * R.cx, xb: Math.min((c + 1) * R.cx, CONFIG.NX), za: r * R.cy, zb: Math.min((r + 1) * R.cy, CONFIG.NY) };
        seg(t0, t1, sp, q < A.done ? "lit" : q < A.fly ? "fly" : "ghost");
      }
    } else {                                        // multe celule: baleiaj vest → est
      const xd = SP.xa + ((SP.xb - SP.xa) * A.done) / R.nObj, xf = SP.xa + ((SP.xb - SP.xa) * A.fly) / R.nObj;
      seg(t0, t1, { ...SP, xa: xf }, "ghost"); seg(t0, t1, { ...SP, xb: xd }, "lit"); seg(t0, t1, { ...SP, xa: xd, xb: xf }, "fly");
    }
  }

  // 5b. scenariul A: harta zilei și conturul României în planul zilei.
  //     În animație, harta apare doar în celulele (chunk-urile) deja descărcate.
  if (S.sc === "harta") {
    const yM = wy(R.U.t[0] + 0.5);
    const rect = (xa, xb, za, zb) => pts([[wx(xa), yM, wz(za)], [wx(xb), yM, wz(za)], [wx(xb), yM, wz(zb)], [wx(xa), yM, wz(zb)]].map((q) => P(...q, k)));
    const A = R.anim;
    let gh = g, zbor = [];
    if (A) {
      const id = "clip-harta-" + svg.id;
      const cp = el("clipPath", { id }, el("defs", {}, g));
      const nx = R.X[1] - R.X[0];
      if (R.nS <= 64) {
        for (let q = 0; q < R.nS; q++) {
          const r = R.Y[0] + Math.floor(q / nx), c = R.X[0] + (q % nx);
          const pr = rect(c * R.cx, Math.min((c + 1) * R.cx, CONFIG.NX), r * R.cy, Math.min((r + 1) * R.cy, CONFIG.NY));
          if (q < A.done) el("polygon", { points: pr }, cp);
          else if (q < A.fly) zbor.push(pr);
        }
      } else {
        const xa = R.X[0] * R.cx, xb = Math.min(R.X[1] * R.cx, CONFIG.NX);
        const xd = xa + ((xb - xa) * A.done) / R.nObj, xf = xa + ((xb - xa) * A.fly) / R.nObj;
        if (xd > xa) el("polygon", { points: rect(xa, xd, 0, CONFIG.NY) }, cp);
        if (xf > xd) zbor.push(rect(xd, xf, 0, CONFIG.NY));
      }
      gh = el("g", { "clip-path": `url(#${id})` }, g);
    }
    if (CONFIG.TEXTURI.activ) {
      const tr = areReal() ? texturaHartaReala(R.it) : null;
      if (tr) {
        const e = extindereReala();
        imagine(gh, tr, P(lonW(e.lon0), yM, latW(e.lat0), k), P(lonW(e.lon1), yM, latW(e.lat0), k),
          P(lonW(e.lon0), yM, latW(e.lat1), k), CONFIG.TEXTURI.opacitateHarta);
      } else {
        INFO_HARTA = "";
        imagine(gh, texturaHarta(R.it), P(0, yM, 0, k), P(W, yM, 0, k), P(0, yM, Dp, k), CONFIG.TEXTURI.opacitateHarta);
      }
    }
    contur(gh, yM, k, C.ink, 1.4, 0.95);
    if (A) contur(g, yM, k, C.ink2, 1, 0.5, "4 3");     // conturul complet, discret, ca reper
    for (const pr of zbor)                               // cererile în curs: conturate peste hartă
      el("polygon", { points: pr, fill: "#ffd400", "fill-opacity": 0.18, stroke: "#e8a700", "stroke-width": 2 }, g);
  }

  // 5c. inspectorul: chunk-ul de sub mouse
  if (svg.id === "cub" && HOVER && !R.anim) {
    const hb = cutieChunk(HOVER.t, HOVER.r, HOVER.c, R);
    for (const f of fete(hb)) {
      if (!vizibila(f, k)) continue;
      el("polygon", { points: pts(f.p.map((q) => P(...q, k))), fill: "#ffd400", "fill-opacity": 0.45, stroke: "#b8860b", "stroke-width": 2 }, g);
    }
  }
  }   // sfârșitul ramurii „cub întreg”

  // 6. datele utile (ce am cerut de fapt)
  const U = R.U;
  if (EXP) { /* în vederea explodată, liniile și punctele nu mai corespund pozițiilor */ }
  else if (S.sc === "serie" || S.sc === "punct") {
    const px = wx(U.x[0] + 0.5), pz = wz(U.y[0] + 0.5);
    if (S.sc === "serie") {
      const a = P(px, wy(U.t[0]), pz, k), b = P(px, wy(U.t[1]), pz, k);
      el("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: C.useful, "stroke-width": 3.2, "stroke-linecap": "round" }, g);
    } else {
      const a = P(px, wy(U.t[0] + 0.5), pz, k);
      el("circle", { cx: a[0], cy: a[1], r: 4.5, fill: C.useful, stroke: C.ink, "stroke-width": 1 }, g);
    }
  } else {
    let y0 = wy(U.t[0]), y1 = wy(U.t[1]);
    const bU = { x0: wx(U.x[0]), x1: wx(U.x[1]), z0: wz(U.y[0]), z1: wz(U.y[1]), y0, y1: Math.max(y1, y0 + 0.004) };
    for (const f of fete(bU)) {
      if (!vizibila(f, k)) continue;
      el("polygon", { points: pts(f.p.map((q) => P(...q, k))), fill: C.useful, "fill-opacity": S.sc === "harta" ? 0 : 0.28, stroke: C.useful, "stroke-width": 1.8 }, g);
    }
  }

  // 7. punctul pe fața de sus
  if (!EXP) {
    const px = wx(R.ix + 0.5), pz = wz(R.iy + 0.5);
    const a = P(px, H, pz, k), b0 = P(px, 0, pz, k);
    el("line", { x1: a[0], y1: a[1], x2: b0[0], y2: b0[1], stroke: C.ink2, "stroke-width": 1, "stroke-dasharray": "3 4", "stroke-opacity": 0.7 }, g);
    el("circle", { cx: a[0], cy: a[1], r: 4, fill: "#ffd400", stroke: C.ink, "stroke-width": 1.2 }, g);
    const t = el("text", { x: a[0] + 7, y: a[1] - 7, "font-size": 12.5, "font-weight": 650, fill: C.ink }, g);
    t.textContent = S.nume;
  }

  // 8. muchiile cubului
  const muchii = [
    [[0, 0, 0], [W, 0, 0]], [[0, 0, Dp], [W, 0, Dp]], [[0, H, 0], [W, H, 0]], [[0, H, Dp], [W, H, Dp]],
    [[0, 0, 0], [0, 0, Dp]], [[W, 0, 0], [W, 0, Dp]], [[0, H, 0], [0, H, Dp]], [[W, H, 0], [W, H, Dp]],
    [[0, 0, 0], [0, H, 0]], [[W, 0, 0], [W, H, 0]], [[0, 0, Dp], [0, H, Dp]], [[W, 0, Dp], [W, H, Dp]],
  ];
  if (!EXP) for (const [a, b] of muchii) linie(P(...a, k), P(...b, k), C.ink2, 1.1, 0.75);

  // 9. etichete pe axe
  const colturi = [[0, 0], [W, 0], [0, Dp], [W, Dp]].map(([x, z]) => ({ x, z, p: P(x, 0, z, k) }));
  const st = colturi.reduce((m, c) => (c.p[0] < m.p[0] ? c : m));
  const txt = (p, s, opts = {}) => {
    const t = el("text", { x: p[0], y: p[1], "font-size": opts.size || 12, fill: opts.fill || C.ink2, "text-anchor": opts.anchor || "end", "font-weight": opts.weight || 400 }, g);
    t.textContent = s;
  };
  const off = (p, dx, dy) => [p[0] + dx, p[1] + dy];
  if (!EXP) txt(off(P(st.x, 0, st.z, k), -8, 4), CONFIG.T0.slice(0, 4));
  if (!EXP) txt(off(P(st.x, H, st.z, k), -8, 4), "2050");
  if (!EXP) txt(off(P(st.x, yF, st.z, k), -8, 4), "frontiera " + CONFIG.FRONTIERE[S.var], { fill: C.ok, weight: 650 });
  txt(off(P(st.x, H * 0.38, st.z, k), -8, 4), "timp ↑", { size: 12.5, fill: C.ink });
  const sus = P(W / 2, H, 0, k);
  if (!EXP) txt(off(sus, 0, -8), "Nord (y = 0)", { anchor: "middle", size: 11.5 });
  txt([VB.w / 2, VB.h - 8], "longitudine x →   ·   latitudine y: de la Nord (spate) la Sud (față)", { anchor: "middle", size: 11.5 });

  svg.setAttribute("aria-label",
    `Cubul de date cu layout-ul ${R.L.nume}: ${R.nObj} obiecte necesare (model) pentru interogarea curentă`);

  // legenda
  if (!cuLegenda) return;
  $("legenda").innerHTML =
    `<span><span class="sw" style="background:${C.accent}"></span>chunk-uri necesare (simulate)</span>` +
    (R.viitorObj ? `<span><span class="sw" style="background:${C.warn}"></span>chunk-uri complet pre-alocate necesare (simulate)</span>` : "") +
    `<span><span class="sw" style="background:${C.useful}"></span>datele cerute de fapt</span>` +
    `<span><span class="sw" style="background:${C.ok}"></span>frontiera last_*_time</span>` +
    `<span><span class="sw" style="background:${C.future};opacity:.6"></span>zona pre-alocată până în 2050</span>` +
    (CONFIG.TEXTURI.activ ? (areReal()
      ? `<span><span class="sw" style="width:56px;background:${gradientCSS(S.var)}"></span><b>date reale ANM</b> · fețe: media anuală ` +
        `${CONFIG.TEXTURI.scaraAnuala[S.var].join(" … ")} ${S.var === "precipitation" ? "mm/zi" : "°C"}` +
        (S.sc === "harta" && INFO_HARTA ? ` · plan: ${INFO_HARTA}` : "") + `</span>`
      : `<span><span class="sw" style="width:56px;background:${gradientCSS(S.var)}"></span>` +
        `culori ilustrative (date sintetice) ${CONFIG.TEXTURI.scara[S.var].join(" … ")} ${S.var === "precipitation" ? "mm" : "°C"}</span>`) : "") +
    `<span><span class="sw" style="background:none;border:1.5px dashed ${C.ink2}"></span>conturul României</span>` +
    (EXP ? `<span>· vedere explodată: o cărămidă = ${EXP.gT} × ${EXP.gY} × ${EXP.gX} chunk-uri (timp × y × x), ${ro(EXP.n)} cărămizi</span>` :
      sT > 1 ? `<span>· o linie orizontală = ${sT} chunk-uri de timp</span>` : "") +
    (exagerat ? `<span>· grosimea în timp e exagerată ca să fie vizibilă</span>` : "");
}

/* ===================================================================== panoul de cifre */
function afiseaza(R) {
  const v = S.var;
  $("m-obj").textContent = ro(R.nObj);
  $("m-obj-n").textContent = `${R.nT} în timp × ${R.nS} în spațiu` + (R.viitorObj ? ` · ${ro(R.viitorObj)} pre-alocate` : "");
  if (R.mb !== null) {
    $("m-mb").textContent = fmtMB(R.mb);
    $("m-mb-n").textContent = "din medianele măsurate pe sector";
  } else {
    $("m-mb").textContent = "≈ " + fmtMB(R.mbEst);
    $("m-mb-n").textContent = `estimat: layout ipotetic, compresie presupusă ${ro(CONFIG.RAPORT_PRESUPUS, 1)} : 1`;
  }
  $("m-raw").textContent = fmtB(R.raw);
  $("m-raw-n").textContent = `${ro(R.nObj)} × ${fmtB(R.rawChunk)} / chunk`;
  $("m-use").textContent = fmtB(R.util);
  $("m-use-n").textContent = R.util === 4 ? "o singură valoare float32" : ro(R.util / 4) + " valori float32";
  const amp = R.raw / R.util;
  $("m-amp").textContent = "×" + ro(amp, amp < 10 ? 1 : 0);
  $("m-amp").className = "val" + (amp > 1000 ? " bad" : "");
  $("m-t").textContent = "≈ " + fmtT(R.timp);
  const mas = R.L.real ? CONFIG.MASURAT[S.sc] : null;
  $("m-t-n").textContent = `model: ${CONFIG.CONCURENTA} cereri simulate simultane, ${CONFIG.DEBIT_MBs} MB/s` +
    (mas ? ` · măsurat: ${mas}` : R.L.real ? "" : " · estimare");
  $("m-keys").textContent = R.chei.join("  ");

  // explicația scenariului
  const L = R.L;
  let e = "";
  if (S.sc === "punct") {
    e = `Pentru <b>o singură valoare</b> (${S.nume}, ${S.data}) modelul necesită transferul și decodarea unui chunk întreg de <b>${fmtB(R.rawChunk)}</b>. În layout-ul comprimat demonstrat se decodează chunk-ul necesar; alte configurații, inclusiv sharding Zarr v3, pot permite acces separat la inner chunks.`;
  } else if (S.sc === "harta") {
    e = `Harta unei zile taie cubul <b>orizontal</b>: ${ro(R.nObj)} obiecte, fiecare cu ${R.ct} zile, din care folosim una singură.`;
  } else if (S.sc === "sezon") {
    e = `Sezonul ${R.extra.a} → ${R.extra.b} (${R.extra.zile} zile) pe sectorul ${R.extra.sector} atinge <b>${R.nT} chunk-uri de timp</b>. ` +
      (R.nT > 1 ? `Granițele de ${R.ct} zile nu se aliniază cu anotimpurile.` : "");
  } else {
    e = `Seria ${S.filtru ? "până la frontieră" : "1961–2050"} pentru un pixel taie cubul <b>vertical</b>: ${ro(R.nT)} chunk-uri de timp ` +
      `pentru ${ro(R.util / 4)} valori.` + (L.real ? ` Măsurat la București: 1,61 GB în ~145 s.` : "");
  }
  e += L.real ? "" : ` <i>Layout ipotetic: același cub rearanjat în chunk-uri [${L.ch.join(", ")}].</i>`;
  $("m-expl").innerHTML = e;

  // avertismente
  const w = [];
  if (!R.inGrila) w.push("Punctul este în afara grilei: s-a folosit cel mai apropiat pixel de pe margine.");
  if ((S.sc === "harta" || S.sc === "punct") && R.it > R.itf) {
    const start=Math.floor(R.it/R.ct)*R.ct,end=Math.min(CONFIG.NT-1,start+R.ct-1);
    const date=i=>new Date(Date.parse(CONFIG.T0)+i*86400000).toISOString().slice(0,10);
    w.push(`Ziua ${S.data} este după frontiera ${CONFIG.FRONTIERE[v]}: ziua selectată nu are observații și folosește fill <b>0,0</b>.`);
    w.push(start<=R.itf?`Chunk-ul temporal ${date(start)} – ${date(end)} este mixt: include date istorice până la frontieră și fill după ea; nu este integral zero.`:`Chunk-ul temporal ${date(start)} – ${date(end)} este complet după frontieră: conține numai fill, nu observații.`);
  }
  if (S.sc === "sezon" && zi(anotimp(S.an, S.anot)[1]) > R.itf)
    w.push(`Sezonul depășește frontiera ${CONFIG.FRONTIERE[v]}: zilele de după ea se citesc ca <b>0,0</b>.`);
  if (S.sc === "serie" && !S.filtru) {
    const fr = (R.itf + 1) / CONFIG.NT;
    const futureMB=R.L.real?R.viitorObj*CONFIG.VIITOR_MB:R.viitorObj*R.rawChunk/1e6/CONFIG.RAPORT_PRESUPUS;
    let t = `Fără filtru, modelul include ${ro(R.viitorObj)} chunk-uri complet pre-alocate (${fmtMB(futureMB)} transfer modelat numai pentru ele), ` +
      `dar ${ro(CONFIG.NT - R.itf - 1)} zile de 0,0 intră în calcul: în exemplul fără alte zile lipsă, media devine ≈ ${ro(fr * 100, 1)} % din media observațiilor.`;
    if (v === "max_temp" && S.nume === "București")
      t += ` Măsurat: <b>${ro(CONFIG.MEDIE_BUC.corecta, 2)} °C → ${ro(CONFIG.MEDIE_BUC.falsa, 2)} °C</b>.`;
    if (v === "precipitation") t += " La precipitații 0,0 e o valoare validă, așa că eroarea nu se vede în date.";
    w.push(t);
  }
  const fr = Object.values(CONFIG.FRONTIERE);
  if (new Set(fr).size > 1 && (S.sc === "serie"))
    w.push(`Frontierele diferă între variabile (${Object.entries(CONFIG.FRONTIERE).map(([a, b]) => a + " " + b).join(", ")}). Pentru combinații folosiți minimul.`);
  $("m-warn").innerHTML = w.join("<br>");
  $("m-warn").classList.toggle("hidden", w.length === 0);

  // formula adresării directe (slide 9)
  const lonTxt = ro(S.lon, 4), latTxt = ro(S.lat, 4);
  const itp = Math.min(Math.max(zi(S.data), 0), CONFIG.NT - 1);
  const key = `${v}/${Math.floor(itp / R.ct)}.${Math.floor(R.iy / R.cy)}.${Math.floor(R.ix / R.cx)}`;
  $("tab-formula").innerHTML = [
    ["Punctul", `${S.nume}: ${lonTxt}°E, ${latTxt}°N · data ${S.data}`],
    ["i<sub>t</sub> (zile)", `${S.data} − ${CONFIG.T0} = <b>${ro(itp)}</b>`],
    ["i<sub>y</sub> (rând)", `⌊(${ro(CONFIG.Y_NORD, 2)} − ${latTxt}) / 0,01⌋ = <b>${R.iy}</b>`],
    ["i<sub>x</sub> (coloană)", `⌊(${lonTxt} − ${ro(CONFIG.X_VEST, 2)}) / 0,01⌋ = <b>${R.ix}</b>`],
    ["Chunk [" + [R.ct, R.cy, R.cx].join(", ") + "]",
      `⌊${itp}/${R.ct}⌋ . ⌊${R.iy}/${R.cy}⌋ . ⌊${R.ix}/${R.cx}⌋ = <b>${Math.floor(itp / R.ct)}.${Math.floor(R.iy / R.cy)}.${Math.floor(R.ix / R.cx)}</b>`],
    ["Intervalul chunk-ului", `${data(Math.floor(itp / R.ct) * R.ct)} → ${data(Math.min((Math.floor(itp / R.ct) + 1) * R.ct, CONFIG.NT) - 1)}`],
    ["URL", R.L.real ? `<span class="mono">${CONFIG.URL}/${key}</span>` : `<i>layout ipotetic: obiectul nu există pe server</i>`],
  ].map(([a, b]) => `<tr><td>${a}</td><td${a === "URL" ? ' class="mono"' : ""}>${b}</td></tr>`).join("");
}

/* ===================================================================== inversarea proiecției (ortografică) */
// Punctul de pe ecran (coordonate SVG) → (x, z) în lume, pentru un nivel de timp y dat.
function inversP(X, Y, y, k) {
  const a = (X - PROJ.ox) / PROJ.s, b = (Y - PROJ.oy) / PROJ.s;
  const bb = (b + (y - H / 2) * k.cp) / k.sp;
  return [k.ct * a + k.st * bb + W / 2, -k.st * a + k.ct * bb + Dp / 2];
}
function infasuratoare(ps) {                      // înfășurătoarea convexă (monotone chain)
  const p = ps.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function inPoligonEcran(x, y, poli) {
  let c = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const [xi, yi] = poli[i], [xj, yj] = poli[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/* ===================================================================== 4. inspectorul de chunk */
let HOVER = null;                                  // {t, r, c} chunk-ul de sub mouse (doar cubul principal)
const ACOPERIRE = CONFIG.ACOPERIRE;
function cutieChunk(t, r, c, R) {                  // geometria unui chunk (cu grosime minimă vizibilă)
  let y0 = wy(t * R.ct), y1 = wy(Math.min((t + 1) * R.ct, CONFIG.NT));
  if (y1 - y0 < 0.022) { const m = (y0 + y1) / 2; y0 = Math.max(0, m - 0.011); y1 = Math.min(H, y0 + 0.022); }
  return { x0: wx(c * R.cx), x1: wx(Math.min((c + 1) * R.cx, CONFIG.NX)), z0: wz(r * R.cy), z1: wz(Math.min((r + 1) * R.cy, CONFIG.NY)), y0, y1 };
}
function chunkSubMouse(R, X, Y) {
  if (!R.nObj || R.anim || S.expl > 0) return null;
  const k = cam();
  const nx = R.X[1] - R.X[0];
  const t0 = R.T[0] * R.ct, t1 = Math.min(R.T[1] * R.ct, CONFIG.NT);
  if (R.nS > 64) {                                 // multe celule (layout C): rezolvăm planul feliei
    const yM = (wy(t0) + wy(t1)) / 2, [x, z] = inversP(X, Y, yM, k);
    const c = Math.floor((x / W) * CONFIG.NX / R.cx), r = Math.floor((z / Dp) * CONFIG.NY / R.cy);
    if (c < R.X[0] || c >= R.X[1] || r < R.Y[0] || r >= R.Y[1]) return null;
    return { t: R.T[0], r, c };
  }
  let best = null;
  for (let q = 0; q < R.nS; q++) {
    const r = R.Y[0] + Math.floor(q / nx), c = R.X[0] + (q % nx);
    const b = { ...cutieChunk(R.T[0], r, c, R), y1: cutieChunk(R.T[1] - 1, r, c, R).y1 };
    const colt = [];
    for (const x of [b.x0, b.x1]) for (const y of [b.y0, b.y1]) for (const z of [b.z0, b.z1]) colt.push(P(x, y, z, k));
    if (!inPoligonEcran(X, Y, infasuratoare(colt))) continue;
    const xc = (b.x0 + b.x1) / 2, zc = (b.z0 + b.z1) / 2;
    const ad = xc * k.dir[0] + zc * k.dir[2];
    if (best && best.ad >= ad) continue;
    let t = R.T[0];
    if (R.nT > 1) {                                 // poziția pe verticală → chunk-ul de timp
      const A = P(xc, b.y0, zc, k), B = P(xc, b.y1, zc, k);
      const vx = B[0] - A[0], vy = B[1] - A[1];
      const f = Math.min(1, Math.max(0, ((X - A[0]) * vx + (Y - A[1]) * vy) / (vx * vx + vy * vy)));
      t = Math.min(R.T[1] - 1, R.T[0] + Math.floor(f * R.nT));
    }
    best = { t, r, c, ad };
  }
  return best;
}
function infoChunk(h, R) {
  const t0 = h.t * R.ct, t1 = Math.min((h.t + 1) * R.ct, CONFIG.NT) - 1;
  const ys = [h.r * R.cy, Math.min((h.r + 1) * R.cy, CONFIG.NY)], xs = [h.c * R.cx, Math.min((h.c + 1) * R.cx, CONFIG.NX)];
  const viitor = h.t > R.tcf;
  const ov = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
  const util = ov([t0, t1 + 1], R.U.t) * ov(ys, R.U.y) * ov(xs, R.U.x);
  const val = (t1 - t0 + 1) * (ys[1] - ys[0]) * (xs[1] - xs[0]);
  let comp = null;
  if (R.L.real) comp = viitor ? CONFIG.VIITOR_MB : CONFIG.MEDIANE_MB[S.var][h.r][h.c];
  const sectorReal = R.L.real ? `${h.r},${h.c}` : null;
  return {
    cheie: `${S.var}/${h.t}.${h.r}.${h.c}`, de: data(t0), pana: data(t1), viitor, util, val, comp,
    raw: val * 4, sectorReal, acop: sectorReal ? ACOPERIRE[h.r][h.c] : null,
    lon: [CONFIG.X_VEST + xs[0] * CONFIG.PAS, CONFIG.X_VEST + xs[1] * CONFIG.PAS],
    lat: [CONFIG.Y_NORD - ys[1] * CONFIG.PAS, CONFIG.Y_NORD - ys[0] * CONFIG.PAS], ys, xs, t0, t1,
  };
}
function arataTooltip(ev, R) {
  const tip = $("tip");
  if (!HOVER) { tip.classList.add("hidden"); return; }
  const i = infoChunk(HOVER, R);
  tip.innerHTML = `<b class="mono">${i.cheie}</b><br>${i.de} → ${i.pana}` +
    `<br>${ro(i.lon[0], 2)}–${ro(i.lon[1], 2)}°E · ${ro(i.lat[0], 2)}–${ro(i.lat[1], 2)}°N` +
    (i.comp !== null ? `<br>pe server: <b>${fmtMB(i.comp)}</b>${i.viitor ? " (numai 0,0)" : " (mediana sectorului)"}` : `<br>pe server: ≈ ${fmtB(i.raw / CONFIG.RAPORT_PRESUPUS)} (estimat)`) +
    `<br>volum modelat: ${fmtB(i.raw)}` + (i.acop !== null ? ` · pixeli valizi: ${ro(i.acop, 1)} %` : "") +
    `<br>folosit: <b>${ro(i.util)}</b> din ${ro(i.val)} valori` +
    `<br><span class="tipclick">click pentru a deschide chunk-ul</span>`;
  const vp = $("cub").closest(".viewport").getBoundingClientRect();
  let x = ev.clientX - vp.left + 16, y = ev.clientY - vp.top + 12;
  tip.classList.remove("hidden");
  if (x + tip.offsetWidth > vp.width - 8) x = ev.clientX - vp.left - tip.offsetWidth - 16;
  tip.style.left = x + "px"; tip.style.top = y + "px";
}
function deschideChunk(h, R) {
  const i = infoChunk(h, R);
  const NTc = i.t1 - i.t0 + 1, NYc = i.ys[1] - i.ys[0], NXc = i.xs[1] - i.xs[0];
  // desen izometric fix al chunk-ului, la scara reală a dimensiunilor lui
  const s = 270 / Math.max(NXc, NYc * 1.4, NTc * 1.6);
  const L = NXc * s, D = NYc * s * 0.9, Hh = Math.max(NTc * s * 1.1, 30);
  const ox = 115, oy = 40 + Hh;
  const iso = (x, z, y) => [ox + x * L + z * D * 0.55, oy + z * D * 0.45 - y * Hh];   // x,z,y ∈ [0,1]
  const pol = (ps, f, st, extra = "") => `<polygon points="${ps.map((p) => p.join(",")).join(" ")}" fill="${f}" stroke="${st}" ${extra}/>`;
  const fata = (x0, x1, z0, z1, y0, y1, f, st, op) =>
    pol([iso(x0, z1, y0), iso(x1, z1, y0), iso(x1, z1, y1), iso(x0, z1, y1)], f, st, `fill-opacity="${op}"`) +
    pol([iso(x1, z0, y0), iso(x1, z1, y0), iso(x1, z1, y1), iso(x1, z0, y1)], f, st, `fill-opacity="${op * 0.8}"`) +
    pol([iso(x0, z0, y1), iso(x1, z0, y1), iso(x1, z1, y1), iso(x0, z1, y1)], f, st, `fill-opacity="${op * 1.1}"`);
  const ac = css("--accent"), us = css("--useful"), ink = css("--ink2"), wr = css("--warn");
  let g = fata(0, 1, 0, 1, 0, 1, i.viitor ? wr : ac, i.viitor ? wr : ac, 0.18);
  const fx = (v) => (v - i.xs[0]) / NXc, fz = (v) => (v - i.ys[0]) / NYc, fy = (v) => (v - i.t0) / NTc;
  const ux = [Math.max(R.U.x[0], i.xs[0]), Math.min(R.U.x[1], i.xs[1])];
  const uz = [Math.max(R.U.y[0], i.ys[0]), Math.min(R.U.y[1], i.ys[1])];
  const ut = [Math.max(R.U.t[0], i.t0), Math.min(R.U.t[1], i.t1 + 1)];
  if (i.util > 0) {
    const X0 = fx(ux[0]), X1 = fx(ux[1]), Z0 = fz(uz[0]), Z1 = fz(uz[1]), Y0 = fy(ut[0]), Y1 = fy(ut[1]);
    if (NXc * NYc > 1 && (ux[1] - ux[0]) * (uz[1] - uz[0]) === 1) {            // un singur pixel: linie sau punct
      const a = iso((X0 + X1) / 2, (Z0 + Z1) / 2, Y0), b = iso((X0 + X1) / 2, (Z0 + Z1) / 2, Math.max(Y1, Y0 + 0.012));
      g += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${us}" stroke-width="3" stroke-linecap="round"/>`;
      g += `<circle cx="${b[0]}" cy="${b[1]}" r="4" fill="${us}" stroke="${css("--ink")}"/>`;
    } else {
      g += fata(X0, X1, Z0, Z1, Y0, Math.max(Y1, Y0 + 0.012), us, us, 0.75);
    }
  }
  const pct = (100 * i.util) / i.val;
  $("modal-body").innerHTML =
    `<h3 class="mono">${i.cheie}</h3>` +
    `<p class="msub">${i.de} → ${i.pana} · ${ro(i.lon[0], 2)}–${ro(i.lon[1], 2)}°E · ${ro(i.lat[0], 2)}–${ro(i.lat[1], 2)}°N</p>` +
    `<svg viewBox="0 0 600 ${oy + D * 0.45 + 40}" class="msvg">${g}` +
    `<text x="${ox + L / 2}" y="${oy + D * 0.45 + 24}" text-anchor="middle" font-size="12" fill="${ink}">x: ${NXc} coloane</text>` +
    `<text x="${ox - 10}" y="${oy - Hh / 2}" text-anchor="end" font-size="12" fill="${ink}">timp: ${NTc} zile</text>` +
    `<text x="${ox + L + D * 0.55 + 6}" y="${oy + D * 0.2}" font-size="12" fill="${ink}">y: ${NYc} rânduri</text></svg>` +
    `<div class="mstat"><div><span>valori în chunk</span><b>${ro(i.val)}</b></div>` +
    `<div><span>valori folosite</span><b style="color:${us}">${ro(i.util)}</b></div>` +
    `<div><span>proporție folosită</span><b>${pct < 0.01 ? ro(pct, 4) : ro(pct, 2)} %</b></div>` +
    `<div><span>transfer modelat</span><b>${i.comp !== null ? fmtMB(i.comp) : "≈ " + fmtB(i.raw / CONFIG.RAPORT_PRESUPUS)}</b></div>` +
    `<div><span>volum de decomprimat</span><b>${fmtB(i.raw)}</b></div>` +
    `<div><span>pixeli valizi în sector</span><b>${i.acop !== null ? ro(i.acop, 1) + " %" : "–"}</b></div></div>` +
    (i.viitor ? `<p class="warn">Chunk pre-alocat: există pe server, dar conține numai 0,0.</p>` : "") +
    `<p class="msub">În layout-ul comprimat demonstrat, partea solicitată necesită decodarea blocului; alte configurații Zarr pot avea acces separat la inner chunks.</p>` +
    (R.L.real ? `<p class="mono murl">${CONFIG.URL}/${i.cheie}</p>` : `<p class="msub"><i>Layout ipotetic: obiectul nu există pe server.</i></p>`);
  $("modal").classList.remove("hidden");$("modal").setAttribute("role","dialog");$("modal").setAttribute("aria-modal","true");$("modal").setAttribute("aria-label","Chunk inspector");$("modal-x").focus();
}

/* ===================================================================== 5. glisorul de timp */
let JOC = 0;                                        // id-ul animației „▶ timp”
function sincronizeazaGlisor() {
  const it = Math.min(Math.max(zi(S.data), 0), CONFIG.NT - 1);
  $("rng-zi").value = it;
  const fr = zi(CONFIG.FRONTIERE[S.var]);
  $("rng-lbl").innerHTML = `<b>${S.data}</b> · chunk de timp ${Math.floor(it / CONFIG.LAYOUTS[0].ch[0])}` +
    (it > fr ? ` · <span style="color:var(--warn)">după frontieră: 0,0</span>` : "");
}
function joacaTimp() {
  if (JOC) { cancelAnimationFrame(JOC); JOC = 0; $("btn-joc").textContent = "▶ timp"; return; }
  opreste();
  $("btn-joc").textContent = "■ timp";
  let ultim = 0;
  const pas = (now) => {
    if (now - ultim > 110) {                        // ~9 cadre/s, un an pe cadru
      ultim = now;
      let it = zi(S.data) + 365;
      if (it >= CONFIG.NT) it = 0;
      S.data = data(it); $("in-data").value = S.data;
      actualizeaza();
    }
    JOC = requestAnimationFrame(pas);
  };
  JOC = requestAnimationFrame(pas);
}
function opresteJoc() { if (JOC) { cancelAnimationFrame(JOC); JOC = 0; $("btn-joc").textContent = "▶ timp"; } }

/* ===================================================================== 6. mini-graficul seriei */
function miniGrafic(R) {
  const box = $("mini");
  if (S.sc !== "serie") { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  const v = S.var, unit = v === "precipitation" ? "mm/zi" : "°C";
  const fr = CONFIG.FRONTIERE[v], anF = +fr.slice(0, 4);
  const real = areReal() && REAL[v].orase && REAL[v].orase[S.nume];
  let ani, val, corecta, falsa, sursa;
  if (real) {
    const o = REAL[v].orase[S.nume];
    ani = REAL[v].ani; val = o.anual; corecta = o.medie_corecta;
    falsa = o.medie_falsa ?? (corecta * (zi(fr) + 1)) / CONFIG.NT;
    sursa = `date reale ANM · ${S.nume}` + (REAL[v].ani[0] > 1961 ? ` · doar ${ani[0]}–${anF} (export de test)` : "");
  } else {
    ani = []; val = [];
    for (let a = 1961; a <= anF; a++) { ani.push(a); val.push(valoareAn(v, a, 0.5)); }
    corecta = val.reduce((s, x) => s + x, 0) / val.length;
    falsa = (corecta * (zi(fr) + 1)) / CONFIG.NT;
    sursa = areReal() ? "ilustrativ (localitatea nu e în exportul de date reale)" : "ilustrativ (date sintetice)";
  }
  const Wd = 520, Hd = 190, m = { l: 38, r: 10, t: 14, b: 22 };
  const xmin = 1961, xmax = 2050;
  const vs = val.filter((x) => x !== null);
  const span = Math.max(...vs) - Math.min(...vs);
  const ymin = (S.filtru ? Math.min(...vs) : Math.min(0, ...vs)) - 0.15 * span - 0.3;
  const ymax = Math.max(...vs, corecta) + 0.25 * span + 0.3;
  const X = (a) => m.l + ((a - xmin) / (xmax - xmin)) * (Wd - m.l - m.r);
  const Y = (y) => Hd - m.b - ((y - ymin) / (ymax - ymin)) * (Hd - m.t - m.b);
  const ink2 = css("--ink2"), line = css("--line"), ac = css("--accent"), ok = css("--ok"), wr = css("--warn"), fut = css("--future");
  let s = `<rect x="${X(anF + 0.5)}" y="${m.t}" width="${X(xmax) - X(anF + 0.5)}" height="${Hd - m.t - m.b}" fill="${fut}" fill-opacity="0.18"/>`;
  for (const a of [1961, 1980, 2000, 2020, 2050])
    s += `<text x="${X(a)}" y="${Hd - 6}" font-size="10.5" fill="${ink2}" text-anchor="${a === 2050 ? "end" : a === 1961 ? "start" : "middle"}">${a}</text>`;
  const pasY = ymax - ymin > 12 ? 5 : ymax - ymin > 5 ? 2 : 1;
  for (let y = Math.ceil(ymin / pasY) * pasY; y <= ymax; y += pasY) {
    if (Math.abs(y) < 1e-9) y = 0;
    s += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${Y(y)}" y2="${Y(y)}" stroke="${line}" stroke-width="${y === 0 ? 1.2 : 0.6}"/>`;
    s += `<text x="${m.l - 5}" y="${Y(y) + 3.5}" font-size="10.5" fill="${ink2}" text-anchor="end">${y}</text>`;
  }
  let d = "";
  ani.forEach((a, i) => { if (val[i] !== null) d += (d && val[i - 1] !== null ? "L" : "M") + X(a).toFixed(1) + "," + Y(val[i]).toFixed(1); });
  s += `<path d="${d}" fill="none" stroke="${ac}" stroke-width="1.8" stroke-linejoin="round"/>`;
  ani.forEach((a, i) => { if (val[i] !== null) s += `<circle cx="${X(a)}" cy="${Y(val[i])}" r="6" fill="transparent"><title>${a}: ${ro(val[i], 1)} ${unit}</title></circle>`; });
  if (!S.filtru) {
    const ult = val[val.length - 1];
    s += `<path d="M${X(anF)},${Y(ult ?? 0)} L${X(anF + 1)},${Y(0)} L${X(xmax)},${Y(0)}" fill="none" stroke="${wr}" stroke-width="2.2"/>`;
    s += `<line x1="${m.l}" x2="${Wd - m.r}" y1="${Y(falsa)}" y2="${Y(falsa)}" stroke="${wr}" stroke-width="1.6" stroke-dasharray="6 4"/>`;
    s += `<text x="${Wd - m.r - 4}" y="${Y(falsa) - 5}" font-size="11" fill="${wr}" text-anchor="end" font-weight="650">media falsă ${ro(falsa, 2)} ${unit}</text>`;
  }
  // tendința liniară (doar anii compleți) și anul parțial marcat separat
  const partial = real && ani[ani.length - 1] === REAL[v].an_partial;
  const xs = [], ys = [];
  ani.forEach((a, i) => { if (val[i] !== null && !(partial && i === ani.length - 1)) { xs.push(a); ys.push(val[i]); } });
  let tendinta = "";
  if (xs.length > 10) {
    const mx = xs.reduce((p, q) => p + q, 0) / xs.length, my = ys.reduce((p, q) => p + q, 0) / ys.length;
    let sxy = 0, sxx = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; });
    const panta = sxy / sxx;
    s += `<line x1="${X(xs[0])}" x2="${X(xs[xs.length - 1])}" y1="${Y(my + panta * (xs[0] - mx))}" y2="${Y(my + panta * (xs[xs.length - 1] - mx))}" stroke="${ink2}" stroke-width="1.2" stroke-dasharray="2 3"/>`;
    tendinta = ` · tendință ${panta >= 0 ? "+" : "−"}${ro(Math.abs(panta * 10), 2)} ${unit}/deceniu (${xs[0]}–${xs[xs.length - 1]})`;
  }
  if (partial) {
    const i = ani.length - 1;
    s += `<circle cx="${X(ani[i])}" cy="${Y(val[i])}" r="3.2" fill="${css("--bg")}" stroke="${ac}" stroke-width="1.5"><title>${ani[i]}: ${ro(val[i], 1)} ${unit} (an parțial, până la ${fr})</title></circle>`;
  }
  s += `<line x1="${m.l}" x2="${X(anF)}" y1="${Y(corecta)}" y2="${Y(corecta)}" stroke="${ok}" stroke-width="1.6"/>`;
  s += `<text x="${m.l + 4}" y="${Y(corecta) - 5}" font-size="11" fill="${ok}" font-weight="650">media corectă ${ro(corecta, 2)} ${unit}</text>`;
  box.innerHTML = `<div class="mini-tit">Media anuală <span>${sursa}${tendinta}</span></div><svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="Media anuală a seriei">${s}</svg>`;
}

/* ===================================================================== 8. vederea explodată */
function deseneazaExplodat(R, g, k, C) {
  const e = S.expl;                                // 0 … 1
  const nTc = R.nTc, nYc = R.nYc, nXc = R.nXc;
  const gT = Math.ceil(nTc / 24), gY = Math.ceil(nYc / 6), gX = Math.ceil(nXc / 8);   // grupare: cel mult 24 × 6 × 8 cărămizi
  const cutii = [];
  for (let a = 0; a < nTc; a += gT) for (let r = 0; r < nYc; r += gY) for (let c = 0; c < nXc; c += gX) {
    const a1 = Math.min(a + gT, nTc), r1 = Math.min(r + gY, nYc), c1 = Math.min(c + gX, nXc);
    const b = { x0: wx(c * R.cx), x1: wx(Math.min(c1 * R.cx, CONFIG.NX)), z0: wz(r * R.cy), z1: wz(Math.min(r1 * R.cy, CONFIG.NY)),
      y0: wy(a * R.ct), y1: wy(Math.min(a1 * R.ct, CONFIG.NT)) };
    const cx = (b.x0 + b.x1) / 2 - W / 2, cy = (b.y0 + b.y1) / 2 - H / 2, cz = (b.z0 + b.z1) / 2 - Dp / 2;
    const d = 0.55 * e;                             // deplasarea proporțională cu distanța de la centru
    const o = [cx * d, cy * d, cz * d];
    const bb = { x0: b.x0 + o[0], x1: b.x1 + o[0], y0: b.y0 + o[1], y1: b.y1 + o[1], z0: b.z0 + o[2], z1: b.z1 + o[2] };
    const citit = a < R.T[1] && a1 > R.T[0] && r < R.Y[1] && r1 > R.Y[0] && c < R.X[1] && c1 > R.X[0];
    const viitor = a > R.tcf;
    const ad = (cx + o[0]) * k.dir[0] + (cy + o[1]) * k.dir[1] + (cz + o[2]) * k.dir[2];
    cutii.push({ bb, citit, viitor, ad });
  }
  cutii.sort((p, q) => p.ad - q.ad);               // pictorul: de la spate la față
  for (const q of cutii) {
    if (q.citit) cutie(g, q.bb, k, q.viitor ? C.warn : C.accent, 0.7, q.viitor ? C.warn : C.accent);
    else if (q.viitor) cutie(g, q.bb, k, C.future, 0.32, C.future);
    else cutie(g, q.bb, k, C.face, 0.38, C.ink2);
  }
  return { gT, gY, gX, n: cutii.length };
}
let TWEEN = 0;
function schimbaLayoutAnimat(id) {                 // „plăcile se transformă în țăruși”: strânge, schimbă, desface
  if (S.expl <= 0.02) { S.layout = id; actualizeaza(); return; }
  cancelAnimationFrame(TWEEN);
  const tinta = S.expl, t0 = performance.now(), dur = 900;
  let schimbat = false;
  const pas = (now) => {
    const f = Math.min(1, (now - t0) / dur);
    if (f >= 0.5 && !schimbat) { S.layout = id; schimbat = true; }
    S.expl = tinta * Math.abs(1 - 2 * f) ** 0.8;
    if (f >= 1) S.expl = tinta;
    actualizeaza();
    if (f < 1) TWEEN = requestAnimationFrame(pas);
  };
  TWEEN = requestAnimationFrame(pas);
}

/* ===================================================================== 7. modul prezentare și turul ghidat */
const SCENARII = ["punct", "harta", "sezon", "serie"];
function seteaza(o){opreste();opresteJoc();Object.assign(S,o);sync();actualizeaza();}

const TUR = [
  { slide: 3, titlu: "Cubul de date", text: "Un singur tensor 3D: timp (vertical, 1961 → 2050), latitudine și longitudine. Planul verde este frontiera last_*_time; deasupra lui, zona pre-alocată.",
    stare: { layout: "A", sc: "punct", cursa: false, expl: 0, filtru: true } },
  { slide: 12, titlu: "Cărămizile: chunk-urile", text: "Același cub, desfăcut în chunk-uri [90, 161, 324]: 366 de straturi de timp × 9 sectoare. Fiecare cărămidă e un obiect separat pe server.",
    stare: { layout: "A", sc: "punct", cursa: false, expl: 0.6 } },
  { slide: 9, titlu: "Adresarea directă", text: "O valoare din București → trei împărțiri întregi → cheia max_temp/266.2.1. Treceți cu mouse-ul peste chunk și dați click pentru a-l deschide.",
    stare: { layout: "A", sc: "punct", cursa: false, expl: 0 } },
  { slide: 15, titlu: "Harta unei zile", text: "Tăietură orizontală: 9 obiecte, ~49 MB, câteva secunde. Apăsați ▶ (sau R) și urmăriți harta asamblându-se sector cu sector.",
    stare: { layout: "A", sc: "harta", cursa: false, expl: 0 }, ruleaza: true },
  { slide: 15, titlu: "Seria de timp a unui punct", text: "Tăietură verticală: 267 de obiecte, 1,6 GB, ~2,5 minute pentru 24.029 de valori. Amplificarea citirii: ×52.000.",
    stare: { layout: "A", sc: "serie", cursa: false, expl: 0, filtru: true }, ruleaza: true },
  { slide: 16, titlu: "Cursa: plăci vs. țăruși", text: "Aceeași serie, același ceas: layout-ul C câștigă detașat. Apăsați 1 pentru hartă și R: acum câștigă A. Nu există chunking universal.",
    stare: { layout: "A", sc: "serie", cursa: true, adv: "C", expl: 0 }, ruleaza: true },
  { slide: 21, titlu: "Capcana 2050", text: "Fără filtrul last_*_time, zilele pre-alocate (0,0) intră în medie. Mini-graficul arată cât de mult coboară media.",
    stare: { layout: "A", sc: "serie", cursa: false, expl: 0, filtru: false } },
];
let PAS = -1;
function arataPas(i) {
  PAS = Math.max(0, Math.min(TUR.length - 1, i));
  const p = TUR[PAS];
  // fiecare pas pornește din aceeași stare de bază (ziua frontierei, max_temp), apoi aplică diferențele
  seteaza({lon:CONFIG.LOCALITATI[0][1],lat:CONFIG.LOCALITATI[0][2],var: "max_temp", data: CONFIG.FRONTIERE.max_temp, filtru: true, cursa: false, expl: 0, adv: "C", ...p.stare });
  $("tur").classList.remove("hidden");
  $("tur-body").innerHTML = `<div class="tur-nr">Pasul ${PAS + 1} / ${TUR.length} · slide ${p.slide}</div><b>${p.titlu}</b><p>${p.text}</p>`;
  $("tur-prev").disabled = PAS === 0;
  $("tur-next").textContent = PAS === TUR.length - 1 ? "Gata ✓" : "Înainte ▶";
  if (p.ruleaza) setTimeout(() => { if (PAS >= 0 && TUR[PAS] === p) porneste(); }, 450);
}
function inchideTur() { PAS = -1; $("tur").classList.add("hidden"); }
function prezentare(on = !$("p07-app").classList.contains("prez")) {
  $("p07-app").classList.toggle("prez", on);
  $("btn-prez").setAttribute("aria-pressed", on);
  try {
    if (on && !document.fullscreenElement) $("p07-app").requestFullscreen?.()?.catch(()=>{});
    if (!on && document.fullscreenElement) document.exitFullscreen?.();
  } catch (e) { /* ecran complet indisponibil (ex. iframe) */ }
  setTimeout(actualizeaza, 60);
}
function scurtaturi(e) {
  const tag = (e.target.tagName || "").toLowerCase();
  const tipInput = (e.target.type || "").toLowerCase();
  if ((tag === "input" && !["range", "checkbox", "button"].includes(tipInput)) || tag === "select" || tag === "textarea" ||
      e.ctrlKey || e.metaKey || e.altKey) return;
  if (tag === "input" && tipInput === "range" && e.key.startsWith("Arrow")) return;   // săgețile mută glisorul
  const k = e.key.toLowerCase();
  const map = {
    "0": () => seteaza({ sc: "punct" }), "1": () => seteaza({ sc: "harta" }), "2": () => seteaza({ sc: "sezon" }), "3": () => seteaza({ sc: "serie" }),
    a: () => seteaza({ layout: "A" }), b: () => seteaza({ layout: "B" }), c: () => seteaza({ layout: "C" }),
    f: () => seteaza({ filtru: !S.filtru }), x: () => seteaza({ cursa: !S.cursa }),
    v: () => { const vs = ["max_temp", "min_temp", "precipitation"]; seteaza({ var: vs[(vs.indexOf(S.var) + 1) % 3] }); },
    e: () => seteaza({ expl: S.expl > 0 ? 0 : 0.6 }),
    r: porneste, " ": porneste, p: () => prezentare(),
    t: () => (PAS < 0 ? arataPas(0) : arataPas(PAS + 1)),
    n: () => PAS >= 0 && arataPas(PAS + 1), arrowright: () => PAS >= 0 && arataPas(PAS + 1),
    arrowleft: () => PAS >= 0 && arataPas(PAS - 1),
    escape: () => { if (!$("modal").classList.contains("hidden")) $("modal").classList.add("hidden"); else if (PAS >= 0) inchideTur(); else if ($("p07-app").classList.contains("prez")) prezentare(false); },
    "?": () => $("ajutor").classList.toggle("hidden"), h: () => $("ajutor").classList.toggle("hidden"),
  };
  if (e.target.id === "cub" && k.startsWith("arrow")) return;   // săgețile rotesc cubul când acesta are focus
  const fn = map[k];
  if (fn) { e.preventDefault(); fn(); }
}

/* ===================================================================== controale */
/* ===================================================================== animația cererilor HTTP */
// ANIM: null = vedere statică; altfel {t0, factor, maxT, sim}: „sim” = secunde simulate scurse.
// Toate cuburile (inclusiv cele două din cursă) folosesc ACELAȘI ceas simulat.
let ANIM = null, RAF = 0;
function stareAnim(R) {
  if (!ANIM) return null;
  const p = R.timp > 0 ? Math.min(1, ANIM.sim / R.timp) : 1;
  const done = Math.min(R.nObj, Math.floor(p * R.nObj + 1e-9));
  const fly = p >= 1 ? done : Math.min(R.nObj, done + CONFIG.CONCURENTA);
  return { done, fly, p };
}
const viteza = () => ANIM.factor > 1.05 ? `redare accelerată ×${ro(ANIM.factor, ANIM.factor < 10 ? 1 : 0)}` : "timp real";
function textAnim(R) {
  const btn = $("btn-run");
  if (!ANIM) {
    $("pfill").style.width = "0%";
    $("ptext").textContent = S.cursa
      ? `Cursă: aceeași interogare pe layout-ul A și pe ${S.adv}, cu același ceas. Apăsați ▶.`
      : `Apăsați ▶ pentru a vedea cele ${ro(R.nObj)} obiecte HTTP modelate pe rând (câte ${CONFIG.CONCURENTA} simultan), cu timpul redat accelerat.`;
    btn.textContent = "▶ Rulează interogarea"; return;
  }
  const gata = ANIM.sim >= ANIM.maxT;
  $("pfill").style.width = ((ANIM.sim / ANIM.maxT) * 100).toFixed(1) + "%";
  btn.textContent = gata ? "↻ Din nou" : "■ Oprește";
  if (S.cursa) {
    $("ptext").textContent = (gata ? "Gata · " : "") + `ceas comun: ${fmtT(ANIM.sim)} simulat · ${viteza()}`;
    return;
  }
  const a = stareAnim(R), mb = R.mbEst * (a.done / R.nObj);
  $("ptext").textContent = (gata ? "Gata · " : "") +
    `cereri modelate ${ro(a.done)} / ${ro(R.nObj)} · ${fmtMB(mb)}${R.L.real ? "" : " (estimat)"} · ${fmtT(Math.min(ANIM.sim, R.timp))} simulat · ${viteza()}`;
}
function porneste() {
  if(!mounted)return;
  if (ANIM && ANIM.sim < ANIM.maxT) { opreste(); actualizeaza(); return; }
  const ids = S.cursa ? ["A", S.adv] : [S.layout];
  const maxT = Math.max(...ids.map((id) => calcul(id).timp));
  const dur = Math.min(CONFIG.ANIM_MAX_s, Math.max(CONFIG.ANIM_MIN_s, maxT));
  ANIM = { t0: performance.now(), maxT, factor: maxT / dur, sim: 0 };
  const pas = (now) => {
    if (!ANIM) return;
    ANIM.sim = Math.min(ANIM.maxT, ((now - ANIM.t0) / 1000) * ANIM.factor);
    actualizeaza();
    if (ANIM.sim < ANIM.maxT) RAF = requestAnimationFrame(pas);
  };
  RAF = requestAnimationFrame(pas);
}
function opreste() { cancelAnimationFrame(RAF); ANIM = null; }

// o „pistă” din cursă: cubul, titlul, bara de progres și cifrele
function pista(R, lat) {
  const a = stareAnim(R);
  R.anim = a && a.p < 1 ? a : null;
  deseneaza(R, $("cub-" + lat), lat === "A");
  $("ct-" + lat).innerHTML = `<span>${R.L.nume} <small>[${[R.ct, R.cy, R.cx].join(", ")}]</small></span>`;
  const est = R.L.real ? "" : " (estimat)";
  let t;
  if (!a) t = `${ro(R.nObj)} obiecte · ${fmtMB(R.mbEst)}${est}<br>≈ ${fmtT(R.timp)}`;
  else if (a.p < 1) t = `cereri modelate ${ro(a.done)} / ${ro(R.nObj)} · ${fmtMB((R.mbEst * a.done) / R.nObj)}${est}<br>${fmtT(ANIM.sim)} …`;
  else t = `<b style="color:var(--ink)">✓ gata în ${fmtT(R.timp)}</b><br>${ro(R.nObj)} obiecte · ${fmtMB(R.mbEst)}${est}`;
  $("ci-" + lat).innerHTML = t;
  $("cf-" + lat).style.width = ((a ? a.p : 0) * 100).toFixed(1) + "%";
  return a ? a.p >= 1 : false;
}

function actualizeaza() {
  if(!mounted)return;
  if($("in-lon")?.value.trim()&&$("in-lat")?.value.trim()&&+$("in-lon").value===S.lon&&+$("in-lat").value===S.lat)clearCoordinateError();

  $("ctl-data").classList.toggle("hidden", !(S.sc === "harta" || S.sc === "punct"));
  $("ctl-sezon").classList.toggle("hidden", S.sc !== "sezon");
  $("ctl-filtru").classList.toggle("hidden", S.sc !== "serie");
  $("cub").classList.toggle("hidden", S.cursa);
  $("cursa").classList.toggle("hidden", !S.cursa);
  $("sel-adv").classList.toggle("hidden", !S.cursa);
  const R = calcul();
  if (S.cursa) {
    const RA = calcul("A"), RX = calcul(S.adv);
    const fa = pista(RA, "A"), fx = pista(RX, "X");
    // câștigătorul = primul care termină pe ceasul comun
    const castig = ANIM && (fa || fx) ? (RA.timp <= RX.timp ? "A" : "X") : null;
    const raport = Math.max(RA.timp, RX.timp) / Math.min(RA.timp, RX.timp);
    for (const lat of ["A", "X"]) {
      const el = $("pista-" + lat);
      el.classList.toggle("castig", castig === lat);
      el.querySelector(".medalie")?.remove();
      if (castig === lat)
        el.insertAdjacentHTML("beforeend", `<span class="medalie">✓ primul · ×${ro(raport, raport < 10 ? 1 : 0)} mai rapid</span>`);
    }
  } else {
    const a = stareAnim(R);
    R.anim = a && a.p < 1 ? a : null;
    deseneaza(R);
  }
  afiseaza(R);
  textAnim(R);
  $("tbar").classList.toggle("hidden", !(S.sc === "harta" || S.sc === "punct"));
  sincronizeazaGlisor();
  miniGrafic(R);
}

function init() {
  if(mounted)return;mounted=true;controller=new AbortController();$("seg-layout").replaceChildren();$("sel-loc").replaceChildren();
  $("btn-run").onclick = porneste;
  const keys=$("m-keys");keys.tabIndex=0;keys.setAttribute("role","button");keys.setAttribute("aria-label","Inspectează primul chunk necesar");
  const inspect=()=>{const R=calcul();deschideChunk({t:R.T[0],r:R.Y[0],c:R.X[0]},R);};listen(keys,"click",inspect);listen(keys,"keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();inspect();}});
  listen(document,"keydown",e=>{if(!$("modal").classList.contains("hidden")&&e.key==="Tab"){e.preventDefault();$("modal-x").focus();}if(e.key==="Escape"&&!$("modal").classList.contains("hidden")){e.preventDefault();e.stopImmediatePropagation();$("modal").classList.add("hidden");keys.focus();}}, {capture:true});
  // orice schimbare de parametri oprește animația în curs
  for (const ev of ["input", "change", "click"])
    listen(document.querySelector("#p07-app .controls"),ev,()=>{if(ANIM)opreste();},{capture:true});
  // layout
  const seg = $("seg-layout");
  for (const L of CONFIG.LAYOUTS) {
    const b = document.createElement("button");
    b.type = "button";
    b.innerHTML = `${L.nume}<small>[${L.ch.join(", ")}]</small>`;
    b.setAttribute("aria-pressed", L.id === S.layout);
    b.onclick = () => {
      [...seg.children].forEach((c, i) => c.setAttribute("aria-pressed", CONFIG.LAYOUTS[i].id === L.id));
      opreste();
      schimbaLayoutAnimat(L.id);
    };
    seg.appendChild(b);
  }
  // localități
  const sel = $("sel-loc");
  CONFIG.LOCALITATI.forEach(([n], i) => sel.add(new Option(n, i)));
  sel.add(new Option("Personalizat (lon / lat)", "custom"));
  sel.value = String(CONFIG.START.loc);
  $("in-lon").value = S.lon; $("in-lat").value = S.lat;
  sel.onchange = () => {
    if (sel.value === "custom") { S.nume = "Punct propriu"; actualizeaza(); return; }
    const [n, lo, la] = CONFIG.LOCALITATI[+sel.value];
    Object.assign(S, { nume: n, lon: lo, lat: la });
    $("in-lon").value = lo; $("in-lat").value = la;
    actualizeaza();
  };
  for (const id of ["in-lon", "in-lat"]) $(id).oninput = () => {
    const lo = parseFloat($("in-lon").value), la = parseFloat($("in-lat").value);
    $("in-lon").setAttribute("aria-invalid",!(Number.isFinite(lo)&&Math.abs(lo)<=180));$("in-lat").setAttribute("aria-invalid",!(Number.isFinite(la)&&Math.abs(la)<=90));
    if (Number.isFinite(lo) && Number.isFinite(la) && Math.abs(lo)<=180 && Math.abs(la)<=90) {
      Object.assign(S, { lon: lo, lat: la, nume: "Punct propriu" });
      sel.value = "custom";window.CARTO_P07.feedback("");actualizeaza();
    }else {coordinateError=true;window.CARTO_P07.feedback(window.CARTO_P07.lang==="en"?"Enter finite longitude ±180° and latitude ±90°.":"Introdu longitudine ±180° și latitudine ±90°, finite.");}
  };
  $("sel-sc").value = S.sc;
  $("sel-sc").onchange = (e) => { S.sc = e.target.value; actualizeaza(); };
  $("sel-var").value = S.var;
  $("sel-var").onchange = (e) => { S.var = e.target.value; actualizeaza(); };
  $("in-data").value = S.data;
  $("in-data").onchange = (e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value) && Number.isFinite(zi(e.target.value)) && zi(e.target.value)>=0 && zi(e.target.value)<CONFIG.NT) { S.data = e.target.value; actualizeaza(); } else { e.target.value=S.data; } };
  $("in-an").value = S.an;
  $("in-an").oninput = (e) => { const a = parseInt(e.target.value, 10); if (a >= 1962 && a <= 2050) { S.an = a; actualizeaza(); } };
  $("sel-anot").value = S.anot;
  $("sel-anot").onchange = (e) => { S.anot = e.target.value; actualizeaza(); };
  $("chk-filtru").onchange = (e) => { S.filtru = e.target.checked; actualizeaza(); };

  // 4. inspectorul de chunk (cubul principal)
  {
    const cub = $("cub");
    let jos = null;
    const coord = (e) => { const pt = cub.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; return pt.matrixTransform(cub.getScreenCTM().inverse()); };
    listen(cub,"pointerdown", (e) => { jos = [e.clientX, e.clientY, HOVER]; });
    listen(cub,"pointermove", (e) => {
      const trage = e.buttons && jos && Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 4;
      if (e.buttons && !trage) return;
      if (trage || (ANIM && ANIM.sim < ANIM.maxT)) { if (HOVER) { HOVER = null; $("tip").classList.add("hidden"); } return; }
      const R = calcul(), q = coord(e);
      const h = chunkSubMouse(R, q.x, q.y);
      const schimbat = (h && h.t) !== (HOVER && HOVER.t) || (h && h.r) !== (HOVER && HOVER.r) || (h && h.c) !== (HOVER && HOVER.c);
      HOVER = h;
      if (schimbat) actualizeaza();
      arataTooltip(e, R);
    });
    listen(cub,"pointerleave", (e) => { if (e.buttons) return; HOVER = null; $("tip").classList.add("hidden"); actualizeaza(); });
    listen(cub,"pointerup", (e) => {          // „click” fără deplasare (robust la redesenare)
      if (!jos || Math.hypot(e.clientX - jos[0], e.clientY - jos[1]) > 4) return;
      const h = jos[2] || HOVER; jos = null;
      if (h) { $("tip").classList.add("hidden"); deschideChunk(h, calcul()); }
    });
    $("modal-x").onclick = () => {$("modal").classList.add("hidden");$("m-keys").focus();};
    listen($("modal"),"click", (e) => { if (e.target.id === "modal") $("modal").classList.add("hidden"); });
  }
  // 5. glisorul de timp
  listen($("rng-zi"),"input", (e) => {
    opreste(); S.data = data(+e.target.value); $("in-data").value = S.data; actualizeaza();
  });
  $("btn-joc").onclick = joacaTimp;
  // 8. vederea explodată
  listen($("rng-expl"),"input", (e) => { S.expl = +e.target.value / 100; actualizeaza(); });
  // 7. prezentare, tur, scurtături
  $("btn-prez").onclick = () => prezentare();
  $("btn-tur").onclick = () => (PAS < 0 ? arataPas(0) : inchideTur());
  $("btn-ajutor").onclick = () => $("ajutor").classList.toggle("hidden");
  $("tur-next").onclick = () => (PAS >= TUR.length - 1 ? inchideTur() : arataPas(PAS + 1));
  $("tur-prev").onclick = () => arataPas(PAS - 1);
  $("tur-x").onclick = inchideTur;
  listen(document,"keydown", scurtaturi);
  listen(document,"fullscreenchange", () => { if (!document.fullscreenElement && $("p07-app").classList.contains("prez")) prezentare(false); });
  listen(document.querySelector("#p07-app .controls"),"input",opresteJoc,{capture:true});

  // rotație comună tuturor cuburilor + modul cursă
  for (const id of ["cub", "cub-A", "cub-X"]) legaRotatie($(id));
  $("btn-cursa").onclick = () => {
    opreste(); S.cursa = !S.cursa;
    $("btn-cursa").setAttribute("aria-pressed", S.cursa); actualizeaza();
  };
  $("sel-adv").value = S.adv;
  $("sel-adv").onchange = (e) => { opreste(); S.adv = e.target.value; actualizeaza(); };
  $("v-iso").onclick = () => { S.th = -0.62; S.ph = 0.52; actualizeaza(); };
  $("v-sus").onclick = () => { S.th = 0; S.ph = 1.45; actualizeaza(); };
  $("v-lat").onclick = () => { S.th = 0; S.ph = 0.08; actualizeaza(); };



  $("footer").innerHTML = `Valori verificate pe <code>${CONFIG.URL}</code> la ${CONFIG.VERIFICAT}. ` +
    `Date: ANM / MeteoRomania · procesare: UVT – EOCube.Ro · licență CC-BY-4.0. ` +
    `Transferul pentru layout-ul A folosește mediana chunk-urilor reale pe sector; pentru B și C e estimat; timpul e un model, nu o măsurătoare.`;
  actualizeaza();
}

// rotație: drag + tastatură (unghiul de vedere e comun tuturor cuburilor)
function legaRotatie(svg) {
  svg.setAttribute("tabindex", "0");
  let drag = null;
  listen(svg,"pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, th: S.th, ph: S.ph }; svg.setPointerCapture(e.pointerId); });
  listen(svg,"pointermove", (e) => {
    if (!drag) return;
    S.th = drag.th + (e.clientX - drag.x) * 0.008;
    S.ph = Math.min(1.45, Math.max(0.05, drag.ph + (e.clientY - drag.y) * 0.006));
    if (!ANIM || ANIM.sim >= ANIM.maxT) actualizeaza();   // în animație, cadrul următor redesenează oricum
  });
  const stop = () => { drag = null; };
  listen(svg,"pointerup", stop);
  listen(svg,"pointercancel", stop);
  listen(svg,"keydown", (e) => {
    const d = { ArrowLeft: [-0.08, 0], ArrowRight: [0.08, 0], ArrowUp: [0, 0.06], ArrowDown: [0, -0.06] }[e.key];
    if (!d) return;
    e.preventDefault();
    S.th += d[0]; S.ph = Math.min(1.45, Math.max(0.05, S.ph + d[1]));
    actualizeaza();
  });
}
init();
window.CARTO_ZARR={init,getState:()=>({...S}),getResults:()=>calcul(),reset:()=>{opreste();opresteJoc();inchideTur();$("modal").classList.add("hidden");Object.assign(S,{...CONFIG.START,lon:CONFIG.LOCALITATI[0][1],lat:CONFIG.LOCALITATI[0][2],filtru:true,expl:0,cursa:false,adv:"C",th:-.62,ph:.52});sync();actualizeaza();},setState:v=>{opreste();opresteJoc();Object.assign(S,v); sync();clearCoordinateError();actualizeaza();},refresh:()=>actualizeaza(),destroy:()=>{mounted=false;controller.abort();opreste();opresteJoc();TEX.clear();for(const n of document.querySelectorAll("#p07-app *"))for(const k of ["onclick","onchange","oninput"])n[k]=null;}};
function sync(){for(const[id,key]of[["sel-sc","sc"],["sel-var","var"],["in-data","data"],["in-an","an"],["sel-anot","anot"],["sel-adv","adv"],["in-lon","lon"],["in-lat","lat"]])$(id).value=S[key];$("chk-filtru").checked=S.filtru;for(const id of ["in-lon","in-lat"])$(id).setAttribute("aria-invalid","false");$("rng-expl").value=S.expl*100;$("btn-cursa").setAttribute("aria-pressed",S.cursa);for(const[b,i]of [...$("seg-layout").children].map((b,i)=>[b,i]))b.setAttribute("aria-pressed",CONFIG.LAYOUTS[i].id===S.layout);const city=CONFIG.LOCALITATI.findIndex(c=>c[1]===S.lon&&c[2]===S.lat);$("sel-loc").value=city<0?"custom":String(city);S.nume=city<0?"Punct propriu":CONFIG.LOCALITATI[city][0];}
})();
