'use strict';

(() => {
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];

  // Keep source expressions intact. The interface path treatment only changes
  // bold text that names a QGIS menu sequence.
  $$('.tutorial-prose strong').forEach(node=>{
    if(!node.textContent.includes(' > ')) return;
    const span=document.createElement('span');
    span.className='qgis-menu-path';
    span.textContent=node.textContent.replaceAll(' > ',' → ');
    node.replaceWith(span);
  });
  $$('.tutorial-prose table').forEach(table=>{
    const wrapper=document.createElement('div');
    wrapper.className='tutorial-table-scroll';
    table.parentNode.insertBefore(wrapper,table);
    wrapper.append(table);
  });

  document.addEventListener('click', async event=>{
    const copy=event.target.closest('.copy-code');
    if(copy){
      const text=$('code',copy.closest('.tutorial-code'))?.textContent||'';
      try {
        if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
        else throw new Error('Clipboard API unavailable');
      } catch {
        const field=document.createElement('textarea');
        field.value=text;field.style.position='fixed';field.style.opacity='0';
        document.body.append(field);field.select();
        const okay=document.execCommand('copy');field.remove();
        if(!okay){copy.textContent='Selectează textul';return;}
      }
      copy.textContent='Copiat';
      clearTimeout(copy._resetTimer);
      copy._resetTimer=setTimeout(()=>{copy.textContent='Copiază';},1700);
      return;
    }
    const opener=event.target.closest('[data-enlarge]');
    if(opener){
      const dialog=$('#tutorial-dialog');if(!dialog)return;
      const src=opener.querySelector('img')?.src;
      if(!src)return;
      $('#tutorial-dialog-image').src=src;
      $('#tutorial-dialog-image').alt=opener.dataset.alt||'';
      $('#tutorial-dialog-caption').textContent=opener.dataset.caption||'';
      $('#tutorial-dialog-title').textContent=opener.dataset.caption||'Captură QGIS';
      dialog.classList.remove('zoomed');
      $('[data-zoom-tutorial-dialog]',dialog)?.setAttribute('aria-pressed','false');
      $('[data-zoom-tutorial-dialog]',dialog).textContent='Mărește detaliile';
      dialog._returnFocus=opener;
      dialog.showModal();
      $('[data-close-tutorial-dialog]',dialog)?.focus();
      return;
    }
    const close=event.target.closest('[data-close-tutorial-dialog]');
    if(close)close.closest('dialog')?.close();
    const zoom=event.target.closest('[data-zoom-tutorial-dialog]');
    if(zoom){
      const on=zoom.closest('dialog').classList.toggle('zoomed');
      zoom.setAttribute('aria-pressed',String(on));
      zoom.textContent=on?'Potrivește imaginea':'Mărește detaliile';
    }
  });
  const dialog=$('#tutorial-dialog');
  dialog?.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
  dialog?.addEventListener('close',()=>{dialog._returnFocus?.focus();$('#tutorial-dialog-image').removeAttribute('src');});

  const toc=$('.tutorial-toc');
  if(toc){
    const narrow=matchMedia('(max-width:600px)');
    toc.open=!narrow.matches;
    narrow.addEventListener('change',event=>{toc.open=!event.matches;});
  }

  const workflow={
    data:{title:'Date',lead:'Fișierele sursă conțin obiectele, geometria sau valorile raster.',details:['GeoPackage poate conține mai multe layere vectoriale.','Un DEM este raster continuu; forest loss este raster tematic.','Încarcă doar straturile necesare întrebării.'],tutorials:[['T01','tutorials/t01.html#section-7'],['T03','tutorials/t03.html#section-9'],['T06','tutorials/t06.html#section-9']]},
    crs:{title:'CRS',lead:'Verifică sistemele de coordonate ale datelor și ale proiectului înainte de procesare.',details:['EPSG:4326 exprimă coordonate geografice în grade.','EPSG:3844 este proiectat și este folosit în exemplele metrice din curs.','Suprapunerea vizuală nu înlocuiește verificarea CRS la Clip.'],tutorials:[['T04','tutorials/t04.html#section-10'],['T05','tutorials/t05.html#section-12'],['T06','tutorials/t06.html#section-13']]},
    attributes:{title:'Atribute',lead:'Tabelul de atribute leagă fiecare obiect spațial de câmpurile sale.',details:['Textul descrie nume și tipuri; numerele permit clasificări și calcule.','Câmpurile binare 0/1 susțin filtre.','NULL înseamnă lipsă de informație, nu zero.'],tutorials:[['T01','tutorials/t01.html#section-9'],['T02','tutorials/t02.html#section-12'],['T04','tutorials/t04.html#section-12']]},
    query:{title:'Interogare / filtrare',lead:'O expresie selectează un subset fără să șteargă sursa.',details:['Condițiile pot folosi AND și OR.','După un exercițiu, șterge filtrul dacă harta finală trebuie să arate toate obiectele.','Un subset păstrat trebuie explicat în titlu și legendă.'],tutorials:[['T01','tutorials/t01.html#section-12'],['T03','tutorials/t03.html#section-18'],['T04','tutorials/t04.html#section-15']]},
    processing:{title:'Analiză / Processing',lead:'Calculele și instrumentele produc valori sau straturi noi pentru o întrebare precisă.',details:['T02 calculează elevi per sală, cu protecție la zero și NULL.','T05 folosește vector Clip pentru gridul Bucureștiului.','T06 folosește Clip Raster by Mask Layer și Hillshade pentru Suceava.'],tutorials:[['T02','tutorials/t02.html#section-16'],['T05','tutorials/t05.html#section-14'],['T06','tutorials/t06.html#section-16']]},
    symbology:{title:'Simbolizare',lead:'Forma, culoarea și mărimea răspund tipului de date și întrebării.',details:['Single Symbol verifică distribuția de bază.','Categorized diferențiază valori nominale; Graduated clase numerice.','DEM-ul cere o rampă continuă, iar forest loss valori tematice discrete.'],tutorials:[['T01','tutorials/t01.html#section-15'],['T02','tutorials/t02.html#section-17'],['T06','tutorials/t06.html#section-19']]},
    layout:{title:'Layout',lead:'Compoziția explică harta dincolo de suprafața desenată.',details:['Titlu, legendă și scară clarifică lectura.','Sursa și nota metodologică arată proveniența și limita interpretării.','T01 introduce prima compoziție; celelalte o adaptează temei.'],tutorials:[['T01','tutorials/t01.html#section-18'],['T05','tutorials/t05.html#section-22'],['T06','tutorials/t06.html#section-23']]},
    export:{title:'Export',lead:'Un produs cartografic se verifică după salvare.',details:['PNG este util pentru ecran și documente digitale.','PDF păstrează compoziția pentru distribuire sau tipărire.','Verifică lizibilitatea titlului, legendei, sursei și notei.'],tutorials:[['T01','tutorials/t01.html#section-19'],['T05','tutorials/t05.html#section-23'],['T06','tutorials/t06.html#section-24']]}
  };
  const nodes=$$('.workflow-node');
  if(nodes.length){
    const detail=$('#workflow-detail');
    const show=key=>{
      const item=workflow[key];if(!item)return;
      nodes.forEach(node=>node.setAttribute('aria-pressed',String(node.dataset.workflow===key)));
      detail.innerHTML=`<span class="eyebrow">ETAPA SELECTATĂ</span><h3>${item.title}</h3><p>${item.lead}</p><ul>${item.details.map(line=>`<li>${line}</li>`).join('')}</ul><strong>Vezi în tutoriale</strong><div>${item.tutorials.map(([id,href])=>`<a href="${href}">${id} →</a>`).join('')}</div>`;
    };
    nodes.forEach(node=>node.addEventListener('click',()=>show(node.dataset.workflow)));
    show('data');
  }
})();
