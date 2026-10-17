"""Independent references: pyproj/PROJ WGS84 Geod and Shapely/GEOS.
No browser/model outputs are used. Run with the existing QGIS Python runtime.
"""
import json, math, random
from pathlib import Path
import pyproj
from shapely.geometry import Polygon, LineString, Point, mapping

root=Path(__file__).resolve().parents[2]
registry=json.loads((root/'data/crs-registry.json').read_text('utf-8'))
geod=pyproj.Geod(ellps='WGS84')
shapes=[
    {'type':'distance','coordinates':[[26.106,44.432],[26.106001,44.432]]},
    {'type':'distance','coordinates':[[26.106,44.432],[26.116,44.432]]},
    {'type':'distance','coordinates':[[21,44],[29,48]]},
    {'type':'distance','coordinates':[[24,46],[24,47]]},
    {'type':'distance','coordinates':[[26.106,55],[26.116,55]]},
    {'type':'line','coordinates':[[26,44],[26.1,44.1],[26.2,44]]},
    {'type':'polygon','coordinates':[[[26.1,44.4],[26.2,44.4],[26.18,44.46],[26.1,44.45],[26.1,44.4]]]},
    {'type':'polygon','coordinates':[[[26.1,44.4],[26.2,44.4],[26.2,44.5],[26.1,44.5],[26.1,44.4]],[[26.12,44.42],[26.14,44.42],[26.14,44.44],[26.12,44.44],[26.12,44.42]]]},
]
shapes.append({'type':'polygon','coordinates':[list(reversed(r)) for r in shapes[-1]['coordinates']]})
def segment_length(r):return sum(geod.inv(*a,*b)[2] for a,b in zip(r,r[1:]))
def ellipsoid_area(r):return abs(geod.polygon_area_perimeter(*zip(*r))[0])
def densify(r):
    out=[]
    for a,b in zip(r,r[1:]):
        n=max(1,math.ceil(geod.inv(*a,*b)[2]/250));out.append(a)
        if n>1:out.extend(geod.npts(*a,*b,n-1))
    return out+[r[-1]]
cases=[]
for g in shapes:
    polygon=g['type']=='polygon';rings=g['coordinates'] if polygon else [g['coordinates']]
    for code in [4326,3857,3844,32634,32635]:
        definition=next(c['proj4'] for c in registry['crs'] if c['epsg']==code)
        tx=pyproj.Transformer.from_crs('EPSG:4326',definition,always_xy=True)
        rs=[[tx.transform(*p) for p in (densify(r) if polygon else r)] for r in rings]
        projected=Polygon(rs[0],rs[1:]) if polygon else LineString(rs[0])
        cases.append({'geometry':g,'crs':'EPSG:'+str(code),'geodesicLength':sum(segment_length(r) for r in rings),'geodesicArea':ellipsoid_area(rings[0])-sum(ellipsoid_area(r) for r in rings[1:]) if polygon else None,'planarLength':projected.length if code!=4326 else None,'planarArea':projected.area if code!=4326 and polygon else None})
(root/'tests/qa/measurement-reference.json').write_text(json.dumps({'source':'pyproj '+pyproj.__version__+' / PROJ '+pyproj.proj_version_str+'; WGS84 Geod; Shapely planar area/length; always_xy; 250m geodesic densification','cases':cases},indent=2)+'\n',encoding='utf-8')

def f(g,id='a',layer='A'):return {'id':id,'layer':layer,**mapping(g)}
square=Polygon([(0,0),(10,0),(10,10),(0,10)]);donut=Polygon(square.exterior.coords,[[(3,3),(7,3),(7,7),(3,7)]])
triangle=Polygon([(0,0),(10,0),(0,10)])
line=LineString([(0,0),(10,0)])
rows=[]
def row(type,rule,good,bad,ref=()):
    rows.extend([{'type':type,'rule':rule,'target':a,'reference':list(ref),'expected':v} for a,v in [(good,True),(bad,False)]])
row('Point','covered',[f(Point(5,0))],[f(Point(5,1))],[f(line,'r','B')])
row('Point','point-end',[f(Point(0,0))],[f(Point(5,0))],[f(line,'r','B')])
row('Point','inside',[f(Point(1,1))],[f(Point(5,5))],[f(donut,'r','B')])
for type,g in [('Point',Point(1,1)),('LineString',line),('Polygon',triangle)]:
    row(type,'duplicates',[f(g)],[f(g),f(g,'b')])
    bad={'Point':{'type':'Point','coordinates':[None,0]},'LineString':{'type':'LineString','coordinates':[[0,0],[0,0]]},'Polygon':{'type':'Polygon','coordinates':[[[0,0],[10,10],[0,10],[10,0],[0,0]]]}}[type]
    row(type,'invalid',[f(g)],[{'id':'a','layer':'A',**bad}])
    coords={'Point':[[0,0],[1,1]],'LineString':[[[0,0],[1,1]],[[2,2],[3,3]]],'Polygon':[[[[0,0],[2,0],[0,2],[0,0]]],[[[5,5],[7,5],[5,7],[5,5]]]]}[type]
    row(type,'multipart',[f(g)],[{'id':'a','layer':'A','type':'Multi'+type,'coordinates':coords}])
row('LineString','line-end',[f(line)],[f(LineString([(0,0),(9,0)]))],[f(Point(0,0),'r1','B'),f(Point(10,0),'r2','B')])
closed=LineString([(0,0),(10,0),(5,10),(0,0)])
row('LineString','dangles',[f(closed)],[f(line)])
row('LineString','pseudos',[f(LineString([(0,0),(5,0),(10,0)]))],[f(LineString([(0,0),(5,0)])),f(LineString([(5,0),(10,0)]),'b')])
row('Polygon','contain',[f(square)],[f(donut)],[f(Point(5,5),'r','B')])
row('Polygon','gaps',[f(square)],[f(donut)])
row('Polygon','overlap',[f(triangle),f(Polygon([(10,0),(10,10),(0,10)]),'b')],[f(triangle),f(Polygon([(2,0),(12,0),(2,10)]),'b')])
row('Polygon','overlap-with',[f(triangle)],[f(Polygon([(5,0),(15,0),(5,10)]))],[f(Polygon([(10,0),(10,10),(0,10)]),'r','B')])
assert len(rows)==38
(root/'tests/qa/topology-matrix.json').write_text(json.dumps({'source':'Independent Cartesian coordinates and hand-checked rule expectations; GEOS-generated geometry serialization. Boundary triangle pair shares only its diagonal. Donut hole is strictly interior.','cases':rows},indent=2)+'\n',encoding='utf-8')

# Independent overlay oracle, including concave polygons, containment and holes.
rng=random.Random(2970410)
overlays=[]
for i in range(40):
    x=rng.uniform(-8,12);y=rng.uniform(-8,12)
    a=donut if i%3==0 else triangle if i%3==1 else Polygon([(0,0),(10,0),(10,3),(3,3),(3,10),(0,10)])
    b=Polygon([(x,y),(x+8,y),(x+4,y+9)])
    hit=a.intersection(b)
    overlays.append({'a':f(a),'b':f(b,'b'),'area':hit.area,'overlap':hit.area>1e-9})
(root/'tests/qa/topology-overlay-reference.json').write_text(json.dumps({'source':'Shapely/GEOS intersection; seed 2970410; independent Cartesian polygon oracle','cases':overlays},indent=2)+'\n',encoding='utf-8')
