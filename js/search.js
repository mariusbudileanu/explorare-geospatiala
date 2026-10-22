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
    const lessonTitles=manifest.lessons.map(lesson=>key(lesson.title));
    const records=new Map((window.CARTO_SEARCH_INDEX||[]).map(r=>[r.id,r]));
    // Section records inherit the parent's manifest authority, never navigation or levels.
    const sections=[...records.values()].filter(r=>r.parentId&&manifest.lessons.some(l=>l.id===r.parentId)).map(r=>({...manifest.lessons.find(l=>l.id===r.parentId),id:r.id,title:r.title,href:r.href,editorial_number:'',keywords:r.keywords,figures:[]}));
    const index=[...manifest.lessons.filter(l=>!l.canonical_id),...sections].map(lesson=>{
      const record=records.get(lesson.id),paragraphs=record?.paragraphs||[];
      // Canonical codes come from the manifest, never incidental DOM mentions.
      // Diagnostic subsections inherit a parent but do not own its lab code.
      const resourceCode=record?.parentId?'':lesson.lab_id||(/^T\d{2}$/.test(lesson.id)?lesson.id:'');
      const metadataFields=[resourceCode,lesson.title,lesson.editorial_number,lesson.source_section,...lesson.keywords,...lesson.figures.map(f=>f.caption)].filter(Boolean);
      return {lesson,resourceCode,paragraphs,description:record?.description||lesson.title,metadataFields,metadata:key(metadataFields.join(' ')),body:key(paragraphs.join(' '))};
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
      const found=index.map((item,order)=>({...item,order,score:item.resourceCode&&key(item.resourceCode)===query?4:key(item.lesson.title).includes(query)?3:item.metadata.includes(query)?2:item.body.includes(query)?1:0})).filter(i=>i.score).sort((a,b)=>b.score-a.score||a.order-b.order).slice(0,8);
      results.innerHTML=found.length?found.map(({lesson,paragraphs,metadataFields,description})=>{
        // Prefer actual teaching text; a metadata-only match must explain its topic.
        const title=key(lesson.title),labelKey=text=>key(text).replace(/[.:;!?]+$/u,'');
        const labels=new Set(metadataFields.map(labelKey));
        const isLabel=text=>key(text).split(/\s*·\s*/).every(part=>labels.has(labelKey(part)));
        const callouts=manifest.lessons.filter(item=>item.id!==lesson.id&&item.companion?.contexts?.includes(lesson.id))
          .map(item=>key(item.companion.contextDescription||item.companion.description)).filter(Boolean);
        const navigation=text=>{const parts=key(text).split(/\s*·\s*/);return parts.length>1&&parts.every(part=>lessonTitles.some(title=>part.startsWith(title)));};
        // The index is flat text: only accept clear prose as associated context.
        // Known metadata can be skipped, but an unknown heading ends this block.
        const descriptive=text=>key(text)!==title&&!isLabel(text)
          &&!navigation(text)&&!callouts.some(description=>key(text).includes(description))
          &&String(text).trim().split(/\s+/).length>=3&&/[.!](?:\s|$)/u.test(text);
        // A filename/path occurrence alone is not an explanation of the query.
        const termInProse=text=>key(text).replace(/\S*[\\/]\S*/g,' ').includes(query);
        const field=metadataFields.find(text=>key(text).includes(query));
        const explanation=key(description)!==title?description:descriptive(paragraphs[0]||'')?paragraphs[0]:'';
        const fallback=key(field||'')===title&&explanation?explanation
          :`Temă indexată: ${field||metadataFields.join(' ')}.${explanation?' '+explanation:''}`;
        const match=paragraphs.findIndex(p=>key(p).includes(query));
        const heading=match<0?'':paragraphs[match],ownHeading=key(heading)===title;
        // An isolated result heading anchors its adjacent block; do not jump
        // through later subheadings to manufacture its introductory explanation.
        // An exact material ID identifies the whole resource, not a file/path
        // mention in a later step; its canonical overview remains the context.
        const body=ownHeading||key(lesson.id)===query?null:paragraphs.find(p=>descriptive(p)&&termInProse(p));
        let context=body||(descriptive(description)&&termInProse(description)?description:fallback);
        if(!body&&match>=0&&!descriptive(heading)){
          let next=match+1;
          while(next<paragraphs.length&&(!key(paragraphs[next])||isLabel(paragraphs[next])))next++;
          const nearby=descriptive(paragraphs[next]||'')?paragraphs[next]:null;
          if(ownHeading&&nearby)context=nearby;
          // Preserve a real subsection heading with its directly associated
          // paragraph, never a category label joined to an unrelated fallback.
          else if(nearby&&!isLabel(heading)&&!title.includes(query))context=`${heading} · ${nearby}`;
        }
        // A body-only navigation match may have no descriptive context at all.
        // Retain its actual text rather than an unrelated page/topic fallback.
        if(match>=0&&!title.includes(query)&&!key(context).includes(query))context=heading;
        // A specific experience match uses its existing anchored destination;
        // general page queries retain the page URL and the same ranking/entity.
        const href=lesson.companion?.href&&key(lesson.companion.title||'').includes(query)
          ?lesson.companion.href:lesson.href;
        return `<a href="${rootPrefix}${href}"><strong>${esc(lesson.editorial_number||'')}</strong> ${esc(lesson.title)} <small>${esc(excerpt(context,query))}</small></a>`;
      }).join(''):'<p>Niciun rezultat.</p>';
    });
    input.addEventListener('keydown',event=>{if(event.key==='Escape')results.hidden=true;if(event.key==='ArrowDown'){event.preventDefault();$('a',results)?.focus();}if(event.key==='Enter'&&!results.hidden){event.preventDefault();$('a',results)?.click();}});
    results.addEventListener('keydown',event=>{const links=$$('a',results),i=links.indexOf(document.activeElement);if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();links[(i+(event.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();}if(event.key==='Escape'){results.hidden=true;input.focus();}});
    document.addEventListener('click',event=>{if(!event.target.closest('.global-search'))results.hidden=true;});
  }

  window.CARTO_SEARCH={init};
})();
