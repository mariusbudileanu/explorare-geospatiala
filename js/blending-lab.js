(function(root){
  'use strict';
  const D=root.CARTO_BLENDING,E=root.CARTO_BLEND_ENGINE,L=root.CARTO_LAB,{esc}=L,controllers=new Map();
  const mode=id=>D.modes.find(m=>m.id===id),title=id=>mode(id)?.name||'Normal';
  const flow=steps=>'<ol class="opacity-flow blend-flow" aria-label="Ordinea compoziției">'+steps.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>';
  function canvas(id,label){return `<canvas id="${id}-canvas" class="blend-canvas" width="${E.width}" height="${E.height}" role="img" aria-label="${esc(label)}">${esc(label)}</canvas>`;}
  function frame(id,label,annotation=true){return `<div class="blend-scene">${canvas(id,label)}${annotation?`<svg class="blend-annotations" viewBox="0 0 480 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${id}-zones"><title id="${id}-zones">Zone de observat: A numai, A ∩ B, B numai</title><g fill="#233f50" font-family="system-ui,sans-serif" font-size="18"><text x="75" y="35">A numai</text><text x="223" y="35">A ∩ B</text><text x="371" y="35">B numai</text></g><path d="M100 42V58M252 42V104M410 42V104" fill="none" stroke="#233f50" stroke-width="1.5"/><rect x="181" y="106" width="143" height="143" fill="none" stroke="#233f50" stroke-width="2" stroke-dasharray="5 4"/></svg>`:''}</div>`;}
  function params(d,s){if(d.id==='B0'){const map={normal50:['normal',50],normal100:['normal',100],multiply100:['multiply',100],screen100:['screen',100]};const [mode,opacity]=map[s.variant];return {...s,mode,opacity};}return s;}
  function kind(d){return ({B3:'feature',B6:'group',B7:'mask',B8:'mask',B9:'hillshade',B10:'legend',B11:'context','blend-repair':'repair'})[d.id]||'explorer';}
  const zones=d=>!['B9','B10','B11','blend-repair'].includes(d.id);
  function plot(d,s,id){const p=params(d,s);return frame(id,`${d.title}. ${title(p.mode)}, opacity ${p.opacity}%. ${['B6','B3'].includes(d.id)?'Nivel: '+(p.scope==='group'?'compoziția comună':'copil / obiect'):''}`,zones(d));}
  function contextFeedback(s){if(s.opacity===0)return 'Tema nu se vede; contextul singur nu comunică variabila tematică.';if(s.mode==='normal'&&s.opacity===100)return 'Tema este dominantă, dar textura contextuală din interior este ascunsă.';if(s.mode==='hard-light')return 'Contrastul este puternic și poate exagera variațiile. Contextul poate începe să concureze cu tema.';if(s.opacity<35)return 'Contextul este vizibil, dar tema poate pierde dominanța. Verifică limitele și relația cu legenda.';if(s.mode==='screen')return 'Compoziția se luminează; verifică dacă tema și limitele păstrează suficient contrast.';return 'Tema și textura contextuală pot fi citite împreună. Verifică dominanța temei și lizibilitatea înainte de a păstra varianta.';}
  function draw(d,state,id){const s=params(d,state),m=mode(s.mode),repair=d.id==='blend-repair';let dynamic='',status=`${m.name} · ${D.families[m.family]} · opacity ${s.opacity}%`;
    dynamic=`<p>${esc(m.observation)}</p><h4>Când poate fi util</h4><p>${esc(m.use)}</p><p class="blend-warning"><strong>Atenție:</strong> ${esc(m.warning)}</p>`;
    if(d.id==='B0')dynamic='<p><strong>CÂT:</strong> Normal la 50% reduce contribuția stratului. <strong>CUM:</strong> Multiply la 100% combină culorile, fără să reducă opacitatea.</p>'+flow(['Strat inferior A','Strat superior B','Mod de combinare + opacity','Imagine']);
    if(d.id==='B3')dynamic+=flow(s.scope==='child'?['Obiect A în strat','Obiect B cu Feature blending','Compune stratul','Stratul pe fundal']:['Obiecte A și B cu Normal','Compune stratul','Layer blending cu fundalul'])+'<p>Este un singur strat vectorial conceptual, cu două obiecte. Nivelul Feature nu este ordinea a două straturi.</p>';
    if(d.id==='B5')dynamic+=flow(s.order==='A'?['B dedesubt','A deasupra: '+m.name,'Hartă']:['A dedesubt','B deasupra: '+m.name,'Hartă'])+'<p>Aici schimbăm ordinea a două straturi distincte, nu feature order din T2.</p>';
    if(d.id==='B6')dynamic+=flow(s.scope==='child'?['A în grup','B: '+m.name+' cu A','Compune grupul','Normal pe C']:['A + B cu Normal','Compune grupul',m.name+' față de C'])+'<p><strong>Render Layers as a Group:</strong> copiii au o compoziție comună. C nu este accesibil blending-ului copilului; devine partenerul de combinare al grupului.</p>';
    if(['B7','B8'].includes(d.id)){status=`${m.name} · B deasupra lui A · alpha B ${s.opacity}%`;dynamic=flow(['Grup: B deasupra lui A',s.mode==='mask-below'?'B produce masca → A este afectat':'A produce masca → B este afectat','Rezultat transparent în exterior','Grupul pe C'])+`<p><strong>${m.name}:</strong> ${esc(m.observation)} Alpha rezultat depinde de ambele straturi; culoarea neagră nu este automat o gaură în mască.</p><p>C rămâne vizibil unde rezultatul grupului este transparent. Datele și geometriile nu sunt decupate.</p>`;}
    if(d.id==='B9')dynamic+='<p>Acesta este un pseudo-hillshade sintetic: nu calculăm panta, umbrele din DEM sau un renderer raster.</p>';
    if(d.id==='B10')dynamic+='<div class="blend-legend-labels"><span>Swatch original · 100%</span><span>Fundal luminos</span><span>Fundal întunecat</span></div><p>Swatch-ul original rămâne neschimbat la selectarea altui mod sau altei opacități.</p>';
    if(d.id==='B11')dynamic='<p>'+esc(contextFeedback(s))+'</p><h4>Argumentează alegerea</h4><p>Urmărește contrastul, dominanța temei, contextul și lizibilitatea. Mai multe combinații pot fi potrivite; nu atribuim un verdict estetic unic.</p>';
    if(repair){const checks=E.repair(s),score=checks.filter(c=>c.ok).length;status=`${score} / 4 · principii pentru această scenă`;dynamic=`<div class="blend-repair-progress"><label for="blend-repair-progress">Probleme rezolvate: ${score} / 4</label><progress id="blend-repair-progress" max="4" value="${score}">${score}/4</progress></div><ol class="blend-feedback" aria-label="Cele patru probleme">${checks.map((c,i)=>`<li>${c.ok?'✓':'○'} <strong>${['Opacitate','Modul temei','Ordinea straturilor','Compoziția grupului'][i]}:</strong> ${esc(c.text)}</li>`).join('')}</ol><p>Mai multe combinații pot produce o compoziție cartografică bună. Exemplul propus este o variantă echilibrată, nu o soluție unică.</p>`;}
    if(s.mode==='subtract')dynamic+='<details class="blend-model-note"><summary>De ce Subtract nu este o scădere raster?</summary><p>În QGIS 3.44, numele Subtract este asociat operației vizuale Exclusion. Laboratorul urmează acest comportament verificat, distinct de Difference; descrierea simplificată din manual nu trebuie citită ca o formulă de analiză.</p>'+L.sourceLink('qgis-composition-reference')+'</details>';
    const legend=d.id==='B10'?[{color:'#c56b43',label:'Culoarea originală a simbolului, neschimbată'}]:d.id==='B9'?[{color:'#ccad6e',label:'A · suprafață colorată sintetică'},{color:'#919191',label:'B · pseudo-hillshade sintetic'}]:['B11','blend-repair'].includes(d.id)?[{color:'#c56b43',label:'Tema · culoare originală'},{color:'#919191',label:'Context · textură și repere'}]:[{color:'#345771',label:'A · patru tonalități originale'},{color:'#cfcfa9',label:'B · pattern luminos, mediu și întunecat'}];
    return {svg:plot(d,s,id),status,dynamic,legend};
  }
  function paint(canvas,d,s){const pixels=E.image(kind(d),params(d,s)),ctx=canvas.getContext('2d');ctx.putImageData(new ImageData(pixels,E.width,E.height),0,0);}
  function comparisons(d,s){
    if(d.id==='B0')return [['Normal · 50%',{...s,mode:'normal',opacity:50,variant:'normal50'}],['Multiply · 100%',{...s,mode:'multiply',opacity:100,variant:'multiply100'}]];
    if(['B2','B9'].includes(d.id))return D.basic.map(id=>[title(id)+' · 100%',{...s,mode:id,opacity:100}]);
    if(['B3','B6'].includes(d.id))return [['Obiect / copil',{...s,scope:'child'}],['Strat / grup compus',{...s,scope:'group'}]];
    if(['B7','B8'].includes(d.id))return ['mask-below','masked-by-below'].map(id=>[title(id),{...s,mode:id}]);
    if(d.id==='B5')return [['A deasupra',{...s,order:'A'}],['B deasupra',{...s,order:'B'}]];
    if(d.id==='B11')return [['Normal · 100%',{...s,mode:'normal',opacity:100}],['Alegerea ta',{...s}]];
    return [['Normal',{...s,mode:'normal'}],[title(s.mode),{...s}]];
  }
  function afterRender(s,result,card){const d=D.demos.find(d=>d.id===card.id);paint(card.querySelector('.lab-map canvas'),d,s);
    const compare=card.querySelector('.lab-compare');if(s.compare){const items=comparisons(d,s);compare.innerHTML='<div class="blend-comparison">'+items.map(([label,state],i)=>`<section><h4>${esc(label)}</h4>${plot(d,state,d.id+'-comparison-'+i)}</section>`).join('')+'</div>';
      items.forEach(([,state],i)=>paint(compare.querySelector('#'+d.id+'-comparison-'+i+'-canvas'),d,state));
      if(d.id==='B2')compare.insertAdjacentHTML('beforeend','<p class="blend-mobile-note">Pe mobil, compară cele patru moduri cu selectorul și scena mare, la opacity 100%.</p>');
    }
    const extra=card.querySelector('.lab-extra');
    if(['B1','B3'].includes(d.id))extra.innerHTML='<button type="button" class="outline-button" data-blend-normal>Revino la Normal</button>';
    if(d.id==='B4')extra.innerHTML='<fieldset class="opacity-presets"><legend>Același mod, altă intensitate</legend>'+[100,70,40].map(p=>`<button type="button" class="outline-button" data-blend-opacity="${p}" aria-pressed="${s.opacity===p}">${p}%</button>`).join('')+'</fieldset>';
    if(d.id==='B11')extra.innerHTML='<fieldset class="opacity-presets"><legend>Compară variante</legend>'+[['normal',100],['multiply',100],['overlay',100],['multiply',60],['overlay',55]].map(([m,p])=>`<button type="button" class="outline-button" data-blend-preset="${m}:${p}" aria-pressed="${s.mode===m&&s.opacity===p}">${title(m)} ${p}%</button>`).join('')+'</fieldset>';
    if(d.id==='blend-repair')extra.innerHTML='<button type="button" class="outline-button" data-blend-solution>Vezi o soluție posibilă</button>';
  }
  function start(){const host=document.getElementById('blending-root');if(!host)return;host.innerHTML=D.demos.map(L.shell).join('');
    for(const d of D.demos){const card=document.getElementById(d.id),compare=card.querySelector('.lab-compare');card.classList.add('blend-demo');card.querySelector('.lab-demo-layout').after(compare);
      controllers.set(d.id,L.mountDemo(d,card,{draw,afterRender,onChange:(state,key)=>{if(key==='family')state.mode=D.modes.find(m=>m.family===state.family).id;}}));
      card.addEventListener('click',e=>{const button=e.target.closest('button');if(!button)return;let patch;
        if(button.hasAttribute('data-blend-normal'))patch={family:'normal',mode:'normal'};
        if(button.hasAttribute('data-blend-opacity'))patch={opacity:Number(button.dataset.blendOpacity)};
        if(button.hasAttribute('data-blend-preset')){const [mode,opacity]=button.dataset.blendPreset.split(':');patch={mode,opacity:Number(opacity)};}
        if(button.hasAttribute('data-blend-solution'))patch={opacity:60,mode:'multiply',order:'theme',groupMode:'normal'};
        if(patch){const attribute=[...button.attributes].find(a=>a.name.startsWith('data-blend-'));controllers.get(d.id).setState(patch);card.querySelector('['+attribute.name+(attribute.value?'="'+attribute.value+'"':'')+']')?.focus();}
      });
    }
    L.checkpoint(document.getElementById('blending-checkpoint'),D.quiz,{title:'Checkpoint · Blending',id:'blending-checkpoint-title',namespace:'blending-quiz'});
    document.getElementById('blend-source-root').innerHTML=L.sources(['vector-layer-rendering','symbol-opacity','color-opacity','group-rendering','blending-modes','raster-transparency'],{id:'blend-qgis-sources',title:'Transparență & blending · QGIS · Surse oficiale'});
    document.getElementById('blend-effects-source').innerHTML=L.sourceLink('draw-effects');
    root.CARTO_BLEND_CONTROLLERS=controllers;
    const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(target)requestAnimationFrame(()=>target.scrollIntoView({block:'start',behavior:'instant'}));
  }
  root.CARTO_BLEND_RENDER={draw,params,kind,comparisons};start();
})(window);
