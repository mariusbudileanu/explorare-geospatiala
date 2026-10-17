/* Persistent SVG adapters. Comparison/lifecycle state belongs to CARTO_COMPARE. */
(function(root){
  'use strict';
  const D=root.CARTO_CARTOGRAPHY,E=root.CARTO_CLASSIFY,L=root.CARTO_LABEL_ENGINE,{esc}=root.CARTO_LAB,ns='http://www.w3.org/2000/svg';
  const number=v=>v===null?'NULL':String(v).replace('.',','),methodLabel={equal:'Equal Interval',quantile:'Quantile',jenks:'Natural Breaks (Jenks)'};
  function color(index,total,palette,range,center){
    if(palette==='diverging'){
      const midpoint=range.lower/2+range.upper/2;
      return midpoint<center?'#6598b8':midpoint>center?'#bb775b':'#e8e4d8';
    }
    const colors=palette==='qualitative'?D.qualitative:D.sequential;
    return colors[total===1?3:Math.round(index*(colors.length-1)/(total-1))];
  }
  const element=(tag,attrs={},parent)=>{const n=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent?.append(n);return n;};
  function classification(){
    let host,svg,nodes=[],rows=[],metrics={},selected;
    return {
      init(panel){host=panel;const drawing=panel.querySelector('.carto-drawing');svg=element('svg',{viewBox:'0 0 480 300',role:'img','aria-label':'24 zone sintetice; identificatorii și tabelul descriu clasele.'},drawing);
        const defs=element('defs',{},svg),pattern=element('pattern',{id:panel.id+'-null',width:8,height:8,patternUnits:'userSpaceOnUse'},defs);element('rect',{width:8,height:8,fill:'#eeeeee'},pattern);element('path',{d:'M0 8L8 0',stroke:'#555', 'stroke-width':1},pattern);
        nodes=D.cells.map(cell=>{const g=element('g',{'data-cell':cell.id},svg),path=element('rect',{x:cell.x,y:cell.y,width:cell.width,height:cell.height,stroke:'#243f46','stroke-width':1},g),title=element('title',{},g),text=element('text',{x:cell.x+35,y:cell.y+31,'text-anchor':'middle','font-size':20,'font-weight':700,fill:'#102f3b',stroke:'#ffffff','stroke-width':3,'paint-order':'stroke'},g);return {path,title,text};});
        const body=panel.querySelector('tbody');rows=D.cells.map(c=>{const row=document.createElement('tr');row.innerHTML=`<th scope="row">${c.id}</th><td></td><td></td>`;body.append(row);return row;});
      },
      update({view}){
        const result=E.classify(D.cells.map(c=>c.numerator),{method:view.method,classes:Number(view.classes),denominators:view.metric==='rate'?D.cells.map(c=>c.denominator):null,scale:view.metric==='rate'?100:1});
        const valid=result.values.filter(v=>v!==null),center=valid.reduce((s,v)=>s+v,0)/valid.length;
        D.cells.forEach((cell,i)=>{const cls=result.assignments[i],n=nodes[i],value=result.values[i];n.path.setAttribute('fill',cls===null?`url(#${host.id}-null)`:color(cls,result.effectiveClasses,view.palette,result.ranges[cls],center));n.text.textContent=cell.id+' '+(cls===null?'?':'C'+(cls+1));n.title.textContent=`Zona ${cell.id}; ${number(value)}; ${cls===null?result.reasons[i]:'clasa '+(cls+1)}`;rows[i].cells[1].textContent=number(value)+(value!==null&&view.metric==='rate'?'%':'');rows[i].cells[2].textContent=cls===null?result.reasons[i]:'C'+(cls+1);});
        host.querySelector('.carto-legend').innerHTML=result.ranges.map((r,i)=>`<li><i class="carto-swatch" aria-hidden="true" style="background:${color(i,result.effectiveClasses,view.palette,r,center)}"></i><span>C${i+1}: ${r.lowerInclusive?'[':'('}${number(r.lower)}; ${number(r.upper)}] · ${r.count} obiecte</span></li>`).join('')+`<li>▧ Fără clasificare: ${result.missing} · NULL / raport nedefinit</li>`;
        host.querySelector('.carto-summary').textContent=`${methodLabel[view.method]} · ${result.effectiveClasses}/${view.classes} clase efective/cerute · ${view.metric==='rate'?'rată: cazuri / persoane eligibile × 100 (%)':'valoare absolută: cazuri observate'}. `+(view.palette==='diverging'?`Paletă divergentă: centrul este media distribuției (${number(center)}); o clasă care traversează media are culoarea mijlocului intervalului. Nu este un prag de risc.`:view.palette==='qualitative'?'Paletă calitativă: exemplu nepotrivit pentru valori ordonate; citește clasa și intervalul.':'Paletă secvențială: ordinea claselor este monotonă.');
        metrics={...result,center};this.setSharedLocation(selected||[1,0]);
      },
      setSharedLocation(point){selected=point;nodes.forEach((n,i)=>n.path.dataset.selected=String(i+1===point[0]));},
      resize(){},getMetrics(){return metrics;},destroy(){svg?.remove();host?.querySelector('tbody').replaceChildren();nodes=[];rows=[];metrics={};host=null;svg=null;}
    };
  }
  function design(){
    let host,svg,title,background,paths=[],circles=[],labels,metrics={},legendNodes=[];
    const points=root.CARTO_LABELING.dense;
    return {
      init(panel){host=panel;svg=element('svg',{viewBox:'0 0 480 340',role:'img','aria-label':'Servicii sintetice: ierarhie vizuală, aceleași 25 de puncte.'},panel.querySelector('.carto-drawing'));background=element('rect',{x:0,y:40,width:480,height:300,class:'carto-context-bg'},svg);title=element('text',{x:18,y:30,class:'carto-title'},svg);title.textContent='Servicii · scenă sintetică';const map=element('g',{transform:'translate(0 40)'},svg);paths=root.CARTO_STYLING.polygons.map(p=>element('path',{d:L.polyPath(p.geometry),fill:'none',class:'carto-context'},map));circles=points.map(p=>{const circle=element('circle',{cx:p.x,cy:p.y,'data-point':p.id,class:'carto-points'},map);element('title',{},circle).textContent=p.name+' · '+p.class;return circle;});labels=element('g',{},map);},
      update({view,context}){
        const extra=context?.p05?.styles?.[host.id.endsWith('-A')?'A':'B']||{},lang=context?.p05?.lang||'ro',en=lang==='en',M=root.CARTO_P05_MODEL;
        const rgb=root.getComputedStyle(svg).backgroundColor.match(/\d+/g),canvas=rgb&&rgb.length>=3?'#'+rgb.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join(''):'#ffffff';
        const contextColor=root.getComputedStyle(background).fill.match(/\d+/g),bg=contextColor?'#'+contextColor.slice(0,3).map((v,i)=>Math.round(Number(v)*view.background/100+parseInt(canvas.slice(1+i*2,3+i*2),16)*(1-view.background/100)).toString(16).padStart(2,'0')).join(''):canvas;
        const ink=root.getComputedStyle(title).fill.match(/\d+/g),stroke=ink&&ink.length>=3?'#'+ink.slice(0,3).map(v=>Number(v).toString(16).padStart(2,'0')).join(''):'#102f3b';
        const encodings=M?M.design({...view,...extra},points,bg,stroke):null;
        title.textContent=en?'Services · synthetic scene':'Servicii · scenă sintetică';
        title.setAttribute('font-size',view.title);title.setAttribute('font-weight',view.title>=24?700:400);background.setAttribute('fill-opacity',view.background/100);paths.forEach(p=>p.setAttribute('stroke-width',view.outline));
        const radius=p=>view.size*(p.class==='principal'?view.principalScale:1);
        circles.forEach((c,i)=>{c.setAttribute('r',radius(points[i]));const encoding=encodings?.find(e=>e.category===points[i].class);c.setAttribute('fill',encoding?.color||(view.palette==='qualitative'?D.qualitative[i%D.qualitative.length]:'#41866b'));c.setAttribute('fill-opacity',encoding?.opacity??1);c.setAttribute('stroke-width',encoding?.strokeWidth??1);});
        const placement=L.solve(points,{avoid:view.hierarchy==='priority',limit:Number(view.density),priority:p=>view.hierarchy==='priority'?p.priority:0,size:15,preferred:extra.position||'NE',distance:extra.distance??8,fixed:view.hierarchy==='equal'});
        labels.innerHTML=placement.accepted.map(p=>L.renderLabel({...p,weight:view.hierarchy==='priority'&&p.feature.class==='principal'?700:400},{buffer:Number(view.halo)})).join('');
        let collisions=0,overlap=0;for(let i=0;i<placement.accepted.length;i++)for(let j=0;j<i;j++)if(L.overlaps(placement.accepted[i].box,placement.accepted[j].box))collisions++;
        for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<radius(points[i])+radius(points[j]))overlap++;
        if(!encodings)host.querySelector('.carto-legend').innerHTML=`<li>● Servicii sintetice · ${points.length} obiecte</li><li>${view.hierarchy==='priority'?'Etichete prioritare: principal > secundar > local.':'Aceeași greutate pentru toate etichetele.'}</li><li>Simboluri: rază de bază ${number(view.size)}; principale × ${number(view.principalScale)} (preset), independent de etichete.</li><li>${view.palette==='qualitative'?'Categorii cromatice fără ordine: nepotrivite pentru ierarhia urmărită.':'O culoare tematică; citește mărimea simbolurilor și greutatea etichetelor.'}</li>`;
        if(encodings){
          if(!legendNodes.length)legendNodes=encodings.map(e=>{const li=document.createElement('li');li.dataset.encoding=e.category;const swatch=element('svg',{viewBox:'0 0 80 80','aria-hidden':'true'});swatch.style.cssText='width:80px;height:80px;flex:none';const circle=element('circle',{cx:40,cy:40},swatch),text=document.createElement('span');li.append(swatch,text);host.querySelector('.carto-legend').append(li);return {li,circle,text};});
          encodings.forEach((e,i)=>{const {circle,text}=legendNodes[i];circle.parentNode.style.backgroundColor=bg;for(const [key,value]of Object.entries({r:e.radius,fill:e.color,'fill-opacity':e.opacity,stroke,'stroke-width':e.strokeWidth}))circle.setAttribute(key,value);text.textContent=`${e.category} · ${e.count} ${en?'objects':'obiecte'}; r=${number(e.radius)} SVG; ${en?'opacity':'opacitate'}=${number(e.opacity)}; ${en?'stroke':'contur'}=${number(e.strokeWidth)}; ${e.color}. ${en?'Fill / stroke contrast against uniform context background':'Contrast interior / contur pe fundal contextual uniform'}: ${e.contrast.toFixed(2)} / ${e.strokeContrast.toFixed(2)}:1. ${e.contrast<3?(en?'Fill below 3:1; inspect outline and text.':'Interior sub 3:1; verifică conturul și textul.'):''}`;});
        }
        host.querySelector('.carto-legend').style.fontSize=['.72rem','.9rem','1.15rem'][view.legend];host.querySelector('.carto-legend').style.fontWeight=view.legend===2?'700':'400';
        host.querySelector('.carto-summary').textContent=`Diagnostic orientativ: ${placement.accepted.length}/${points.length} etichete vizibile; ${collisions} perechi de etichete suprapuse; ${overlap} perechi de simboluri suprapuse (cercuri). Nu este un verdict de calitate; omisiunea textului nu elimină obiectul.`;
        host.querySelector('.carto-records').innerHTML=L.table(placement.records);if(en){host.querySelector('.carto-summary').textContent=`Teaching diagnostics: ${placement.accepted.length}/${points.length} labels visible; ${collisions} overlapping label pairs; ${overlap} overlapping symbol pairs. Omitting labels does not remove objects. No universal design score.`;host.querySelectorAll('.carto-records caption').forEach(n=>n.textContent='Objects remain in the data; only label visibility changes');host.querySelectorAll('.carto-records thead th').forEach((n,i)=>n.textContent=['ID','Name','Label'][i]);host.querySelectorAll('.carto-records td').forEach(n=>n.textContent=n.textContent.replace('afișată','shown').replace('limită de densitate','density limit').replace('conflict / poziție indisponibilă','conflict / unavailable position'));}
        metrics={visible:placement.accepted.length,collisions,overlap,records:placement.records,encodings};
      },
      setSharedLocation(){},resize(){},getMetrics(){return metrics;},destroy(){svg?.remove();host?.querySelector('.carto-records').replaceChildren();host=null;svg=null;paths=[];circles=[];labels=null;legendNodes=[];metrics={};}
    };
  }
  root.CARTO_CARTOGRAPHY_VIEW={classification,design};
})(window);
