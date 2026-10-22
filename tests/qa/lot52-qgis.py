"""Real PyQGIS checks. Originals remain local/ignored; UI 3.44 is not certified here.

Run with the installed python-qgis launcher, PYTHONNOUSERSITE=1 and QT_QPA_PLATFORM=offscreen.
Source downloads are identified by URL/checksum in the existing dataset inventory.
"""
import collections
import hashlib
import html
import itertools
import json
import math
import os
from pathlib import Path
import re
import sys
os.environ["GDAL_PAM_ENABLED"] = "NO"  # Never create/update sidecars on original rasters.

from qgis.core import (
    NULL, Qgis, QgsApplication, QgsCategorizedSymbolRenderer, QgsCoordinateReferenceSystem,
    QgsCoordinateTransform, QgsExpression, QgsExpressionContext, QgsExpressionContextUtils,
    QgsFeature, QgsFeatureRequest, QgsField, QgsGeometry, QgsLayout, QgsLayoutExporter,
    QgsLayoutItemLabel, QgsLayoutItemLegend, QgsLayoutItemMap, QgsLayoutItemPage, QgsLayoutItemScaleBar,
    QgsLayoutPoint, QgsLayoutSize, QgsLegendStyle, QgsFillSymbol, QgsPointXY, QgsProject, QgsRendererCategory,
    QgsSymbol, QgsVectorLayer, QgsMemoryProviderUtils,
)
from qgis.PyQt.QtCore import QVariant
from qgis.PyQt.QtGui import QColor, QFont, QFontDatabase, QFontMetrics
from osgeo import ogr, osr, gdal

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tmp/qa/lot52"
SOURCES = Path(sys.argv[1]) if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else OUT / "sources"
OUT.mkdir(parents=True, exist_ok=True)
app = QgsApplication([], False)
app.initQgis()
QFontDatabase.addApplicationFont("C:/Windows/Fonts/arial.ttf")
layout_font = QFont("Arial", 9)
app.setFont(layout_font)
sys.path.append(str(Path(os.environ["QGIS_PREFIX_PATH"]) / "python/plugins"))
from processing.core.Processing import Processing
Processing.initialize()
import processing

checks = 0
report = {"qgis": Qgis.QGIS_VERSION, "scope": "PyQGIS engine and exports, not interactive UI 3.44", "originals": [], "exports": []}


def check(value, message):
    global checks
    checks += 1
    if not value:
        raise AssertionError(message)


def load(folder, layer_name, source_ids=False):
    for file in (SOURCES / folder).rglob("*.gpkg"):
        dataset = ogr.Open(str(file), 0)
        if dataset.GetLayerByName(layer_name) is not None:
            layer = QgsVectorLayer(str(file) + "|layername=" + layer_name, layer_name, "ogr")
            check(layer.isValid(), "Load original " + layer_name)
            if source_ids:
                fields = layer.fields()
                fields.append(QgsField("source_fid", QVariant.String))
                copy = QgsMemoryProviderUtils.createMemoryLayer(layer_name, fields, layer.wkbType(), layer.crs())
                features = []
                for source in layer.getFeatures():
                    feature = QgsFeature(fields)
                    feature.setGeometry(source.geometry())
                    feature.setAttributes(source.attributes() + [str(source.id())])
                    features.append(feature)
                copy.dataProvider().addFeatures(features)
                check(len({f["source_fid"] for f in copy.getFeatures()}) == layer.featureCount(), "Unique source GeoPackage primary keys copied before filtering")
                return copy
            # Work only on a memory copy: provider subset filters may touch SQLite headers.
            return layer.materialize(QgsFeatureRequest())
    raise FileNotFoundError(layer_name)


def evaluator(expression, layer):
    compiled = QgsExpression(expression)
    check(not compiled.hasParserError(), compiled.parserErrorString())
    context = QgsExpressionContext()
    context.appendScopes(QgsExpressionContextUtils.globalProjectLayerScopes(layer))
    compiled.prepare(context)

    def calculate(feature):
        context.setFeature(feature)
        result = compiled.evaluate(context)
        check(not compiled.hasEvalError(), compiled.evalErrorString())
        return None if result is None or result == NULL else result
    return calculate


def copied_expression(tutorial, section):
    source = (ROOT / "tutorials" / (tutorial.lower() + ".html")).read_text(encoding="utf-8")
    block = re.search(r'<article class="tutorial-step\b[^>]*id="section-' + str(section) + r'"[^>]*>[\s\S]*?</article>', source)[0]
    return html.unescape(re.search(r'<pre><code[^>]*>([\s\S]*?)</code>', block)[1]).strip()


def verify_suceava_mask_conventions(data_root):
    """Only the frozen 6 km ROI; original data are always read-only."""
    import numpy as np
    gdal.UseExceptions()
    root=Path(data_root);out=OUT/'mask-conventions';out.mkdir(exist_ok=True,parents=True)
    paths={'source':root/'date_raster/Hansen_GFC-2024-v1.12_lossyear_50N_020E_s70.tif','historic_loss':root/'date_raster/forest_loss_suceava.tif','historic_dem':root/'date_raster/dem_suceava.tif','mask':root/'date_vector/judet_suceava.gpkg'}
    def sha(p):
     with p.open('rb') as stream: return hashlib.file_digest(stream,'sha256').hexdigest()
    protected=list(paths.values())+[root/'date_raster/cop30m_3844-002.tif']+list(SOURCES.rglob('*.gpkg'))
    protected += [Path(str(p)+'.aux.xml') for p in protected if Path(str(p)+'.aux.xml').exists()]
    before={str(p):sha(p) for p in protected}
    prior=json.loads((OUT/'qgis-results.json').read_text(encoding='utf8'))
    for entry in prior['originals']:
     matches=[p for p in protected if p.name==entry['file']]
     check(bool(matches) and before[str(matches[0])]==entry['sha256'],'Original GeoPackage checksum '+entry['file'])
    extent=(493650,687180,499650,693180);gt=(493650,30,0,693180,0,-30);srs=osr.SpatialReference();srs.ImportFromEPSG(3844)
    vector=ogr.Open(str(paths['mask']),0);layer=vector.GetLayer();geom=None
    for f in layer:
     g=f.GetGeometryRef().Clone();geom=g if geom is None else geom.Union(g)
    layer.ResetReading()
    report={'extent':extent,'affine':gt,'grid':[200,200],'metadata':{},'counts':{},'differences':[],'originals':before}
    for k,p in paths.items():
     if k=='mask':continue
     ds=gdal.Open(str(p),gdal.GA_ReadOnly);report['metadata'][k]={'size':[ds.RasterXSize,ds.RasterYSize],'affine':ds.GetGeoTransform(),'nodata':ds.GetRasterBand(1).GetNoDataValue()};ds=None
    arrays={}
    for key in ['source','historic_loss']:
     for cut in [False,True]:
      ds=gdal.Warp('',str(paths[key]),format='MEM',dstSRS='EPSG:3844',outputBounds=extent,width=200,height=200,resampleAlg='near',dstNodata=255,cutlineDSName=str(paths['mask']) if cut else None)
      a=ds.ReadAsArray();arrays[key+('_warp_cutline' if cut else '_unmasked')]=a
    for touched in [False,True]:
     mask=gdal.GetDriverByName('MEM').Create('',200,200,1,gdal.GDT_Byte);mask.SetGeoTransform(gt);mask.SetProjection(srs.ExportToWkt());gdal.RasterizeLayer(mask,[1],layer,burn_values=[1],options=['ALL_TOUCHED=TRUE'] if touched else []);arrays['mask_'+('all_touched' if touched else 'center')]=mask.ReadAsArray();layer.ResetReading()
    for name,a in arrays.items():
     if name.startswith('mask_'):continue
     sel=(a>=13)&(a<=14);report['counts'][name]={'without_target_mask':int(sel.sum()),'center_target_mask':int((sel&(arrays['mask_center']==1)).sum()),'all_touched_target_mask':int((sel&(arrays['mask_all_touched']==1)).sum())}
    sel=(arrays['source_warp_cutline']>=13)&(arrays['source_warp_cutline']<=14)
    for row,col in np.argwhere(sel&(arrays['mask_center']!=1)):
     x,y=gt[0]+(int(col)+.5)*30,gt[3]-(int(row)+.5)*30;p=ogr.Geometry(ogr.wkbPoint);p.AddPoint_2D(x,y)
     srcgt=report['metadata']['source']['affine'];sc=int((x-srcgt[0])/srcgt[1]);sr=int((y-srcgt[3])/srcgt[5]);sx,sy=srcgt[0]+(sc+.5)*srcgt[1],srcgt[3]+(sr+.5)*srcgt[5];sp=ogr.Geometry(ogr.wkbPoint);sp.AddPoint_2D(sx,sy)
     report['differences'].append({'row':int(row),'col':int(col),'code':int(arrays['source_warp_cutline'][row,col]),'center':[x,y],'center_inside':bool(geom.Contains(p)),'distance_boundary':geom.Boundary().Distance(p),'source_nearest_cell':[sr,sc],'source_center':[sx,sy],'source_center_inside':bool(geom.Contains(sp)),'all_touched':int(arrays['mask_all_touched'][row,col])})
    check(report['counts']['source_warp_cutline']=={'without_target_mask':213,'center_target_mask':212,'all_touched_target_mask':213},'Different source-cutline/target-center/all-touched counts, not forced equality')
    check(report['counts']['historic_loss_unmasked']==report['counts']['source_warp_cutline'],'Historic copy and source-cutline ROI agree for these year codes')
    check(report['counts']['source_unmasked']['without_target_mask']==525,'Upstream unmasked ROI is not the historic clipped copy')
    check(len(report['differences'])==1,'One boundary cell explains the target mask difference')
    cell=report['differences'][0]
    check((cell['row'],cell['col'],cell['code'])==(192,197,13),'Identified boundary cell')
    check(not cell['center_inside'] and cell['source_center_inside'] and cell['all_touched']==1,'Nearest source center inside, target center outside, intersected cell')
    check(abs(cell['distance_boundary']-5.065045656283305)<1e-5,'Boundary distance in projected metres')
    for key in ['historic_loss','historic_dem']:
     ds=gdal.Open(str(paths[key]),gdal.GA_ReadOnly);geo=ds.GetGeoTransform();samples=[]
     check(ds.GetRasterBand(1).GetNoDataValue() is None,'Historical NoData is undeclared '+key)
     for row,col in [(0,0),(0,ds.RasterXSize-1),(ds.RasterYSize-1,0),(ds.RasterYSize-1,ds.RasterXSize-1)]:
      point=ogr.Geometry(ogr.wkbPoint);point.AddPoint_2D(geo[0]+(col+.5)*geo[1],geo[3]+(row+.5)*geo[5]);v=float(ds.GetRasterBand(1).ReadAsArray(col,row,1,1)[0,0])
      if not geom.Contains(point): samples.append({'row':row,'col':col,'value':v});check(v==0,'Historical exterior corner uses zero '+key)
     check(bool(samples),'Observed exterior samples '+key);report['metadata'][key]['exterior_samples']=samples;ds=None
    check(all(sha(Path(p))==h for p,h in before.items()),'All nine original GeoPackages, Suceava rasters and sidecars unchanged')
    report['status']='PASS read-only mask comparison';report['original_files']=before;return report


def verify_suceava(data_root, project):
    """Representative 6 km ROI on local originals; never a full-county/GUI claim."""
    import numpy as np
    from qgis.core import QgsRasterLayer, QgsRectangle, QgsPalettedRasterRenderer
    from qgis.analysis import QgsRasterCalculator, QgsRasterCalculatorEntry
    folder = Path(data_root)
    originals = {
        "dem": folder / "date_raster/cop30m_3844-002.tif",
        "loss": folder / "date_raster/Hansen_GFC-2024-v1.12_lossyear_50N_020E_s70.tif",
        "mask": folder / "date_vector/judet_suceava.gpkg",
        "prepared_dem": folder / "date_raster/dem_suceava.tif",
        "prepared_loss": folder / "date_raster/forest_loss_suceava.tif",
    }
    check(all(p.is_file() for p in originals.values()), "All configured Suceava originals exist")
    def sha(file):
        h = hashlib.sha256()
        with file.open("rb") as stream:
            for block in iter(lambda: stream.read(4 * 1024 * 1024), b""):
                h.update(block)
        return h.hexdigest()
    protected = list(originals.values()) + [p for f in originals.values() for p in [Path(str(f) + ".aux.xml")] if p.exists()]
    before = {str(p): sha(p) for p in protected}
    inventory = json.loads((ROOT / "data/tutorial-dataset-inventory.json").read_text(encoding="utf-8"))["datasets"]
    for dataset_id, key in [("copernicus_dem_30m", "dem"), ("hansen_lossyear_2024", "loss"), ("counties_ro", "mask")]:
        entry = next(d for d in inventory if d["dataset_id"] == dataset_id)["verification"]
        check(entry["local_source_filename"] == originals[key].name and entry["sha256"] == before[str(originals[key])], "Existing inventory identifies checksummed Suceava source " + key)
    metadata = {}
    for key in ["dem", "loss", "prepared_dem", "prepared_loss"]:
        ds = gdal.Open(str(originals[key]), gdal.GA_ReadOnly)
        metadata[key] = {"size": [ds.RasterXSize, ds.RasterYSize], "affine": ds.GetGeoTransform(), "crs": ds.GetSpatialRef().GetAuthorityCode(None), "nodata": ds.GetRasterBand(1).GetNoDataValue()}
        check(metadata[key]["crs"] == "3844", "Suceava input already projected in EPSG:3844: " + key)
        ds = None
    check(metadata["prepared_dem"]["affine"] != metadata["prepared_loss"]["affine"], "Original prepared rasters genuinely require grid alignment")
    original_mask = QgsVectorLayer(str(originals["mask"]), "Suceava original", "ogr")
    check(original_mask.isValid() and original_mask.crs().authid() == "EPSG:3844", "Original Suceava mask CRS")
    mask = original_mask.materialize(QgsFeatureRequest()); original_mask = None
    geometry = QgsGeometry.unaryUnion([f.geometry() for f in mask.getFeatures()])
    boundary = geometry.convertToType(Qgis.GeometryType.Line)
    ds = gdal.Open(str(originals["prepared_loss"]), gdal.GA_ReadOnly)
    sample = ds.ReadAsArray(buf_xsize=128, buf_ysize=128)
    gt = ds.GetGeoTransform(); sx, sy = ds.RasterXSize / 128, ds.RasterYSize / 128; ds = None
    candidates = []
    for row, col in np.argwhere((sample > 0) & (sample <= 24)):
        x, y = gt[0] + (int(col) + .5) * sx * gt[1], gt[3] + (int(row) + .5) * sy * gt[5]
        point = QgsGeometry.fromPointXY(QgsPointXY(x, y))
        if geometry.contains(point): candidates.append((boundary.distance(point), x, y))
    check(bool(candidates), "Original loss sample intersects Suceava")
    _, x, y = min(candidates)
    xmin, ymin = math.floor((x - 3000) / 30) * 30, math.floor((y - 3000) / 30) * 30
    extent = (xmin, ymin, xmin + 6000, ymin + 6000)
    out = OUT / "suceava"; out.mkdir(exist_ok=True)
    arrays, rasters = {}, {}
    for key, resampling, nodata, dtype in [("dem", "bilinear", -9999, gdal.GDT_Float32), ("loss", "near", 255, gdal.GDT_Byte)]:
        target = out / (key + "-aligned.tif")
        result = gdal.Warp(str(target), str(originals[key]), format="GTiff", dstSRS="EPSG:3844", outputBounds=extent, xRes=30, yRes=30, cutlineDSName=str(originals["mask"]), cropToCutline=False, resampleAlg=resampling, dstNodata=nodata, outputType=dtype, creationOptions=["COMPRESS=DEFLATE"])
        check(result is not None, "Warp/alignment and county cutline on original " + key)
        arrays[key] = result.ReadAsArray(); result = None
        rasters[key] = QgsRasterLayer(str(target), key)
    check(arrays["dem"].shape == arrays["loss"].shape == (200, 200), "Identical aligned 30m grid")
    valid_dem, valid_loss = arrays["dem"] != -9999, arrays["loss"] != 255
    check(valid_dem.any() and (~valid_dem).any(), "Representative ROI includes both mask interior and exterior")
    check(set(np.unique(arrays["loss"][valid_loss])).issubset(set(range(25))), "Nearest preserves original loss-year codes")
    check((arrays["loss"] == 0).any() and (~valid_loss).any(), "Valid no-loss zero distinct from output NoData255")
    for operation, params in [("hillshade", {"AZIMUTH": 315, "V_ANGLE": 45}), ("slope", {})]:
        target = out / (operation + ".tif")
        processing.run("native:" + operation, {"INPUT": str(out / "dem-aligned.tif"), "Z_FACTOR": 1, **params, "OUTPUT": str(target)})
        rasters[operation] = QgsRasterLayer(str(target), operation)
        check(rasters[operation].isValid(), "QGIS terrain operation on original Suceava ROI: " + operation)
    def calculate(expression, names, target):
        entries = []
        for name in names:
            e = QgsRasterCalculatorEntry(); e.ref = name + "@1"; e.raster = rasters[name]; e.bandNumber = 1; entries.append(e)
        calc = QgsRasterCalculator(expression, str(target), "GTiff", QgsRectangle(*extent), 200, 200, entries, project.transformContext())
        check(calc.processCalculation() == 0, "Suceava Raster Calculator " + expression)
        ds = gdal.Open(str(target)); band = ds.GetRasterBand(1); a, missing = band.ReadAsArray(), band.GetNoDataValue(); ds = None
        return a, missing
    slope, slope_nodata = calculate('"dem@1" * 0 + "slope@1"', ["dem", "slope"], out / "slope-masked.tif")
    check(np.all(slope[~valid_dem] == slope_nodata), "Explicit DEM mask excludes missing elevation from slope")
    check(np.all((slope[slope != slope_nodata] >= 0) & (slope[slope != slope_nodata] <= 90)), "Slope output in degrees")
    period, period_nodata = calculate('("loss@1" >= 13) AND ("loss@1" <= 14)', ["loss"], out / "loss-2013-2014.tif")
    reference = valid_loss & (arrays["loss"] >= 13) & (arrays["loss"] <= 14)
    check(np.array_equal(period[valid_loss] == 1, reference[valid_loss]), "Original-data year selection equals independent NumPy reference")
    check(np.all(period[~valid_loss] == period_nodata) and np.all(period[arrays["loss"] == 0] == 0), "NoData propagates while zero remains a valid no-loss observation")
    project.addMapLayers([rasters["hillshade"], rasters["loss"]])
    classes = [QgsPalettedRasterRenderer.Class(code, QColor("#B45B59") if code in [13, 14] else QColor(0, 0, 0, 0), str(2000 + code) if code else "Fără pierdere detectată") for code in range(25)]
    rasters["loss"].setRenderer(QgsPalettedRasterRenderer(rasters["loss"].dataProvider(), 1, classes))
    layout = QgsLayout(project); layout.initializeDefaults()
    item = QgsLayoutItemMap(layout); layout.addLayoutItem(item); item.attemptMove(QgsLayoutPoint(15, 25)); item.attemptResize(QgsLayoutSize(170, 170)); item.setCrs(QgsCoordinateReferenceSystem("EPSG:3844")); item.setLayers([rasters["loss"], rasters["hillshade"]]); item.zoomToExtent(QgsRectangle(*extent))
    label = QgsLayoutItemLabel(layout); label.setText("QA Suceava: ROI 6 km / EPSG:3844 / Copernicus DEM + Hansen v1.12\nRoșu: pierdere detectată 2013–2014; probă tehnică, nu modelul final T06"); layout.addLayoutItem(label); label.attemptMove(QgsLayoutPoint(15, 10)); label.adjustSizeToText()
    exporter = QgsLayoutExporter(layout)
    check(exporter.exportToImage(str(out / "qa.png"), QgsLayoutExporter.ImageExportSettings()) == QgsLayoutExporter.Success, "Suceava representative PNG export")
    check(exporter.exportToPdf(str(out / "qa.pdf"), QgsLayoutExporter.PdfExportSettings()) == QgsLayoutExporter.Success, "Suceava representative PDF export")
    check(all(sha(Path(p)) == digest for p, digest in before.items()), "Suceava originals and sidecars unchanged")
    return {"status": "PASS representative original-data ROI, not full-county recomputation or GUI3.44", "original_files": before, "metadata": metadata, "extent": extent, "grid": "200x200; 30m; EPSG:3844", "loss_2013_2014_pixels": int(reference.sum()), "valid_no_loss_pixels": int((arrays["loss"] == 0).sum()), "mapped_pixel_area_m2": 900, "interpretation": "Descriptive mapped cells, not an unbiased estimate of true forest loss; no causality/legal conclusion", "reprojection": "Sources already EPSG:3844; Warp aligns grids, not a test of the upstream geographic-to-Stereo70 conversion", "datamask": "Hansen separate datamask not present locally; no-loss0 is not proof of valid mapped land without that mask"}


def run_checks():
    print("PyQGIS ready", flush=True)
    before = {p: hashlib.sha256(p.read_bytes()).hexdigest() for p in SOURCES.rglob("*.gpkg")}
    school = load("schools", "Unitățile de Învățământ Preuniversitar din Municipiul București 2022-2023")
    boundary = load("schools", "Limită Administrativă - Municipiul București")
    check(school.featureCount() == 757, "Full București source, not Sector 1")
    ownership = "Regim Juridic - Tip de proprietate"
    groups = collections.Counter(f[ownership] for f in school.getFeatures())
    check(dict(groups) == {"Public de interes național și local": 465, "Privat": 292}, "Original nominal values and counts")
    sectors = collections.Counter(f["Sector"] for f in school.getFeatures())
    check(dict(sectors) == {1: 164, 2: 141, 3: 142, 4: 108, 5: 78, 6: 124}, "Original sectors, integers, no NULL")
    contract = json.loads((ROOT / "data/workshop-reproducibility.json").read_text(encoding="utf-8"))
    expression = contract["workshops"]["T01"]["expressions"]["highest_documented_level"]
    check(copied_expression("T01", 14) == expression, "Rendered CASE equals source contract")
    levels = ["Nivel Antepreșcolar", "Nivel Preșcolar", "Nivel Primar", "Nivel Gimnazial", "Nivel Liceal"]
    extra = ["Învățământ Profesional", "Nivel Postliceal", "Învățământ Special", "Club"]
    memory = QgsVectorLayer("Point?crs=EPSG:4326", "CASE cases", "memory")
    memory.dataProvider().addAttributes([QgsField(name, QVariant.Int) for name in levels + extra])
    memory.updateFields()
    evaluate = evaluator(expression, memory)
    for flags in itertools.product([0, 1], repeat=5):
        marked = [i for i, value in enumerate(flags) if value]
        expected = levels[max(marked)].removeprefix("Nivel ") if marked else "Fără nivel marcat în cele cinci câmpuri"
        for others in itertools.product([0, 1], repeat=4):
            feature = QgsFeature(memory.fields())
            feature.setAttributes(list(flags + others))
            check(evaluate(feature) == expected, "Highest level; orthogonal fields do not change rank")
    for index in range(5):
        for value, expected in [(NULL, "Date incomplete"), (2, "Valori de verificat"), (-1, "Valori de verificat")]:
            feature = QgsFeature(memory.fields())
            values = [1] * 9
            values[index] = value
            feature.setAttributes(values)
            check(evaluate(feature) == expected, "NULL and unexpected markers remain separate")
    calculate = evaluator(expression, school)
    classified = collections.Counter(calculate(f) for f in school.getFeatures())
    check(sum(classified.values()) == 757, "CASE covers every original feature")
    check(not any(label in classified for label in ["Date incomplete", "Valori de verificat"]), "Actual five fields complete/binary")
    report["T01"] = {"features": 757, "ownership": dict(groups), "sectors": dict(sectors), "case": dict(classified), "binary_combinations": 512}
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(3844)
    axes = [(srs.GetAxisName(None, i), srs.GetAxisOrientation(None, i)) for i in range(2)]
    check(axes == [("Northing", 1), ("Easting", 3)], "EPSG authority axis order north/east")
    report["EPSG3844_axes"] = axes

    print("CASE and axes PASS", flush=True)
    check(all(QFontMetrics(layout_font).inFontUcs4(ord(c)) for c in "ȘșȚțăâîN0123456789"), "Export font contains Romanian glyphs")
    # Actual categorized renderer, full-city extent, legend and scale bars in both CRSs.
    categories = []
    for value, color in zip(groups, ["#355f81", "#c65340"]):
        symbol = QgsSymbol.defaultSymbol(school.geometryType())
        symbol.setColor(QColor(color))
        categories.append(QgsRendererCategory(value, symbol, value))
    school.setRenderer(QgsCategorizedSymbolRenderer(ownership, categories))
    boundary.renderer().setSymbol(QgsFillSymbol.createSimple({"color": "255,255,255,0", "outline_color": "80,80,80", "outline_width": "0.4"}))
    check(len(school.renderer().categories()) == 2, "Nominal renderer, no CASE dependency")
    project = QgsProject.instance()
    project.setEllipsoid("WGS84")
    project.addMapLayer(school)
    project.addMapLayer(boundary)
    for epsg in [4326, 3844]:
        target = QgsCoordinateReferenceSystem("EPSG:" + str(epsg))
        project.setCrs(target)
        layout = QgsLayout(project)
        layout.initializeDefaults()
        layout.pageCollection().pages()[0].setPageSize("A4", QgsLayoutItemPage.Landscape)
        item = QgsLayoutItemMap(layout)
        layout.addLayoutItem(item)
        item.attemptMove(QgsLayoutPoint(10, 20))
        item.attemptResize(QgsLayoutSize(195, 170))
        item.setCrs(target)
        item.setLayers([school, boundary])
        extent = QgsCoordinateTransform(boundary.crs(), target, project).transformBoundingBox(boundary.extent())
        extent.scale(1.06)
        item.zoomToExtent(extent)
        legend = QgsLayoutItemLegend(layout)
        legend.setTitle("Tip de proprietate")
        legend.setLinkedMap(item)
        for style in [QgsLegendStyle.Title, QgsLegendStyle.Group, QgsLegendStyle.Subgroup, QgsLegendStyle.SymbolLabel]:
            legend.setStyleFont(style, layout_font)
        legend.model().rootGroup().findLayer(school.id()).setName("Unități școlare")
        legend.model().rootGroup().findLayer(boundary.id()).setName("Limită administrativă")
        layout.addLayoutItem(legend)
        legend.attemptMove(QgsLayoutPoint(210, 30))
        scale = QgsLayoutItemScaleBar(layout)
        scale.setStyle("Single Box")
        scale.setLinkedMap(item)
        scale.applyDefaultSize()
        scale.setUnits(Qgis.DistanceUnit.Kilometers)
        scale.setUnitsPerSegment(1)
        scale.setNumberOfSegments(2)
        scale.setUnitLabel("km")
        scale.setFont(layout_font)
        layout.addLayoutItem(scale)
        scale.attemptMove(QgsLayoutPoint(15, 185))
        check(math.isfinite(item.scale()) and item.scale() > 1000, "Valid map scale in EPSG:" + str(epsg))
        check(scale.sizeWithUnits().width() > 0, "Scale bar rendered, including geographic map")
        label = QgsLayoutItemLabel(layout)
        label.setFont(layout_font)
        label.setText("Unități de învățământ după proprietate, 2022–2023\nSursa: ADIZMB / Observatorul Urban Metropolitan București · CC BY 4.0")
        layout.addLayoutItem(label)
        label.attemptMove(QgsLayoutPoint(10, 2))
        label.attemptResize(QgsLayoutSize(280, 16))
        north = QgsLayoutItemLabel(layout)
        north.setFont(layout_font)
        north.setText("N ↑")
        layout.addLayoutItem(north)
        north.attemptMove(QgsLayoutPoint(270, 20))
        north.attemptResize(QgsLayoutSize(15, 10))
        exporter = QgsLayoutExporter(layout)
        png, pdf = OUT / ("t01-" + str(epsg) + ".png"), OUT / ("t01-" + str(epsg) + ".pdf")
        settings = QgsLayoutExporter.ImageExportSettings()
        settings.dpi = 150
        settings.exportMetadata = False
        check(exporter.exportToImage(str(png), settings) == QgsLayoutExporter.Success, "Actual PNG export")
        check(exporter.exportToPdf(str(pdf), QgsLayoutExporter.PdfExportSettings()) == QgsLayoutExporter.Success, "Actual PDF export")
        check(png.stat().st_size > 10000 and pdf.stat().st_size > 10000, "Nonempty exports")
        report["exports"].append({"crs": epsg, "scale": item.scale(), "units": "km", "png": png.name, "pdf": pdf.name})

    print("Layouts PASS", flush=True)
    catchment = load("schools", "Delimitarea Circumscripțiilor Școlare din Municipiul București 2022-2023")
    rate = evaluator(copied_expression("T02", 16), catchment)
    rates = [rate(f) for f in catchment.getFeatures()]
    check(len(rates) == 174 and rates.count(None) == 1, "Original T02 denominator NULL remains NULL")
    synthetic = QgsFeature(catchment.fields())
    for pupils, rooms, expected in [(100, 10, 10), (0, 10, 0), (NULL, 10, None), (100, 0, None), (100, NULL, None)]:
        synthetic["Număr total elevi"], synthetic["Număr săli de clasă"] = pupils, rooms
        check(rate(synthetic) == expected, "Rate zero/NULL boundary")
    report["T02"] = {"features": len(rates), "null_rate": rates.count(None)}
    secondary = load("medical", "Cabinete și Ambulatorii de Specialitate (Secondary Care)")
    hospitals = load("medical", "Spitale București-Ilfov (Tertiary Care)")
    for layer, expr, expected in [(secondary, '"Contract Ecograf" = 1', 132), (hospitals, '"CT - Computer Tomograf" = 1', 29), (hospitals, '"RMN - Rezonanță Magnetică Nucleară" = 1', 22)]:
        count = sum(1 for _ in layer.getFeatures(QgsFeatureRequest().setFilterExpression(expr)))
        check(count == expected, "Original medical filter " + expr)
    report["T03"] = {"secondary": 1082, "hospitals": 158, "ecograf_contract": 132, "CT": 29, "RMN": 22}
    sports = load("sports", "02_Baze_Sportive_București_1991-2024")
    area = evaluator(copied_expression("T04", 16), sports)
    areas = [area(f) for f in sports.getFeatures()]
    check(len(areas) == 157 and all(v is not None and math.isfinite(v) and v >= 0 for v in areas), "Metric hectares on original sports polygons")
    report["T04"] = {"features": 157, "states": dict(collections.Counter(f["Stare"] for f in sports.getFeatures())), "ownership": dict(collections.Counter(f["Tip proprietate"] for f in sports.getFeatures())), "area_ha_range": [min(areas), max(areas)]}

    print("T02-T04 PASS", flush=True)
    # Original national grid, but processing/attribute checks are scoped to București.
    census_file = SOURCES / "census2021-original.gpkg"
    grid = QgsVectorLayer(str(census_file) + "|layername=recensamant2021_griddata", "Census 2021", "ogr")
    check(grid.isValid() and grid.featureCount() == 240290 and grid.crs().authid() == "EPSG:3844", "National original grid")
    mask = processing.run("native:reprojectlayer", {"INPUT": boundary, "TARGET_CRS": grid.crs(), "OUTPUT": "memory:"})["OUTPUT"]
    request = QgsFeatureRequest().setFilterRect(mask.extent())
    candidates = list(grid.getFeatures(request))
    subset = QgsVectorLayer("Polygon?crs=EPSG:3844", "Original cells around București", "memory")
    subset.dataProvider().addAttributes(list(grid.fields()))
    subset.updateFields()
    subset.dataProvider().addFeatures(candidates)
    clipped = processing.run("native:clip", {"INPUT": subset, "OVERLAY": mask, "OUTPUT": "memory:"})["OUTPUT"]
    by_id = {f["GRD_ID"]: f for f in candidates}
    truncated = 0
    for feature in clipped.getFeatures():
        original = by_id[feature["GRD_ID"]]
        check(feature.attributes() == original.attributes(), "Clip preserves every original attribute")
        truncated += feature.geometry().area() < original.geometry().area() - 1
    check(clipped.featureCount() > 100 and truncated > 0, "Real boundary Clip truncates cells")
    share = evaluator(copied_expression("T05", 19), subset)
    shares = [share(f) for f in subset.getFeatures()]
    check(all(v is None or 0 <= v <= 100 for v in shares), "Actual under-15 percentages")
    report["T05"] = {"national_features": 240290, "bbox_cells": len(candidates), "clipped_cells": clipped.featureCount(), "truncated_cells": truncated, "attributes_unchanged": True}
    # Lot 5.3: project operations, real originals for vectors; synthetic terrain only.
    metric_school = processing.run("native:reprojectlayer", {"INPUT": school, "TARGET_CRS": QgsCoordinateReferenceSystem("EPSG:3844"), "OUTPUT": "memory:"})["OUTPUT"]
    buffers = processing.run("native:buffer", {"INPUT": metric_school, "DISTANCE": 500, "SEGMENTS": 20, "END_CAP_STYLE": 0, "JOIN_STYLE": 0, "MITER_LIMIT": 2, "DISSOLVE": False, "OUTPUT": "memory:"})["OUTPUT"]
    union = processing.run("native:dissolve", {"INPUT": buffers, "FIELD": [], "OUTPUT": "memory:"})["OUTPUT"]
    check(buffers.featureCount() == 757, "Original school Buffer: one output per point")
    union_area = sum(f.geometry().area() for f in union.getFeatures())
    check(0 < union_area < sum(f.geometry().area() for f in buffers.getFeatures()), "Dissolve eliminates overlapping buffer areas")
    prepared_grid = processing.run("native:fieldcalculator", {"INPUT": subset, "FIELD_NAME": "aria_originala", "FIELD_TYPE": 0, "FIELD_LENGTH": 24, "FIELD_PRECISION": 6, "FORMULA": "area($geometry)", "OUTPUT": "memory:"})["OUTPUT"]
    intersection = processing.run("native:intersection", {"INPUT": prepared_grid, "OVERLAY": union, "OUTPUT": "memory:"})["OUTPUT"]
    weights = collections.defaultdict(float)
    estimate = evaluator('"Populatia_totala_T" * area($geometry) / "aria_originala"', intersection)
    for feature in intersection.getFeatures():
        original = by_id[feature["GRD_ID"]]
        check(feature["Populatia_totala_T"] == original["Populatia_totala_T"], "Intersection preserves population, no redistribution")
        fraction = feature.geometry().area() / original.geometry().area()
        check(abs(feature["aria_originala"] - original.geometry().area()) < 0.01, "Original area field copied unchanged")
        expected = original["Populatia_totala_T"] * fraction
        check(abs(estimate(feature) - expected) < 1e-6, "QGIS area-weighted estimate matches independent geometry reference")
        weights[feature["GRD_ID"]] += fraction
    check(all(0 < w <= 1 + 1e-8 for w in weights.values()), "Dissolved coverage weights never double-count a cell")
    medical = load("medical", "Cabinete și Ambulatorii de Specialitate (Secondary Care)", source_ids=True)
    check(medical.setSubsetString('"Contract Ecograf" = 1'), 'Valid actual medical subset field')
    hubs = processing.run("native:reprojectlayer", {"INPUT": medical, "TARGET_CRS": QgsCoordinateReferenceSystem("EPSG:3844"), "OUTPUT": "memory:"})["OUTPUT"]
    legacy_to_source = {str(f.id()): str(f["source_fid"]) for f in hubs.getFeatures()}
    hubs = processing.run("native:fieldcalculator", {"INPUT": hubs, "FIELD_NAME": "hub_id", "FIELD_TYPE": 2, "FIELD_LENGTH": 30, "FIELD_PRECISION": 0, "FORMULA": '"source_fid"', "OUTPUT": "memory:"})["OUTPUT"]
    origins = QgsVectorLayer("Point?crs=EPSG:3844", "Five original school locations", "memory")
    origins.dataProvider().addAttributes([QgsField("origin_id", QVariant.String)])
    origins.updateFields()
    origin_features = []
    for source in itertools.islice(metric_school.getFeatures(), 5):
        origin = QgsFeature(origins.fields()); origin.setGeometry(source.geometry())
        origin["origin_id"] = str(source.id()); origin_features.append(origin)
    origins.dataProvider().addFeatures(origin_features)
    medical_buffers = processing.run("native:buffer", {"INPUT": hubs, "DISTANCE": 500, "SEGMENTS": 20, "END_CAP_STYLE": 0, "JOIN_STYLE": 0, "MITER_LIMIT": 2, "DISSOLVE": False, "OUTPUT": "memory:"})["OUTPUT"]
    check(medical_buffers.featureCount() == 132, "Alternative Buffer on original eligible medical points")
    # E53-02: select service buffers, not the origins or a dissolved union.
    processing.run("native:selectbylocation", {"INPUT": medical_buffers, "PREDICATE": [0], "INTERSECT": origins, "METHOD": 0})
    selected_services = processing.run("native:saveselectedfeatures", {"INPUT": medical_buffers, "OUTPUT": "memory:"})["OUTPUT"]
    origin_geometries = [f.geometry() for f in origins.getFeatures()]
    expected_services = {str(f["hub_id"]) for f in medical_buffers.getFeatures() if any(f.geometry().intersects(g) for g in origin_geometries)}
    selected_ids = {str(f["hub_id"]) for f in selected_services.getFeatures()}
    check(selected_ids == expected_services, "Select by Location retains exactly the intersecting service IDs")
    check(0 < len(selected_ids) < 132, "Original test points select a nontrivial subset of the 132 eligible services")
    check(selected_services.featureCount() == len(selected_ids), "One selected buffer per service, never a dissolved union")
    check(selected_ids == {legacy_to_source["37"], legacy_to_source["72"]}, "Same two independently audited services, now linked to original fid")
    check(selected_ids == {"215", "497"}, "Original GeoPackage primary keys independently identified in Op6.1")
    hub_geometries = {str(f["hub_id"]): f.geometry() for f in hubs.getFeatures()}
    for feature in selected_services.getFeatures():
        check(str(feature["hub_id"]) in hub_geometries, "Selected buffer identifies an eligible original service")
        check(any(hub_geometries[str(feature["hub_id"])].distance(g) <= 500 + 1e-7 for g in origin_geometries), "Selected service satisfies the Euclidean threshold")
    print("PF selected service IDs", sorted(selected_ids), flush=True)
    nearest = processing.run("qgis:distancetonearesthubpoints", {"INPUT": origins, "HUBS": hubs, "FIELD": "hub_id", "UNIT": 0, "OUTPUT": "memory:"})["OUTPUT"]
    known_hubs = {str(f["hub_id"]) for f in hubs.getFeatures()}
    print("PF nearest counts", origins.featureCount(), hubs.featureCount(), nearest.featureCount(), flush=True)
    check(nearest.featureCount() == 5 and hubs.featureCount() == 132, "Nearest on real origins and eligible services")
    for feature in nearest.getFeatures():
        check(str(feature["HubName"]) in known_hubs and feature["HubDist"] >= 0, "Nearest reports documented eligible hub and distance")
    reversed_hubs = QgsMemoryProviderUtils.createMemoryLayer("Reversed eligible originals", hubs.fields(), hubs.wkbType(), hubs.crs())
    reversed_hubs.dataProvider().addFeatures(list(reversed(list(hubs.getFeatures()))))
    reversed_buffers = processing.run("native:buffer", {"INPUT": reversed_hubs, "DISTANCE": 500, "SEGMENTS": 20, "END_CAP_STYLE": 0, "JOIN_STYLE": 0, "MITER_LIMIT": 2, "DISSOLVE": False, "OUTPUT": "memory:"})["OUTPUT"]
    processing.run("native:selectbylocation", {"INPUT": reversed_buffers, "PREDICATE": [0], "INTERSECT": origins, "METHOD": 0})
    check({str(f["hub_id"]) for f in reversed_buffers.getSelectedFeatures()} == selected_ids, "Service selection independent of record order")
    reversed_nearest = processing.run("qgis:distancetonearesthubpoints", {"INPUT": origins, "HUBS": reversed_hubs, "FIELD": "hub_id", "UNIT": 0, "OUTPUT": "memory:"})["OUTPUT"]
    check({f["origin_id"]: (str(f["HubName"]), round(f["HubDist"], 7)) for f in nearest.getFeatures()} == {f["origin_id"]: (str(f["HubName"]), round(f["HubDist"], 7)) for f in reversed_nearest.getFeatures()}, "Nearest service identity/distance independent of order in this original-data fixture")
    report["medical_identity"] = {"key": "original GeoPackage fid copied as source_fid before filtering; hub_id aliases source_fid", "scope": "stable within the checksummed original GeoPackage, not guaranteed across a new source export", "legacy_to_source": {k: legacy_to_source[k] for k in ["37", "72"]}, "selected": [{"source_fid": f["source_fid"], "name": f["Nume firmă"]} for f in selected_services.getFeatures()], "reversed_order": "PASS"}
    # Synthetic 9x9 DEM: slope of a plane, never a replacement for Suceava originals.
    dem_path, slope_path = OUT / "pf-synthetic-dem.tif", OUT / "pf-synthetic-slope.tif"
    import numpy as np
    values = np.tile(np.arange(9, dtype="float32") * 30 + 100, (9, 1))
    values[6, 6] = -9999
    dem = gdal.GetDriverByName("GTiff").Create(str(dem_path), 9, 9, 1, gdal.GDT_Float32)
    dem.SetGeoTransform((500000, 30, 0, 500000, 0, -30))
    metric_srs = osr.SpatialReference(); metric_srs.ImportFromEPSG(3844)
    dem.SetProjection(metric_srs.ExportToWkt())
    dem.GetRasterBand(1).SetNoDataValue(-9999); dem.GetRasterBand(1).WriteArray(values); dem = None
    processing.run("native:slope", {"INPUT": str(dem_path), "Z_FACTOR": 1, "OUTPUT": str(slope_path)})
    slope = gdal.Open(str(slope_path)); band = slope.GetRasterBand(1); arr = band.ReadAsArray()
    check(abs(float(arr[2, 2]) - 45) < 0.001, "QGIS Slope outputs degrees, independent plane reference")
    raw_missing_center = float(arr[6, 6])
    from qgis.analysis import QgsRasterCalculator, QgsRasterCalculatorEntry
    from qgis.core import QgsRasterLayer
    dem_layer = QgsRasterLayer(str(dem_path), "dem")
    slope_layer = QgsRasterLayer(str(slope_path), "slope")
    entries = []
    for ref, layer in [("dem@1", dem_layer), ("slope@1", slope_layer)]:
        entry = QgsRasterCalculatorEntry(); entry.ref = ref; entry.raster = layer; entry.bandNumber = 1; entries.append(entry)
    masked_path = OUT / "pf-synthetic-slope-masked.tif"
    calculator = QgsRasterCalculator('"dem@1" * 0 + "slope@1"', str(masked_path), "GTiff", dem_layer.extent(), 9, 9, entries, project.transformContext())
    check(calculator.processCalculation() == 0, "Explicit valid DEM mask via QGIS Raster Calculator")
    masked = gdal.Open(str(masked_path)); masked_band = masked.GetRasterBand(1); masked_values = masked_band.ReadAsArray()
    check(float(masked_values[6, 6]) == masked_band.GetNoDataValue(), "Explicit mask excludes missing DEM center")
    check(abs(float(masked_values[2, 2]) - 45) < 0.001, "Mask preserves valid slope")

    report["PF"] = {"vectors": "PASS on original ADIZMB schools/medical and original census cells around București", "buffers": buffers.featureCount(), "medical_buffers": medical_buffers.featureCount(), "selected_service_ids": sorted(selected_ids), "selection_method": "Select by Location: individual service buffers intersect five original school points; IDs preserved in memory export", "union_area_m2": union_area, "intersection_features": intersection.featureCount(), "nearest_origins": nearest.featureCount(), "raster_slope": "PASS synthetic plane only; full Suceava NETESTAT", "raw_slope_at_missing_dem": raw_missing_center, "explicit_dem_mask": "PASS", "qgis_gui_344": "NETESTAT"}
    report["T06"] = verify_suceava(os.environ["QA_SUCEAVA_DATA_ROOT"], project) if os.environ.get("QA_SUCEAVA_DATA_ROOT") else {"status": "NETESTAT without configured Suceava originals", "reason": "Set QA_SUCEAVA_DATA_ROOT for representative original-data execution; no GUI3.44 claim or Rîșca substitution."}
    if os.environ.get("QA_SUCEAVA_DATA_ROOT"):
        report["PF"]["raster_slope"] = "PASS synthetic reference and original Suceava ROI; upstream reprojection/full county/GUI3.44 not certified"
    for file, digest in before.items():
        report["originals"].append({"file": file.name, "sha256": digest})
        check(hashlib.sha256(file.read_bytes()).hexdigest() == digest, "Original left byte-identical: " + file.name)
    report.update(status="PASS", checks=checks)
    (OUT / "qgis-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))

try:
    if sys.argv[1:2] == ["--mask-conventions-only"]:
        report["scope"] = "Read-only Suceava 6km mask conventions, not full-county processing or GUI"
        report["T06"] = verify_suceava_mask_conventions(sys.argv[2])
        report.update(status="PASS", checks=checks)
        (OUT / "mask-conventions-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"status":report["status"],"checks":checks,"counts":report["T06"]["counts"],"differences":report["T06"]["differences"]}))
    else:
        run_checks()
except Exception:
    import traceback
    traceback.print_exc()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(1)
QgsProject.instance().clear()
app.exitQgis()

# Verify originals again after provider/application teardown, not only inside run_checks.
for original in report["originals"]:
    file = next(p for p in SOURCES.rglob("*.gpkg") if p.name == original["file"])
    if hashlib.sha256(file.read_bytes()).hexdigest() != original["sha256"]:
        raise AssertionError("Original changed during QGIS teardown: " + original["file"])
for file, expected in report["T06"].get("original_files", {}).items():
    h = hashlib.sha256()
    with Path(file).open("rb") as stream:
        for block in iter(lambda: stream.read(4 * 1024 * 1024), b""): h.update(block)
    if h.hexdigest() != expected: raise AssertionError("Suceava original changed during teardown: " + file)
