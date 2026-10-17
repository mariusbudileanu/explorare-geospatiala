"""Independent PROJ factors, in each projection's native geodetic frame.
No browser outputs are used as expected values. Run with the existing pyproj runtime.
"""
import json, re, math
from pathlib import Path
import pyproj

root = Path(__file__).resolve().parents[2]
registry = json.loads((root/'data/crs-registry.json').read_text(encoding='utf-8'))
cases = []
for code in [3857, 3844, 32634, 32635, 3035]:
    crs = next(c for c in registry['crs'] if c['epsg'] == code)
    definition = re.sub(r'\s*\+towgs84=\S+', '', crs['proj4'])
    for point in [[26.106,44.432],[26.22,47.35],[23.96,46.2],[24,46],[25,46]]:
        if code == 3844:
            geo = '+proj=longlat +ellps=krass '+re.search(r'\+towgs84=\S+',crs['proj4'])[0]
            native = list(pyproj.Transformer.from_crs('EPSG:4326',geo,always_xy=True).transform(*point))
        else:
            native = point
        f = pyproj.Proj(definition).get_factors(*native)
        row={'crs':crs['id'],'point':point,'native':native,'major':f.tissot_semimajor,'minor':f.tissot_semiminor,'east':f.parallel_scale,'north':f.meridional_scale,'area':f.areal_scale,'angle':f.angular_distortion}
        if code == 3857:
            # PROJ's pseudo-Mercator factors use its computational sphere. Our
            # declared ground reference is WGS84: use independent analytic radii.
            phi=math.radians(point[1]); rf=298.257223563; e2=2/rf-1/rf**2
            w=math.sqrt(1-e2*math.sin(phi)**2)
            east=w/math.cos(phi); north=w**3/((1-e2)*math.cos(phi))
            row.update(major=north,minor=east,east=east,north=north,area=east*north,angle=math.degrees(2*math.asin((north-east)/(north+east))),method='Analytic spherical Mercator differential divided by WGS84 curvature radii')
        cases.append(row)
(root/'tests/qa/distortion-reference.json').write_text(json.dumps({'source':'pyproj '+pyproj.__version__+' / PROJ '+pyproj.proj_version_str+' get_factors; native geodetic coordinates; datum differential excluded','cases':cases},indent=2)+'\n',encoding='utf-8')
