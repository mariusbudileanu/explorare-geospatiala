# Consolidated v3 audit remediation

Baseline: `388cee0da0d9aefac7c8c6d0db9b2b22040373f7`. No additional laboratory, map, target CRS, data acquisition or release metadata is introduced.

## Experiment state (ASTRA V3-01 / V3-02)

The pre-fix browser reproduction confirmed that L07 restored opacity 35 into the comparison/SVG while its input showed 100. L16 rows and L17 destination 12 returned after reset/reload because their URLs retained the old state. P05 now restores validated state before model-to-control/output synchronization, for A and B. Reset clears only the owning parameters (`L07` and legacy `L07-design`, or `L16`, or `L17`), preserving other query parameters and fragments. Share still uses `replaceState`. Same-document history restores validated state without writing history. Mount is idempotent; listeners/observers and added controls are cleaned on destroy.

Existing v1 laboratory links and the existing unversioned, bounded `L07-design` comparison payload remain supported. Malformed/obsolete state falls back to the baseline. These are advisory learning states, not saved student assessments.

## Zarr frontier (ASTRA V3-03)

For max_temp, the available frontier is 2026-10-15. Its 90-day temporal chunk spans 2026-07-19 to 2026-10-16: the first unavailable day is in a mixed chunk, not an entirely empty chunk. The next chunk starts 2026-10-17 and is wholly after the frontier. Romanian and English warnings distinguish selected-day fill from whole-chunk content. Chunk counts, packed snapshot, grids and transfer calculations are unchanged; no exporter/cloud read is run.

## Hansen: owner-confirmed source semantics

The owner confirms locality clipping without scientific recoding. Zero retains the source-product meaning **no detected loss**; positive codes represent loss years, and spatial exclusions/masks are separate. Existing event analyses retain their positive-code filter. The legacy metadata key `semantic_nodata` and numeric API field names are preserved for compatibility; their wording explicitly describes an analysis exclusion, not product NoData.

The UI labels the combined group honestly as zero/non-event or excluded. Its positive-year support is not all valid land pixels. Counts, TIFF bytes, masks, arrays, year mapping and 2013/2014 event detection are unchanged. No whole-locality loss percentage is inferred from a positive-year denominator.

## L19 inverse safety (OPUS m-04)

The original audit's exact GCP fixture was unavailable. Equivalent deterministic tests add one GCP 1 pixel from an existing GCP with a 50 m easting inconsistency, preserving 12 original GCPs. Both fictional maps and all four original scan scenarios are covered, with clean counterparts. Near-zero TPS fitting residuals coexist with large independently measured forward/inverse inconsistencies. This reproduces the failure mechanism, not the exact reported 1,105 m / 51 px figures.

A separate inverse-consistency diagnostic samples a 33×25 grid including output boundaries, plus source probes spanning the known map frame. It measures target→inverse→forward discrepancy in output pixels and source→forward→inverse discrepancy in source pixels. A warning begins above 2 pixels; rectification/export is blocked above 10 pixels or for nonfinite results. These are explicit educational safety limits against severe inconsistency, not universal mapping-accuracy standards. They leave the validated clean approximate inverses usable. Sampling is not a proof of global invertibility or positional accuracy.

The seven fits, their RMSE definitions, independently fitted polynomial/TPS inverses, interpolation, map configurations and PNG/PGW encoding remain unchanged. The safety gate does not replace independent check points or known-truth diagnostics. TPS is not globally disabled. The existing valid ZAREA PNG remains byte-identical to the audited reference.

Independent NumPy TPS references are in `tests/qa/v3-inverse-reference.json`; `generate-v3-inverse-reference.py` can recompute them directly from that file's explicit input coordinates. The oracle never uses browser outputs as expected values.

## Conditional expressions and decision eligibility

IF selects the true branch only for TRUE; a NULL condition selects ELSE, consistently with CASE WHEN. Other Boolean operators retain three-valued logic, and the existing raster NoData behavior remains explicit. This is a bounded expression subset, not a claim of complete QGIS compatibility. The branch behavior was checked against [QGIS 3.44 fcnIf](https://api.qgis.org/api/3.44/qgsexpressionfunction_8cpp_source.html), which evaluates the false branch when the condition is not true; no QGIS desktop execution is claimed.

In L18, connection to origin 0 is now an explicit eligibility requirement. Known disconnection is not an optional unknown travel-time measurement and cannot be compensated by zero time weight. Generic inactive unknown criteria remain permitted. Normalization domains, effective weights and criterion contributions are unchanged; only eligibility and the consequent ranks change. Existing Fraction fixtures are retained verbatim; their test applies the independently verified network constraint before comparing ranks. The obsolete IF(NULL) assertion is updated to the owner-approved branch contract; Boolean/mask tests remain.

## Advisory findings

L09 wording distinguishes unsupported touching-ring configurations from universal OGC invalidity; the geometry algorithm is unchanged. Polynomial failure wording describes deficient design-matrix rank rather than assuming collinearity. L16 explains the sensitivity of four-unit summaries and avoids inferential conclusions from Moran's sign. No new GEOS solver, inferential Moran procedure, cartographic controls or textbook QR presets are implemented.

Codex turn-diff refs are tool-specific advisory metadata. They are not publication refs and are neither edited, deleted nor published by this operation. Public-history safety checks are scoped to the relevant main/development histories.

## Executable validation

`tests/qa/v3-audit-remediation.cjs` checks independent Boolean/BFS/TPS references and actual controls, output labels, SVG styling/labels, history, reset/reload, fresh deep links, corrupt URLs, lifecycle and export safety. Existing P01–P07/general suites, the official static generator and byte-verified candidate/committed archives provide regression coverage. Temporary screenshots and reports remain outside tracked content. Browser evidence is reported separately from mathematical comparisons.
