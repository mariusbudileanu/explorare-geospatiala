/* Controlled P02 geometry examples reuse the canonical 13-rule catalog. */
(function(root){
  'use strict';
  const R=root.CARTO_TOPOLOGY_RULES,D=root.CARTO_TOPOLOGY;
  const outer=[[80,60],[400,60],[360,260],[80,230],[80,60]],hole=[[160,110],[220,110],[220,170],[160,170],[160,110]];
  const poly=(id,coordinates,layer='A')=>({id,layer,type:'Polygon',coordinates});
  R.p02Fixture=function(type,rule,state='valid'){
    const bad=state==='problem',s=R.fixture(type,rule,state);
    if(rule==='inside'){s.target=[D.point('P1','A',bad?[190,140]:[120,100])];s.reference=[poly('Z1',[outer,hole],'B')];}
    if(rule==='covered')s.reference=[{id:'L1',layer:'B',type:'MultiLineString',coordinates:[[[80,160],[240,160]],[[240,160],[400,220]]]}];
    if(type==='Polygon'){
      const p=poly('Z1',[outer]);
      if(rule==='duplicates')s.target=bad?[p,{...p,id:'Z2',coordinates:[[...outer.slice(0,-1)].reverse().concat([outer.at(-2)])]}]:[p];
      if(rule==='invalid'&&!bad)s.target=[poly('Z1',[outer,hole])];
      if(rule==='multipart')s.target=bad?[{id:'Z1',layer:'A',type:'MultiPolygon',coordinates:[[[[20,20],[150,20],[150,150],[20,150],[20,20]],[[50,50],[80,50],[80,80],[50,80],[50,50]]],[[[250,170],[430,170],[400,290],[250,170]]]]}]:[poly('Z1',[outer,hole])];
      if(rule==='contain'){s.target=[poly('Z1',[outer,hole])];s.reference=[D.point('P1','B',bad?[190,140]:[120,100])];}
      if(rule==='gaps'){s.target=[poly('Z1',bad?[outer,hole]:[outer])];delete s.domain;}
      if(rule==='overlap'||rule==='overlap-with'){
        const a=poly('Z1',[[[80,70],[300,70],[80,250],[80,70]]]),b=poly('Z2',bad?[[[180,70],[400,70],[180,250],[180,70]]]:[[[300,70],[300,250],[80,250],[300,70]]],rule==='overlap-with'?'B':'A');
        s.target=rule==='overlap-with'?[a]:[a,b];s.reference=rule==='overlap-with'?[b]:[];
      }
    }
    return s;
  };
})(typeof window==='undefined'?globalThis:window);
