'use strict';
const fs=require('node:fs'),path=require('node:path');

// Independent objective evaluation: pairwise squared differences in exact
// 2^-1074 units, rather than the engine's translated weighted sum/squares.
function binaryUnits(value){
  const data=new DataView(new ArrayBuffer(8));data.setFloat64(0,value);
  const bits=data.getBigUint64(0),exponent=Number(bits>>52n&2047n);
  let units=bits&((1n<<52n)-1n);
  if(exponent)units=((1n<<52n)|units)<<BigInt(exponent-1);
  return bits>>63n?-units:units;
}
function exactObjective(values,assignments,classes){
  let numerator=0n,denominator=1n;
  for(let group=0;group<classes;group++){
    const points=values.filter((v,i)=>assignments[i]===group).map(binaryUnits);
    if(!points.length)continue;
    let pairs=0n;for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)pairs+=(points[i]-points[j])**2n;
    const weight=BigInt(points.length);numerator=numerator*weight+pairs*denominator;denominator*=weight;
  }
  return {numerator,denominator:denominator*(1n<<2148n)};
}
module.exports=function(E,{ok,equal}){
  const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'classification-extreme-reference.json'),'utf8'));
  const summary={cases:fixture.cases.length,methods:{equal:0,quantile:0,jenks:0},exhaustive:0,propertyCases:0,seed:fixture.seed};
  for(const t of fixture.cases){
    const label=t.name+' '+t.method+' '+t.classes,before=JSON.stringify(t.values),r=E.classify(t.values,{method:t.method,classes:t.classes});summary.methods[t.method]++;
    if(t.name.startsWith('fuzz-'))summary.propertyCases++;
    ok(JSON.stringify(t.values)===before,'Robust immutable input '+label);
    ok(r.breaks.every(Number.isFinite),'Finite breaks '+label);
    ok(r.breaks.every((v,i)=>!i||v>=r.breaks[i-1]),'Monotone breaks '+label);
    ok(r.breaks[0]===Math.min(...t.values)&&r.breaks.at(-1)===Math.max(...t.values),'Original endpoints '+label);
    ok(r.breaks.every(v=>v>=r.min&&v<=r.max),'Bounds remain in original units '+label);
    ok(r.breaks.length===t.breaks.length,'Reference effective intervals '+label);
    r.breaks.forEach((v,i)=>ok(Math.abs(v-t.breaks[i])<=Math.max(Number.MIN_VALUE,Math.abs(t.breaks[i])*Number.EPSILON*4),'Independent binary64 break '+label));
    equal(r.assignments,t.assignments,'Independent extreme assignments '+label);
    ok(r.assignments.every(v=>Number.isInteger(v)&&v>=0&&v<r.effectiveClasses),'Every finite observation classified '+label);
    ok(r.counts.reduce((a,b)=>a+b,0)===t.values.length&&r.missing===0,'Extreme counts sum '+label);
    const counts=Array(r.effectiveClasses).fill(0);r.assignments.forEach(i=>counts[i]++);equal(r.counts,counts,'Counts match assignments '+label);
    for(let i=0;i<r.ranges.length;i++){
      const range=r.ranges[i];ok(Number.isFinite(range.lower)&&Number.isFinite(range.upper)&&range.lower<=range.upper,'Finite legend interval '+label);
      ok(range.lowerInclusive===(i===0)&&range.upperInclusive&&range.count===counts[i],'Legend inclusion/count '+label);
      ok(t.values.every((v,j)=>r.assignments[j]!==i||(v<=range.upper&&(i===0?v>=range.lower:v>range.lower))),'Exact interval membership '+label);
    }
    const reversed=E.classify([...t.values].reverse(),{method:t.method,classes:t.classes});equal(reversed.breaks,r.breaks,'Permutation-invariant breaks '+label);equal(reversed.assignments,[...r.assignments].reverse(),'Permutation-correct assignments '+label);
    if(t.objective){
      const score=exactObjective(t.values,r.assignments,r.effectiveClasses);
      ok(score.numerator*BigInt(t.objective.denominator)===BigInt(t.objective.numerator)*score.denominator,'Exhaustive exact Jenks objective '+label);summary.exhaustive++;
    }
  }
  const equalAudit=E.classify([0,5e307,1e308],{method:'equal',classes:3});
  equal(equalAudit.breaks,[0,1e308/3,2*(1e308/3),1e308],'Permanent Equal overflow reproduction');equal(equalAudit.assignments,[0,1,2],'Permanent Equal overflow assignments');
  const jenksAudit=E.classify([0,1,100,1e308],{method:'jenks',classes:3});
  equal(jenksAudit.breaks,[0,1,100,1e308],'Permanent Jenks underflow reproduction');equal(jenksAudit.assignments,[0,0,1,2],'Permanent Jenks underflow assignments');
  const score=exactObjective([0,1,100,1e308],jenksAudit.assignments,3);ok(score.numerator*2n===score.denominator,'Permanent Jenks objective equals 0.5');
  return summary;
};
