"""Independent NumPy TPS oracle. Reads explicit inputs, never browser/model output.
Usage: python generate-v3-inverse-reference.py input-cases.json
The fixtures are validation coordinates, not a new GIS dataset.
"""
import json,sys,numpy as np
from pathlib import Path
def tps(source,target):
    source=np.array(source,float);target=np.array(target,float)
    center=source.mean(0);scale=np.sqrt(np.mean(np.sum((source-center)**2,axis=1))/2)
    u=(source-center)/scale;v=target-target.mean(0)
    d=((u[:,None,:]-u[None,:,:])**2).sum(2);kernel=np.zeros_like(d);mask=d>0;kernel[mask]=.5*d[mask]*np.log(d[mask])
    p=np.c_[np.ones(len(u)),u];matrix=np.block([[kernel,p],[p.T,np.zeros((3,3))]])
    coefficients=np.linalg.solve(matrix,np.r_[v,np.zeros((3,2))]);mean=target.mean(0)
    def apply(points):
        q=(np.array(points,float)-center)/scale;r=((q[:,None,:]-u[None,:,:])**2).sum(2);k=np.zeros_like(r);mask=r>0;k[mask]=.5*r[mask]*np.log(r[mask])
        return np.c_[k,np.ones(len(q)),q]@coefficients+mean
    return apply
payload=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
cases=payload['cases'] if isinstance(payload,dict) else payload
for c in cases:
    source=np.array([[p['x'],p['y']]for p in c['gcps']]);target=np.array([[p['E'],p['N']]for p in c['gcps']]);forward=tps(source,target);inverse=tps(target,source);r=c['frame']
    grid=np.array([[r['E0']+r['w']*r['res']*i/32,r['N1']-r['h']*r['res']*j/24]for i in range(33)for j in range(25)])
    map_error=np.linalg.norm(forward(inverse(grid))-grid,axis=1)/r['res'];probes=np.array(c['sourceProbes']);source_error=np.linalg.norm(inverse(forward(probes))-probes,axis=1)
    c['expected']={'maxMapPixels':float(map_error.max()),'maxSourcePixels':float(source_error.max()),'rmse':float(np.sqrt(np.mean(np.sum((forward(source)-target)**2,axis=1))))}
Path(__file__).with_name('v3-inverse-reference.json').write_text(json.dumps({'oracle':'Independent NumPy TPS solves; 33x25 target grid and explicit source probes','cases':cases},ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print('Independent TPS reference:',len(cases),'cases')
