'use strict';
(() => {
  const model=window.CARTO_LEARNING,manifest=window.CARTO_CONTENT;
  if(!model||!manifest)return;
  const lessons=new Map(manifest.lessons.map(item=>[item.id,item]));
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const link=(id,prefix='')=>{const l=lessons.get(id);if(!l)throw Error('Unknown learning destination: '+id);return `<a href="${prefix}${esc(l.href)}">${esc(l.title)}</a>`;};
  const icons={
    'book-open':'<path d="M12 7v14m0-14C9 4 5 4 2 5v15c3-1 7-1 10 1 3-2 7-2 10-1V5c-3-1-7-1-10 2Z"/>',
    layers:'<path d="m12 3 10 6-10 6L2 9 12 3Zm-10 12 10 6 10-6M2 12l10 6 10-6"/>',
    'graduation-cap':'<path d="m2 9 10-6 10 6-10 6L2 9Zm4 3v6c4 3 8 3 12 0v-6m4-3v9"/>'
  };
  const badge=level=>{const value=model.levels[level];return value?`<span class="level-badge level-${level}" data-learning-level="${level}" style="--level-color:${value.color}"><svg data-icon="${value.icon}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7">${icons[value.icon]}</svg>${esc(value.label)}</span>`:'';};
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
  const companionHub=()=>{
    const laboratories=manifest.lessons.filter(l=>l.lab_id).sort((a,b)=>a.lab_id.localeCompare(b.lab_id));
    return `<section class="lesson-section" aria-labelledby="companion-primary-title"><h2 id="companion-primary-title">Cele 20 de laboratoare</h2><p>Experimentează direct în browser, fără instalarea QGIS.</p><form class="catalog-filters" hidden aria-label="Filtrează laboratoarele"><label>Temă <select id="catalog-theme"><option value="">Toate temele</option>${manifest.chapters.filter(g=>laboratories.some(l=>l.canonicalSection===g.id)).map(g=>`<option value="${g.id}">${esc(g.label)}</option>`).join('')}</select></label><label>Dificultate <select id="catalog-level"><option value="">Toate nivelurile</option>${Object.entries(model.levels).map(([id,v])=>`<option value="${id}">${esc(v.label)}</option>`).join('')}</select></label><button type="reset">Resetează filtrele</button></form><p id="catalog-status" role="status" aria-live="polite">20 de laboratoare</p><div class="companion-primary-grid catalog-grid">${laboratories.map(l=>{
      const item=model.items[l.id],group=manifest.chapterFor(l.id),contexts=[...new Set([...(l.companion?.contexts||[]),...item.prerequisites])].filter(id=>lessons.has(id)&&id!==l.id&&!lessons.get(id).canonical_id).slice(0,3);
      return `<article class="learning-card catalog-card" style="--level-color:${model.levels[item.level].color}" data-lab="${l.lab_id}" data-theme="${group.id}" data-level="${item.level}"><div class="companion-card-meta"><span class="eyebrow">${l.lab_id}</span>${badge(item.level)}</div><h3><a href="${esc(l.href)}">${esc(l.title)}</a></h3><p>${esc(l.description||l.companion?.description||item.outcomes[0])}</p><p class="small">Temă: ${esc(group.label)}</p>${contexts.length?`<p>Concepte și legături: ${contexts.map(id=>link(id)).join(' · ')}</p>`:''}</article>`;
    }).join('')}</div><p id="catalog-empty" hidden>Niciun laborator nu corespunde filtrelor alese.</p></section><section class="lesson-section"><h2 id="companion-secondary-title">Explorează și aplică</h2><p><a href="learning-path.html">Parcurs recomandat</a> · <a href="challenges.html">Provocări pe date reale</a></p><h2 id="companion-course-title">Continuă în QGIS</h2><p><a href="tutorials/index.html">Atelierele T01–T06</a> transferă conceptele într-un proiect GIS.</p></section>`;
  };
  const companionHome=()=>`<section class="companion-home lesson-section" aria-labelledby="companion-home-title"><h2 id="companion-home-title">Două căi de explorare</h2><div class="companion-primary-grid"><article class="learning-card"><h3>Învață pe capitole</h3><p>Parcurge conceptele în ordinea structurii academice.</p><a class="outline-button" href="#cuprins">Vezi cuprinsul →</a></article><article class="learning-card"><h3>${esc(lessons.get('digital-companion').title)}</h3><p>Experimentează cu proiecții, clasificare, design și diagnostic.</p><a class="outline-button" href="${esc(lessons.get('digital-companion').href)}">Deschide Digital Companion →</a></article></div></section>`;
  const intro=(id,prefix='')=>{
    const item=model.items[id];if(!item?.level)return '';
    const preparation=(refs,title)=>{const available=refs.filter(id=>lessons.has(id));return available.length?`<div class="learning-prerequisites"><h2>${title}</h2><p>${available.map(p=>link(p,prefix)).join(' · ')}</p></div>`:'';};
    const outcomes=/^T0[1-6]$/.test(id)?'':`<div><h2>Ce vei ști să faci</h2><ul>${item.outcomes.map(text=>`<li>${esc(text)}</li>`).join('')}</ul></div>`;
    return `<aside class="learning-context resource-level" style="--level-color:${model.levels[item.level].color}" aria-label="Nivel și pregătire"><div class="learning-context-top">${badge(item.level)}<a href="${prefix}learning-path.html">Parcurs recomandat →</a></div>${outcomes}${preparation(item.prerequisites,'Cunoștințe necesare')}${preparation(item.recommendedPrerequisites,'Pregătire recomandată')}${item.prerequisites.length?'<p class="small">Prerechizitele descriu pregătirea necesară; accesul la resursă rămâne liber.</p>':''}</aside>${callouts(id,prefix)}`;
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
  const tail=(id,prefix='')=>{
    if(!model.items[id])return '';
    const seen=new Set([id]),actions=[];
    const add=(target,label,primary=false)=>{if(!target||seen.has(target)||!lessons.has(target))return;seen.add(target);actions.push(`<a${primary?' class="outline-button continuation-primary"':''} href="${prefix}${esc(lessons.get(target).href)}"><span>${label}</span> · ${esc(manifest.resourceLabel(target))}</a>`);};
    add(model.recommendedNext(id),'Continuă parcursul recomandat',true);
    const chapter=manifest.chapterContinuation(id);if(chapter)add(chapter.id,chapter.label);
    return checks(id)+`<nav class="learning-continuation" aria-label="Continuă învățarea">${actions.join('')}${id==='final-project'?'<p>Ai încheiat proiectul integrator. Poți alege o altă temă prin explorare liberă.</p>':id===model.activePath.at(-1)?'<p>Ai încheiat secvența introductivă disponibilă. Continuă explorarea liberă prin capitole sau prin catalogul laboratoarelor.</p>':''}</nav>`;
  };
  const levels=()=>`<div class="learning-grid level-cards">${Object.entries(model.levels).map(([key,value])=>`<article class="learning-card">${badge(key)}<p>${esc(value.description)}</p><a href="learning-path.html#nivel-${key}">Materiale pentru ${esc(value.label.toLocaleLowerCase('ro'))} →</a></article>`).join('')}</div>`;
  const stages=()=>`<ol class="learning-stages">${model.stages.map((stage,i)=>`<li><article class="learning-card"><h3>${i+1}. ${esc(stage.title)}</h3><p>${esc(stage.task)}</p><p>${stage.items.map(id=>link(id)).join(' · ')}</p></article></li>`).join('')}</ol><p>Secvența ghidată disponibilă se încheie aici. Continuările introductive către coordonate rectangulare și prima hartă QGIS sunt în pregătire. Poți explora liber toate resursele existente.</p>`;
  const inventory=()=>Object.entries(model.levels).map(([level,descriptor])=>`<section id="nivel-${level}"><h3>${esc(descriptor.label)}</h3><p>${esc(descriptor.description)}</p><div class="learning-inventory-grid">${manifest.groups.flatMap(g=>g.lessons).filter(id=>model.items[id]?.level===level).map(id=>`<article class="learning-card"><h4>${link(id)}</h4>${badge(level)}<p>${esc(model.items[id].reason)}</p><p>${esc(model.items[id].outcomes[0])}</p></article>`).join('')}</div></section>`).join('');
  const branches=()=>`<div class="learning-grid">${[
    ['Vector și structuri de date',['vector','formats','georeferencing']],
    ['Raster și interpretare',['rasterChallenges']],
    ['Reprezentare cartografică',['representation']],
    ['Analiză și decizie',['statistics','networks']],
    ['Aplicații pe date reale',['sport','vectorChallenges']]
  ].map(([title,keys])=>{const ids=[...new Set(keys.flatMap(key=>model.plan.branches[key]).map(id=>model.segments[id]?.resourceId||id))];return `<article class="learning-card"><h3>${title}</h3><p>${ids.map(id=>link(id)).join(' · ')}</p></article>`;}).join('')}</div>`;
  const glossary=()=>`<dl id="glossary-list" class="glossary-list">${window.CARTO_GLOSSARY.map((item,i)=>`<div class="glossary-entry" id="termen-${i+1}"><dt><strong>${esc(item.term_ro)}</strong> <span lang="en">${esc(item.term_en)}</span></dt><dd><p>${esc(item.modern_definition||item.historical_definition)}</p>${item.historical_definition?`<p class="small">Referință istorică: Năstase &amp; Cernea (1974), ${esc(item.source)}. <a href="https://biblioteca-digitala.ro/?pub=10971-cartografie-generala">Consultă sursa</a>.</p>`:''}${item.lesson_id?`<p>${link(item.lesson_id)} →</p>`:''}</dd></div>`).join('')}</dl>`;
  const home=()=>`<section class="learning-home lesson-section" id="incepe"><span class="eyebrow">UN PUNCT DE PORNIRE</span><h2>Începe aici, apoi alege direcția</h2><p>Pentru primul contact cu GIS, începe cu <a href="learning-path.html">secvența introductivă</a>: poziție geografică, hartă și date. Experimentează în <a href="digital-companion.html">laboratoarele din browser</a>. Dacă ai experiență, poți intra direct în orice modul.</p>${levels()}<p class="learning-home-route">Fundamente → date și reprezentare → CRS → operații GIS → analiză → ateliere → proiect integrator</p><p><a class="outline-button" href="learning-path.html">Parcurge etapele recomandate →</a> <a class="outline-button" href="final-project.html">Proiect final integrator →</a></p></section>`;
  window.CARTO_LEARNING_UI={intro,tail,badge,levels,stages,branches,inventory,glossary,home,form,bindChecks,experience,experienceCard,callouts,companionHub,companionHome};
  if(typeof document==='undefined')return;
  function initialize() {
    const id=document.body.dataset.pageId || (['home','resources'].includes(document.body.dataset.page)?document.body.dataset.page:new URLSearchParams(location.search).get('id'));
    const main=document.querySelector('main'),prefix=document.body.dataset.root||'';
    if(main&&model.items[id]&&(model.items[id].level||manifest.chapterFor(id))){
      if(!main.querySelector('.learning-context')){
        const hero=main.querySelector('h1')?.closest('section,header');
        if(hero)hero.insertAdjacentHTML('afterend',intro(id,prefix));
      }
      if(!main.querySelector('.learning-continuation')){
        const footer=main.querySelector('.site-footer');
        if(footer)footer.insertAdjacentHTML('beforebegin',tail(id,prefix));else main.insertAdjacentHTML('beforeend',tail(id,prefix));
      }
    }
    document.querySelectorAll('.feature-card,.workshop-card,.lab-hub-card').forEach(card=>{
      const anchor=card.matches('a')?card:card.querySelector('a');if(!anchor)return;
      const lesson=manifest.lessons.find(l=>new URL(prefix+l.href,location.href).href===anchor.href);
      const item=lesson&&model.items[lesson.id];if(!item?.level||card.querySelector('.level-badge'))return;
      const heading=card.querySelector('h2,h3');heading?.insertAdjacentHTML('afterend',badge(item.level));
    });
    if(main&&lessons.has(id)){
      const breadcrumb=main.querySelector('.lesson-breadcrumb');
      if(breadcrumb)breadcrumb.outerHTML=manifest.breadcrumbMarkup(id,prefix);
      else if(lessons.has(id))main.insertAdjacentHTML('afterbegin',manifest.breadcrumbMarkup(id,prefix));
    }
    const catalog=document.querySelector('.catalog-filters');
    if(catalog){
      const cards=[...document.querySelectorAll('.catalog-card')],theme=document.querySelector('#catalog-theme'),level=document.querySelector('#catalog-level');
      const update=()=>{let count=0;for(const card of cards){const show=(!theme.value||card.dataset.theme===theme.value)&&(!level.value||card.dataset.level===level.value);card.hidden=!show;if(show)count++;}document.querySelector('#catalog-status').textContent=count+' din 20 de laboratoare';document.querySelector('#catalog-empty').hidden=count>0;};
      catalog.hidden=false;catalog.addEventListener('change',update);catalog.addEventListener('reset',()=>{theme.value='';level.value='';update();});update();
    }
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
