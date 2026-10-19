/* P06: WLC only. Routing/statistics remain in P05; missing-value semantics in CARTO_EXPRESSION. */
(function(root){
  'use strict';
  const finite=v=>typeof v==='number'&&Number.isFinite(v),sum=a=>a.reduce((s,v)=>s+v,0),need=(b,m='Invalid decision input')=>{if(!b)throw Error(m);};
  const criteria=[{id:'travel',name:['Timp de rețea','Network time'],unit:'min',direction:'cost'},{id:'served',name:['Gospodării potențiale','Potential households'],unit:'households',direction:'benefit'},{id:'investment',name:['Investiție','Investment'],unit:'kEUR',direction:'cost'}];
  function value(raw){const E=root.CARTO_EXPRESSION,r=E.evaluate(E.compile('"value"'),()=>raw===null||raw===undefined?E.NULL:raw);return r.kind==='value'?(finite(r.value)?{kind:'value',value:r.value}:{kind:'error',code:'numeric-required'}):r;}
  function normalize(x,lo,hi,direction){need([x,lo,hi].every(finite)&&lo<=x&&x<=hi&&['benefit','cost'].includes(direction));if(lo===hi)return .5;const scale=Math.max(Math.abs(lo),Math.abs(hi))||1;const span=hi-lo,b=Number.isFinite(span)?(x-lo)/span:(x/scale-lo/scale)/(hi/scale-lo/scale);return Math.max(0,Math.min(1,direction==='benefit'?b:1-b));}
  function evaluate(rows,cs,weights,{cap=null,excludeProtected=false}={}){
    need(Array.isArray(rows)&&rows.length>0&&rows.length<=64&&Array.isArray(cs)&&cs.length>0&&cs.length<=12);
    need(new Set(rows.map(r=>r.id)).size===rows.length&&rows.every(r=>typeof r.id==='string'));
    need(new Set(cs.map(c=>c.id)).size===cs.length&&cs.every(c=>typeof c.id==='string'&&['benefit','cost'].includes(c.direction)));
    need(cap===null||finite(cap)&&cap>=0);need(typeof excludeProtected==='boolean');
    const rawWeights=cs.map(c=>weights[c.id]);need(rawWeights.every(w=>finite(w)&&w>=0),'Weights must be finite and nonnegative');
    const max=Math.max(...rawWeights),scaled=rawWeights.map(w=>max?w/max:0),total=sum(scaled),effective=Object.fromEntries(cs.map((c,i)=>[c.id,total?scaled[i]/total:0]));
    const parsed=rows.map(r=>Object.fromEntries(cs.map(c=>[c.id,value(r[c.id])]))),domains=Object.fromEntries(cs.map(c=>{const vs=parsed.flatMap(r=>r[c.id].kind==='value'?[r[c.id].value]:[]);return [c.id,vs.length?{min:Math.min(...vs),max:Math.max(...vs),constant:Math.min(...vs)===Math.max(...vs)}:null];}));
    const result=rows.map((r,i)=>{const reasons=[];if(r.networkReachable===false)reasons.push('constraint-unreachable');if(excludeProtected){if(typeof r.protected!=='boolean')reasons.push('constraint-protected-unknown');else if(r.protected)reasons.push('constraint-protected');}if(cap!==null){const p=value(r.investment);if(p.kind!=='value')reasons.push('constraint-investment-unknown');else if(p.value>cap)reasons.push('constraint-cap');}
      const cells=Object.fromEntries(cs.map(c=>{const p=parsed[i][c.id],d=domains[c.id],n=p.kind==='value'&&d?normalize(p.value,d.min,d.max,c.direction):null;if(weights[c.id]>0&&n===null&&!(c.id==='travel'&&r.networkReachable===false))reasons.push('data-'+c.id+'-'+p.kind);return [c.id,{...p,normalized:n,active:weights[c.id]>0,weight:effective[c.id],contribution:effective[c.id]===0?0:n===null?null:effective[c.id]*n}];}));
      const eligible=reasons.length===0,score=total&&eligible?sum(cs.map(c=>cells[c.id].contribution)):null;
      return {id:r.id,x:r.x,y:r.y,cells,reasons,eligible,score,rank:null};});
    const ranked=result.filter(r=>r.score!==null).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    // Competition ranks anchored to the first score of each tie group; deterministic IDs do not break ties.
    let anchor=null,rank=0;ranked.forEach((r,i)=>{if(anchor===null||Math.abs(anchor-r.score)>1e-12){anchor=r.score;rank=i+1;}r.rank=rank;});
    return {valid:total>0,error:total?null:'all-zero-weights',effective,domains,rows:result,leaders:ranked.filter(r=>r.rank===1).map(r=>r.id),excluded:result.filter(r=>!r.eligible).length};
  }
  function dataset({barrier=false,slow=false,quality='complete'}={}){
    need(['complete','missing','invalid','constant'].includes(quality));const network=root.CARTO_P05_MODEL.network({cost:'time',barrier,slow});
    const ids=['3','5','7','10','11','12','13'],served=[500,300,750,450,900,600,200],investment=[80,40,110,60,150,50,30];
    return ids.map((id,i)=>{const n=network.graph.nodes.find(n=>n.id===id);return {id,x:n.x,y:n.y,networkReachable:network.distance[id]!==null,travel:network.distance[id],served:quality==='constant'?500:quality==='missing'&&i===1?null:quality==='invalid'&&i===2?'unknown':served[i],investment:investment[i],protected:i===2||i===5};});
  }
  const baseline={travel:1,served:1,investment:1};
  function decision({weights=baseline,cap=null,excludeProtected=false,barrier=false,slow=false,quality='complete'}={}){return evaluate(dataset({barrier,slow,quality}),criteria,weights,{cap,excludeProtected});}
  function sensitivity(options){return criteria.map(c=>({criterion:c.id,samples:[0,.25,.5,.75,1].map(share=>{const others=criteria.filter(d=>d.id!==c.id),old=others.map(d=>options.weights[d.id]),scale=Math.max(...old),tot=sum(old.map(v=>scale?v/scale:0));const weights=Object.fromEntries(others.map((d,i)=>[d.id,(1-share)*(tot?(old[i]/scale)/tot:1/others.length)]));weights[c.id]=share;const result=decision({...options,weights});return {share,weights:result.effective,leaders:result.leaders,rows:result.rows.map(r=>({id:r.id,score:r.score,rank:r.rank,eligible:r.eligible}))};})}));}
  function diagnose({activity='density',variable='density',zoning='blocks',destination='3',cost='time',barrier=false,budget=60}={}){
    const P=root.CARTO_P05_MODEL;need(['density','maup','network'].includes(activity));
    if(activity==='network'){const A=P.network({destination,cost,budget,barrier:false}),B=P.network({destination,cost,budget,barrier});return {A,B,expected:B.total!==null&&B.total<=budget?'supported':'unsupported',kind:'methodological',delta:B.total===null||A.total===null?null:B.total-A.total};}
    const A=P.statistics({zoning:'fine',variable:activity==='density'?'count':'density'}),B=P.statistics({zoning:activity==='density'?'fine':zoning,variable:activity==='density'?variable:'density'});
    return {A,B,expected:activity==='density'?(variable==='density'?'supported':variable==='rate'?'different':'unsupported'):(B.zones.length===A.zones.length?'supported':'unsupported'),kind:activity==='density'?'methodological':'support-dependent',delta:B.moran.I===null||A.moran.I===null?null:B.moran.I-A.moran.I};
  }
  root.CARTO_P06_MODEL={criteria,baseline,value,normalize,evaluate,dataset,decision,sensitivity,diagnose};
})(typeof window==='undefined'?globalThis:window);
