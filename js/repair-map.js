/* Orchestrates the existing symbol painter, label engine and demo controller. */
(function(root){
  'use strict';
  const D=root.CARTO_REPAIR,L=root.CARTO_LAB,E=root.CARTO_LABEL_ENGINE,S=root.CARTO_STYLING_RENDER,{esc}=L;
  const features=[...D.points,...D.polygons,...D.roads];
  const links=[['#introducere','Stilizare · reia conceptele'],['#label-intro','Etichetare · reia conceptele'],['tutorials/t01.html','T01 · prima hartă'],['challenges.html','Provocări GIS']];

  function scene(state){
    const eligible=features.filter(p=>state.visibility==='all'||E.scaleVisible(p,D.scale));
    const displaced=E.makeLabel(D.points[0],D.points[0].name,355,28,{size:18});
    const placement=E.solve(eligible.filter(p=>p.id!==1),{
      avoid:state.collision==='avoid',priority:p=>Number(state[p.class]),preferred:'N',distance:5,size:18,
      obstacles:state.collision==='avoid'?[displaced.box]:[]
    });
    const labels=[displaced,...placement.accepted];
    let overlaps=0;for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++)if(E.overlaps(labels[i].box,labels[j].box))overlaps++;
    const records=[{feature:D.points[0],placement:displaced,reason:'afișată · deplasată'},...placement.records,
      ...features.filter(p=>!eligible.includes(p)).map(feature=>({feature,reason:'omisă la scara mică'}))];
    return {labels,records,overlaps,eligible};
  }

  function draw(d,state,prefix){
    const result=scene(state),checks=D.evaluate(state),count=checks.filter(c=>c.solved).length;
    let content=D.polygons.map(p=>`<path data-polygon-id="${p.id}" d="${E.polyPath(p.geometry)}" fill="${p.color}" fill-opacity=".72" stroke="var(--ink)" stroke-width="${state.outlineWidth*4}"><title>${esc(p.name)}</title></path>`).join('');
    // Local roads are drawn first; only the deliberate width hierarchy is wrong.
    for(const road of [...D.roads].reverse())content+=`<path data-road-id="${road.id}" d="${S.linePath(road.points)}" fill="none" stroke="var(--ink)" stroke-width="${4*(road.class==='principal'?Number(state.mainWidth):road.class==='local'?Number(state.localWidth):.8)}" stroke-linecap="round"><title>${esc(road.name)}</title></path>`;
    content+=`<path d="${S.linePath(root.CARTO_STYLING.lines[3].points)}" fill="none" stroke="#477ba7" stroke-width="2" stroke-dasharray="6 3"><title>Râul Albastru · context</title></path>`;
    content+=D.points.map(p=>`<g data-feature-id="${p.id}"><title>${esc(p.name)} · ${esc(p.class)}</title>${S.marker(p.class==='principal'?'square':p.class==='secondary'?'circle':'diamond',p.x,p.y,p.class==='principal'?20:Number(state.secondarySize)*4,p.class==='principal'?'#ba6350':p.class==='secondary'?'#477ba7':'#41866b')}</g>`).join('');
    if(state.callout)content+=E.callout(result.labels[0]);
    content+=result.labels.map(p=>E.renderLabel(p,{buffer:Number(state.buffer)*4})).join('');
    const status=`Scară conceptuală 1:5 000 000 · ${result.labels.length}/18 etichete afișate · ${result.overlaps} perechi suprapuse`;
    const dynamic=(count===8?`<section class="repair-completion" aria-labelledby="repair-completion-title"><h4 id="repair-completion-title">Harta este acum mult mai clară</h4><p>Ai corectat opt probleme legate de ierarhia vizuală, simbolizare, lizibilitatea și plasarea etichetelor.</p><ul>${D.issues.map(i=>'<li>✓ '+esc(i.principle)+'</li>').join('')}</ul><nav class="lab-nav" aria-label="Continuă după exercițiu">${links.map(([href,label])=>`<a href="${href}">${esc(label)} →</a>`).join('')}</nav></section>`:'')+
      `<details class="repair-results"><summary>Vezi denumirile afișate și omise</summary>${E.table(result.records)}</details>`;
    return {svg:E.frame(prefix,d.title,status,content),legend:[{label:'Principal · pătrat · 5 mm',color:'#ba6350'},{label:'Secundar · cerc',color:'#477ba7'},{label:'Local · romb',color:'#41866b'},{label:'Drumuri · grosimea exprimă ierarhia'},{label:'Râu · linie întreruptă',color:'#477ba7'}],status,dynamic,checks,count,scene:result};
  }

  function start(){
    const host=document.getElementById('repair-root');if(!host)return;
    host.innerHTML=L.shell(D.demo);const card=document.getElementById('repair-map');
    card.querySelector('.lab-controls').innerHTML=`<div class="repair-progress"><p id="repair-progress-text" role="status" aria-live="polite" aria-atomic="true"></p><progress max="8" value="0" aria-labelledby="repair-progress-text"></progress><p class="small">Tema: obiectele principale și cartierele. Scara rămâne mică; corectează nivelul de detaliu al denumirilor.</p></div>`+
      D.issues.map((issue,i)=>`<details class="repair-issue" id="repair-issue-${issue.id}" ${i===0?'open':''}><summary><span>${i+1}. ${esc(issue.title)}</span><span data-issue-status="${issue.id}"></span></summary><div class="repair-issue-controls">${L.controls({...D.demo,controls:issue.controls})}</div><p class="repair-issue-feedback small" data-feedback="${issue.id}"></p><button type="button" class="outline-button" data-hint="${issue.id}" aria-expanded="false" aria-controls="repair-hint-${issue.id}">Indiciu<span class="sr-only">: ${esc(issue.title)}</span></button><p class="small repair-hint" id="repair-hint-${issue.id}" hidden>${esc(issue.hint)}</p></details>`).join('');
    card.querySelector('.lab-map').insertAdjacentHTML('beforebegin','<p class="repair-view" role="status" aria-live="polite">Harta curentă</p>');
    card.querySelector('.lab-observe h4').textContent='Feedback și principii';
    card.querySelector('.lab-observe').insertAdjacentHTML('afterbegin','<p class="repair-feedback" role="status" aria-live="polite" aria-atomic="true">Observă cele opt probleme și modifică setările.</p>');
    card.querySelector('.lab-actions').insertAdjacentHTML('beforeend','<button type="button" class="outline-button" data-solution>Vezi o soluție posibilă</button>');
    card.querySelector('.lab-actions').insertAdjacentHTML('afterend','<p class="small repair-solution-note" hidden>În proiectarea cartografică pot exista mai multe soluții bune. Această variantă respectă regulile discutate în laborator.</p>');
    let changedKey='',solutionShown=false;
    const controller=L.mountDemo(D.demo,card,{
      draw,compareMode:'toggle',alternate:()=>({...D.defaults}),
      onChange:(state,key)=>{changedKey=key;state.compare=false;solutionShown=false;},
      onReset:()=>{changedKey='';solutionShown=false;card.querySelectorAll('[data-hint]').forEach(b=>b.setAttribute('aria-expanded','false'));card.querySelectorAll('.repair-hint').forEach(p=>p.hidden=true);card.querySelectorAll('.repair-issue').forEach((n,i)=>n.open=i===0);},
      afterRender:(state,result)=>{
        card.querySelector('#repair-progress-text').textContent=`${result.count} / 8 probleme rezolvate`;
        card.querySelector('progress').value=result.count;
        for(const check of result.checks){card.querySelector(`[data-issue-status="${check.id}"]`).textContent=check.solved?'✓ Rezolvată':'○ De corectat';card.querySelector(`[data-feedback="${check.id}"]`).textContent=check.feedback;}
        const issue=D.issues.find(i=>i.controls.some(c=>c.key===changedKey)),feedback=issue?result.checks.find(c=>c.id===issue.id):null;
        card.querySelector('.repair-feedback').textContent=feedback?(feedback.solved?'✓ ':'○ ')+feedback.feedback:result.count===8?'Ai corectat cele opt probleme. Pot exista mai multe variante bune.':'Observă cele opt probleme și modifică setările.';
        card.querySelector('.repair-view').textContent=state.compare?'Harta inițială · progresul și setările curente sunt păstrate':'Harta curentă · setările tale';
        const compare=card.querySelector('[data-compare]');compare.disabled=result.count<2;compare.textContent=state.compare?'Vezi harta curentă':'Compară cu harta inițială';
        card.querySelector('.repair-solution-note').hidden=!solutionShown;
      }
    });
    card.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-solution')){changedKey='';solutionShown=true;controller.setState({...D.solution,compare:false});}
      if(button.hasAttribute('data-hint')){const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));document.getElementById(button.getAttribute('aria-controls')).hidden=!open;}
    });
    document.getElementById('repair-source-root').innerHTML=L.sources(['vector-styling','symbology','classification','label-settings','labels'],{id:'qgis-repair-sources',title:'Aplică toate corecțiile în QGIS'});
    // A small public teaching API also permits independent result verification.
    root.CARTO_REPAIR_LAB={scene,draw,getState:controller.getState};
    const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target?.closest('#repair-map,#repair-qgis,#qgis-repair-sources'))requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  start();
})(window);
