"""Independent P05 references: exact Fraction Moran and Floyd-Warshall, no JS output."""
from fractions import Fraction as F
from pathlib import Path
import json,itertools,math
widths=[500,1000,1500,1000];heights=[1000,500,1500,1000]
counts=[10,15,80,95,12,18,85,100,20,25,110,125,22,30,120,140]
cells=[]
for r,c in itertools.product(range(4),repeat=2):
 i=r*4+c;x=sum(widths[:c]);y=sum(heights[:r]);cells.append(dict(id=i,x=x,y=y,right=x+widths[c],bottom=y+heights[r],area=F(widths[c]*heights[r],1000000),count=counts[i],eligible=200+i*20))
def touches(a,b,queen):
 dx=min(a['right'],b['right'])-max(a['x'],b['x']);dy=min(a['bottom'],b['bottom'])-max(a['y'],b['y'])
 return dx>=0 and dy>=0 and (queen or dx>0 or dy>0)
stats=[]
for zoning,variable,neighbors,normalization,island,pattern in itertools.product(['fine','blocks','rows','columns'],['count','density','rate'],['rook','queen'],['row','binary'],[False,True],['cluster','checker','uniform']):
 groups={}
 for c in cells:
  i=c['id'];r,col=divmod(i,4);k=i if zoning=='fine' else (r//2*2+col//2 if zoning=='blocks' else r if zoning=='rows' else col)
  groups.setdefault(k,[]).append(c)
 zones=[]
 for k,cs in groups.items():
  count=sum(F(c['count']) if pattern=='cluster' else F(100 if sum(divmod(c['id'],4))%2 else 10) if pattern=='checker' else c['area']*100 for c in cs);area=sum(c['area'] for c in cs);eligible=sum(c['eligible'] for c in cs)
  zones.append(dict(id=k,count=count,area=area,eligible=eligible,value=count if variable=='count' else count/area if variable=='density' else count/eligible*100,members=cs))
 n=len(zones);adj=[[F(int(i!=j and (not island or (i!=n-1 and j!=n-1)) and any(touches(a,b,neighbors=='queen') for a in g['members'] for b in h['members']))) for j,h in enumerate(zones)]for i,g in enumerate(zones)]
 weights=[[v/sum(row) if normalization=='row' and sum(row) else v for v in row]for row in adj];x=[g['value'] for g in zones];mean=sum(x)/n;den=sum((v-mean)**2 for v in x);s0=sum(map(sum,weights));I=F(n,1)/s0*sum(weights[i][j]*(x[i]-mean)*(x[j]-mean) for i in range(n) for j in range(n))/den if den and s0 else None
 stats.append(dict(options=dict(zoning=zoning,variable=variable,neighbors=neighbors,normalization=normalization,island=island,pattern=pattern),values=[float(v) for v in x],counts=[float(g['count'])for g in zones],areas=[float(g['area'])for g in zones],weights=[[float(v)for v in r]for r in weights],I=float(I) if I is not None else None,s0=float(s0)))
nodes=[(i%4*1000,i//4*1000) for i in range(12)]+[(3500,2600),(4000,2600)]
edges=[]
for i in range(12):
 if i%4<3:edges.append((i,i+1,3 if i//4==0 else 6))
 if i<8:edges.append((i,i+4,6))
edges.append((12,13,3))
networks=[]
for barrier,slow,cost in itertools.product([False,True],[False,True],['distance','time']):
 d=[[math.inf]*14 for _ in nodes]
 for i in range(14):d[i][i]=0
 for a,b,speed in edges:
  if barrier and (a,b) in [(1,2),(9,10)]:continue
  if slow and (a,b)==(5,6):speed=1
  length=math.dist(nodes[a],nodes[b]);w=length if cost=='distance' else length/speed*.06
  d[a][b]=d[b][a]=w
 for k in range(14):
  for i in range(14):
   for j in range(14):d[i][j]=min(d[i][j],d[i][k]+d[k][j])
 networks.append(dict(options=dict(barrier=barrier,slow=slow,cost=cost),distances=[[v if math.isfinite(v)else None for v in row]for row in d]))
out={'method':'Exact Fraction Moran on geometric rectangle contacts; independent all-pairs Floyd-Warshall','cells':[{k:float(v) if isinstance(v,F) else v for k,v in c.items()}for c in cells],'statistics':stats,'networks':networks}
Path(__file__).with_name('p05-reference.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
print(json.dumps({'statistics':len(stats),'networkConfigs':len(networks),'routeReferences':len(networks)*14*14}))
