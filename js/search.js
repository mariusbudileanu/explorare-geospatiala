'use strict';
(() => {
  const $=(selector,root=document)=>root.querySelector(selector);
  const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const normalize=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function init(manifest, rootPrefix = '') {
    const input=$('#search'),results=$('#search-results');if(!input||!results)return;
    results.setAttribute('aria-live','polite');results.setAttribute('aria-label','Rezultatele căutării');
    const key=text=>normalize(text).replace(/[‐‑–—-]/g,' ').replace(/\s+/g,' ').trim();
    const records=new Map((window.CARTO_SEARCH_INDEX||[]).map(r=>[r.id,r]));
    const index=manifest.lessons.map(lesson=>{const record=records.get(lesson.id);const paragraphs=record?.paragraphs||[];return {lesson,paragraphs,metadata:key([lesson.title,lesson.editorial_number,lesson.source_section,...lesson.keywords,...lesson.figures.map(f=>f.caption)].join(' ')),body:key(paragraphs.join(' '))};});
    input.addEventListener('input',()=>{
      const query=key(input.value);results.hidden=!query;if(!query){results.innerHTML='';return;}
      const found=index.map(item=>({...item,score:key(item.lesson.title).includes(query)?3:item.metadata.includes(query)?2:item.body.includes(query)?1:0})).filter(i=>i.score).sort((a,b)=>b.score-a.score).slice(0,8);
      results.innerHTML=found.length?found.map(({lesson,paragraphs})=>{const context=paragraphs.find(p=>key(p).includes(query))||paragraphs[0]||lesson.editorial_part||lesson.part;const words=context.split(/\s+/);const match=words.findIndex((_,i)=>key(words.slice(i,i+query.split(' ').length+1).join(' ')).includes(query));const start=Math.max(0,match-12);const snippet=(start?'… ':'')+words.slice(start,start+42).join(' ')+(words.length>start+42?' …':'');return `<a href="${rootPrefix}${lesson.href}"><strong>${esc(lesson.editorial_number||'')}</strong> ${esc(lesson.title)}<small>${esc(snippet)}</small></a>`;}).join(''):'<p>Niciun rezultat.</p>';
    });
    input.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true;if(event.key==='ArrowDown'){event.preventDefault();$('a',results)?.focus();}if(event.key==='Enter'&&!results.hidden){event.preventDefault();$('a',results)?.click();}});
    results.addEventListener('keydown',event=>{const links=$$('a',results),i=links.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();links[(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();}if(event.key==='Escape'){results.hidden=true;input.focus();}});
    document.addEventListener('click',event=>{if(!event.target.closest('.global-search'))results.hidden=true;});
  }

  window.CARTO_SEARCH={init};
})();
