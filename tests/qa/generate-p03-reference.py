"""Independent P03 references: analytic surfaces, spherical geometry and GEOS.
Run with the already installed QGIS Python; never imports the JS under test.
"""
import json
import math
from pathlib import Path
from shapely.geometry import box, Polygon, MultiPolygon, mapping
from pyproj import Geod

root = Path(__file__).resolve().parents[2]
sphere = Geod(a=6371008.8, b=6371008.8)
terrain = []
for gx, gy in [(0, 0), (.1, .2), (-.1, .2), (.1, -.2), (-.1, -.2), (1, 0), (0, 1)]:
    for az in [0, 90, 180, 270, 315]:
        for alt in [0, 45, 90]:
            slope = math.atan(math.hypot(gx, gy))
            aspect = None if gx == gy == 0 else math.degrees(math.atan2(-gx, -gy)) % 360
            normal = [-gx, -gy, 1]
            light = [math.cos(math.radians(alt))*math.sin(math.radians(az)), math.cos(math.radians(alt))*math.cos(math.radians(az)), math.sin(math.radians(alt))]
            shade = 255 * max(0, sum(a*b for a, b in zip(normal, light))/math.sqrt(sum(a*a for a in normal)))
            terrain.append(dict(gx=gx, gy=gy, azimuth=az, altitude=alt, degrees=math.degrees(slope), percent=100*math.hypot(gx, gy), aspect=aspect, shade=shade))
overlays = []
scenes = [([box(26,44,26.02,44.02),box(26.015,44.005,26.035,44.025)],box(26.01,43.995,26.03,44.02)),([box(26,44,26.01,44.01)],box(26.04,44.04,26.05,44.05)),([box(26,44,26.01,44.01)],box(26.01,44,26.02,44.01)),([MultiPolygon([box(26,44,26.01,44.01),box(26.03,44,26.04,44.01)])],box(26.005,43.995,26.035,44.015))]
def spherical_area(g):
    # Surface integral for straight lon/lat edges (Turf domain), not GEOS area.
    if g.is_empty or g.geom_type not in ['Polygon','MultiPolygon']:
        return 0
    if g.geom_type == 'MultiPolygon':
        return sum(spherical_area(p) for p in g.geoms)
    def ring(r):
        c = list(r.coords)
        return abs(sum(math.radians(b[0]-a[0])*(math.sin(math.radians(a[1]))+math.sin(math.radians(b[1]))) for a,b in zip(c,c[1:])))*6371008.8**2/2
    return ring(g.exterior)-sum(ring(r) for r in g.interiors)
for name,(polys,boundary) in zip(['normal','empty','touch','multipart'],scenes):
    intersections = [p.intersection(boundary) for p in polys]
    intersections = [p for p in intersections if p.area > 0]
    overlays.append(dict(scene=name,count=len(intersections),planarArea=sum(p.area for p in intersections),sphereArea=sum(spherical_area(p) for p in intersections)))
distances=[]
for a,b in [([26.005,44.01],[26.02,44.01]),([26.005,44.01],[26.01,44.02]),([26.02,44.01],[26.01,44.02])]:
    distances.append(dict(a=a,b=b,metres=sphere.inv(*a,*b)[2]))
result=dict(method='Independent Python analytical surfaces, pyproj sphere and Shapely/GEOS overlays',terrain=terrain,overlays=overlays,distances=distances)
(root/'tests/qa/p03-reference.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
