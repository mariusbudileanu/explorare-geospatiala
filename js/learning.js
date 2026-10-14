'use strict';
(() => {
  const model=window.CARTO_LEARNING,manifest=window.CARTO_CONTENT;
  if(!model||!manifest)return;
  const lessons=new Map(manifest.lessons.map(item=>[item.id,item]));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link=(id,prefix='')=>{const l=lessons.get(id);if(!l)throw Error('Unknown learning destination: '+id);return `<a href="${prefix}${esc(l.href)}">${esc(l.title)}</a>`;};
  const badge=level=>`<span class="level-badge level-${level}" data-learning-level="${level}">${esc(model.levels[level].label)}</span>`;
  const experience=id=>{
    const lesson=lessons.get(id),info=lesson.companion;
    return {id,title:info.title||lesson.title,href:info.href||lesson.href,description:info.description,category:info.category,level:model.items[id].level};
  };
  const experienceCard=(id,{compact=false,prefix=''}={})=>{
    const item=experience(id);
    return `<article class="learning-card companion-card${compact?' companion-card-compact':''}" data-experience="${esc(id)}"><div class="companion-card-meta"><span class="eyebrow">${esc(item.category)}</span>${badge(item.level)}</div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><a class="companion-card-link" href="${esc(prefix+item.href)}">Explorează <span class="sr-only">${esc(item.title)}</span> →</a></article>`;
  };
  const callouts=(id,prefix='')=>manifest.companion.primary.filter(key=>lessons.get(key).companion.contexts.includes(id)).map(key=>{
    const item=experience(key),description=lessons.get(key).companion.contextDescription||item.description;
    return `<aside class="companion-callout" data-companion-callout="${esc(key)}" aria-label="Explorează acest concept"><span class="eyebrow">Explorează acest concept</span><h2>${esc(item.title)}</h2><p>${esc(description)}</p><a class="outline-button" href="${esc(prefix+item.href)}">Deschide ${key==='styling-labeling'?'studioul':'laboratorul'} <span class="sr-only">${esc(item.title)}</span> →</a></aside>`;
  }).join('');
  const companionHub=()=>`<section class="lesson-section" aria-labelledby="companion-primary-title"><h2 id="companion-primary-title">Experiențe principale</h2><div class="companion-primary-grid">${manifest.companion.primary.map(id=>experienceCard(id)).join('')}</div></section><section class="lesson-section" aria-labelledby="companion-secondary-title"><h2 id="companion-secondary-title">Mai multe experiențe interactive</h2><div class="companion-secondary-grid">${manifest.companion.secondary.map(id=>experienceCard(id,{compact:true})).join('')}</div></section><section class="lesson-section" aria-labelledby="companion-course-title"><h2 id="companion-course-title">De la experiment la curs și QGIS</h2><p>Laboratoarele din browser ajută la explorarea conceptelor; atelierele QGIS transferă aceleași concepte într-un flux GIS complet. Experiențele sunt complementare capitolelor și nu înlocuiesc QGIS.</p><p><a class="outline-button" href="tutorials/index.html">Ateliere QGIS →</a></p><p>Preferi traseul structurat? <a href="index.html#cuprins">Învață pe capitole</a> sau alege <a href="learning-path.html">Parcursul recomandat</a>. Accesul la toate materialele rămâne liber.</p></section>`;
  const companionHome=()=>`<section class="companion-home lesson-section" aria-labelledby="companion-home-title"><h2 id="companion-home-title">Două căi de explorare</h2><div class="companion-primary-grid"><article class="learning-card"><h3>Învață pe capitole</h3><p>Parcurge conceptele în ordinea structurii academice.</p><a class="outline-button" href="#cuprins">Vezi cuprinsul →</a></article><article class="learning-card"><h3>${esc(lessons.get('digital-companion').title)}</h3><p>Experimentează cu proiecții, clasificare, design și diagnostic.</p><a class="outline-button" href="${esc(lessons.get('digital-companion').href)}">Deschide Digital Companion →</a></article></div></section>`;
  const intro=(id,prefix='')=>{
    const item=model.items[id];if(!item)return '';
    const prerequisites=item.level!=='beginner'&&item.prerequisites.length?`<div class="learning-prerequisites"><h2>Înainte de a începe</h2><p>${item.prerequisites.map(p=>link(p,prefix)).join(' · ')}. Recomandări de pregătire; accesul rămâne liber.</p></div>`:'';
    const outcomes=/^T0[1-6]$/.test(id)?'':`<div><h2>Ce vei ști să faci</h2><ul>${item.outcomes.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></div>`;
    return `<aside class="learning-context" aria-label="Nivel și pregătire"><div class="learning-context-top">${badge(item.level)}<a href="${prefix}learning-path.html">Parcurs recomandat →</a></div>${outcomes}${prerequisites}</aside>${callouts(id,prefix)}`;
  };
  const optionText=option=>typeof option==='string'?option:option.text;
  const form=q=>`<form class="formative-check" data-learning-question="${esc(q.id)}"><fieldset><legend>${esc(q.prompt)}</legend>${q.options.map((option,i)=>`<label><input type="radio" name="learning-${esc(q.id)}" value="${i}"> <span>${esc(optionText(option))}</span></label>`).join('')}</fieldset><div class="formative-actions" hidden><button type="submit">Verifică alegerea</button><button type="reset">Reia întrebarea</button></div><p class="learning-feedback" role="status" aria-live="polite"></p><details class="formative-explanation"><summary>Explicație și justificare</summary>${Number.isInteger(q.answer)?`<p><strong>Alegerea justificată:</strong> ${esc(optionText(q.options[q.answer]))}</p>`:''}<p>${esc(q.explanation)}</p>${q.options.some(o=>typeof o==='object')?'<ul>'+q.options.map(o=>`<li><strong>${esc(o.text)}:</strong> ${esc(o.feedback)}</li>`).join('')+'</ul>':''}</details></form>`;
  function bindChecks(scope,questions,{signal}={}){
    for(const element of scope.querySelectorAll('[data-learning-question]')){
      const q=questions.find(q=>q.id===element.dataset.learningQuestion);if(!q)continue;
      element.querySelector('.formative-actions').hidden=false;
      const feedback=element.querySelector('.learning-feedback');
      element.addEventListener('submit',event=>{event.preventDefault();const value=new FormData(element).get('learning-'+q.id);if(value===null){feedback.textContent='Alege o variantă înainte de verificare.';return;}const option=q.options[Number(value)];feedback.textContent=typeof option==='object'?({justified:'Intervenție justificabilă. ',partial:'Intervenție parțială. ',revise:'Revizuiește interpretarea. '}[option.status]+option.feedback):(Number(value)===q.answer?'Alegere justificată. ':'Revizuiește alegerea. ')+q.explanation;},{signal});
      element.addEventListener('reset',()=>feedback.textContent='',{signal});
    }
  }
  const checks=id=>{
    const questions=model.checks[id]||[];if(!questions.length)return '';
    return `<section class="learning-checks lesson-section" aria-labelledby="learning-checks-title"><h2 id="learning-checks-title">Verifică-ți înțelegerea</h2><p>Alege o variantă și verifică justificarea. Aceste verificări sunt formative; răspunsurile nu sunt salvate.</p>${questions.map(form).join('')}</section>`;
  };
  const tail=(id,prefix='')=>{const item=model.items[id];if(!item)return '';return checks(id)+`<nav class="learning-continuation" aria-label="Continuă învățarea"><span><strong>Continuă:</strong> ${link(item.next,prefix)}</span>${(item.related||[]).map(p=>link(p,prefix)).join(' ')}${item.quality?`<a href="${prefix}data-quality.html">Calitate și incertitudine →</a>`:''}<a href="${prefix}learning-path.html">Revino la parcurs</a></nav>`;};
  const levels=()=>`<div class="learning-grid level-cards">${Object.entries(model.levels).map(([key,value])=>`<article class="learning-card">${badge(key)}<p>${esc(value.description)}</p><a href="learning-path.html#nivel-${key}">Materiale pentru ${esc(value.label.toLocaleLowerCase('ro'))} →</a></article>`).join('')}</div>`;
  const stages=()=>`<ol class="learning-stages">${model.stages.map((stage,i)=>`<li><article class="learning-card"><div class="learning-context-top"><h3>${i+1}. ${esc(stage.title)}</h3>${badge(stage.level)}</div><p>${esc(stage.task)}</p><p>${stage.items.map(id=>link(id)).join(' · ')}</p></article></li>`).join('')}</ol>`;
  const inventory=()=>Object.entries(model.levels).map(([level,descriptor])=>`<section id="nivel-${level}"><h3>${esc(descriptor.label)}</h3><p>${esc(descriptor.description)}</p><div class="learning-inventory-grid">${manifest.groups.flatMap(g=>g.lessons).filter(id=>model.items[id]?.level===level).map(id=>`<article class="learning-card"><h4>${link(id)}</h4>${badge(level)}<p>${esc(model.items[id].reason)}</p><p>${esc(model.items[id].outcomes[0])}</p></article>`).join('')}</div></section>`).join('');
  const glossary=()=>`<dl id="glossary-list" class="glossary-list">${window.CARTO_GLOSSARY.map((item,i)=>`<div class="glossary-entry" id="termen-${i+1}"><dt><strong>${esc(item.term_ro)}</strong> <span lang="en">${esc(item.term_en)}</span></dt><dd><p>${esc(item.modern_definition||item.historical_definition)}</p>${item.historical_definition?`<p class="small">Referință istorică: Năstase &amp; Cernea (1974), ${esc(item.source)}. <a href="https://biblioteca-digitala.ro/?pub=10971-cartografie-generala">Consultă sursa</a>.</p>`:''}${item.lesson_id?`<p>${link(item.lesson_id)} →</p>`:''}</dd></div>`).join('')}</dl>`;
  const home=()=>`<section class="learning-home lesson-section" id="incepe"><span class="eyebrow">UN PUNCT DE PORNIRE</span><h2>Începe aici, apoi alege direcția</h2><p>Pentru primul contact cu GIS: <a href="coordinates.html">coordonate</a>, <a href="geospatial-data.html">vector și raster</a>, apoi <a href="tutorials/t01.html">prima hartă în QGIS</a>. Dacă ai experiență, poți intra direct în orice modul.</p>${levels()}<p class="learning-home-route">Fundamente → date și reprezentare → CRS → operații GIS → analiză → ateliere → proiect integrator</p><p><a class="outline-button" href="learning-path.html">Parcurge etapele recomandate →</a> <a class="outline-button" href="final-project.html">Proiect final integrator →</a></p></section>`;
  window.CARTO_LEARNING_UI={intro,tail,badge,levels,stages,inventory,glossary,home,form,bindChecks,experience,experienceCard,callouts,companionHub,companionHome};
  if(typeof document==='undefined')return;
  function initialize() {
    const id=document.body.dataset.pageId || (document.body.dataset.page==='home'?'home':new URLSearchParams(location.search).get('id'));
    const main=document.querySelector('main'),prefix=document.body.dataset.root||'';
    if(main&&model.items[id]&&id!=='digital-companion'){
      if(!main.querySelector('.learning-context')){
        const hero=main.querySelector('h1')?.closest('section,header');
        if(hero)hero.insertAdjacentHTML('afterend',intro(id,prefix));
      }
      if(!main.querySelector('.learning-continuation')){
        const footer=main.querySelector('.site-footer');
        if(footer)footer.insertAdjacentHTML('beforebegin',tail(id,prefix));else main.insertAdjacentHTML('beforeend',tail(id,prefix));
      }
    }
    document.querySelectorAll('.theme-card,.feature-card,.workshop-card,.lab-hub-card').forEach(card=>{
      const anchor=card.matches('a')?card:card.querySelector('a');if(!anchor)return;
      const lesson=manifest.lessons.find(l=>new URL(prefix+l.href,location.href).href===anchor.href);
      const item=lesson&&model.items[lesson.id];if(!item||card.querySelector('.level-badge'))return;
      const heading=card.querySelector('h2,h3');heading?.insertAdjacentHTML('afterend',badge(item.level));
    });
    bindChecks(document,model.checks[id]||[]);
    const filter=document.querySelector('#glossary-filter');
    if(filter){
      const entries=[...document.querySelectorAll('.glossary-entry')];
      const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[‐‑–—-]/g,' ');
      const index=entries.map(element=>({element,text:normalize(element.textContent)}));
      const update=()=>{const query=normalize(filter.value.trim());let count=0;for(const entry of index){const show=entry.text.includes(query);entry.element.hidden=!show;if(show)count++;}document.querySelector('#glossary-status').textContent=`${count} din ${entries.length} termeni`;document.querySelector('#glossary-empty').hidden=count>0;};
      filter.closest('.glossary-filter').hidden=false;filter.addEventListener('input',update);
      document.querySelector('#glossary-reset').addEventListener('click',()=>{filter.value='';update();filter.focus();});update();
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})();
