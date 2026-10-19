"""Independent GDAL/PROJ/GEOS/NumPy oracle; no JavaScript or expression evaluator.
Usage in the installed GIS Python runtime: script.py EXTERNAL_OUTPUT_FILE.json
Does not modify source rasters, metadata or existing fixtures.
"""
import hashlib,json,sys
from pathlib import Path
import numpy as np
from osgeo import gdal
from pyproj import CRS,Transformer
from shapely import contains_xy,transform
from shapely.geometry import shape,Polygon
from shapely.ops import unary_union

root=Path(__file__).resolve().parents[2]
definition=next(c['proj4'] for c in json.loads((root/'data/crs-registry.json').read_text(encoding='utf8'))['crs'] if c['epsg']==3844)
tr=Transformer.from_crs('EPSG:4326',CRS.from_proj4(definition),always_xy=True)
boundary=json.loads((root/'data/challenges/risca/risca_boundary.geojson').read_text(encoding='utf8'))
polygon=unary_union([transform(shape(f['geometry']),tr.transform,interleaved=False) for f in boundary['features']])
spec=json.loads((root/'data/challenges/risca/raster_metadata.json').read_text(encoding='utf8'))['rasters']['dem']
source=root/'data/challenges/risca'/spec['filename'];ds=gdal.Open(str(source));assert ds is not None;gt=ds.GetGeoTransform()
values=np.frombuffer(ds.ReadRaster(buf_type=gdal.GDT_Float64),dtype='<f8').reshape(ds.RasterYSize,ds.RasterXSize)
rows,cols=np.indices(values.shape);x=gt[0]+(cols+.5)*gt[1]+(rows+.5)*gt[2];y=gt[3]+(cols+.5)*gt[4]+(rows+.5)*gt[5]
mask=contains_xy(polygon,x,y)&np.isfinite(values)
nodata=ds.GetRasterBand(1).GetNoDataValue()
if nodata is not None:mask&=values!=nodata
selected=mask&(values<500);output=np.where(selected,1.,0.).astype('<f8')
result=dict(method='GDAL Float64 read; explicit PROJ transformation; GEOS pixel-centre containment; NumPy mask and comparison',sourceSHA256=hashlib.sha256(source.read_bytes()).hexdigest(),valid=int(mask.sum()),selected=int(selected.sum()),pixelArea=abs(gt[1]*gt[5]-gt[2]*gt[4]),maskSHA256=hashlib.sha256(mask.astype('u1').tobytes()).hexdigest(),outputSHA256=hashlib.sha256(output.tobytes()).hexdigest())
result['selectedHA']=result['selected']*result['pixelArea']/10000
# Tangency at one point does not disconnect the interior: OGC-valid GEOS oracle.
outer=[[26,44],[26.1,44],[26.1,44.1],[26,44.1],[26,44]]
holes=[[[26,44.05],[26.02,44.04],[26.02,44.06],[26,44.05]],[[26.02,44.02],[26.04,44.02],[26.04,44.04],[26.02,44.04],[26.02,44.02]],[[26.04,44.04],[26.06,44.04],[26.06,44.06],[26.04,44.06],[26.04,44.04]]]
result['touchingRings']=[dict(coordinates=[outer,holes[0]],ogcValid=Polygon(outer,[holes[0]]).is_valid),dict(coordinates=[outer,*holes[1:]],ogcValid=Polygon(outer,holes[1:]).is_valid)]
assert result['valid']==376159 and result['selected']==112309
assert all(g['ogcValid'] for g in result['touchingRings'])
Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps(result))
