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
    // Section records inherit the parent's manifest authority, never navigation or levels.
    const sections=[...records.values()].filter(r=>r.parentId&&manifest.lessons.some(l=>l.id===r.parentId)).map(r=>({...manifest.lessons.find(l=>l.id===r.parentId),id:r.id,title:r.title,href:r.href,editorial_number:'',keywords:r.keywords,figures:[]}));
    const index=[...manifest.lessons,...sections].map(lesson=>{
      const record=records.get(lesson.id),paragraphs=record?.paragraphs||[];
      const metadataFields=[lesson.title,lesson.editorial_number,lesson.source_section,...lesson.keywords,...lesson.figures.map(f=>f.caption)].filter(Boolean);
      return {lesson,paragraphs,description:record?.description||lesson.title,metadataFields,metadata:key(metadataFields.join(' ')),body:key(paragraphs.join(' '))};
    });
    const excerpt=(context,query)=>{
      const words=context.trim().split(/\s+/),position=key(context).indexOf(query);
      let offset=0;
      const match=words.findIndex(word=>{const end=offset+key(word).length;const found=position>=offset&&position<end;offset=end+1;return found;});
      const start=Math.max(0,match-12),end=Math.min(words.length,start+42);
      return (start?'… ':'')+words.slice(start,end).join(' ')+(end<words.length?' …':'');
    };
    input.addEventListener('input',()=>{
      const query=key(input.value);results.hidden=!query;if(!query){results.innerHTML='';return;}
      const found=index.map(item=>({...item,score:key(item.lesson.title).includes(query)?3:item.metadata.includes(query)?2:item.body.includes(query)?1:0})).filter(i=>i.score).sort((a,b)=>b.score-a.score).slice(0,8);
      results.innerHTML=found.length?found.map(({lesson,paragraphs,metadataFields,description})=>{
        // Prefer actual teaching text; a metadata-only match must explain its topic.
        const field=metadataFields.find(text=>key(text).includes(query));
        const context=paragraphs.find(p=>key(p).includes(query))
          ||`Temă indexată: ${field||metadataFields.join(' ')}. ${description}`;
        return `<a href="${rootPrefix}${lesson.href}"><strong>${esc(lesson.editorial_number||'')}</strong> ${esc(lesson.title)} <small>${esc(excerpt(context,query))}</small></a>`;
      }).join(''):'<p>Niciun rezultat.</p>';
    });
    input.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true;if(event.key==='ArrowDown'){event.preventDefault();$('a',results)?.focus();}if(event.key==='Enter'&&!results.hidden){event.preventDefault();$('a',results)?.click();}});
    results.addEventListener('keydown',event=>{const links=$$('a',results),i=links.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();links[(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();}if(event.key==='Escape'){results.hidden=true;input.focus();}});
    document.addEventListener('click',event=>{if(!event.target.closest('.global-search'))results.hidden=true;});
  }

  window.CARTO_SEARCH={init};
})();
