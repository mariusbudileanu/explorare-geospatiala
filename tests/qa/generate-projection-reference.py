"""Independent fixtures: pyproj/PROJ, not browser code. Run with a pyproj environment."""
import json, math
from pathlib import Path
import pyproj
from pyproj.transformer import TransformerGroup

ROOT = Path(__file__).resolve().parents[2]
g = pyproj.Geod(ellps='WGS84')
codes = [4326, 3857, 3844, 32634, 32635]
transforms = {}
for code in codes:
    group = TransformerGroup(4326, code, always_xy=True)
    transforms[code] = next((t for t in group.transformers if '(19)' in t.description), group.transformers[0]) if code == 3844 else group.transformers[0]

def direct(p, az, distance):
    lon, lat, _ = g.fwd(*p, az, distance)
    return [lon, lat]

def distance(a, b):
    return g.inv(*a, *b)[2]

def area(ring):
    return abs(g.polygon_area_perimeter([p[0] for p in ring], [p[1] for p in ring])[0])

def densify(points, closed=False, step=250):
    result = []
    for i in range(len(points) if closed else len(points)-1):
        a, b = points[i], points[(i+1) % len(points)]
        az, _, d = g.inv(*a, *b)
        n = max(1, math.ceil(d/step))
        result += [a if j == 0 else direct(a, az, d*j/n) for j in range(n)]
    return result if closed else result+[points[-1]]

def planar(points):
    o = points[0]
    return abs(sum((a[0]-o[0])*(b[1]-o[1])-(b[0]-o[0])*(a[1]-o[1]) for a,b in zip(points,points[1:]+points[:1])))/2

centres = [[26.106,44.432],[26.22,47.35],[23.96,46.2]]
distances = []
for p in centres:
    for d in [.001,.1,1,1000,10000,50000,500000]:
        q = direct(p,45,d)
        distances.append({'a':p,'b':q,'metres':distance(p,q)})
for a,b in [([0,0],[90,0]),([-73,40],[2,49]),([-3,-20],[80,70]),([0,0],[179.999,-.001]),([26,44],[26,44])]:
    distances.append({'a':a,'b':b,'metres':distance(a,b)})
areas, scenes = [], []
for p in centres:
    for km in [1,10,25,50]:
        ring = [direct(p,az,km*1000/math.sqrt(2)) for az in [-135,-45,45,135]]
        areas += [{'ring':ring,'square_metres':area(ring)},{'ring':ring[::-1],'square_metres':area(ring[::-1])}]
        segment = [p,direct(p,45,km*1000)]
        boundary = densify(ring,True)
        projected = []
        for code in codes:
            t = transforms[code]
            points = [list(t.transform(*x)) for x in boundary]
            ends = [t.transform(*x) for x in segment]
            projected.append({'crs':f'EPSG:{code}','center':list(t.transform(*p)),
                              'distance':None if code==4326 else math.dist(*ends),
                              'area':None if code==4326 else planar(points)})
        scenes.append({'center':p,'km':km,'distance':distance(*segment),'area':area(ring),'boundary_count':len(boundary),'projected':projected})
for ring in [[[0,0],[1,0],[1,1],[0,1]],[[-12,-20],[-11,-20],[-11,-19],[-12,-19]]]:
    areas.append({'ring':ring,'square_metres':area(ring)})
tiny=[direct(centres[0],az,1) for az in [-135,-45,45,135]]
areas.append({'ring':tiny,'square_metres':area(tiny)})
transformation = []
for p in centres+[[-73,40],[-3,-20],[0,0]]:
    for code in codes:
        if code==3844 and p not in centres: continue
        transformation.append({'input':p,'crs':f'EPSG:{code}','expected':list(transforms[code].transform(*p))})
reference={'implementation':f'pyproj {pyproj.__version__} / PROJ {pyproj.proj_version_str}; Geod WGS84; always_xy',
           'datum_operation':transforms[3844].description,
           'densification_max_step_m':250,'distances':distances,'areas':areas,'scenes':scenes,'transformations':transformation}
(ROOT/'tests/qa/projection-reference.json').write_text(json.dumps(reference,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'distances':len(distances),'areas':len(areas),'scenes':len(scenes),'transformations':len(transformation)}))
