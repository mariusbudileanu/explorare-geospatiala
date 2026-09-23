(function (root) {
  'use strict';
  const registry = root.CRS_REGISTRY;
  if (!registry || !root.proj4) return;
  const byId = Object.fromEntries(registry.crs.map(crs => [crs.id, crs]));
  for (const crs of registry.crs) root.proj4.defs(crs.id, crs.proj4);
  function transform(source, target, coordinates) {
    if (!byId[source] || !byId[target]) throw new Error('CRS necunoscut.');
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) throw new Error('Introduceți două numere valide.');
    if (source === 'EPSG:4326' && (Math.abs(coordinates[0]) > 180 || Math.abs(coordinates[1]) > 90)) throw new Error('Longitudinea sau latitudinea este în afara intervalului valid.');
    const result = root.proj4(source, target, coordinates);
    if (!result.every(Number.isFinite)) throw new Error('Transformarea nu a produs coordonate finite.');
    return result;
  }
  function usesPulkovo(source, target) { return byId[source]?.datum === 'Pulkovo 1942(58)' || byId[target]?.datum === 'Pulkovo 1942(58)'; }
  root.CRS_ENGINE = {registry, byId, transform, usesPulkovo};
})(window);
