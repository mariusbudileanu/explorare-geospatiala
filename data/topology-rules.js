/* Fixed original teaching fixtures; logical coordinates never follow display highlights. */
(function(root){
  'use strict';
  const D=root.CARTO_TOPOLOGY,{rect,line,point}=D;
  const rules=[
    ['covered','Must be covered by',['Point'],['Point','LineString','Polygon'],'Fiecare punct este acoperit de cel puțin o geometrie de referință. Aproape nu înseamnă coincident.','Stații pe traseul rețelei.'],
    ['point-end','Must be covered by endpoints of',['Point'],['LineString'],'Verificăm punctele: fiecare coincide exact cu un capăt al unei linii de referință.','Puncte terminale ale traseelor.'],
    ['inside','Must be inside',['Point'],['Polygon'],'Fiecare punct verificat se află în interiorul unui poligon de referință.','Centre de servicii în zonele deservite.'],
    ['duplicates','Must not have duplicates',['Point','LineString','Polygon'],[],'Features distincte din același layer nu au geometrie identică. IDs diferite pot ocupa exact același loc.','Un singur obiect înregistrat o singură dată.'],
    ['invalid','Must not have invalid geometries',['Point','LineString','Polygon'],[],'Verificăm construcția geometriei, independent de relația cu vecinii.','Geometrii utilizabile în analiză.'],
    ['multipart','Must not have multi-part geometries',['Point','LineString','Polygon'],[],'Semnalează un feature compus din mai multe părți. Multipart nu înseamnă automat invalid geometry.','Un model care cere singlepart.'],
    ['line-end','End points must be covered by',['LineString'],['Point'],'Verificăm liniile: ambele capete sunt acoperite de puncte de referință. Direcția diferă de regula pentru puncte din T3.','Conducte cu puncte terminale documentate.'],
    ['dangles','Must not have dangles',['LineString'],[],'Semnalează capetele libere ale liniilor, inclusiv capete care pot fi justificate de model.','Conectivitatea unei rețele.'],
    ['pseudos','Must not have pseudos',['LineString'],[],'Un endpoint legat doar de endpoint-ul unei alte geometrii liniare este pseudo-node. Un vertex intermediar al unei singure linii nu este automat pseudo-node.','Evitarea segmentării inutile; segmentarea poate fi justificată în alte modele.'],
    ['contain','Must contain',['Polygon'],['Point'],'Fiecare poligon verificat conține cel puțin un punct din layerul de referință. Contains descrie o relație; Must contain impune condiția tuturor poligoanelor target.','Zone de servicii cu minimum un centru.'],
    ['gaps','Must not have gaps',['Polygon'],[],'Semnalează golurile între poligoanele vecine. Aici verificăm o gaură interioară într-o acoperire delimitată; nu orice spațiu exterior liber.','Acoperire administrativă continuă.'],
    ['overlap','Must not overlap',['Polygon'],[],'Verifică suprafața comună între features din același layer. Atingerea pe frontieră are arie zero.','Parcelele exclusive din același layer.'],
    ['overlap-with','Must not overlap with',['Polygon'],['Polygon'],'Verifică suprafața comună între target layer și un alt reference layer.','Zone incompatibile din două layere diferite.']
  ].map(([id,name,types,reference,why,model])=>({id,name,types,reference,why,model}));
  const byId=Object.fromEntries(rules.map(r=>[r.id,r]));
  function tiles(problem=false,small=false){const [x0,y0,x1,y1,l,r,t,b]=small?[20,170,210,290,105,125,215,245]:[80,60,400,260,220,260,130,190];return {domain:[x0,y0,x1,y1],features:[rect('N','A',x0,y0,x1,t),rect('S','A',x0,b,x1,y1),rect('W','A',x0,t,problem?l:r,b),rect('E','A',r,t,x1,b)]};}
  function network(problem=false){const a=[100,90],b=[320,90],c=[210,230];return [line('L1','A',a,b),line('L2','A',b,c),line('L3','A',c,a),...(problem?[line('L4','A',b,[400,200])]:[])];}
  function fixture(type,rule,state='valid'){
    const bad=state==='problem';let target=[],reference=[],domain;
    if(rule==='inside'){target=[point('P1','A',[150,110]),point('P2','A',[210,200]),point('P3','A',bad?[420,160]:[310,160])];reference=[rect('Z1','B',100,60,370,260)];}
    if(rule==='covered'||rule==='point-end'){target=[point('P1','A',rule==='covered'?(bad?[240,195]:[240,160]):(bad?[105,190]:[80,160]))];reference=[line('L1','B',[80,160],[400,160])];}
    if(rule==='line-end'){target=[line('L1','A',[80,160],bad?[380,195]:[400,160])];reference=[point('P1','B',[80,160]),point('P2','B',[400,160])];}
    if(rule==='dangles')target=network(bad);
    if(rule==='pseudos')target=bad?[line('L1','A',[80,160],[240,160]),line('L2','A',[240,160],[400,160])]:[{id:'L1',layer:'A',type:'LineString',coordinates:[[80,160],[240,160],[400,160]]}];
    if(rule==='contain'){target=[rect('Z1','A',60,70,220,250),rect('Z2','A',260,70,420,250)];reference=[point('P1','B',[140,160]),point('P2','B',bad?[240,280]:[340,160])];}
    if(rule==='gaps'){const t=tiles(bad);target=t.features;domain=t.domain;}
    if(rule==='overlap'||rule==='overlap-with'){target=[rect('Z1','A',80,70,280,220),rect('Z2',rule==='overlap-with'?'B':'A',bad?220:280,120,400,260)];if(rule==='overlap-with')reference=[target.pop()];}
    if(rule==='duplicates'){const create=type==='Point'?()=>point('P1','A',[240,160]):type==='LineString'?()=>line('L1','A',[80,160],[400,160]):()=>rect('Z1','A',100,70,380,250);target=[create()];if(bad)target.push({...create(),id:type==='Point'?'P2':type==='LineString'?'L2':'Z2'});}
    if(rule==='invalid')target=[type==='Point'?point('P1','A',bad?[NaN,160]:[240,160]):type==='LineString'?line('L1','A',[140,160],bad?[140,160]:[360,160]):bad?{...D.validity,id:'Z1'}:rect('Z1','A',100,70,380,250)];
    if(rule==='multipart'){const parts=type==='Point'?[[140,160],[340,160]]:type==='LineString'?[[[80,110],[210,110]],[[280,210],[410,210]]]:[rect('', 'A',80,70,210,180).coordinates,rect('','A',280,150,410,260).coordinates];target=[{id:type==='Point'?'P1':type==='LineString'?'L1':'Z1',layer:'A',type:bad?'Multi'+type:type,coordinates:bad?parts:parts[0]}];}
    return {id:type+'-'+rule+'-'+state,type,rule,target,reference,domain};
  }
  const contexts={dangles:[['Rețea de conducte','Incompatibil cu modelul: aici cerem conectarea tuturor ramurilor; capătul liber sugerează o conexiune lipsă.'],['Străzi','Compatibil cu modelul: ramura este o stradă fără ieșire intenționată. Regula o semnalează în continuare.']],gaps:[['Unități administrative','Incompatibil cu modelul: teritoriul delimitat trebuie acoperit continuu.'],['Clădiri','Compatibil cu modelul: spațiul dintre clădiri este permis; nu cerem acoperire continuă.']],overlap:[['Parcelele cadastrale exclusive','Incompatibil cu modelul: aceeași suprafață nu poate aparține ambelor parcele.'],['Zone de influență','Compatibil cu modelul: influențele pot împărți suprafață.']],multipart:[['Parcelă individuală · singlepart','Incompatibil cu modelul: fiecare parcelă trebuie reprezentată printr-o singură componentă.'],['Arhipelag / UAT cu insule','Compatibil cu modelul: componentele separate aparțin aceleiași entități.']]};
  const quiz=[
    ['Unitățile administrative trebuie să formeze o acoperire continuă fără spații între vecini.','Polygons','gaps','Nu cerem aici exclusivitate. Dacă modelul o cere și pe aceasta, combinăm Must not have gaps cu Must not overlap.'],
    ['Parcelele din același layer nu trebuie să împartă aceeași suprafață.','Polygons','overlap','Regula se aplică aceluiași layer; Must not overlap with ar verifica un alt layer.'],
    ['Punctele care reprezintă capete de traseu trebuie să coincidă cu endpoint-urile liniilor.','Points','point-end','Target sunt punctele; reference sunt liniile, nu invers.'],
    ['Centrele de servicii trebuie să se afle în interiorul zonelor deservite.','Points','inside','Target sunt centrele; reference sunt poligoanele zonelor. Nu verificăm dacă fiecare zonă are un centru.'],
    ['Rețeaua de conducte nu ar trebui să aibă capete libere nejustificate.','Lines','dangles','Regula semnalează toate dangles; operatorul decide apoi care capete sunt justificate.']
  ];
  const gap=tiles(true,true),checker={layers:{Points:{type:'Point',features:[point('P1','A',[60,90]),point('P2','A',[350,220])]},Lines:{type:'LineString',features:[line('L1','B',[270,40],[350,40]),line('L2','B',[350,40],[310,120]),line('L3','B',[310,120],[270,40]),line('L4','B',[350,40],[430,110])]},Polygons:{type:'Polygon',features:[...gap.features,rect('Z5','A',290,170,380,250),rect('Z6','A',350,200,450,290)],domain:gap.domain},'Polygons B':{type:'Polygon',features:[rect('B1','B',420,230,465,280)]}},extents:{full:[0,0,480,320],west:[0,0,240,320],east:[240,0,480,320]},defaults:[{id:'r1',layer:'Points',rule:'inside',other:'Polygons',enabled:true},{id:'r2',layer:'Lines',rule:'dangles',other:'',enabled:true},{id:'r3',layer:'Polygons',rule:'gaps',other:'',enabled:true},{id:'r4',layer:'Polygons',rule:'overlap',other:'',enabled:true}]};
  root.CARTO_TOPOLOGY_RULES={rules,byId,fixture,contexts,quiz,checker,tiles,network};
})(typeof window!=='undefined'?window:globalThis);
