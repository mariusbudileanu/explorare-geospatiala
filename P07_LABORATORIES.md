# P07 — Zarr and Georeferencing laboratory integration

The original external applications are reused on native pages: `zarr-cloud-data.html` (L12) and `georeferencing-lab.html` (L19). Local/offline use requires the same local HTTP server as the rest of the platform (for ES modules and the local JSON snapshot); no Internet connection or cloud credentials are required. Direct `file://` module execution is not supported. Static purpose, method and recovery links remain available when startup fails.

## Ownership, source and reproducibility

The owner confirms rights to the original external code, exporter and fictional maps. Original software: MIT; original educational text and fictional maps: CC BY 4.0. Source hashes are recorded in ATTRIBUTION.md. Only required implementation modules, supplied fonts and an offline snapshot were imported; external originals are unchanged. No ZIP or external development directory is published.

`js/georef/` is the actual ESM implementation used by the browser and numerical tests. The map-generation configurations and drawing modules remain unchanged. It reuses the platform CRS engine exclusively for EPSG:3844; it has no CRS selector. D3 dependencies use the versions and integrity records from the audited external lockfile, bundled as `js/vendor/p07-d3.js` using esbuild 0.28.2. The temporary bundler is not a runtime dependency. Required third-party notices and original OFL font licenses are retained. No new projection, raster or geodesic engine is introduced.

The original Python exporter remains outside this repository. Its hardcoded output path, unpinned environment, cache fingerprint limitations and documented large remote reads were not validated by an actual export. The current application does not depend on it or execute it. The provided snapshot is reused without new acquisition or new daily grids.

## Scientific contracts

L12 distinguishes selected query day, embedded annual mean, latest daily grid, incomplete 2026, frontier filtering and preallocated fill zero through 2050. Precipitation annual maps represent means of daily amounts, not annual totals. Useful bytes, modeled decompressed volume, compressed-size estimates and historical measurements are distinct. Layouts B/C are hypothetical; actual cloud requests are zero. Snapshot packing, quantization and masks are preserved.

L19 preserves ZAREA 1:10,000 and Delta Sălciilor 1:100,000, both fictional and exclusively Stereo70. Romanian X=northing and Y=easting. GCP RMSE is not independent validation. Seven transformations are retained. Rank-deficient/coincident/nonfinite or noninvertible configurations fail safely. Polynomial/TPS inverses are separately fitted approximations; extrapolation may be unstable. Known-error summaries sample 825 positions. Monte Carlo uncertainty is conditional on the specified simulated noise, not an accuracy guarantee.

Rectification retains an 8-pixel inverse grid and bilinear sampling. Incomplete source-edge stencils become transparent. PNG and PGW share a basename; PGW coordinates refer to the upper-left pixel center. Assign EPSG:3844 when importing in QGIS; a world file does not encode CRS. No GeoTIFF or mandatory GCP export is introduced.

## QA

`tests/qa/generate-p07-reference.py` generates independent references offline using NumPy, SVD and enumerated chunk sets, never browser outputs. `tests/qa/p07-labs.cjs` exercises those fixed references, negative configurations, original guide, actual PNG/PGW downloads, corrupt-state recovery, keyboard input, URL/reset, both languages/themes, responsive/no-JS layouts and repeated lifecycle operations. Run with the same CODEX_NODE_MODULES and QA_BROWSER_PATH contract as prior package suites. Existing P01–P06 reference fixtures are preserved. The official static generator remains the authority for shared navigation and search; use an EOL-safe Git archive for strict check mode.
