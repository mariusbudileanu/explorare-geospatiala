"""Independent P06 oracle: exact Fraction WLC; Floyd-Warshall network, no JS outputs."""
from fractions import Fraction as F
from pathlib import Path
import json,itertools

def rows(barrier=False,slow=False,quality='complete'):
 n=14; d=[[None]*n for _ in range(n)]
 for i in range(n): d[i][i]=F(0)
 edges=[]
 for i in range(12):
  if i%4<3: edges.append((i,i+1,3 if i//4==0 else 6))
  if i<8: edges.append((i,i+4,6))
 edges.append((12,13,3))
 for a,b,v in edges:
  if barrier and (a,b) in [(1,2),(9,10)]: continue
  if slow and (a,b)==(5,6): v=1
  metres=500 if a==12 else 1000
  d[a][b]=d[b][a]=F(metres*60,v*1000)
 for k in range(n):
  for i in range(n):
   for j in range(n):
    if d[i][k] is not None and d[k][j] is not None:
     v=d[i][k]+d[k][j]
     if d[i][j] is None or v<d[i][j]:d[i][j]=v
 ids=[3,5,7,10,11,12,13];served=[500,300,750,450,900,600,200];costs=[80,40,110,60,150,50,30]
 return [dict(id=str(i),travel=d[0][i],served=F(500) if quality=='constant' else None if quality=='missing' and k==1 else 'unknown' if quality=='invalid' and k==2 else F(served[k]),investment=F(costs[k]),protected=k in [2,5])for k,i in enumerate(ids)]

def oracle(rs,weights,cap=None,protected=False):
 keys=['travel','served','investment'];sw=sum(weights);effective=[F(w,sw) if sw else F(0) for w in weights];domains=[]
 for k in keys:
  vs=[r[k] for r in rs if isinstance(r[k],F)];domains.append((min(vs),max(vs)))
 result=[]
 for r in rs:
  ns=[];reasons=[]
  if protected and r['protected']:reasons.append('constraint-protected')
  if cap is not None and r['investment']>cap:reasons.append('constraint-cap')
  for k,(lo,hi),w in zip(keys,domains,effective):
   v=r[k];z=None if not isinstance(v,F) else F(1,2) if lo==hi else (v-lo)/(hi-lo) if k=='served' else (hi-v)/(hi-lo)
   ns.append(z)
   if w>0 and z is None:reasons.append('data-'+k+('-null' if v is None else '-error'))
  contributions=[F(0) if w==0 else None if z is None else z*w for z,w in zip(ns,effective)];score=sum(contributions) if sw and not reasons else None
  result.append(dict(id=r['id'],normalized=ns,contributions=contributions,score=score,rank=None,reasons=reasons))
 ranked=sorted([r for r in result if r['score'] is not None],key=lambda r:(-r['score'],r['id']));anchor=None;rank=0
 for i,r in enumerate(ranked):
  if anchor is None or abs(anchor-r['score'])>F(1,10**12):anchor=r['score'];rank=i+1
  r['rank']=rank
 return dict(rows=result,effective=effective,leaders=[r['id'] for r in ranked if r['rank']==1],domains=domains)

cases=[]
for barrier,slow,quality,weights,cap,protected in itertools.product([False,True],[False,True],['complete','missing','invalid','constant'],[(1,1,1),(0,1,0),(1,0,0),(0,0,0),(2,3,7),(10**100,2*10**100,7*10**100)],[None,70],[False,True]):
 opts=dict(barrier=barrier,slow=slow,quality=quality,weights=dict(zip(['travel','served','investment'],weights)),cap=cap,excludeProtected=protected)
 cases.append(dict(options=opts,expected=oracle(rows(barrier,slow,quality),weights,cap,protected)))
def convert(v):
 if isinstance(v,F):return float(v)
 raise TypeError(type(v))
path=Path(__file__).with_name('p06-reference.json');path.write_text(json.dumps({'method':'Independent Python Fraction WLC + Floyd-Warshall; no browser or JavaScript expected values','cases':cases},default=convert,separators=(',',':')),encoding='utf-8',newline='\n')
print('Independent P06 cases:',len(cases))
