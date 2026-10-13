"""Independent exhaustive partition oracle (no JavaScript or QGIS outputs as expectations)."""
import itertools,json,math,statistics,random,pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
values=[0,3,5,5,7,10,12,15,18,20,25,30,35,40,45,50,60,75,90,120,200,400,900,None]
den=[100,30,50,100,35,100,0,100,90,None,100,100,100,200,150,100,200,250,300,400,500,800,1200,None]
cases=[('absolute',values),('rate',[v/d*100 if v is not None and d else None for v,d in zip(values,den)]),('ordered',[0,1,2,3,4,5,6,40]),('unordered',[40,4,2,6,0,3,5,1]),('duplicates',[0,0,0,1,1,3,8,8,100]),('all-equal',[5,5,5,5]),('tiny',[0,-2]),('negative',[-100,-20,-10,-10,-1,0,4]),('null',[None,None])]
rng=random.Random(872)
for i in range(24):cases.append(('seeded-'+str(i),[rng.randint(-12,18) for _ in range(8)]))
result=[]
for name,raw in cases:
    s=sorted(v for v in raw if v is not None);u=sorted(set(s))
    for requested in [1,4,5,7]:
        k=min(requested,len(u))
        for method in ['equal','quantile','jenks']:
            if not s:breaks=[]
            elif k==1:breaks=[s[0],s[-1]]
            elif method=='equal':breaks=[s[0]]+[s[0]+(s[-1]-s[0])*i/k for i in range(1,k)]+[s[-1]]
            elif method=='quantile':
                upper=[]
                for i in range(1,k):
                    p=(len(s)-1)*i/k;lo=math.floor(p);upper.append(s[lo]+(s[lo+1]-s[lo])*(p-lo))
                breaks=[s[0]]+sorted(set(upper+[s[-1]]))
            else:
                # Enumerate every contiguous partition of distinct values; evaluate using raw observations.
                costs={}
                for a in range(len(u)):
                    for b in range(a+1,len(u)+1):
                        group=[x for x in s if u[a]<=x<=u[b-1]];mean=statistics.mean(group)
                        costs[a,b]=math.fsum((x-mean)**2 for x in group)
                best=None
                for cuts in itertools.combinations(range(1,len(u)),k-1):
                    edges=(0,)+cuts+(len(u),);score=math.fsum(costs[a,b] for a,b in zip(edges,edges[1:]));key=(score,tuple(reversed(cuts)))
                    if best is None or key<best[0]:best=(key,edges)
                breaks=[s[0]]+[u[end-1] for end in best[1][1:]]
            assignments=[None if v is None else next(i for i,b in enumerate(breaks[1:]) if v<=b+1e-12) for v in raw]
            result.append(dict(name=name,values=raw,method=method,classes=requested,breaks=breaks,assignments=assignments))
(ROOT/'tests/qa/classification-reference.json').write_text(json.dumps(dict(oracle='Independent exhaustive contiguous partitions, raw SSE; quantiles linear (n-1); Python standard library',cases=result),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Independent reference cases:',len(result))
