'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

module.exports=function(E,{ok,equal}){
  const source=fs.readFileSync(path.join(__dirname,'../../js/classification-engine.js'),'utf8');
  // Exercise the actual private helper without adding a public runtime API.
  const start=source.indexOf('  function quantileLerp('),end=source.indexOf('\n  function ',start+1);
  ok(start>=0&&end>start,'Quantile interpolation has one canonical private helper');
  const lerp=vm.runInNewContext('('+source.slice(start,end)+')');
  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'quantile-reference.json'),'utf8'));
  const summary={cases:fixture.cases.length,interpolation:fixture.interpolation.length,auditCases:0,targetCases:0,fuzzCases:0,seeds:fixture.seeds};
  for(const t of fixture.interpolation){
    const value=lerp(t.a,t.b,t.t);
    ok(Number.isFinite(value),'Interpolation finite');
    ok(value>=Math.min(t.a,t.b)&&value<=Math.max(t.a,t.b),'Interpolation within original endpoints');
    ok(value>=t.lower&&value<=t.upper,'Interpolation agrees with independent Fraction/IEEE rounding envelope');
    if(t.t===0)ok(Object.is(value,t.a),'t=0 exact endpoint including signed zero');
    if(t.t===1)ok(Object.is(value,t.b),'t=1 exact endpoint including signed zero');
    if(t.a===t.b)ok(value===t.a,'Equal endpoints have no ULP drift');
  }
  for(const t of fixture.cases){
    const label=t.name+' k='+t.classes,before=JSON.stringify(t.values),sorted=[...t.values].sort((a,b)=>a-b);
    const r=E.classify(t.values,{method:'quantile',classes:t.classes});
    if(t.name.startsWith('audit-max-'))summary.auditCases++;
    else if(t.seed!==null)summary.fuzzCases++;
    else summary.targetCases++;
    ok(JSON.stringify(t.values)===before,'Quantile immutable input '+label);
    ok(r.breaks.every(Number.isFinite),'Quantile finite breaks '+label);
    ok(r.breaks[0]===sorted[0]&&r.breaks.at(-1)===sorted.at(-1),'Quantile preserves endpoints '+label);
    ok(r.breaks.every((v,i)=>!i||v>=r.breaks[i-1]),'Quantile monotone breaks '+label);
    ok(r.breaks.every(v=>v>=r.min&&v<=r.max),'Quantile bounds '+label);
    const uppers=t.thresholds.map(t=>{
      const a=sorted[t.index],b=sorted[Math.min(t.index+1,sorted.length-1)],value=lerp(a,b,t.t);
      ok(value>=t.lower&&value<=t.upper,'Independent R7 Fraction threshold '+label);
      if(a===b)ok(value===a,'Duplicate threshold exact '+label);
      return value;
    });
    equal(r.breaks,[sorted[0],...new Set(uppers)],'Unchanged R7 position and repeated-break merging '+label);
    ok(r.assignments.every(i=>Number.isInteger(i)&&i>=0&&i<r.effectiveClasses),'Every finite value assigned once '+label);
    ok(r.counts.reduce((a,b)=>a+b,0)===t.values.length&&r.missing===0,'Quantile counts sum '+label);
    for(let group=0;group<r.ranges.length;group++){
      const range=r.ranges[group],indices=r.assignments.map((a,i)=>a===group?i:-1).filter(i=>i>=0);
      ok(range.lowerInclusive===(group===0)&&range.upperInclusive,'Quantile interval inclusion '+label);
      ok(range.count===indices.length&&r.counts[group]===indices.length,'Quantile legend count '+label);
      ok(indices.every(i=>t.values[i]<=range.upper&&(group===0?t.values[i]>=range.lower:t.values[i]>range.lower)),'Quantile exact interval membership '+label);
    }
    const order=t.values.map((_,i)=>i).reverse(),reverse=E.classify(order.map(i=>t.values[i]),{method:'quantile',classes:t.classes});
    equal(reverse.breaks,r.breaks,'Quantile permutation-invariant breaks '+label);
    equal(reverse.assignments,order.map(i=>r.assignments[i]),'Quantile permutation-correct assignments '+label);
  }
  const M=Number.MAX_VALUE,U=2**971,values=[M-4*U,M-3*U,M-2*U,M-U,M,M,M,M];
  const result=E.classify(values,{method:'quantile',classes:5});
  equal(result.breaks,[M-4*U,M-3*U,M-U,M],'Permanent MAX_VALUE quantile reproduction');
  equal(result.assignments,[0,0,1,1,2,2,2,2],'Permanent MAX_VALUE quantile assignments');
  equal(result.counts,[2,2,4],'Permanent MAX_VALUE quantile counts');
  for(const value of [M,-M,Number.MIN_VALUE,0,-0,7,-7])for(const t of [.1,.4,.5,.6,.9])ok(lerp(value,value,t)===value,'Equal endpoint identity');
  for(const t of [0,.4,.6,1]){
    ok(lerp(-0,+0,t)===0,'Mixed signed zero is numerically zero');
    const zeros=E.classify([-0,+0,-0,+0],{method:'quantile',classes:7});
    equal(zeros.assignments,[0,0,0,0],'Signed zero never creates artificial classes');
  }
  ok(summary.auditCases===fixture.auditCases&&summary.targetCases===fixture.targetCases&&summary.fuzzCases===fixture.fuzzCases,'All deterministic quantile families executed');
  return summary;
};
