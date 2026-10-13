/* Pure numeric classification; no DOM, geometry, network or mutable input. */
(function(root){
  'use strict';
  function equalUpper(min,max,index,classes){
    const span=max-min,scaled=span*index,t=index/classes;
    // Preserve ordinary arithmetic; divide before multiplying if that product overflows.
    // Opposite-sign endpoints can overflow the span, but their weighted sum cannot.
    return Number.isFinite(scaled)?min+scaled/classes:Number.isFinite(span)?min+span*t:min*(1-t)+max*t;
  }
  function quantileLerp(a,b,t){
    if(t===0)return a;if(t===1)return b;if(a===b)return a;
    const value=a*(1-t)+b*t;
    // Preserve ordinary rounding. Near the finite limit, avoid separately rounded
    // large products; use the nearer endpoint and the finite same-sign difference.
    // Also reconstruct from an endpoint if weighted rounding leaves [a,b].
    if(Number.isFinite(a+b)&&Number.isFinite(value)&&value>=Math.min(a,b)&&value<=Math.max(a,b))return value;
    const span=b-a;
    // Opposite signs can overflow the difference; their weighted sum stays finite.
    return Number.isFinite(span)?t<=.5?a+span*t:b-span*(1-t):value;
  }
  function gcd(a,b){while(b){const next=a%b;a=b;b=next;}return a;}
  function fraction(n,d){if(n===0n)return {n:0n,d:1n};const divisor=gcd(n,d);return {n:n/divisor,d:d/divisor};}
  function addCosts(a,b){
    const divisor=gcd(a.d,b.d),left=b.d/divisor,right=a.d/divisor;
    return fraction(a.n*left+b.n*right,a.d*left);
  }
  function dyadic(value){
    // Exact binary64 significand/exponent; no Number subtraction or squared costs.
    const buffer=new ArrayBuffer(8),view=new DataView(buffer);view.setFloat64(0,value);
    const bits=view.getBigUint64(0),exponent=Number((bits>>52n)&2047n);
    let significand=bits&((1n<<52n)-1n),power=exponent?exponent-1075:-1074;
    if(exponent)significand|=1n<<52n;
    if(!significand)return {significand:0n,power:0};
    while((significand&1n)===0n){significand>>=1n;power++;}
    return {significand:bits>>63n?-significand:significand,power};
  }
  function jenksUppers(unique,sorted,classes){
    const parts=unique.map(dyadic),power=parts.reduce((p,v)=>v.significand?Math.min(p,v.power):p,Infinity);
    const integers=parts.map(v=>v.significand?v.significand<<BigInt(v.power-power):0n),origin=integers[0],units=integers.map(v=>v-origin),n=unique.length;
    const frequency=new Map(unique.map(v=>[v,0]));sorted.forEach(v=>frequency.set(v,frequency.get(v)+1));
    // All SSE share the positive factor 2^(2*power). Keep the remaining rational exact.
    const costs=Array.from({length:n},()=>Array(n+1));
    for(let start=0;start<n;start++){
      let weight=0n,sum=0n,squares=0n;
      for(let end=start;end<n;end++){
        const f=BigInt(frequency.get(unique[end])),x=units[end];weight+=f;sum+=f*x;squares+=f*x*x;
        costs[start][end+1]=fraction(weight*squares-sum*sum,weight);
      }
    }
    const dp=Array.from({length:classes+1},()=>Array(n+1).fill(null)),cut=Array.from({length:classes+1},()=>Array(n+1).fill(0));dp[0][0]={n:0n,d:1n};
    for(let c=1;c<=classes;c++)for(let end=c;end<=n;end++)for(let start=c-1;start<end;start++){
      if(!dp[c-1][start])continue;
      const candidate=addCosts(dp[c-1][start],costs[start][end]),previous=dp[c][end];
      // Strict rational comparison; exact ties retain the first ascending separator.
      if(!previous||candidate.n*previous.d<previous.n*candidate.d){dp[c][end]=candidate;cut[c][end]=start;}
    }
    const uppers=[];let end=n;for(let c=classes;c>0;c--){uppers.unshift(unique[end-1]);end=cut[c][end];}return uppers;
  }
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
    else if(method==='equal')uppers=Array.from({length:k},(_,i)=>i===k-1?max:equalUpper(min,max,i+1,k));
    else if(method==='quantile')uppers=Array.from({length:k},(_,i)=>{const p=(sorted.length-1)*(i+1)/k,lo=Math.floor(p),t=p-lo;return lo===sorted.length-1?max:quantileLerp(sorted[lo],sorted[lo+1],t);});
    else uppers=jenksUppers(unique,sorted,k);
    if(uppers.some((v,i)=>!Number.isFinite(v)||v<min||v>max||(i&&v<uppers[i-1]))||uppers.at(-1)!==max)throw Error('Pragurile de clasificare nu respectă domeniul numeric finit.');
    uppers=[...new Set(uppers)];const counts=uppers.map(()=>0);
    const assignments=values.map(v=>{if(v===null)return null;const index=uppers.findIndex(upper=>v<=upper);counts[index]++;return index;});
    const breaks=[min,...uppers],ranges=uppers.map((upper,i)=>({lower:i?uppers[i-1]:min,upper,lowerInclusive:i===0,upperInclusive:true,count:counts[i]}));
    return {method,requestedClasses:classes,values,reasons,breaks,assignments,counts,ranges,min,max,missing:values.length-sorted.length,effectiveClasses:uppers.length};
  }
  root.CARTO_CLASSIFY={classify};
})(typeof window==='undefined'?globalThis:window);
