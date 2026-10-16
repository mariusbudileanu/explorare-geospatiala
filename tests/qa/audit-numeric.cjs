'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=(E,{ok,equal})=>{
  const oracle=JSON.parse(fs.readFileSync(path.join(__dirname,'audit-numeric-reference.json'),'utf8'));
  for(const [i,t] of oracle.quantiles.entries()){
    const r=E.classify(t.values,{method:'quantile',classes:t.classes});
    equal(r.breaks,t.breaks,'Single-rounded independent R7 thresholds '+i);
    equal(r.assignments,t.assignments,'Reference R7 cardinality/assignment '+i);
    ok(r.counts.reduce((s,v)=>s+v,0)+r.missing===t.values.length,'Conserved R7 observations '+i);
  }
  for(const [i,t] of oracle.rates.entries()){
    const r=E.classify([t.value],{denominators:[t.denominator],scale:t.scale});
    equal(r.values,[t.expected],'Recover finite scaled rate without intermediate range loss '+i);
    ok(r.missing===0&&r.reasons[0]==='','Recovered rate remains observed '+i);
  }
  for(const method of ['equal','quantile']){
    const r=E.classify([Number.MIN_VALUE,2*Number.MIN_VALUE,3*Number.MIN_VALUE,4*Number.MIN_VALUE],{method,classes:2});
    equal(r.assignments,[0,0,1,1],'Subnormal midpoint ties-to-even '+method);
  }
  const invalid=E.classify([1,1,1,1],{denominators:[0,null,-1,Infinity],scale:1});
  equal(invalid.values,[null,null,null,null],'Invalid rate denominators remain missing');
  return {quantiles:oracle.quantiles.length,rates:oracle.rates.length};
};
