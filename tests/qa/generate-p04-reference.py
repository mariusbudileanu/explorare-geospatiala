"""Independent Shapely, GDAL, PROJ and NumPy references; no browser output."""
import json, math
from pathlib import Path
import numpy as np
from osgeo import gdal
from pyproj import CRS, Transformer
from shapely.geometry import LineString, Polygon, shape
from shapely.ops import unary_union
from shapely import contains_xy, transform

root=Path(__file__).resolve().parents[2]
line=LineString([(0,0),(10,0),(20,3),(30,0),(40,0),(50,20),(60,0),(70,0),(80,-3),(90,0),(100,0)])
notch=Polygon([(0,0),(100,0),(100,100),(60,100),(50,80),(40,100),(0,100)])
geometries=[]
for tolerance in [0,1,3,5,15,25,200]:
    result=line.simplify(tolerance,preserve_topology=False)
    geometries.append(dict(scene='line',tolerance=tolerance,coordinates=list(result.coords),length=result.length,vertices=len(result.coords),sourceLength=line.length))
for tolerance in [0,1,5,15,25]:
    result=notch.simplify(tolerance,preserve_topology=False)
    geometries.append(dict(scene='polygon',tolerance=tolerance,area=result.area,vertices=len(result.exterior.coords)-1))
metadata=json.loads((root/'data/challenges/risca/raster_metadata.json').read_text(encoding='utf-8'))
registry=json.loads((root/'data/crs-registry.json').read_text(encoding='utf-8'))
definition=next(c['proj4'] for c in registry['crs'] if c['epsg']==3844)
tr=Transformer.from_crs('EPSG:4326',CRS.from_proj4(definition),always_xy=True)
boundary=json.loads((root/'data/challenges/risca/risca_boundary.geojson').read_text(encoding='utf-8'))
polygons=unary_union([transform(shape(f['geometry']),tr.transform,interleaved=False) for f in boundary['features']])
rasters={}
for source in ['dem','forestLoss']:
    spec=metadata['rasters'][source];ds=gdal.Open(str(root/'data/challenges/risca'/spec['filename']));a=np.frombuffer(ds.ReadRaster(buf_type=gdal.GDT_Float64),dtype=np.float64).reshape(ds.RasterYSize,ds.RasterXSize);gt=ds.GetGeoTransform()
    rows,cols=np.indices(a.shape);x=gt[0]+(cols+.5)*gt[1]+(rows+.5)*gt[2];y=gt[3]+(cols+.5)*gt[4]+(rows+.5)*gt[5]
    mask=contains_xy(polygons,x,y)&np.isfinite(a)
    if source=='forestLoss':mask &= a!=0
    rasters[source]=(a,mask,gt)
dem,mask,gt=rasters['dem'];valid=np.zeros_like(mask)
valid[1:-1,1:-1]=np.logical_and.reduce([mask[r:r+mask.shape[0]-2,c:c+mask.shape[1]-2] for r in range(3) for c in range(3)])
du=(dem[:-2,2:]+2*dem[1:-1,2:]+dem[2:,2:]-dem[:-2,:-2]-2*dem[1:-1,:-2]-dem[2:,:-2])/8
dv=(dem[2:,:-2]+2*dem[2:,1:-1]+dem[2:,2:]-dem[:-2,:-2]-2*dem[:-2,1:-1]-dem[:-2,2:])/8
slope=np.full_like(dem,np.nan);slope[1:-1,1:-1]=np.degrees(np.arctan(np.hypot(du/gt[1],dv/gt[5])))
forest,fmask,fgt=rasters['forestLoss']
fr,fc=np.indices(forest.shape);fx=fgt[0]+(fc+.5)*fgt[1];fy=fgt[3]+(fr+.5)*fgt[5]
u=(fx-gt[0])/gt[1]-.5;v=(fy-gt[3])/gt[5]-.5;col=np.floor(u).astype(int);row=np.floor(v).astype(int)
inside=(col>=0)&(row>=0)&(col+1<dem.shape[1])&(row+1<dem.shape[0]);ci=np.clip(col,0,dem.shape[1]-2);ri=np.clip(row,0,dem.shape[0]-2)
known=inside&valid[ri,ci]&valid[ri,ci+1]&valid[ri+1,ci]&valid[ri+1,ci+1]
dx=u-col;dy=v-row
aligned=slope[ri,ci]*(1-dx)*(1-dy)+slope[ri,ci+1]*dx*(1-dy)+slope[ri+1,ci]*(1-dx)*dy+slope[ri+1,ci+1]*dx*dy
loss=fmask&((forest==13)|(forest==14))
mapping=metadata['rasters']['forestLoss']['value_to_year']['mapping']
counts={str(year):int(np.count_nonzero(fmask&(forest==int(code)))) for code,year in mapping.items()}
native=dict(slopeValid=int(valid.sum()),slopeAbove10=int(np.count_nonzero(valid&(slope>10))),r6Known=int(np.count_nonzero(loss&known)),r6Unknown=int(np.count_nonzero(loss&~known)),r6Above10=int(np.count_nonzero(loss&known&(aligned>10))),demValid=int(mask.sum()),demThreshold500=int(np.count_nonzero(mask&(dem>=500))),demTerrain500Slope10=int(np.count_nonzero(valid&(dem>=500)&(slope>=10))),forestValid=int(fmask.sum()),forestYears=counts,forestCellArea=abs(fgt[1]*fgt[5]-fgt[2]*fgt[4]))
output=dict(method='Shapely/GEOS simplification; independent GDAL/PROJ/Shapely centre mask and NumPy Horn',geometry=geometries,native=native)
(root/'tests/qa/p04-reference.json').write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
