"""Offline independent P07 reference generator. Requires NumPy; never fetches source data."""
from pathlib import Path
import json,math,itertools,datetime,numpy as np
xy=np.array([(x,-y)for y in [0,100,200,300]for x in [0,100,200,300]],float);probes=np.array([(37,-43),(143,-217),(269,-111),(80,-270)],float)
def mapping(t,p):
 x,y=p[:,0],p[:,1]
 if t=='linear':return np.c_[585000+1.7*x,323500+1.6*y]
 if t=='helmert':return np.c_[585000+2*x-.3*y,323500+.3*x+2*y]
 if t=='projective':
  den=1+.0002*x-.0001*y;return np.c_[(585000+1.7*x+.1*y)/den,(323500+.05*x+1.6*y)/den]
 a=585000+1.7*x+.1*y;b=323500+.05*x+1.6*y
 if t in ['poly2','poly3','tps']:a+=.0003*x*x-.0002*x*y;b+=.0001*y*y
 if t=='poly3':a+=.0000002*x*x*y;b+=.0000001*x*y*y
 return np.c_[a,b]
cases=[]
for t in ['linear','helmert','poly1','poly2','poly3','projective','tps']:
 for noise in [0,.6]:
  dst=mapping(t,xy)+noise*np.c_[np.sin(np.arange(16)),np.cos(np.arange(16))];cases.append({'type':t,'gcps':[dict(x=x,y=y,E=E,N=N)for(x,y),(E,N)in zip(xy,dst)],'probes':probes.tolist()})

def fit(t,src,dst):
 ms=src.mean(0);scale=np.sqrt(np.mean(np.sum((src-ms)**2,axis=1))/2);u=(src-ms)/scale;md=dst.mean(0);target=dst-md
 if t=='linear':
  cx=np.linalg.lstsq(np.c_[np.ones(len(u)),u[:,0]],target[:,0],rcond=None)[0];cy=np.linalg.lstsq(np.c_[np.ones(len(u)),u[:,1]],target[:,1],rcond=None)[0]
  return lambda p:np.c_[np.c_[np.ones(len(p)),((p-ms)/scale)[:,0]]@cx,np.c_[np.ones(len(p)),((p-ms)/scale)[:,1]]@cy]+md
 if t=='helmert':
  A=np.zeros((2*len(u),4));A[::2]=np.c_[np.ones(len(u)),np.zeros(len(u)),u[:,0],-u[:,1]];A[1::2]=np.c_[np.zeros(len(u)),np.ones(len(u)),u[:,1],u[:,0]];c=np.linalg.lstsq(A,target.ravel(),rcond=None)[0]
  return lambda p:np.c_[c[0]+c[2]*((p-ms)/scale)[:,0]-c[3]*((p-ms)/scale)[:,1],c[1]+c[3]*((p-ms)/scale)[:,0]+c[2]*((p-ms)/scale)[:,1]]+md
 if t.startswith('poly'):
  order=int(t[-1]);design=lambda p:np.array([((p-ms)/scale)[:,0]**(degree-j)*((p-ms)/scale)[:,1]**j for degree in range(order+1)for j in range(degree+1)]).T;c=np.linalg.lstsq(design(src),target,rcond=None)[0];return lambda p:design(p)@c+md
 if t=='projective':
  ds=np.sqrt(np.mean(np.sum(target**2,axis=1))/2);v=target/ds;A=[]
  for(x,y),(E,N)in zip(u,v):A.extend([[-x,-y,-1,0,0,0,E*x,E*y,E],[0,0,0,-x,-y,-1,N*x,N*y,N]])
  _,_,vh=np.linalg.svd(A);H=vh[-1].reshape(3,3)
  def f(p):
   h=np.c_[(p-ms)/scale,np.ones(len(p))]@H.T;return h[:,:2]/h[:,2,None]*ds+md
  return f
 dist=((u[:,None,:]-u[None,:,:])**2).sum(2);K=np.zeros_like(dist);mask=dist>0;K[mask]=.5*dist[mask]*np.log(dist[mask]);P=np.c_[np.ones(len(u)),u];L=np.block([[K,P],[P.T,np.zeros((3,3))]]);coef=np.linalg.solve(L,np.r_[target,np.zeros((3,2))])
 def f(p):
  v=(p-ms)/scale;r2=((v[:,None,:]-u[None,:,:])**2).sum(2);q=np.zeros_like(r2);mask=r2>0;q[mask]=.5*r2[mask]*np.log(r2[mask]);return np.c_[q,np.ones(len(p)),v]@coef+md
 return f

# Independent oracle: enumerate native index sets/chunk keys. No browser/JS results used.
base=datetime.date(1961,1,1);NT=32872
med={'max_temp':[[3.0498,7.6629,2.7626],[6.7993,9.3689,5.0071],[3.4856,6.0617,4.3958]],'min_temp':[[3.0865,7.4737,2.6991],[6.8595,9.2510,4.9307],[3.4986,6.1365,4.5353]],'precipitation':[[1.4352,3.0717,1.0866],[2.9953,3.6723,1.8064],[1.4774,2.4281,1.6862]]}
layouts={'A':(90,161,324),'B':(3650,32,32),'C':(32872,16,16)}
zarr=[]
inputs=[]
for v,l,s,loc,f,d in itertools.product(list(med),list(layouts),['punct','harta','sezon','serie'],[(26.1025,44.4268),(21.2257,45.7489),(28.6348,44.1598)],[True,False],['2025-07-01','2049-12-31']):inputs.append(dict(var=v,layout=l,sc=s,lon=loc[0],lat=loc[1],filtru=f,data=d,an=int(d[:4]),anot='JJA'))
for l,y,season in itertools.product(layouts,[1961,2000,2026,2050],['DJF','MAM','SON']):inputs.append(dict(var='max_temp',layout=l,sc='sezon',lon=26.1025,lat=44.4268,filtru=True,data=f'{y}-01-01',an=y,anot=season))
for s in inputs:
 ct,cy,cx=layouts[s['layout']];ix=min(971,max(0,math.floor((s['lon']-20.13)/.01+1e-9)));iy=min(482,max(0,math.floor((48.36-s['lat'])/.01+1e-9)))
 frontier=(datetime.date(2026,10,16 if s['var']=='min_temp'else 15)-base).days;day=min(NT-1,max(0,(datetime.date.fromisoformat(s['data'])-base).days))
 if s['sc']=='punct':t0,t1,y0,y1,x0,x1=day,day,iy,iy,ix,ix
 elif s['sc']=='harta':t0,t1,y0,y1,x0,x1=day,day,0,482,0,971
 elif s['sc']=='serie':t0,t1,y0,y1,x0,x1=0,frontier if s['filtru']else NT-1,iy,iy,ix,ix
 else:
  y=s['an'];m0,m1={'DJF':(12,2),'MAM':(3,5),'JJA':(6,8),'SON':(9,11)}[s['anot']];first=datetime.date(y-1 if m0==12 else y,m0,1);last=datetime.date(y,m1+1,1)-datetime.timedelta(days=1)
  t0=max(0,(first-base).days);t1=min(NT-1,(last-base).days);y0=iy//161*161;y1=min(482,y0+160);x0=ix//324*324;x1=min(971,x0+323)
 keys=list(itertools.product(range(t0//ct,t1//ct+1),range(y0//cy,y1//cy+1),range(x0//cx,x1//cx+1)));future=sum(t*ct>frontier for t,y,x in keys);raw=len(keys)*ct*cy*cx*4;util=(t1-t0+1)*(y1-y0+1)*(x1-x0+1)*4
 mb=sum(.0758 if t*ct>frontier else med[s['var']][y][x]for t,y,x in keys)if s['layout']=='A'else raw/1e6/3.5
 zarr.append({'state':s,'expected':dict(nObj=len(keys),rawChunk=ct*cy*cx*4,raw=raw,util=util,viitorObj=future,mbEst=mb,timp=math.ceil(len(keys)/10)*.15+mb/11,ix=ix,iy=iy)})
geo=[]
for c in cases:
 dst=np.array([(g['E'],g['N'])for g in c['gcps']]);oracle=fit(c['type'],xy,dst);res=dst-oracle(xy);entry={**c,'expected':{'forward':oracle(probes).tolist(),'residuals':res.tolist(),'rmse':float(np.sqrt(np.mean(np.sum(res**2,axis=1))))}}
 if c['type'].startswith('poly')or c['type']=='tps':entry['expected']['inverse']=fit(c['type'],dst,xy)(dst).tolist()
 geo.append(entry)
path=Path(__file__).with_name('p07-reference.json');path.write_text(json.dumps({'method':'Independent Python chunk-set enumeration and NumPy least-squares/SVD/TPS; no UI outputs','zarr':zarr,'georef':geo},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(path,len(zarr),len(geo))
