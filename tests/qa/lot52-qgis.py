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

from qgis.core import (
    NULL, Qgis, QgsApplication, QgsCategorizedSymbolRenderer, QgsCoordinateReferenceSystem,
    QgsCoordinateTransform, QgsExpression, QgsExpressionContext, QgsExpressionContextUtils,
    QgsFeature, QgsFeatureRequest, QgsField, QgsGeometry, QgsLayout, QgsLayoutExporter,
    QgsLayoutItemLabel, QgsLayoutItemLegend, QgsLayoutItemMap, QgsLayoutItemPage, QgsLayoutItemScaleBar,
    QgsLayoutPoint, QgsLayoutSize, QgsLegendStyle, QgsFillSymbol, QgsPointXY, QgsProject, QgsRendererCategory,
    QgsSymbol, QgsVectorLayer,
)
from qgis.PyQt.QtCore import QVariant
from qgis.PyQt.QtGui import QColor, QFont, QFontDatabase, QFontMetrics
from osgeo import ogr, osr

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tmp/qa/lot52"
SOURCES = Path(sys.argv[1]) if len(sys.argv) > 1 else OUT / "sources"
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


def load(folder, layer_name):
    for file in (SOURCES / folder).rglob("*.gpkg"):
        dataset = ogr.Open(str(file), 0)
        if dataset.GetLayerByName(layer_name) is not None:
            layer = QgsVectorLayer(str(file) + "|layername=" + layer_name, layer_name, "ogr")
            check(layer.isValid(), "Load original " + layer_name)
            return layer
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
    report["T06"] = {"status": "NETESTAT full Suceava workflow", "reason": "No original Suceava DEM/mask and no interactive 3.44 session; Rîșca is not substituted. Provider documentation/header evidence is separate."}
    for file, digest in before.items():
        report["originals"].append({"file": file.name, "sha256": digest})
        check(hashlib.sha256(file.read_bytes()).hexdigest() == digest, "Original left byte-identical: " + file.name)
    report.update(status="PASS", checks=checks)
    (OUT / "qgis-results.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))

try:
    run_checks()
except Exception:
    import traceback
    traceback.print_exc()
    sys.stdout.flush()
    sys.stderr.flush()
    os._exit(1)
QgsProject.instance().clear()
app.exitQgis()
