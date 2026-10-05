/* Original synthetic scene and explicit, DOM-independent teaching rules. */
(function(root){
  'use strict';
  const select=(key,label,options,value)=>({key,label,type:'select',options,value});
  const range=(key,label,min,max,value,step=.1,unit='mm')=>({key,label,type:'range',min,max,value,step,unit});
  const issues=[
    {id:'points',title:'Simbolurile secundare domină harta',principle:'Simbolurile secundare trebuie subordonate temei principale.',
      controls:[select('secondarySize','Dimensiunea punctelor secundare',[[2,'Small · 2 mm'],[4,'Medium · 4 mm'],[8,'Large · 8 mm']],8)],
      hint:'Elementele secundare trebuie să rămână vizibile, dar să nu concureze cu tema principală.',
      good:'Simbolurile secundare nu mai concurează cu tema principală.',bad:'Simbolurile secundare sunt încă mai mari decât obiectele principale.'},
    {id:'outline',title:'Contururile sunt prea puternice',principle:'Contururile trebuie să separe suprafețele fără să acopere tema.',
      controls:[range('outlineWidth','Grosimea conturului',0,3,3)],
      hint:'Conturul trebuie să ajute la separarea cartierelor; umplerea transmite tema.',
      good:'Contururile poligoanelor sunt mai bine integrate.',bad:'Contururile groase continuă să domine suprafețele.'},
    {id:'roads',title:'Ierarhia drumurilor este inversată',principle:'Drumul principal trebuie să domine vizual drumurile secundare și locale.',
      controls:[range('mainWidth','Grosimea drumului principal',.3,3,1),range('localWidth','Grosimea drumului local',.3,3,3)],
      hint:'Compară grosimile: cititorul trebuie să identifice mai întâi drumul principal.',
      good:'Ierarhia drumurilor este acum mai clară.',bad:'Drumul principal nu este încă mai puternic decât celelalte drumuri.'},
    {id:'buffer',title:'Etichetele se pierd în fundal',principle:'Buffer-ul poate separa textul de un fundal cu contrast variabil.',
      controls:[select('buffer','Buffer în jurul literelor',[[0,'Off'],[.5,'0,5 mm'],[1,'1 mm'],[2,'2 mm']],0)],
      hint:'Separă conturul literelor de suprafețele și liniile care trec prin spatele lor.',
      good:'Buffer-ul separă literele de fundalul dificil.',bad:'Textul nu are încă un contur care să îl separe de fundal.'},
    {id:'collision',title:'Etichetele se suprapun',principle:'Lizibilitatea poate justifica mutarea sau omiterea unor etichete.',
      controls:[select('collision','Plasarea etichetelor',[['all','Show all'],['avoid','Avoid overlap']],'all')],
      hint:'Geometriile pot rămâne pe hartă chiar dacă unele denumiri sunt mutate sau omise.',
      good:'Pozițiile alternative și omiterea textului fără loc evită suprapunerile.',bad:'Show all nu protejează textul de coliziuni; activează o regulă de plasare.'},
    {id:'priority',title:'Prioritățile sunt egale',principle:'Prioritatea trebuie să favorizeze denumirile importante când spațiul este limitat.',
      controls:[range('principal','Principal',0,10,5,1,''),range('secondary','Secundar',0,10,5,1,''),range('local','Local',0,10,5,1,'')],
      hint:'Când spațiul este limitat, obiectele mai importante trebuie să aibă o șansă mai mare de etichetare.',
      good:'Denumirile principale au întâietate, urmate de cele secundare și locale.',bad:'Prioritățile nu formează încă ordinea Principal > Secundar > Local.'},
    {id:'scale',title:'Prea mult text la această scară',principle:'Nivelul de detaliu trebuie adaptat scării.',
      controls:[select('visibility','Vizibilitatea etichetelor',[['all','All scales'],['controlled','Controlled by scale']],'all')],
      hint:'O hartă la scară mică nu poate comunica același nivel de detaliu ca una la scară mare.',
      good:'La scara mică sunt păstrate numai denumirile principale.',bad:'Denumirile secundare și locale sunt încă solicitate la scara mică.'},
    {id:'callout',title:'Eticheta deplasată nu indică obiectul',principle:'Callout-ul păstrează legătura dintre eticheta deplasată și obiect.',
      controls:[{key:'callout',label:'Linie de legătură (Callout)',type:'checkbox',value:false}],
      hint:'Dacă textul este mutat departe de obiect, cititorul trebuie să poată urmări relația dintre ele.',
      good:'Linia de legătură conectează Centrul Civic cu punctul său.',bad:'Eticheta Centrul Civic este deplasată, dar relația cu punctul rămâne ambiguă.'}
  ];
  const controls=issues.flatMap(issue=>issue.controls);
  const defaults=Object.fromEntries(controls.map(c=>[c.key,c.value]));
  const solution={secondarySize:2,outlineWidth:.5,mainWidth:2,localWidth:.6,buffer:1,collision:'avoid',principal:10,secondary:5,local:2,visibility:'controlled',callout:true};
  const predicates={
    points:s=>Number(s.secondarySize)>0&&Number(s.secondarySize)<=4,
    outline:s=>Number(s.outlineWidth)>=0&&Number(s.outlineWidth)<=.75,
    roads:s=>Number(s.mainWidth)>Math.max(Number(s.localWidth),.8),
    buffer:s=>Number(s.buffer)>=.5,
    collision:s=>s.collision==='avoid',
    priority:s=>Number(s.principal)>Number(s.secondary)&&Number(s.secondary)>Number(s.local),
    scale:s=>s.visibility==='controlled',
    callout:s=>s.callout===true
  };
  const issueChecks=Object.fromEntries(issues.map(issue=>[issue.id,s=>{
    const solved=predicates[issue.id](s);return {id:issue.id,solved,feedback:solved?issue.good:issue.bad,hint:issue.hint};
  }]));
  const evaluate=state=>issues.map(issue=>issueChecks[issue.id](state));
  // The same fictitious visual world, with three adjacent districts.
  const polygons=[
    {id:13,name:'Cartier A',class:'principal',x:98,y:75,color:'#78ad9b',geometry:[[30,55],[165,40],[155,135],[210,258],[48,265],[38,145]]},
    {id:14,name:'Cartier B',class:'principal',x:225,y:78,color:'#477ba7',geometry:[[165,40],[300,52],[295,140],[300,258],[210,258],[155,135]]},
    {id:15,name:'Cartier C',class:'principal',x:376,y:81,color:'#ba6350',geometry:[[300,52],[450,60],[435,150],[425,255],[300,258],[295,140]]}
  ];
  const names=['Centrul Civic','Clinica A','Stația A','Spital Nord','Școala B','Stația B','Școala Est','Biblioteca C','Stația C'];
  const points=root.CARTO_LABELING.priority.map((p,i)=>({...p,name:names[i]})).concat([
    {id:10,name:'Parc Sud',class:'local',x:70,y:220},
    {id:11,name:'Piața Sud',class:'secondary',x:235,y:222},
    {id:12,name:'Stația Sud',class:'local',x:398,y:214}
  ]);
  const roads=root.CARTO_STYLING.lines.slice(0,3).map((line,i)=>({...line,id:16+i,class:['principal','secondary','local'][i],name:['Drum principal','Drum secundar','Drum local'][i],x:[185,240,310][i],y:[92,126,172][i]}));
  root.CARTO_REPAIR={issues,issueChecks,evaluate,defaults,solution,points,polygons,roads,scale:0,
    demo:{id:'repair-map',kind:'repair',level:'PROVOCARE',badge:'EXERCIȚIU FINAL',actionContext:'Repară harta',title:'Repară harta',
      concept:'Găsește și corectează opt probleme de stilizare și etichetare.',controls,defaults,compare:true,resetLabel:'Reia exercițiul',
      observation:'O hartă bună cere o ierarhie vizuală coerentă și o alegere controlată a informației. Datele și pozițiile obiectelor rămân aceleași; modifici reprezentarea și afișarea denumirilor.',
      where:'Layer Properties → Symbology / Labels',source:'label-settings',links:[]}
  };
})(window);
