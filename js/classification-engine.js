/* Pure numeric classification; no DOM, geometry, network or mutable input. */
(function(root){
  'use strict';
  function classify(input,{method='equal',classes=5,denominators=null,scale=1}={}){
    if(!Array.isArray(input)||!['equal','quantile','jenks'].includes(method)||!Number.isInteger(classes)||classes<1||classes>100||!Number.isFinite(scale)||scale<=0)throw Error('Parametri de clasificare invalizi.');
    if(denominators!==null&&(!Array.isArray(denominators)||denominators.length!==input.length))throw Error('Numitorii trebuie să corespundă valorilor.');
    const reasons=[],values=input.map((v,i)=>{
      let reason=v===null||v===undefined?'NULL':typeof v!=='number'||!Number.isFinite(v)?'valoare nefinită / nenumerică':'';
      const d=denominators?.[i];
      if(!reason&&denominators!==null)reason=d===null||d===undefined?'numitor NULL':typeof d!=='number'||!Number.isFinite(d)||d<=0?'numitor nepozitiv / invalid':'';
      const value=reason?null:denominators===null?v:v/d*scale;
      if(value!==null&&!Number.isFinite(value))reason='rezultat nefinit';
      reasons.push(reason);return reason?null:value;
    });
    const sorted=values.filter(v=>v!==null).sort((a,b)=>a-b),unique=[...new Set(sorted)];
    if(!sorted.length)return {method,requestedClasses:classes,values,reasons,breaks:[],assignments:values.map(()=>null),counts:[],ranges:[],min:null,max:null,missing:input.length,effectiveClasses:0};
    const min=sorted[0],max=sorted.at(-1),k=Math.min(classes,unique.length);let uppers=[];
    if(k===1)uppers=[max];
    else if(method==='equal')uppers=Array.from({length:k},(_,i)=>i===k-1?max:Number.isFinite(max-min)?min+(max-min)*(i+1)/k:min*(1-(i+1)/k)+max*((i+1)/k));
    else if(method==='quantile')uppers=Array.from({length:k},(_,i)=>{const p=(sorted.length-1)*(i+1)/k,lo=Math.floor(p),t=p-lo;return lo===sorted.length-1?max:sorted[lo]*(1-t)+sorted[lo+1]*t;});
    else {
      // Weighted contiguous least-squares partitions of distinct values. Duplicates never split.
      // Normalize to bound sums; this changes neither the optimum nor interval boundaries.
      const magnitude=Math.max(Math.abs(min),Math.abs(max))||1,span=max-min,normalized=unique.map(v=>Number.isFinite(span)?(v-min)/span:(v/magnitude-min/magnitude)/(max/magnitude-min/magnitude)),n=unique.length;
      const frequency=new Map(unique.map(v=>[v,0]));sorted.forEach(v=>frequency.set(v,frequency.get(v)+1));
      // Weighted Welford avoids cancellation in narrow intervals.
      const costs=Array.from({length:n},()=>Array(n+1).fill(0));
      for(let start=0;start<n;start++){let weight=0,mean=0,sse=0;for(let end=start;end<n;end++){const f=frequency.get(unique[end]),delta=normalized[end]-mean;weight+=f;mean+=delta*f/weight;sse+=f*delta*(normalized[end]-mean);costs[start][end+1]=Math.max(0,sse);}}
      const dp=Array.from({length:k+1},()=>Array(n+1).fill(Infinity)),cut=Array.from({length:k+1},()=>Array(n+1).fill(0));dp[0][0]=0;
      for(let c=1;c<=k;c++)for(let end=c;end<=n;end++)for(let start=c-1;start<end;start++){
        const candidate=dp[c-1][start]+costs[start][end],previous=dp[c][end],tolerance=32*Number.EPSILON*Math.max(Math.abs(candidate),Number.isFinite(previous)?Math.abs(previous):0);
        if(!Number.isFinite(previous)||candidate<previous-tolerance){dp[c][end]=candidate;cut[c][end]=start;}
      }
      let end=n;for(let c=k;c>0;c--){uppers.unshift(unique[end-1]);end=cut[c][end];}
    }
    uppers=[...new Set(uppers)];const counts=uppers.map(()=>0);
    const assignments=values.map(v=>{if(v===null)return null;const index=uppers.findIndex(upper=>v<=upper);counts[index]++;return index;});
    const breaks=[min,...uppers],ranges=uppers.map((upper,i)=>({lower:i?uppers[i-1]:min,upper,lowerInclusive:i===0,upperInclusive:true,count:counts[i]}));
    return {method,requestedClasses:classes,values,reasons,breaks,assignments,counts,ranges,min,max,missing:values.length-sorted.length,effectiveClasses:uppers.length};
  }
  root.CARTO_CLASSIFY={classify};
})(typeof window==='undefined'?globalThis:window);
