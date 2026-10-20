/* Controlled geometry edits; every status is recomputed by the existing rule engine. */
(function(root){
  'use strict';
  const E=root.CARTO_TOPOLOGY_ENGINE,C=E.ruleChecks,F=root.CARTO_TOPOLOGY_DIAGNOSTICS;
  const clone=g=>JSON.parse(JSON.stringify(g));
  function evaluate(g){const config={duplicate:{rule:'duplicates',target:g.points},outside:{rule:'inside',target:g.points,reference:g.zones},endpoint:{rule:'point-end',target:g.points.filter(f=>f.role==='terminal'),reference:g.lines},dangle:{rule:'dangles',target:g.lines},pseudo:{rule:'pseudos',target:g.lines},gap:{rule:'gaps',target:g.zones,domain:g.domain},overlap:{rule:'overlap',target:g.zones},cross:{rule:'overlap-with',target:g.zones,reference:g.restricted}};
    const checks=F.problems.map(p=>({...p,...C.evaluate(config[p.id])}));return {checks,solved:checks.filter(c=>c.valid).length,errors:checks.flatMap(c=>c.errors.map(e=>({...e,problemId:c.id}))),valid:checks.every(c=>c.valid)};
  }
  function repair(geometry,id){const g=clone(geometry),find=(group,key)=>g[group].find(f=>f.id===key);if(!F.problems.some(p=>p.id===id))throw Error('Acțiune necunoscută.');
    if(id==='duplicate')g.points=g.points.filter(f=>f.id!=='P2');
    if(id==='outside')find('points','P3').coordinates=[390,270];
    if(id==='endpoint')find('points','P4').coordinates=[...find('lines','L3').coordinates.at(-1)];
    if(id==='dangle')find('lines','L8').coordinates[2]=[...find('lines','L5').coordinates[0]];
    if(id==='pseudo'&&find('lines','L2')){const a=find('lines','L1'),b=find('lines','L2');a.coordinates=[...a.coordinates,...b.coordinates.slice(1)];g.lines=g.lines.filter(f=>f.id!=='L2');}
    if(id==='gap'){const w=find('zones','W');w.coordinates=E.ring([30,150,260,190]);}
    if(id==='overlap')find('zones','E2').coordinates=E.ring([350,150,450,190]);
    if(id==='cross')find('restricted','B1').coordinates=E.ring([450,220,470,260]);
    return g;
  }
  function solution(g=F.initial()){return F.problems.reduce((state,p)=>repair(state,p.id),g);}
  // Compare the same cyclic vertex sequence, allowing either winding and start.
  // Keep the engine's coordinate tolerance; area or an unordered vertex set is insufficient.
  function sameRing(a,b){
    const vertices=ring=>E.same(ring[0],ring.at(-1))?ring.slice(0,-1):ring;
    if(!Array.isArray(a)||!Array.isArray(b)||a.length<3||b.length<3)return false;
    const left=vertices(a),right=vertices(b),n=left.length;
    if(n<3||n!==right.length)return false;
    return right.some((p,start)=>E.same(left[0],p)&&[1,-1].some(direction=>left.every((v,i)=>E.same(v,right[(start+direction*i+n)%n]))));
  }
  function diagnose(round,answer=''){const result=C.evaluate(round),candidate=round.candidates.find(c=>c.id===answer),error=result.errors[0];if(result.errors.length!==1)throw Error('Runda trebuie să aibă o singură eroare calculată.');let correct=false;
    if(candidate){if(['duplicate','point-outside'].includes(error.type))correct=error.affectedFeatureIds.every(id=>candidate.featureIds.includes(id));else if(['dangle','pseudo-node'].includes(error.type))correct=candidate.kind==='point'&&E.same(candidate.location,error.location);else if(['gap','overlap'].includes(error.type))correct=candidate.kind==='area'&&sameRing(candidate.location,error.location);}
    return {...result,correct,candidate,feedback:!answer?'Unde este problema? Selectează un feature, endpoint sau o zonă.':(correct?'✓ Identificat. '+round.why:round.wrong)};
  }
  Object.assign(E,{repairChecks:{evaluate,repair,solution,diagnose,clone}});
})(typeof window!=='undefined'?window:globalThis);
