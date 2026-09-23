/* Shared mathematical projection registry and geographic sampling engine. */
(function (root) {
  'use strict';
  const R = Math.PI / 180;
  const polar = rho => (lambda, phi) => [rho(phi) * Math.sin(lambda), -rho(phi) * Math.cos(lambda)];
  const definitions = {
    orthographic: {domain: 'Emisfera nordică, φ ≥ 0°', maxLat: 90, minLat: 0, forward: polar(phi => Math.cos(phi))},
    stereographic: {domain: 'φ > −90°; afișare în emisfera nordică', maxLat: 90, minLat: 0, forward: polar(phi => 2 * Math.tan((Math.PI / 2 - phi) / 2))},
    gnomonic: {domain: 'φ > 0°; afișare de la 15°', maxLat: 90, minLat: 15, forward: polar(phi => Math.tan(Math.PI / 2 - phi))},
    postel: {domain: '−90° < φ ≤ 90°', maxLat: 90, minLat: -75, forward: polar(phi => Math.PI / 2 - phi)},
    'lambert-az': {domain: '−90° < φ ≤ 90°', maxLat: 90, minLat: -75, forward: polar(phi => 2 * Math.sin((Math.PI / 2 - phi) / 2))},
    equirectangular: {domain: '−90° ≤ φ ≤ 90°', maxLat: 90, minLat: -90, forward: (lambda, phi) => [lambda, -phi]},
    'lambert-cyl': {domain: '−90° ≤ φ ≤ 90°', maxLat: 90, minLat: -90, forward: (lambda, phi) => [lambda, -Math.sin(phi)]},
    mercator: {domain: '|φ| < 90°; afișare până la 80°', maxLat: 80, minLat: -80, forward: (lambda, phi) => [lambda, -Math.log(Math.tan(Math.PI / 4 + phi / 2))]},
    eqearth: {domain: 'Global; proiecție echivalentă Equal Earth', maxLat: 90, minLat: -90, forward: (lambda, phi) => {
      const theta = Math.asin(Math.sqrt(3) / 2 * Math.sin(phi));
      const t2 = theta * theta, t6 = t2 * t2 * t2, t8 = t6 * t2;
      const a1 = 1.340264, a2 = -0.081106, a3 = 0.000893, a4 = 0.003796;
      const divisor = 3 * (a1 + 3 * a2 * t2 + 7 * a3 * t6 + 9 * a4 * t8);
      return [2 * Math.sqrt(3) * lambda * Math.cos(theta) / divisor, -(a1 * theta + a2 * theta ** 3 + a3 * theta ** 7 + a4 * theta ** 9)];
    }},
    gall: {domain: '|φ| < 90°; afișare până la 80°', maxLat: 80, minLat: -80, forward: (lambda, phi) => [lambda / Math.SQRT2, -(1 + 1 / Math.SQRT2) * Math.tan(phi / 2)]},
    mollweide: {domain: '−90° ≤ φ ≤ 90°', maxLat: 90, minLat: -90, forward(lambda, phi) {
      if (Math.abs(Math.abs(phi) - Math.PI / 2) < 1e-10) return [0, -Math.sign(phi) * Math.SQRT2];
      let theta = phi;
      for (let i = 0; i < 16; i++) {
        const delta = (2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(phi)) / (2 + 2 * Math.cos(2 * theta));
        theta -= delta;
        if (Math.abs(delta) < 1e-12) break;
      }
      return [2 * Math.SQRT2 / Math.PI * lambda * Math.cos(theta), -Math.SQRT2 * Math.sin(theta)];
    }}
  };
  const wrap = longitude => ((longitude + 180) % 360 + 360) % 360 - 180;
  function project(id, longitude, latitude, center = 0) {
    const item = definitions[id];
    if (!item || ![longitude, latitude, center].every(Number.isFinite) || latitude < item.minLat || latitude > item.maxLat || Math.abs(longitude) > 180) return null;
    const lambda = wrap(longitude - center) * R;
    const result = item.forward(lambda, latitude * R);
    return result.every(Number.isFinite) ? result : null;
  }
  function samplePath(id, geographic, center, maxJump = 1) {
    const segments = [];
    let current = [], previous = null;
    for (const [lon, lat] of geographic) {
      const point = project(id, lon, lat, center);
      const seam = previous && Math.abs(wrap(lon - center) - wrap(previous[0] - center)) > 180;
      const jump = point && previous && previous[1] && Math.hypot(point[0] - previous[1][0], point[1] - previous[1][1]) > maxJump;
      if (!point || seam || jump) { if (current.length > 1) segments.push(current); current = []; }
      if (point) current.push(point);
      previous = [lon, point];
    }
    if (current.length > 1) segments.push(current);
    return segments;
  }
  function graticule(id, {center = 0, interval = 30, grid = true, equator = true, central = true, test = false} = {}) {
    const item = definitions[id];
    if (!item) return null;
    const lines = [];
    const latitudes = [];
    for (let lat = Math.ceil(item.minLat / interval) * interval; lat <= item.maxLat; lat += interval) latitudes.push(lat);
    const longitudes = [];
    for (let lon = -180; lon < 180; lon += interval) longitudes.push(lon);
    const lonSamples = Array.from({length: 145}, (_, i) => wrap(center - 180 + i * 2.5));
    const latSamples = Array.from({length: Math.round((item.maxLat - item.minLat) / 2.5) + 1}, (_, i) => item.minLat + i * 2.5);
    if (grid) {
      for (const lat of latitudes) if (lat !== 0) lines.push({kind: 'grid', segments: samplePath(id, lonSamples.map(lon => [lon, lat]), center)});
      for (const lon of longitudes) if (Math.abs(wrap(lon - center)) > 1e-6) lines.push({kind: 'grid', segments: samplePath(id, latSamples.map(lat => [lon, lat]), center)});
    }
    if (equator) lines.push({kind: 'equator', segments: samplePath(id, lonSamples.map(lon => [lon, 0]), center)});
    if (central) lines.push({kind: 'central', segments: samplePath(id, latSamples.map(lat => [center, lat]), center)});
    if (test) for (const lat of [25, 50, 75]) for (const lon of [-90, 0, 90]) {
      const vertices = Array.from({length: 73}, (_, i) => {
        const a = i * Math.PI / 36, radius = 5 * R, phi = lat * R, lambda = lon * R;
        const latitude = Math.asin(Math.sin(phi) * Math.cos(radius) + Math.cos(phi) * Math.sin(radius) * Math.sin(a));
        const longitude = lambda + Math.atan2(Math.cos(a) * Math.sin(radius) * Math.cos(phi), Math.cos(radius) - Math.sin(phi) * Math.sin(latitude));
        return [wrap(longitude / R), latitude / R];
      });
      lines.push({kind: 'test', segments: samplePath(id, vertices, center)});
    }
    return lines;
  }
  function validate() {
    const warnings = [];
    for (const [id, item] of Object.entries(definitions)) {
      for (const [lat, lon] of [[0,0],[0,45],[0,-45],[45,0],[-45,0],[90,0],[-90,0],[30,120],[-30,-120]]) {
        const point = project(id, lon, lat);
        const expected = lat >= item.minLat && lat <= item.maxLat;
        if (Boolean(point) !== expected) warnings.push(`${id}: φ=${lat}, λ=${lon}: domain mismatch`);
      }
      const geometry = graticule(id, {test: true});
      if (!geometry.some(line => line.segments.length)) warnings.push(`${id}: empty graticule`);
      if (geometry.flatMap(line => line.segments.flat()).some(point => !point.every(Number.isFinite))) warnings.push(`${id}: non-finite geometry`);
    }
    return warnings;
  }
  root.CARTO_PROJECTIONS = {definitions, project, samplePath, graticule, validate, wrap};
})(typeof window !== 'undefined' ? window : globalThis);
