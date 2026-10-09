'use strict';

(() => {
  const manifest = window.CARTO_CONTENT;
  const demo = window.CARTO_DEMO;
  const glossary = window.CARTO_GLOSSARY || [];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const lessonById = Object.fromEntries(manifest.lessons.map(lesson => [lesson.id, lesson]));
  const normalize = text => String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fmt = (value, digits = 2) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: digits }).format(value);
  const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const param = new URLSearchParams(location.search);
  const pageType = document.body.dataset.page;
  const currentId = document.body.dataset.pageId || (pageType === 'home' ? 'home' : pageType === 'resources' ? 'resources' : (param.get('id') || ''));
  const rootPrefix = document.body.dataset.root || '';
  let currentLesson = lessonById[currentId];

  const summaries = {
    sphere: ['Manualul definește sfera și obiectele rezultate prin secționarea ei: zonă, calotă, trapez, fus, cerc mare și cerc mic.', 'Modelul vectorial folosește o sferă schematică și calculează ariile din limitele alese. Formulele sunt transpuse cu unghiuri în radiani.', 'Geometria sferică oferă vocabularul necesar pentru a înțelege rețele geografice și suprafețe de proiecție.'],
    cylinder: ['Manualul descrie cilindrul circular drept prin axă, generatoare, rază și înălțime și indică suprafața laterală, totală și volumul.', 'Modifică raza și înălțimea; desenul și valorile se actualizează împreună. Notația modernă h este pusă în corespondență cu I din sursă.', 'Cilindrul devine, în capitolele următoare, o suprafață desfășurabilă folosită în construcția proiecțiilor cilindrice.'],
    cone: ['Manualul prezintă conul de rotație ca rezultat al rotirii unui triunghi dreptunghic în jurul unei catete.', 'Modelul calculează generatoarea, aria laterală, aria totală și volumul din raza și înălțimea alese.', 'Legătura cu proiecțiile conice este conceptuală: conul oferă o suprafață desfășurabilă pentru rețeaua cartografică.'],
    ellipse: ['Manualul definește elipsa și prezintă două construcții: prin dreptunghiul axelor și prin cercuri auxiliare.', 'Reconstrucția digitală desface metoda cercurilor auxiliare în pași și arată axele, centrul, focarele și punctele construite.', 'În mediile digitale, elipsa poate fi generată parametric; aici metoda matematică modernă este comparată cu procedeul grafic istoric.'],
    'map-definition': ['Manualul distinge planul de hartă prin întinderea reprezentată, efectul curburii și folosirea unei proiecții cartografice.', 'Comparația didactică separă trei idei: micșorare, model matematic și generalizare în funcție de scop.', 'În GIS, o hartă este rezultatul selecției datelor, al reprezentării și al unui sistem de coordonate; aceasta este doar o corespondență conceptuală.'],
    'map-classification': ['Manualul clasifică hărțile după scară, conținut, teritoriu, destinație și numărul culorilor.', 'Explorerul păstrează categoriile și pragurile din 1974; ele sunt prezentate ca document istoric, nu ca standard contemporan.', 'Criteriile se regăsesc conceptual în proprietăți ale proiectelor GIS, dar nu există o echivalență unu-la-unu.'],
    'map-importance': ['Manualul evidențiază rolul hărților în planificare, transport, resurse, învățământ și cercetare.', 'Exemplele sunt organizate ca relații între întrebare, informație spațială și decizie.', 'GIS extinde capacitatea de analiză, dar acest MVP nu formulează încă afirmații contemporane bazate pe literatură externă.'],
    'map-exterior': ['Secțiunea tratează titlul și indicativul, scara, graficele de pantă și alte indicații din exteriorul cadrului.', 'Macheta interactivă transformă o pagină de hartă într-un set de zone selectabile.', 'Într-un proiect GIS, aceste elemente corespund conceptual compoziției cartografice și informațiilor marginale.'],
    'map-frame': ['Manualul distinge cadrul interior, cadrul geografic și cadrul ornamental; figura 37 le arată împreună cu rețeaua geometrică.', 'Macheta permite identificarea fiecărui strat al cadrului și include un mod de test.', 'Într-o compoziție GIS, cadrul și grila sunt elemente de prezentare configurabile; corespondența este conceptuală.'],
    'map-interior': ['Secțiunea grupează caroiajul kilometric, planimetria și altimetria sau nivelmentul.', 'Macheta separă grila, elementele liniare și formele de relief, pentru a face vizibilă anatomia conținutului.', 'Straturile tematice și ordinea lor vizuală sunt o analogie utilă pentru lucrul în GIS, fără a reproduce interfața unui program.'],
    about: ['Proiectul pornește de la manualul universitar din 1974 și păstrează explicit limitele și terminologia sursei.', 'Sursa istorică este citată prin secțiuni, pagini și figuri; reconstrucțiile SVG sunt interpretări originale. Scanurile nu sunt redistribuite.', 'Seria progresivă Ateliere QGIS adaugă șase exerciții practice contemporane; materialul procedural nu provine din manualul din 1974.']
  };

  const projectionCatalog = [
    {key:'orthographic',name:'Ortografică polară',family:'Azimutală',class:'perspectivă · ortografică · polară; poziții ecuatorială și oblică descrise',section:'13.1',page:95,exact:true,figure:'Fig. 64',note:'Razele proiectante sunt paralele; laboratorul redă cazul polar.'},
    {key:'stereographic',name:'Stereografică polară',family:'Azimutală',class:'perspectivă · stereografică · polară; poziții ecuatorială și oblică descrise',section:'14.1',page:101,exact:true,figure:'Fig. 68',note:'Punctul de vedere se află pe sferă, diametral opus planului tangent.'},
    {key:'gnomonic',name:'Centrală polară',family:'Azimutală',class:'perspectivă · centrală · polară',section:'15.1',page:113,exact:true,figure:'Fig. 77',note:'Punctul de perspectivă este în centrul sferei; ecuatorul tinde la infinit.'},
    {key:'postel',name:'Postel polară',family:'Azimutală',class:'neperspectivă · polară',section:'16.1',page:112,exact:true,figure:'§ 16.1',note:'Reconstrucție azimutală echidistantă polară.'},
    {key:'lambert-az',name:'Lambert azimutală',family:'Azimutală',class:'neperspectivă · polară',section:'16.2',page:116,exact:true,figure:'§ 16.2',note:'Reconstrucție azimutală echivalentă polară.'},
    {key:'equirectangular',name:'Cilindrică pătratică',family:'Cilindrică',class:'normală',section:'17.1',page:120,exact:true,figure:'Fig. 83',note:'Meridianele și paralelele sunt drepte perpendiculare.'},
    {key:'lambert-cyl',name:'Cilindrică Lambert',family:'Cilindrică',class:'echivalentă · normală',section:'17.2',page:123,exact:true,figure:'§ 17.2',note:'Reconstrucție cilindrică echivalentă.'},
    {key:'mercator',name:'Mercator',family:'Cilindrică',class:'conformă · normală',section:'17.3',page:132,exact:true,figure:'Fig. 89',note:'Latitudinile extreme sunt limitate în vizualizare.'},
    {key:'gall',name:'Gali stereografică',family:'Cilindrică',class:'stereografică · normală',section:'17.4',page:130,exact:true,figure:'§ 17.4',note:'Reconstrucție matematică modernă a formei cilindrice.'},
    {key:'conic-schematic',name:'Conică Ptolemeu',family:'Conică',class:'dreaptă',section:'18.1',page:135,exact:false,figure:'Fig. 91',note:'Schemă conceptuală; consultați construcția istorică.'},
    {key:'mollweide',name:'Mollweide',family:'Convențională',class:'pseudocilindrică',section:'19.1',page:138,exact:true,figure:'Fig. 93',note:'Reconstrucție matematică a rețelei Mollweide.'},
    {key:'eckert-schematic',name:'Eckert trapeziformă',family:'Convențională',class:'pseudocilindrică',section:'19.2',page:140,exact:false,figure:'§ 19.2',note:'Schemă conceptuală; formula nu este simulată.'},
    {key:'grinten-schematic',name:'Grinten',family:'Convențională',class:'circulară',section:'20.1',page:144,exact:false,figure:'Fig. 96',note:'Schemă conceptuală bazată pe figura istorică.'},
    {key:'globular-schematic',name:'Globulară',family:'Convențională',class:'circulară',section:'20.2',page:147,exact:false,figure:'Fig. 98',note:'Schemă conceptuală bazată pe figura istorică.'},
    {key:'star-schematic',name:'Stelată',family:'Derivată',class:'derivată din Postel',section:'21.1',page:150,exact:false,figure:'Fig. 101',note:'Schemă conceptuală cu lobi; manualul o derivă din Postel.'}
  ];

  const methodInfo = {
    diagrams:{name:'Diagrame',historical:'Manualul reunește reprezentări grafice liniare și de suprafață: benzi, coloane, pătrate, cercuri și sectoare, simple sau structurale.',principle:'O mărime sau o structură este transformată într-o formă grafică măsurabilă și comparabilă.',gis:'Diagrame sau grafice asociate unor entități. Corespondență conceptuală; configurarea exactă depinde de date și de aplicație.'},
    choropleth:{name:'Cartogramă',historical:'Intensitatea fenomenului este redată pe unități teritoriale prin nuanțe sau hașuri ordonate.',principle:'Valorile sunt grupate în clase; fiecare suprafață primește un ton conform clasei sale.',gis:'Reprezentare graduată a poligoanelor, apropiată conceptual de o hartă coropletă. Nu presupune un singur instrument sau algoritm.'},
    cartodiagram:{name:'Cartodiagramă',historical:'Diagramele sunt amplasate în interiorul unităților teritoriale și pot reda structură, dinamică sau ambele.',principle:'Poziția oferă context spațial, iar mărimea și împărțirea diagramei poartă valorile tematice.',gis:'Diagrame sau simboluri proporționale ancorate la entități. Corespondență conceptuală.'},
    signs:{name:'Metoda semnelor',historical:'Semne geometrice, litere, semne artistice sau simbolice localizează fenomene care nu pot fi reprezentate la scară.',principle:'Forma diferențiază categorii; mărimea poate reda cantități, continuu sau în trepte.',gis:'Simbolizare categorizată sau proporțională pentru entități punctuale. Legătura este aproximativă.'},
    areas:{name:'Metoda arealelor',historical:'Un areal delimitează suprafața în care se răspândește un fenomen; limitele pot fi precise sau schematice.',principle:'Se comunică prezența și extinderea spațială, nu neapărat o valoare continuă în fiecare punct.',gis:'Poligoane tematice cu contur, umplere sau hașură. Digitizarea limitei rămâne o etapă distinctă.'},
    qualitative:{name:'Fond calitativ',historical:'Suprafețe cu răspândire continuă sunt delimitate și diferențiate prin culori sau hașuri calitative.',principle:'Clasele nominale împart exhaustiv teritoriul și sunt explicate prin legendă.',gis:'Simbolizare categorizată a poligoanelor. Corespondență conceptuală, fără echivalare terminologică totală.'},
    flows:{name:'Linii de mișcare',historical:'Linii și săgeți redau direcția, traseul și uneori cantitatea unui flux; pot fi precise sau schematice.',principle:'Direcția este codificată prin geometrie, iar valoarea prin grosime sau structură.',gis:'Linii tematice cu grosime proporțională și simboluri direcționale. Fluxurile necesită relații origine–destinație.'},
    isolines:{name:'Izolinii',historical:'Punctele cu aceeași valoare sunt unite; apropierea liniilor indică o schimbare mai rapidă a fenomenului.',principle:'Un câmp numeric continuu este discretizat prin niveluri egale sau alese.',gis:'Generare de contururi dintr-o suprafață interpolată. Demo-ul folosește un câmp sintetic și nu reproduce o unealtă anume.'},
    dots:{name:'Metoda punctului',historical:'Punctele cu valoare stabilită redau repartiția și cantitatea; dispunerea poate fi reală sau uniformă.',principle:'Numărul punctelor dintr-o zonă exprimă cantitatea, iar poziția lor sugerează distribuția.',gis:'Reprezentare de densitate prin puncte sau puncte generate în poligoane. Corespondență conceptuală.'},
    relief:{name:'Machete de relief',historical:'Curbele de nivel sunt copiate pe foi, decupate și suprapuse în ordine altimetrică, apoi modelul este finisat.',principle:'Informația 2D a nivelurilor devine o suprafață tridimensională în trepte.',gis:'O corespondență conceptuală cu modelele digitale ale terenului este documentată în cardul QGIS 3.44 de mai jos.'}
  };

  function glossaryMarkup(term) {
    const item = glossary.find(entry => normalize(entry.term_ro) === normalize(term));
    if (!item) return esc(term);
    return `<span class="glossary-term" tabindex="0" data-definition="${esc(item.historical_definition)} — ${esc(item.source)}">${esc(term)}</span>`;
  }

  function renderNav() {
    const nav = $('#chapter-nav'); if (!nav) return;
    nav.innerHTML = manifest.groups.map(group => `<details class="nav-group" open><summary>${group.label}</summary>${group.lessons.map(id => {
      const lesson = lessonById[id];
      return `<a class="nav-item ${id === currentId ? 'active' : ''}" href="${rootPrefix}${lesson.href}" ${id === currentId ? 'aria-current="page"' : ''}>${lesson.editorial_number ? `${lesson.editorial_number} ` : ''}${esc(lesson.title)}</a>`;
    }).join('')}</details>`).join('');
  }

  function initSidebarPosition() {
    const sidebar = $('#sidebar'), nav = $('#chapter-nav');
    if (!sidebar || !nav) return {save() {}, restore() {}};
    const key = 'cartografie-sidebar-state';
    const groups = $$('.nav-group', nav);
    let saved = {}, restored = false;
    try { saved = JSON.parse(sessionStorage.getItem(key)) || {}; } catch {}
    groups.forEach((group, index) => {
      if (typeof saved.groups?.[index] === 'boolean') group.open = saved.groups[index];
      if (group.querySelector('[aria-current="page"]')) group.open = true;
    });
    const visible = () => sidebar.getClientRects().length > 0;
    const save = () => {
      // A closed mobile drawer reports zero; retain its last visible position.
      if (!restored || !visible()) return;
      saved = {top: sidebar.scrollTop, groups: groups.map(group => group.open)};
      try { sessionStorage.setItem(key, JSON.stringify(saved)); } catch {}
    };
    const restore = () => {
      if (!visible()) return;
      sidebar.scrollTop = Number.isFinite(saved.top) ? saved.top : 0;
      if (!restored) {
        const active = nav.querySelector('[aria-current="page"]');
        if (active) {
          const box = sidebar.getBoundingClientRect(), item = active.getBoundingClientRect();
          // Adjust only this scroll container, never the main page or its anchor.
          if (item.top < box.top + 8) sidebar.scrollTop += item.top - box.top - 8;
          else if (item.bottom > box.bottom - 8) sidebar.scrollTop += item.bottom - box.bottom + 8;
        }
      }
      restored = true;
      save();
    };
    nav.addEventListener('click', event => { if (event.target.closest('a')) save(); }, true);
    sidebar.addEventListener('scroll', save, {passive:true});
    groups.forEach(group => group.addEventListener('toggle', save));
    addEventListener('pagehide', save);
    // Restore at pageshow: an animation frame can be deferred in background tabs.
    addEventListener('pageshow', restore);
    return {save, restore};
  }

  function initShell() {
    renderNav();
    const sidebarPosition = initSidebarPosition();
    const narrow = matchMedia('(max-width:900px)');
    const setNav = collapsed => { sidebarPosition.save(); document.body.classList.toggle('nav-collapsed', collapsed); $('#nav-toggle')?.setAttribute('aria-expanded', String(!collapsed)); if (!collapsed) sidebarPosition.restore(); };
    setNav(narrow.matches); narrow.addEventListener('change', event => setNav(event.matches));
    $('#nav-toggle')?.addEventListener('click', () => setNav(!document.body.classList.contains('nav-collapsed')));
    $('#chapter-nav')?.addEventListener('click', event => { if (event.target.closest('a') && narrow.matches) setNav(true); });
    document.body.classList.add('nav-enhanced');
    const setTheme = dark => { document.body.classList.toggle('dark', dark); $('#theme-toggle')?.setAttribute('aria-pressed', String(dark)); if ($('#theme-label')) $('#theme-label').textContent = dark ? 'Mod luminos' : 'Mod întunecat'; };
    try { setTheme(localStorage.getItem('cartografie-theme') === 'dark'); } catch { setTheme(false); }
    $('#theme-toggle')?.addEventListener('click', () => { const dark = !document.body.classList.contains('dark'); setTheme(dark); try { localStorage.setItem('cartografie-theme', dark ? 'dark' : 'light'); } catch {} });
    initSearch();
    const top = $('#back-top');
    addEventListener('scroll', () => { if (top) top.hidden = scrollY < 700; }, {passive:true});
    top?.addEventListener('click', () => scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'}));
  }

  function initSearch() { window.CARTO_SEARCH?.init(manifest, rootPrefix); }

  function renderHome() {
    const themes = [
      ['01','Fundamente geospațiale','De la coordonate geografice și rectangulare la sferă, cilindru, con și elipsă.','coordinates','6 lecții'],
      ['02','Harta și elementele ei','Definiție, clasificare și anatomia interactivă a unei hărți.','map-definition','6 lecții'],
      ['03','Proiecții și CRS','De la Pământ la hartă: modele, deformări și familii istorice de proiecții.','earth-to-map','12 secțiuni'],
      ['04','Metode de reprezentare','Aceleași date fictive, nouă logici cartografice și corespondențe GIS.','method-diagrams','10 secțiuni'],
      ['05','Date geospațiale','Vector, raster, formate și laboratoare de prelucrare.','geospatial-data','29 operații'],
      ['06','Analiza datelor geospațiale','De la întrebare și selecție la operație, rezultat și interpretare.','analysis','Sinteză'],
      ['07','Ateliere QGIS','Șase exerciții practice, de la prima hartă la raster și vector.','tutorials','6 tutoriale']
    ];
    $('#theme-overview').innerHTML = themes.map(([number,title,text,id,count]) => `<a class="theme-card" href="${lessonById[id].href}"><span class="theme-number">${number}</span><div><h3>${title}</h3><p>${text}</p></div><footer><span>${count}</span><strong>Explorează →</strong></footer></a>`).join('');
    const features = [['Sferă interactivă','Delimitează zone, calote, trapeze și fuse.','sphere'],['De la Pământ la hartă','Compară geoidul, Mercator, Equal Earth și rutele de navigație.','earth-to-map'],['Anatomia unei hărți','Identifică elementele într-o machetă și încearcă modul test.','map-frame'],['Vector sau raster?','Explorează entități, pixeli și operații GIS.','geospatial-data']];
    $('#feature-cards').innerHTML = features.map(([title,text,id]) => `<a class="feature-card" href="${lessonById[id].href}"><h3>${title}</h3><p>${text}</p></a>`).join('');
    $('#future-cards').innerHTML = manifest.future.map(item => `<article class="future-card"><h3>${item.title}</h3><p>${item.status}</p><span>Planificat</span></article>`).join('');
  }

  function contentCard(type, level, source, theme, classes, html) {
    return `<article class="${classes}" data-filterable data-content-type="${type}" data-level="${level}" data-source="${source}" data-theme="${theme}">${html}</article>`;
  }

  function lessonIntro(lesson, lead) {
    const pages = lesson.source_pages.map(item => `p. tipărite ${item.printed} · PDF ${item.pdf}`).join('; ');
    const historical = lesson.source_section ? `<span class="meta-chip">Sursa originală: Năstase &amp; Cernea, 1974, § ${esc(lesson.source_section)} · ${pages}</span>` : '<span class="meta-chip">Extensie contemporană · nu provine din manualul din 1974</span>';
    return `<div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> <span>→</span> ${esc(lesson.editorial_part || lesson.part)}</div><section class="lesson-hero"><span class="eyebrow">${esc(lesson.editorial_part || lesson.part)} ${lesson.editorial_number ? ` / ${esc(lesson.editorial_number)}` : ''}</span><h1>${lesson.editorial_number ? `${esc(lesson.editorial_number)} ` : ''}${esc(lesson.title)}</h1><p class="lead">${lead}</p><div class="lesson-meta">${historical}<span class="meta-chip">${lesson.interactive_components.length} module interactive</span></div></section>`;
  }

  function siteFooter() {
    return `<footer class="page-footer site-footer"><div><strong>Explorare geospațială · Material educațional</strong><p>Conținut istoric, reconstrucții interactive și aplicații GIS contemporane.</p></div><span class="footer-credit">Marius Budileanu</span><nav aria-label="Legături în subsol"><a href="about.html">Despre proiect</a><a href="resources.html">Resurse</a><a href="https://biblioteca-digitala.ro/?pub=10971-cartografie-generala" target="_blank" rel="noopener noreferrer" aria-label="Vezi publicația originală în Biblioteca Digitală; se deschide într-o filă nouă">Sursa originală ↗</a></nav></footer>`;
  }

  function layerCards(lesson, texts) {
    return `<section id="straturi" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">TREI PLANURI DE LECTURĂ</span><h2>Sursă, explicație, corespondență</h2></div></div><div class="layer-grid">${contentCard('context istoric','essential','textbook',lesson.theme,'layer-card historical-card',`<span class="source-tag historical">Sursa din 1974</span><h3>Formularea manualului</h3><p>${texts[0]}</p>`)}${contentCard('concept','essential','modern',lesson.theme,'layer-card modern-card',`<span class="source-tag modern">Explicație didactică modernă</span><h3>Ce urmărim</h3><p>${texts[1]}</p>`)}${contentCard('qgis','detailed','gis',lesson.theme,'layer-card gis-card',`<span class="source-tag qgis-tag">Corespondență GIS modernă</span><h3>Legătura conceptuală</h3><p>${texts[2]}</p>`)}</div></section>`;
  }

  function sourceGallery(lesson) {
    const items = lesson.figures.length ? lesson.figures : lesson.source_pages.map(page => ({number:`§ ${lesson.source_section}`,page:page.printed,caption:`Secțiunea ${lesson.source_section}`}));
    if (!items.length) return '';
    return `<section id="surse" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">SURSA ISTORICĂ · 1974</span><h2>Referințe la manual</h2></div></div><p>Năstase, A. &amp; Cernea, D. (1974). <em>Cartografie generală – manual practic</em>. Universitatea din București. Explicațiile și schemele din lecție sunt interpretări didactice proprii; scanurile nu sunt redistribuite.</p><div class="source-gallery">${items.map((item,index)=>`<article class="source-thumb" data-filterable data-content-type="figură" data-level="essential" data-source="textbook" data-theme="${lesson.theme}"><h3>${esc(item.number)}</h3><p>§ ${esc(lesson.source_section)} · p. ${esc(item.page)}<br>${esc(item.caption)}</p><button type="button" class="outline-button" data-source-index="${index}">Referință bibliografică</button></article>`).join('')}</div></section>`;
  }

  function lessonTail(lesson) {
    const group = manifest.groups.find(group => group.lessons.includes(lesson.id));
    const index = group ? group.lessons.indexOf(lesson.id) : -1;
    const ids = group ? [group.lessons[index-1],group.lessons[index+1]].filter(Boolean) : [];
    const lessonVocabulary = normalize([lesson.title, ...lesson.keywords].join(' '));
    const terms = glossary.filter(item => lessonVocabulary.includes(normalize(item.term_ro))).slice(0, 5);
    const glossarySection = terms.length ? `<section class="lesson-section glossary-section"><span class="eyebrow">GLOSAR ISTORIC</span><h2>Termeni ai lecției</h2><p>Treci cu indicatorul sau focalizează un termen pentru definiția și trimiterea din manual.</p><div class="glossary-list">${terms.map(item => glossaryMarkup(item.term_ro)).join('')}</div></section>` : '';
    const practiceByTheory={
      'rectangular-coordinates':['T05','T06'], 'method-choropleth':['T02','T05'],
      'method-qualitative':['T01','T04'], 'method-signs':['T01','T03'],
      'method-cartodiagram':['T03'], 'method-areas':['T04','T06'],
      'relief-models':['T06'], 'map-exterior':['T01','T06'], 'map-frame':['T01']
    };
    const practice=(practiceByTheory[lesson.id]||[]).map(id=>lessonById[id]);
    const practiceSection=practice.length?`<section class="lesson-section"><span class="eyebrow">DIN TEORIE ÎN PRACTICĂ</span><h2>Vezi conceptul într-un atelier QGIS</h2><div class="next-lessons">${practice.map(item=>`<a class="next-card" href="${item.href}"><strong>${esc(item.title)}</strong><span>Exercițiu practic contemporan · ${item.id}</span></a>`).join('')}</div></section>`:'';
    const bridge=lesson.theme==='proiectii'||lesson.id==='rectangular-coordinates'?['projection-intro.html','De la Pământ la hartă · explicația modernă']:lesson.id==='method-isolines'?['geospatial-data.html#raster-lab','DEM → curbe de nivel · date geospațiale']:lesson.id==='relief-models'?['geospatial-data.html#raster-lab','DEM și hillshade · date geospațiale']:['method-signs','method-areas','method-qualitative'].includes(lesson.id)?['geospatial-data.html#vector','Modelul vectorial · date geospațiale']:null;
    const bridgeSection=bridge?`<section class="lesson-section"><span class="eyebrow">LEGĂTURĂ CONTEMPORANĂ</span><div class="next-lessons"><a class="next-card" href="${bridge[0]}"><strong>${bridge[1]}</strong><span>Explicație actuală separată de manualul din 1974</span></a></div></section>`:'';
    return `${glossarySection}${practiceSection}${bridgeSection}<section class="lesson-section"><span class="eyebrow">CONTINUĂ</span><h2>Lecții apropiate</h2><div class="next-lessons">${ids.map(id=>{const next=lessonById[id];const number=next.editorial_number;const prefix=(typeof number==='string' && number.trim()) || (typeof number==='number' && Number.isFinite(number));return `<a class="next-card" href="${next.href}"><strong>${prefix ? `${esc(number)} ` : ''}${esc(next.title)}</strong><span>${esc(next.editorial_part || next.part)}</span></a>`;}).join('') || '<a class="next-card" href="index.html"><strong>Privire de ansamblu</strong><span>Toate traseele</span></a>'}</div></section>${siteFooter()}<div class="filter-empty" id="filter-empty">Niciun card nu corespunde filtrelor active.</div>`;
  }

  function renderAbout(lesson) {
    $('#lesson-root').innerHTML = `<div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> → Despre</div><section class="lesson-hero"><span class="eyebrow">DESPRE PLATFORMĂ</span><h1>Despre proiect</h1><p class="lead">Explorare geospațială leagă fundamentele cartografice de GIS contemporan, prin explicații, simulări și exerciții pentru studenți de licență și master.</p></section>
    <section class="lesson-section"><h2>Fundamente, interpretare și practică</h2><div class="about-grid">
    <article class="about-principle"><h3>Sursa istorică</h3><p>A. Năstase &amp; D. Cernea, <em>Cartografie generală – manual practic</em>, Universitatea din București, 1974, rămâne reperul istoric central. Lecțiile indică secțiuni, pagini și figuri; <a href="https://biblioteca-digitala.ro/?pub=10971-cartografie-generala" target="_blank" rel="noopener noreferrer">manualul se consultă în Biblioteca Digitală ↗</a>. Scanurile și crop-urile nu sunt redistribuite.</p></article>
    <article class="about-principle"><h3>Reconstrucție contemporană</h3><p>Schemele vectoriale, explicațiile și modelele interactive sunt interpretări didactice originale. Terminologia din 1974 este contextualizată; CRS, EPSG și procedurile GIS/QGIS sunt extensii contemporane distincte.</p></article>
    <article class="about-principle"><h3>Laboratoarele interactive</h3><p>Simulările teoretice folosesc exemple sintetice. Provocări GIS și Raster Styling folosesc subseturi reale cu metadate, metode și limite explicite. Proximitatea nu măsoară singură accesibilitatea, iar suprapunerea spațială nu demonstrează cauzalitate.</p></article>
    <article class="about-principle"><h3>Domeniul resursei</h3><p>Platforma este o resursă educațională pentru fundamente și aplicații GIS. Nu este manual oficial QGIS, nu înlocuiește documentația ANCPI și nu este un manual complet de geodezie.</p></article>
    <article class="about-principle"><h3>Autor și afiliere</h3><p><strong>Marius Budileanu</strong><br>Universitatea din București, Facultatea de Geografie</p><p>Platforma și codul au fost dezvoltate cu asistență AI; conținutul academic, datele și rezultatele au fost revizuite și validate de autor.</p></article>
    <article class="about-principle"><h3>Statut și QGIS</h3><p>Platformă disponibilă, în consolidare înainte de release-ul 1.0. Nu a fost atribuit un DOI de release. Funcționalitățile planificate sunt marcate separat.</p><p>Țintă: <strong>QGIS 3.44 LTR</strong>. Nu este declarată o versiune patch neverificată. Comenzile tutorialelor folosesc în principal interfața în engleză, explicată în română. Unele verificări numerice folosesc un runtime GDAL/QGIS separat, fără a schimba versiunea țintă.</p></article>
    </div></section>
    <section id="licente" class="lesson-section"><h2>Licențe și resurse terțe</h2><p>Codul propriu: <a href="LICENSE">MIT</a>. Conținutul educațional original: <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">Creative Commons Attribution 4.0 International (CC BY 4.0) ↗</a>. Datele externe, interfețele și imaginile terțe, publicația istorică și bibliotecile software își păstrează propriile drepturi. Licența platformei nu le relicențiază.</p><p><a href="resources.html#registrul-datelor">Registrul datelor</a> · <a href="resources.html#atribuiri">Surse și atribuiri</a></p></section>
    <section id="cum-citezi" class="lesson-section"><h2>Cum citezi această resursă</h2><p>Budileanu, M. (2026). <em>Explorare geospațială</em>. Universitatea din București, Facultatea de Geografie. <a href="https://mariusbudileanu.github.io/explorare-geospatiala/">https://mariusbudileanu.github.io/explorare-geospatiala/</a></p><p>Metadatele <a href="https://github.com/mariusbudileanu/explorare-geospatiala/blob/main/CITATION.cff">CITATION.cff</a> susțin citarea repository-ului. DOI-ul va fi adăugat după viitorul release, prin integrarea GitHub–Zenodo deja configurată.</p></section>
    <section class="lesson-section"><h2>Cod și feedback</h2><p><a href="https://github.com/mariusbudileanu/explorare-geospatiala">Repository GitHub</a> · <a href="https://github.com/mariusbudileanu/explorare-geospatiala/issues">Raportează o problemă</a></p></section>` + lessonTail(lesson).replace(/<div class="filter-empty"[\s\S]*?<\/div>$/, '');
  }

  function renderGeneric(lesson) {
    const text = summaries[lesson.id] || [`Conținutul secțiunii ${lesson.source_section} a fost inventariat și verificat în paginile indicate.`, 'Lecția organizează noțiunile istorice în carduri și obiecte care pot fi comparate.', 'Corespondența GIS este o interpretare didactică și nu o echivalare terminologică exactă.'];
    let special = '';
    if (lesson.id === 'map-classification') special = classificationMarkup();
    else if (['map-exterior','map-frame','map-interior'].includes(lesson.id)) special = anatomyMarkup();
    else special = genericConceptMarkup(lesson);
    $('#lesson-root').innerHTML = lessonIntro(lesson,text[1]) + `<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Explorează</a><a href="#surse">Sursa originală</a></nav>` + layerCards(lesson,text) + special + sourceGallery(lesson) + lessonTail(lesson);
    if (lesson.id === 'map-classification') initClassification();
    if (['map-exterior','map-frame','map-interior'].includes(lesson.id)) initAnatomy(lesson.id);
  }

  function genericConceptMarkup(lesson) {
    if (lesson.id === 'map-definition') return `<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">PLAN SAU HARTĂ?</span><h2>Scara întinderii schimbă problema</h2></div></div><div class="layer-grid">${contentCard('concept','essential','textbook','harta','shared-card','<h3>Plan</h3><p>În formularea manualului, reprezintă o suprafață mică și nu ia în calcul forma sferică a Pământului.</p>')}${contentCard('concept','essential','textbook','harta','shared-card','<h3>Hartă</h3><p>Cuprinde o parte mai mare sau întreaga suprafață și folosește o proiecție cartografică.</p>')}${contentCard('concept','detailed','modern','harta','shared-card','<h3>Ideea comună</h3><p>Ambele selectează și micșorează realitatea; scopul și întinderea determină cum se construiește reprezentarea.</p>')}</div><div class="warning-note">Definiția citată de manual este un document istoric al disciplinei. O definiție contemporană verificată va fi adăugată numai în etapa de surse moderne.</div></section>`;
    if (lesson.id === 'map-importance') return `<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">ROLURI ENUMERATE ÎN MANUAL</span><h2>De la observație la acțiune</h2></div></div><div class="projection-catalog">${[['Planificare','ameliorări, desecări, împăduriri'],['Transport','organizarea rețelelor și a deplasărilor'],['Resurse','prospectare și exploatare'],['Învățământ','înțelegerea raporturilor spațiale'],['Cercetare','observație, sinteză și comparație'],['Organizarea teritoriului','repartiții și relații între fenomene']].map(([title,text])=>`<article class="projection-entry" data-filterable data-content-type="exemplu" data-level="essential" data-source="textbook" data-theme="harta"><strong>${title}</strong><span>${text}</span></article>`).join('')}</div></section>`;
    return `<section id="exploreaza" class="lesson-section"><div class="modern-note">Conținutul interactiv al acestei secțiuni este integrat în laboratorul tematic al traseului.</div></section>`;
  }

  function classificationMarkup() {
    return `<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">CLASIFICARE CONFORM MANUALULUI DIN 1974</span><h2>Schimbă criteriul</h2></div><span class="source-tag historical">pp. 38–39</span></div>${contentCard('exemplu','essential','textbook','harta','shared-card classification-card',`<div class="classification-tabs" id="classification-tabs">${[['scale','După scară'],['content','După conținut'],['territory','După teritoriu'],['purpose','După destinație'],['color','După numărul culorilor']].map(([key,label],i)=>`<button data-criterion="${key}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><div class="classification-content"><div id="classification-list" class="classification-list"></div><div id="scale-continuum"></div></div>`)}</section>`;
  }

  function initClassification() {
    const data = {
      scale:[['Scări mari','1:2 – 1:200.000; manualul separă planurile și hărțile topografice.'],['Scări mijlocii','1:200.000 – 1:1.000.000; hărți topografice de ansamblu.'],['Scări mici','Mai mici de 1:1.000.000; hărți geografice de ansamblu.']],
      content:[['Geografice generale','Hărți topografice de detaliu și de ansamblu.'],['Speciale sau tematice','Fizico-geografice și social-economice.']],
      territory:[['Universale / planisfere','Întreaga suprafață a Pământului.'],['Emisfere, oceane și mări','Mari unități ale globului.'],['Continente și state','Grupuri de continente, continente sau părți, state.']],
      purpose:[['Navigație','Maritimă sau aeriană.'],['Turistice și rutiere','Călătorie și orientare.'],['Militare și școlare','Destinații specializate menționate în manual.']],
      color:[['Monocrome','Editate în alb-negru.'],['Policrome','Cu două sau mai multe culori.']]
    };
    const render = key => {
      $('#classification-list').innerHTML = data[key].map(([title,text])=>`<div class="classification-item"><strong>${title}</strong><span>${text}</span></div>`).join('');
      $('#scale-continuum').innerHTML = key === 'scale' ? `<div class="scale-continuum"><div class="scale-line"></div><div class="scale-mark" style="left:33%">1:200.000</div><div class="scale-mark" style="left:68%">1:1.000.000</div><div class="scale-labels"><span>mai detaliat</span><span>mai generalizat</span></div></div><p class="small">Continuum didactic. Pragurile sunt cele tipărite în manual; nu reprezintă o clasificare contemporană verificată.</p>` : '<div class="modern-note">Alege „După scară” pentru a vedea continuum-ul istoric.</div>';
    };
    $('#classification-tabs').addEventListener('click', event => {const button=event.target.closest('[data-criterion]');if(!button)return;$$('button',$('#classification-tabs')).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render(button.dataset.criterion);});
    render('scale');
  }

  function anatomyMarkup() {
    return `<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">ANATOMIA UNEI HĂRȚI</span><h2>Selectează un element</h2></div><span class="live-badge"><span class="status-dot"></span> Mod interactiv</span></div>${contentCard('exercițiu','essential','modern','harta','shared-card',`<div class="tool-tabs" id="anatomy-tools"><button data-tool="explore" aria-pressed="true">Mod explorare</button><button data-tool="test" aria-pressed="false">Mod test</button><button data-tool="all" aria-pressed="false">Arată toate elementele</button><button data-tool="labels" aria-pressed="true">Etichete vizibile</button></div><div class="map-anatomy"><div class="map-sheet" id="map-sheet"><div class="map-frame-outer"></div><div class="map-frame-geo"></div><div class="mock-title">REGIUNEA ATLAS</div><div class="mock-scale">1 : 50 000</div><div class="mock-legend">LEGENDĂ<br>━ drum<br>≈ râu<br>◎ relief</div><div class="mock-grid"></div><div class="mock-river"></div><div class="mock-relief"></div>${[['title','titlu','28%','0','44%','8%'],['scale','scară','34%','90%','32%','9%'],['frame','cadru ornamental','5%','5%','90%','90%'],['geographic','cadru geografic','9%','9%','82%','82%'],['grid','caroiaj / rețea','13%','13%','74%','74%'],['planimetry','elemente planimetrice','16%','35%','60%','30%'],['altimetry','elemente altimetrice','52%','18%','26%','30%'],['marginal','informații marginale','85%','18%','13%','42%']].map(([key,label,left,top,width,height])=>`<button class="map-hotspot" data-part="${key}" aria-label="${label}" style="left:${left};top:${top};width:${width};height:${height}"></button>`).join('')}</div><div class="anatomy-info"><span class="source-tag historical">Manual 1974</span><h3 id="anatomy-title">Alege un element</h3><p id="anatomy-text">Explorează zonele hărții pentru a vedea rolul fiecăreia.</p><div id="test-prompt" class="test-prompt" hidden></div></div></div>`)}</section>`;
  }

  function initAnatomy(initial) {
    const info = {
      title:['Titlul hărții','Identifică obiectul sau tema reprezentată și face parte din informația exterioară cadrului.'],scale:['Scara','Exprimă raportul de micșorare; manualul prezintă forme numerice, grafice și directe.'],frame:['Cadrul ornamental','Element exterior cu rol estetic, construit din una sau mai multe linii.'],geographic:['Cadrul geografic','Poartă diviziuni și valori geografice, între cadrul interior și cel ornamental.'],grid:['Caroiajul / rețeaua','Sprijină localizarea și citirea coordonatelor în interiorul hărții.'],planimetry:['Elemente de planimetrie','Ape, căi de comunicație, localități, limite și alte obiecte planimetrice.'],altimetry:['Elemente de altimetrie','Relieful este redat prin semne, curbe de nivel și alte convenții.'],marginal:['Informații marginale','Legenda, indicațiile și alte date necesare interpretării hărții.']
    };
    let mode='explore', labels=true, target='scale';
    const select = button => {
      const key=button.dataset.part;
      if(mode==='test') {const correct=key===target;$('#test-prompt').textContent=correct?'Corect. Scara se află în zona marginală inferioară.':'Mai încearcă. Caută raportul numeric din marginea de jos.';$('#test-prompt').hidden=false;if(!correct)return;}
      $$('.map-hotspot').forEach(b=>b.classList.toggle('active',b===button));$('#anatomy-title').textContent=info[key][0];$('#anatomy-text').textContent=info[key][1];
    };
    $('#map-sheet').addEventListener('click',event=>{const button=event.target.closest('[data-part]');if(button)select(button);});
    $('#anatomy-tools').addEventListener('click',event=>{const button=event.target.closest('[data-tool]');if(!button)return;const tool=button.dataset.tool;if(tool==='explore'||tool==='test'){mode=tool;$$('[data-tool="explore"],[data-tool="test"]',$('#anatomy-tools')).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$('#test-prompt').hidden=tool!=='test';if(tool==='test'){$('#test-prompt').textContent='Identifică scara hărții.';$('#test-prompt').hidden=false;}}if(tool==='all'){$$('.map-hotspot').forEach(b=>b.classList.add('active'));button.setAttribute('aria-pressed','true');}if(tool==='labels'){labels=!labels;button.setAttribute('aria-pressed',String(labels));$$('.mock-title,.mock-scale,.mock-legend').forEach(el=>el.style.visibility=labels?'visible':'hidden');}});
    const partList=document.createElement('div');partList.className='anatomy-part-list';partList.setAttribute('aria-label','Elementele hărții');
    partList.innerHTML=Object.entries(info).map(([key,[title]])=>`<button type="button" data-select-part="${key}">${title}</button>`).join('');
    partList.addEventListener('click',event=>{const key=event.target.closest('[data-select-part]')?.dataset.selectPart;if(key)select($(`[data-part="${key}"]`));});
    $('.anatomy-info').append(partList);
    const initialKey = initial==='map-frame'?'frame':initial==='map-interior'?'grid':'title';select($(`[data-part="${initialKey}"]`));
  }

  function renderSphere(lesson) {
    const text=summaries.sphere;
    $('#lesson-root').innerHTML=lessonIntro(lesson,'Selectează un obiect sferic, modifică limitele lui și urmărește simultan definiția, figura originală și aria calculată.')+`<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Laborator</a><a href="#formule">Formule</a><a href="#surse">Figuri originale</a></nav>`+layerCards(lesson,text)+`<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">LABORATOR SFERIC</span><h2>Obiecte pe sferă</h2></div><span class="live-badge"><span class="status-dot"></span> Calcul verificabil</span></div>${contentCard('figură,formulă','essential','modern','geometrie','interactive-card',`<div class="interactive-header"><h3 id="sphere-object-title">Zona sferică</h3><span class="source-tag modern">Reconstrucție SVG</span></div><div class="interactive-body"><div class="control-panel"><fieldset><legend>Obiect</legend><div class="object-buttons" id="sphere-objects">${[['zone','Zonă sferică'],['cap','Calotă'],['trapezoid','Trapez sferic'],['lune','Fus sferic'],['great','Cerc mare'],['small','Cerc mic']].map(([key,label],i)=>`<button data-object="${key}" aria-pressed="${i===0}">${label}</button>`).join('')}</div></fieldset><label for="sphere-lat-low-input">Latitudine inferioară <output id="sphere-lat-low">−25°</output><input id="sphere-lat-low-input" type="range" min="-80" max="70" value="-25"></label><label for="sphere-lat-high-input">Latitudine superioară <output id="sphere-lat-high">45°</output><input id="sphere-lat-high-input" type="range" min="-70" max="85" value="45"></label><label for="sphere-lon-west-input">Longitudine vestică <output id="sphere-lon-west">−35°</output><input id="sphere-lon-west-input" type="range" min="-170" max="160" value="-35"></label><label for="sphere-lon-east-input">Longitudine estică <output id="sphere-lon-east">55°</output><input id="sphere-lon-east-input" type="range" min="-160" max="170" value="55"></label><fieldset><legend>Reprezentare</legend><label><input type="checkbox" data-sphere-toggle="equator" checked> Ecuator</label><label><input type="checkbox" data-sphere-toggle="meridians" checked> Meridiane</label><label><input type="checkbox" data-sphere-toggle="parallels" checked> Paralele</label></fieldset></div><div class="viz-panel"><svg id="sphere-svg" viewBox="0 0 520 420" role="img" aria-label="Laborator de geometrie sferică"></svg></div><div class="result-panel"><span class="source-tag historical" id="sphere-source-label">Fig. 11 · p. 22</span><h3 id="sphere-definition"></h3><p id="sphere-description"></p><div class="formula-card"><code id="sphere-formula"></code><div class="stat-list"><div><span>Raza R</span><strong>1 u</strong></div><div><span>Aria</span><strong id="sphere-area"></strong></div></div></div><button class="outline-button full-button" id="sphere-source">Vezi figura originală ↗</button></div></div>`)}</section><section id="formule" class="lesson-section"><span class="eyebrow">NOTAȚIE</span><h2>Formule folosite în laborator</h2><div class="layer-grid">${contentCard('formulă','detailed','textbook','geometrie','formula-card','<code>S = 2πR²(sin φ₂ − sin φ₁)</code><p>Zona sferică delimitată de două paralele. În scan, simbolurile sunt afectate de OCR; formula a fost verificată vizual.</p>')}${contentCard('formulă','detailed','textbook','geometrie','formula-card','<code>S = R² · Δλ · (sin φ₂ − sin φ₁)</code><p>Trapezul sferic; Δλ este în radiani în calculul numeric modern.</p>')}${contentCard('formulă','detailed','textbook','geometrie','formula-card','<code>S = 2R² · Δλ</code><p>Fusul sferic; Δλ reprezintă diferența de longitudine în radiani.</p>')}</div></section>`+sourceGallery(lesson)+lessonTail(lesson);
    initSphere(lesson);
  }

  function initSphere(lesson) {
    const objects={
      zone:{title:'Zona sferică',definition:'Porțiune a suprafeței sferei cuprinsă între două secțiuni plane paralele.',formula:'S = 2πR² |sin φ₂ − sin φ₁|',figure:0},
      cap:{title:'Calota sferică',definition:'Parte a suprafeței sferei delimitată de un plan secant.',formula:'S = 2πR² (1 − sin φ)',figure:1},
      trapezoid:{title:'Trapezul sferic',definition:'Porțiune delimitată de două meridiane și două paralele.',formula:'S = R² Δλ |sin φ₂ − sin φ₁|',figure:2},
      lune:{title:'Fusul sferic',definition:'Porțiune a sferei cuprinsă între două meridiane.',formula:'S = 2R² Δλ',figure:3},
      great:{title:'Cercul mare',definition:'Secțiune a sferei cu un plan care trece prin centru.',formula:'L = 2πR',figure:4},
      small:{title:'Cercul mic',definition:'Secțiune a sferei cu un plan care nu trece prin centru.',formula:'L = 2πR cos φ',figure:4}
    };
    let object='zone';
    const values=()=>({lo:+$('#sphere-lat-low-input').value,hi:+$('#sphere-lat-high-input').value,west:+$('#sphere-lon-west-input').value,east:+$('#sphere-lon-east-input').value});
    const ellipse=(lat,cls='svg-grid')=>{const y=210-lat*1.75,w=175*Math.cos(lat*Math.PI/180);return `<ellipse class="${cls}" cx="260" cy="${y}" rx="${Math.max(5,w)}" ry="${Math.max(2,w*.28)}"/>`;};
    const spherePoint=(lat,lon)=>{const p=lat*Math.PI/180,l=lon*Math.PI/180;return [260+176*Math.cos(p)*Math.sin(l),210-176*Math.sin(p)];};
    const spherePatch=(low,high,west,east)=>{const left=Math.max(-90,Math.min(west,east)),right=Math.min(90,Math.max(west,east));if(right<=left)return '';const samples=(a,b)=>{const n=Math.max(2,Math.ceil(Math.abs(b-a)/3)+1);return Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));};const ring=[...samples(left,right).map(lon=>spherePoint(low,lon)),...samples(low,high).slice(1).map(lat=>spherePoint(lat,right)),...samples(right,left).slice(1).map(lon=>spherePoint(high,lon)),...samples(high,low).slice(1).map(lat=>spherePoint(lat,left))];return `<path class="svg-historical" d="${ring.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')}Z"/>`;};
    function draw(){
      let {lo,hi,west,east}=values();if(lo>hi)[lo,hi]=[hi,lo];let dl=Math.abs(east-west)*Math.PI/180;
      $('#sphere-lat-low').textContent=`${lo}°`;$('#sphere-lat-high').textContent=`${hi}°`;$('#sphere-lon-west').textContent=`${west}°`;$('#sphere-lon-east').textContent=`${east}°`;
      const toggles=Object.fromEntries($$('[data-sphere-toggle]').map(input=>[input.dataset.sphereToggle,input.checked]));
      let svg='<circle class="svg-fill" cx="260" cy="210" r="176"/>';
      if(toggles.parallels) for(let lat=-60;lat<=60;lat+=30) svg+=ellipse(lat);
      if(toggles.meridians) for(let rot=-60;rot<=60;rot+=30) svg+=`<ellipse class="svg-grid" cx="260" cy="210" rx="${Math.max(8,176*Math.cos(rot*Math.PI/180))}" ry="176" transform="rotate(${rot} 260 210)"/>`;
      if(toggles.equator) svg+='<ellipse class="svg-accent" cx="260" cy="210" rx="176" ry="49"/>';
      if(object==='zone'){const y1=210-hi*1.75,y2=210-lo*1.75;svg+=`<path class="svg-historical" d="M${260-175*Math.cos(hi*Math.PI/180)} ${y1} Q260 ${y1+46} ${260+175*Math.cos(hi*Math.PI/180)} ${y1} L${260+175*Math.cos(lo*Math.PI/180)} ${y2} Q260 ${y2+46} ${260-175*Math.cos(lo*Math.PI/180)} ${y2}Z"/>`;svg+=ellipse(lo,'svg-strong')+ellipse(hi,'svg-strong');}
      if(object==='cap'){const y=210-hi*1.75;svg+=`<path class="svg-historical" d="M${260-175*Math.cos(hi*Math.PI/180)} ${y} Q260 ${y+46} ${260+175*Math.cos(hi*Math.PI/180)} ${y} A176 176 0 0 0 260 34 A176 176 0 0 0 ${260-175*Math.cos(hi*Math.PI/180)} ${y}Z"/>`+ellipse(hi,'svg-strong');}
      if(object==='trapezoid'||object==='lune'){svg+=spherePatch(object==='lune'?-90:lo,object==='lune'?90:hi,west,east);}
      if(object==='great')svg+='<ellipse class="svg-strong" cx="260" cy="210" rx="176" ry="58" transform="rotate(-28 260 210)"/>';
      if(object==='small')svg+=ellipse(hi,'svg-strong');
      svg+='<text class="svg-text" x="260" y="24" text-anchor="middle">Polul Nord</text><text class="svg-text" x="260" y="410" text-anchor="middle">Polul Sud</text>';
      $('#sphere-svg').innerHTML=svg;
      let area=0;if(object==='zone')area=2*Math.PI*Math.abs(Math.sin(hi*Math.PI/180)-Math.sin(lo*Math.PI/180));if(object==='cap')area=2*Math.PI*(1-Math.sin(hi*Math.PI/180));if(object==='trapezoid')area=dl*Math.abs(Math.sin(hi*Math.PI/180)-Math.sin(lo*Math.PI/180));if(object==='lune')area=2*dl;if(object==='great')area=2*Math.PI;if(object==='small')area=2*Math.PI*Math.cos(hi*Math.PI/180);
      const item=objects[object],fig=lesson.figures[item.figure];$('#sphere-object-title').textContent=item.title;$('#sphere-definition').textContent=item.title;$('#sphere-description').textContent=item.definition;$('#sphere-formula').textContent=item.formula;$('#sphere-area').textContent=`${fmt(area,4)} ${object==='great'||object==='small'?'u (lungime)':'u²'}`;$('#sphere-area').previousElementSibling.textContent=object==='great'||object==='small'?'Lungime':'Aria';$('#sphere-source-label').textContent=`${fig.number} · p. ${fig.page}`;
    }
    $('#sphere-objects').addEventListener('click',event=>{const button=event.target.closest('[data-object]');if(!button)return;object=button.dataset.object;$$('button',$('#sphere-objects')).forEach(b=>b.setAttribute('aria-pressed',String(b===button)));draw();});
    $('#sphere-lat-low-input').addEventListener('input',()=>{if(+$('#sphere-lat-low-input').value>+$('#sphere-lat-high-input').value)$('#sphere-lat-high-input').value=$('#sphere-lat-low-input').value;});
    $('#sphere-lat-high-input').addEventListener('input',()=>{if(+$('#sphere-lat-high-input').value<+$('#sphere-lat-low-input').value)$('#sphere-lat-low-input').value=$('#sphere-lat-high-input').value;});
    $('#sphere-lon-west-input').addEventListener('input',()=>{if(+$('#sphere-lon-west-input').value>+$('#sphere-lon-east-input').value)$('#sphere-lon-east-input').value=$('#sphere-lon-west-input').value;});
    $('#sphere-lon-east-input').addEventListener('input',()=>{if(+$('#sphere-lon-east-input').value<+$('#sphere-lon-west-input').value)$('#sphere-lon-west-input').value=$('#sphere-lon-east-input').value;});
    $$('input[id^="sphere-lat-"],input[id^="sphere-lon-"],[data-sphere-toggle]').forEach(input=>input.addEventListener('input',draw));
    $('#sphere-source').addEventListener('click',()=>openSource(objects[object].figure));draw();
  }

  function renderSolid(lesson,kind) {
    const text=summaries[lesson.id];const cone=kind==='cone';
    $('#lesson-root').innerHTML=lessonIntro(lesson,cone?'Deplasează raza și înălțimea conului; generatoarea și mărimile derivate se actualizează.':'Deplasează raza și înălțimea cilindrului și urmărește cum se schimbă suprafața și volumul.')+`<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Laborator</a><a href="#legatura">Legătura cu proiecțiile</a><a href="#surse">Figura originală</a></nav>`+layerCards(lesson,text)+`<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">GEOMETRIE DINAMICĂ</span><h2>${cone?'Con':'Cilindru'} de rotație</h2></div></div>${contentCard('figură,formulă','essential','modern','geometrie','interactive-card',`<div class="interactive-header"><h3>Dimensiuni și formule</h3><span class="source-tag modern">Model didactic</span></div><div class="interactive-body"><div class="control-panel"><label for="solid-r">Rază R <output id="solid-r-out">3</output><input id="solid-r" type="range" min="1" max="8" step=".5" value="3"></label><label for="solid-h">Înălțime h <output id="solid-h-out">6</output><input id="solid-h" type="range" min="2" max="12" step=".5" value="6"></label><p class="small">În manual, înălțimea este notată I. Folosim h în formula modernă pentru claritate.</p></div><div class="viz-panel"><svg id="solid-svg" viewBox="0 0 520 420" role="img" aria-label="${cone?'Con':'Cilindru'} interactiv"></svg></div><div class="result-panel"><span class="source-tag historical">${lesson.figures[0].number} · p. ${lesson.figures[0].page}</span><div class="stat-list"><div><span>Generatoare g</span><strong id="solid-g"></strong></div><div><span>Suprafață laterală</span><strong id="solid-lateral"></strong></div><div><span>Suprafață totală</span><strong id="solid-total"></strong></div><div><span>Volum</span><strong id="solid-volume"></strong></div></div><button class="outline-button full-button" data-source-index="0">Vezi figura originală ↗</button></div></div>`)}</section><section id="legatura" class="lesson-section">${contentCard('concept','detailed','modern','proiectii','shared-card',`<span class="eyebrow">DE CE APARE ${cone?'CONUL':'CILINDRUL'} ÎN CARTOGRAFIE?</span><div class="source-chain"><strong>${cone?'CON GEOMETRIC':'CILINDRU GEOMETRIC'}</strong><b>↓</b><strong>SUPRAFAȚĂ DE PROIECȚIE</strong><b>↓</b><a href="lesson.html?id=projection-${cone?'conic':'cylindrical'}">PROIECȚII ${cone?'CONICE':'CILINDRICE'} →</a></div><p>Legătura este introdusă aici conceptual. Construcțiile cartografice sunt dezvoltate în secțiunile 17 și 18.</p>`)}</section>`+sourceGallery(lesson)+lessonTail(lesson);
    initSolid(cone);
  }

  function initSolid(cone) {
    const draw=()=>{const r=+$('#solid-r').value,h=+$('#solid-h').value,g=cone?Math.hypot(r,h):h;$('#solid-r-out').textContent=fmt(r);$('#solid-h-out').textContent=fmt(h);$('#solid-g').textContent=fmt(g,3);const lateral=cone?Math.PI*r*g:2*Math.PI*r*h,total=cone?Math.PI*r*(g+r):2*Math.PI*r*(h+r),volume=(cone?1/3:1)*Math.PI*r*r*h;$('#solid-lateral').textContent=fmt(lateral,3);$('#solid-total').textContent=fmt(total,3);$('#solid-volume').textContent=fmt(volume,3);const rx=35+r*13,top=350-h*22,bottom=350;let svg;if(cone)svg=`<ellipse class="svg-fill" cx="260" cy="${bottom}" rx="${rx}" ry="22"/><path class="svg-fill" d="M260 ${top} L${260-rx} ${bottom} A${rx} 22 0 0 0 ${260+rx} ${bottom}Z"/><line class="svg-axis" x1="260" y1="${top-25}" x2="260" y2="${bottom+35}" stroke-dasharray="4 4"/><line class="svg-accent" x1="260" y1="${top}" x2="${260+rx}" y2="${bottom}"/><line class="svg-strong" x1="260" y1="${bottom}" x2="${260+rx}" y2="${bottom}"/><text class="svg-text" x="${260+rx/2}" y="${bottom+18}">R</text><text class="svg-text" x="${260+rx/2+16}" y="${(top+bottom)/2}">g</text><text class="svg-text" x="270" y="${(top+bottom)/2}">h</text>`;else svg=`<path class="svg-fill" d="M${260-rx} ${top} L${260-rx} ${bottom} A${rx} 22 0 0 0 ${260+rx} ${bottom} L${260+rx} ${top}Z"/><ellipse class="svg-fill" cx="260" cy="${top}" rx="${rx}" ry="22"/><ellipse class="svg-strong" cx="260" cy="${bottom}" rx="${rx}" ry="22"/><line class="svg-axis" x1="260" y1="${top-30}" x2="260" y2="${bottom+30}" stroke-dasharray="4 4"/><line class="svg-accent" x1="${260+rx}" y1="${top}" x2="${260+rx}" y2="${bottom}"/><line class="svg-strong" x1="260" y1="${bottom}" x2="${260+rx}" y2="${bottom}"/><text class="svg-text" x="${260+rx/2}" y="${bottom+18}">R</text><text class="svg-text" x="${260+rx+10}" y="${(top+bottom)/2}">g = h</text><text class="svg-text" x="270" y="${(top+bottom)/2}">axă</text>`;$('#solid-svg').innerHTML=svg;};$('#solid-r').addEventListener('input',draw);$('#solid-h').addEventListener('input',draw);draw();
  }

  function renderEllipse(lesson) {
    const text=summaries.ellipse;
    $('#lesson-root').innerHTML=lessonIntro(lesson,'Construiește elipsa în pași, pornind de la axele sale și de la cele două cercuri auxiliare din figura 20.')+`<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Construcție</a><a href="#surse">Original vs digital</a></nav>`+layerCards(lesson,text)+`<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">RECONSTRUCȚIE PAS CU PAS</span><h2>Metoda cercurilor auxiliare</h2></div><span id="ellipse-step-label" class="step-readout">Pasul 1 / 5</span></div>${contentCard('figură,exercițiu','essential','modern','geometrie','interactive-card',`<div class="interactive-header"><h3>Reconstrucție digitală</h3><span class="source-tag modern">Fig. 20 reinterpretată</span></div><div class="viz-panel"><svg id="ellipse-svg" viewBox="0 0 640 420" role="img" aria-label="Construcția elipsei în pași"></svg></div><div class="ellipse-controls"><button id="ellipse-prev">← Pasul anterior</button><button id="ellipse-next">Pasul următor →</button><button id="ellipse-play">Rulează construcția</button></div><p id="ellipse-explanation" class="modern-note"></p>`)}</section>`+sourceGallery(lesson)+lessonTail(lesson);
    initEllipse();
    const reset=document.createElement('button');reset.id='ellipse-reset';reset.type='button';reset.textContent='Reia de la început';
    reset.addEventListener('click',()=>{if($('#ellipse-play').textContent==='Oprește')$('#ellipse-play').click();for(let i=0;i<4;i++)$('#ellipse-prev').click();$('#ellipse-play').textContent='Rulează construcția';});
    $('.ellipse-controls').append(reset);
  }

  function initEllipse(){let step=0,timer=null;const explanations=['Trasăm axa mare AA′ și axa mică BB′ prin centrul O.','Construim două cercuri concentrice, cu razele egale cu semiaxele.','Împărțim cercurile prin aceleași raze auxiliare.','Ducem paralele la axe prin punctele corespunzătoare; intersecțiile lor aparțin elipsei.','Unim punctele într-o curbă continuă și marcăm focarele calculabile din c² = a² − b².'];const draw=()=>{const cx=320,cy=210,a=210,b=120,c=Math.sqrt(a*a-b*b);let svg=`<line class="svg-axis" x1="70" y1="${cy}" x2="570" y2="${cy}"/><line class="svg-axis" x1="${cx}" y1="50" x2="${cx}" y2="370"/><text class="svg-text" x="58" y="${cy-8}">A</text><text class="svg-text" x="574" y="${cy-8}">A′</text><text class="svg-text" x="${cx+8}" y="44">B</text><text class="svg-text" x="${cx+8}" y="388">B′</text><circle cx="${cx}" cy="${cy}" r="4" fill="var(--ink)"/><text class="svg-text" x="${cx+8}" y="${cy-8}">O</text>`;if(step>=1)svg+=`<circle class="svg-grid" cx="${cx}" cy="${cy}" r="${a}"/><circle class="svg-grid" cx="${cx}" cy="${cy}" r="${b}"/>`;if(step>=2)for(let angle=0;angle<360;angle+=30){const t=angle*Math.PI/180;svg+=`<line class="svg-grid" x1="${cx}" y1="${cy}" x2="${cx+a*Math.cos(t)}" y2="${cy+a*Math.sin(t)}"/>`;}if(step>=3)for(let angle=0;angle<360;angle+=30){const t=angle*Math.PI/180,x=cx+a*Math.cos(t),y=cy+b*Math.sin(t);svg+=`<line class="svg-grid" x1="${x}" y1="${cy}" x2="${x}" y2="${y}"/><line class="svg-grid" x1="${cx}" y1="${y}" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="3" fill="var(--teal)"/>`;}if(step>=4)svg+=`<ellipse class="svg-strong" cx="${cx}" cy="${cy}" rx="${a}" ry="${b}"/><circle cx="${cx-c}" cy="${cy}" r="4" fill="var(--blue)"/><circle cx="${cx+c}" cy="${cy}" r="4" fill="var(--blue)"/><text class="svg-text" x="${cx-c}" y="${cy+20}" text-anchor="middle">F₁</text><text class="svg-text" x="${cx+c}" y="${cy+20}" text-anchor="middle">F₂</text>`;$('#ellipse-svg').innerHTML=svg;$('#ellipse-step-label').textContent=`Pasul ${step+1} / 5`;$('#ellipse-explanation').textContent=explanations[step];$('#ellipse-prev').disabled=step===0;$('#ellipse-next').disabled=step===4;};$('#ellipse-prev').addEventListener('click',()=>{step=Math.max(0,step-1);draw();});$('#ellipse-next').addEventListener('click',()=>{step=Math.min(4,step+1);draw();});$('#ellipse-play').addEventListener('click',()=>{if(timer){clearInterval(timer);timer=null;$('#ellipse-play').textContent='Rulează construcția';return;}step=0;draw();$('#ellipse-play').textContent='Oprește';timer=setInterval(()=>{if(step===4){clearInterval(timer);timer=null;$('#ellipse-play').textContent='Rulează din nou';}else{step++;draw();}},650);});draw();}

  function renderProjection(lesson){
    const selected=lesson.projection_key || (lesson.id==='projection-classification'?'orthographic':'postel');
    const historical=`Manualul organizează sistemele de proiecție după deformări, poziția suprafeței, modul de construcție și utilizare; secțiunea curentă este ${lesson.source_section}.`;
    const modern='Laboratorul desenează rețele numai pentru formule implementate. Exemplele fără formulă verificată sunt marcate „schemă conceptuală”.';
    const gis='Alegerea unei proiecții într-un flux GIS depinde de scop și teritoriu. Această lecție arată forme geometrice, nu recomandă un CRS.';
    $('#lesson-root').innerHTML=lessonIntro(lesson,'Explorează familia, clasificarea istorică și forma rețelei cartografice; apoi compară două reprezentări ale aceleiași rețele.')+`<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Laborator</a><a href="#comparatie">Comparație</a><a href="#catalog">Catalog</a><a href="#surse">Original</a></nav>`+layerCards(lesson,[historical,modern,gis])+projectionLabMarkup(selected)+projectionComparisonMarkup()+`<section id="catalog" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">SECȚIUNILE 13–21</span><h2>Catalogul exemplelor</h2></div></div><div class="projection-catalog">${projectionCatalog.map(item=>`<article class="projection-entry" data-filterable data-content-type="concept" data-level="detailed" data-source="textbook" data-theme="proiectii"><strong>${item.section} · ${item.name}</strong><span>${item.family} · ${item.class}<br>${item.exact?'Rețea matematică disponibilă':'Schemă conceptuală'}</span></article>`).join('')}</div></section>`+sourceGallery(lesson)+lessonTail(lesson);initProjectionLab(selected);initProjectionComparison();
  }

  function projectionLabMarkup(selected){return `<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">LABORATOR DE PROIECȚII</span><h2>Rețea geografică → rețea cartografică</h2></div><span class="live-badge"><span class="status-dot"></span> Matematic / conceptual</span></div>${contentCard('figură,formulă','essential','modern','proiectii','interactive-card projection-lab',`<div class="interactive-header"><h3 id="projection-title"></h3><span id="projection-accuracy" class="source-tag modern"></span></div><div class="interactive-body"><div class="control-panel"><label>Familie geometrică<select id="projection-family"><option>Toate</option><option>Azimutală</option><option>Cilindrică</option><option>Conică</option><option>Convențională</option><option>Derivată</option></select></label><label>Clasificare istorică<select id="projection-class"><option>Toate</option><option>perspectivă</option><option>neperspectivă</option><option>ortografică</option><option>stereografică</option><option>centrală</option><option>polară</option><option>ecuatorială</option><option>oblică</option><option>normală</option><option>pseudocilindrică</option><option>circulară</option></select></label><label>Exemplu<select id="projection-select">${projectionCatalog.map(item=>`<option value="${item.key}" ${item.key===selected?'selected':''}>${item.section} · ${item.name}</option>`).join('')}</select></label><label for="projection-lon">Meridian de referință <output id="projection-lon-out">0°</output><input id="projection-lon" type="range" min="-90" max="90" step="15" value="0"></label><label for="projection-lat">Latitudine de referință <output id="projection-lat-out">30°</output><input id="projection-lat" type="range" min="-60" max="60" step="15" value="30"></label></div><div class="viz-panel"><svg id="projection-svg" class="projection-stage" viewBox="0 0 560 430" role="img" aria-label="Rețea cartografică interactivă"></svg></div><div class="result-panel"><span id="projection-section" class="source-tag historical"></span><h3 id="projection-family-label"></h3><p id="projection-note"></p><div class="stat-list"><div><span>Familie</span><strong id="projection-family-result"></strong></div><div><span>Clasificare</span><strong id="projection-class-result"></strong></div></div><button id="projection-source" class="outline-button full-button">Vezi figura originală ↗</button></div></div>`)}</section>`;}

  const projectionEngine=window.CARTO_PROJECTIONS;
  if(projectionEngine)projectionCatalog.forEach(item=>{if(item.exact)Object.assign(projectionEngine.definitions[item.key],item);});

  function schematicSvg(key){if(key==='conic-schematic')return `<path class="outline" d="M90 360L280 55L470 360Z"/><path class="grat-line" d="M135 288Q280 352 425 288M180 215Q280 255 380 215M225 142Q280 164 335 142"/><path class="grat-line" d="M280 55L180 360M280 55L230 360M280 55L330 360M280 55L380 360"/><text class="projection-label" x="280" y="400" text-anchor="middle">schemă conceptuală conică</text>`;if(key==='star-schematic'){let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,b=a+Math.PI/10;d+=`${i?'L':'M'}${280+190*Math.cos(a)} ${210+190*Math.sin(a)}L${280+80*Math.cos(b)} ${210+80*Math.sin(b)}`;}return `<path class="outline" d="${d}Z"/><circle class="grat-line" cx="280" cy="210" r="45"/><circle class="grat-line" cx="280" cy="210" r="80"/><text class="projection-label" x="280" y="415" text-anchor="middle">schemă conceptuală stelată</text>`;}return `<circle class="outline" cx="280" cy="210" r="185"/><ellipse class="grat-line" cx="280" cy="210" rx="185" ry="62"/><ellipse class="grat-line" cx="280" cy="210" rx="62" ry="185"/><path class="grat-line" d="M110 138Q280 210 450 138M110 282Q280 210 450 282M208 40Q280 210 208 380M352 40Q280 210 352 380"/><text class="projection-label" x="280" y="415" text-anchor="middle">schemă conceptuală circulară</text>`;}

  function graticuleSvg(key,options={}){
    const item=projectionCatalog.find(p=>p.key===key);
    if(!item.exact)return schematicSvg(key);
    const center=options.center||0, interval=options.interval||30;
    const base=projectionEngine.graticule(key,{center,interval,grid:true,equator:true,central:true});
    const points=base.flatMap(line=>line.segments.flat());
    const maxX=Math.max(.01,...points.map(p=>Math.abs(p[0]))),maxY=Math.max(.01,...points.map(p=>Math.abs(p[1])));
    const scale=Math.min(205/maxX,170/maxY),toXY=p=>[280+p[0]*scale,210+p[1]*scale];
    const path=segments=>segments.map(segment=>segment.map((p,i)=>{const [x,y]=toXY(p);return `${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`;}).join('')).join('');
    const polar=item.family==='Azimutală';
    let svg=polar?`<circle class="outline" cx="280" cy="210" r="${(Math.max(maxX,maxY)*scale).toFixed(2)}"/>`:key==='mollweide'?`<ellipse class="outline" cx="280" cy="210" rx="${(maxX*scale).toFixed(2)}" ry="${(maxY*scale).toFixed(2)}"/>`:`<rect class="outline" x="${(280-maxX*scale).toFixed(2)}" y="${(210-maxY*scale).toFixed(2)}" width="${(2*maxX*scale).toFixed(2)}" height="${(2*maxY*scale).toFixed(2)}"/>`;
    const lines=projectionEngine.graticule(key,{center,interval,grid:options.grid!==false,equator:options.equator!==false,central:options.central!==false,test:!!options.test});
    for(const line of lines){const d=path(line.segments);if(d)svg+=`<path class="${line.kind==='test'?'svg-accent':`grat-line ${line.kind==='grid'?'':line.kind}`}" d="${d}">${line.kind==='test'?'<title>Repere grafice proiectate prin aceeași transformare ca rețeaua. Nu reprezintă încă o analiză formală a deformărilor.</title>':''}</path>`;}
    if(options.reference){const refLat=options.refLat??30,refLon=options.refLon??0,point=projectionEngine.project(key,refLon,refLat,center);if(point){const [x,y]=toXY(point);svg+=`<circle class="reference-point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="5"/><text class="projection-label" x="${(x+9).toFixed(2)}" y="${(y-8).toFixed(2)}">φ ${refLat}° · λ ${refLon}°</text>`;}}
    return svg;
  }

  function initProjectionLab(selected){
    const select=$('#projection-select'),family=$('#projection-family'),classification=$('#projection-class'),svg=$('#projection-svg');
    svg.classList.add('projection-view');svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    $('#projection-lon').closest('label').firstChild.textContent='Meridian central ';
    $('#projection-lat').closest('label').firstChild.textContent='Latitudinea reperului ';
    const draw=()=>{
      const item=projectionCatalog.find(p=>p.key===select.value),refLat=+$('#projection-lat').value,center=+$('#projection-lon').value;
      svg.innerHTML=graticuleSvg(item.key,{center,grid:true,equator:true,central:true,reference:true,refLat,refLon:0});
      $('#projection-title').textContent=item.name;
      $('#projection-accuracy').textContent=item.exact?'Proiecție calculată':'Schemă conceptuală';
      $('#projection-accuracy').className=`source-tag ${item.exact?'modern':'historical'}`;
      $('#projection-lon').closest('label').hidden=!item.exact;
      $('#projection-lat').closest('label').hidden=!item.exact;
      $('#projection-section').textContent=`§ ${item.section} · ${item.figure}`;
      $('#projection-family-label').textContent=item.family;
      $('#projection-note').textContent=item.note+(item.exact?` Domeniu afișat: ${projectionEngine.definitions[item.key].domain}.`:'');
      $('#projection-family-result').textContent=item.family;$('#projection-class-result').textContent=item.class;
      $('#projection-lon-out').textContent=`${center}°`;$('#projection-lat-out').textContent=`${refLat}°`;
    };
    const filterOptions=()=>{$$('option',select).forEach(option=>{const item=projectionCatalog.find(p=>p.key===option.value);option.hidden=(family.value!=='Toate'&&item.family!==family.value)||(classification.value!=='Toate'&&!item.class.includes(classification.value));});const visible=$$('option',select).find(o=>!o.hidden);if(select.selectedOptions[0]?.hidden&&visible)select.value=visible.value;draw();};
    family.addEventListener('change',filterOptions);classification.addEventListener('change',filterOptions);select.addEventListener('change',draw);
    $('#projection-lon').addEventListener('input',draw);$('#projection-lat').addEventListener('input',draw);
    $('#projection-source').addEventListener('click',()=>openAdHocSource(projectionCatalog.find(p=>p.key===select.value)));
    draw();
  }

  function projectionComparisonMarkup(){return `<section id="comparatie" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">MOD COMPARAȚIE</span><h2>Aceeași rețea, două proiecții</h2></div></div>${contentCard('exemplu','essential','modern','proiectii','shared-card',`<div class="comparison-options"><label><input id="compare-grid" type="checkbox" checked> Rețea geografică</label><label><input id="compare-equator" type="checkbox" checked> Ecuator</label><label><input id="compare-central" type="checkbox" checked> Meridian central</label><label><input id="compare-test" type="checkbox"> Cercuri de test</label><label for="compare-lon">λ referință <output id="compare-lon-out">0°</output><input id="compare-lon" type="range" min="-90" max="90" step="15" value="0"></label><label for="compare-lat">φ referință <output id="compare-lat-out">30°</output><input id="compare-lat" type="range" min="-60" max="60" step="15" value="30"></label></div><div class="comparison-panels"><div class="comparison-pane"><label for="projection-a">Proiecția A</label><select id="projection-a"></select><svg id="projection-a-svg" viewBox="0 0 560 430"></svg></div><div class="comparison-pane"><label for="projection-b">Proiecția B</label><select id="projection-b"></select><svg id="projection-b-svg" viewBox="0 0 560 430"></svg></div></div><p class="small">Punctul de referință și cercurile de test sunt sincronizate. Site-ul nu formulează afirmații despre conservarea deformărilor dincolo de clasificarea tipărită în manual.</p>`)}</section>`;}

  function initProjectionComparison(){
    const exact=projectionCatalog.filter(p=>p.exact),options=exact.map(p=>`<option value="${p.key}">${p.name}</option>`).join('');
    $('#projection-a').innerHTML=options;$('#projection-b').innerHTML=options;
    $('#projection-a').value='orthographic';$('#projection-b').value='mollweide';
    $('#compare-lon').closest('label').firstChild.textContent='Meridian central ';
    $('#compare-lat').closest('label').firstChild.textContent='Latitudinea reperului ';
    $('#compare-test').closest('label').lastChild.textContent=' Cercuri geografice de test ';
    $('#compare-test').setAttribute('title','Repere grafice proiectate prin aceeași transformare ca rețeaua. Nu reprezintă încă o analiză formală a deformărilor.');
    for(const id of ['projection-a-svg','projection-b-svg']){$(`#${id}`).classList.add('projection-view');$(`#${id}`).setAttribute('preserveAspectRatio','xMidYMid meet');$(`#${id}`).setAttribute('role','img');$(`#${id}`).setAttribute('aria-label','Rețea geografică proiectată');}
    const drawPanel=side=>{const center=+$('#compare-lon').value,refLat=+$('#compare-lat').value,opts={center,interval:30,grid:$('#compare-grid').checked,equator:$('#compare-equator').checked,central:$('#compare-central').checked,test:$('#compare-test').checked,reference:true,refLat,refLon:0};$(`#projection-${side}-svg`).innerHTML=graticuleSvg($(`#projection-${side}`).value,opts);};
    const drawBoth=()=>{drawPanel('a');drawPanel('b');$('#compare-lat-out').textContent=`${$('#compare-lat').value}°`;$('#compare-lon-out').textContent=`${$('#compare-lon').value}°`;};
    for(const side of ['a','b'])$(`#projection-${side}`).addEventListener('change',()=>drawPanel(side));
    for(const id of ['compare-grid','compare-equator','compare-central','compare-test'])$(`#${id}`).addEventListener('change',drawBoth);
    for(const id of ['compare-lat','compare-lon'])$(`#${id}`).addEventListener('input',drawBoth);
    drawBoth();
  }

  function renderMethod(lesson){const info=methodInfo[lesson.method_key];const texts=[info.historical,info.principle,info.gis];$('#lesson-root').innerHTML=lessonIntro(lesson,'Parcurge principiul istoric și explorează un exemplu cartografic distinct, construit cu date fictive pentru această metodă.')+`<nav class="lesson-jump"><a href="#straturi">Trei straturi</a><a href="#exploreaza">Studio GIS</a><a href="#aceleasi-date">Comparație</a><a href="#surse">Original</a></nav>`+layerCards(lesson,texts)+`<section class="lesson-section">${contentCard('qgis','detailed','gis','reprezentare','qgis-card',`<span class="source-tag qgis-tag">Corespondență conceptuală</span><div class="qgis-flow"><span>${info.name}<small>Manual 1974</small></span><b>→</b><span>${info.principle}<small>Principiu cartografic</small></span><b>→</b><span>${info.gis}<small>Interpretare GIS</small></span></div>`)}</section>`+methodStudioMarkup(lesson.method_key)+sameDataMarkup()+sourceGallery(lesson)+lessonTail(lesson);initMethodStudio(lesson.method_key);initSameData(lesson.method_key);}

  function methodStudioMarkup(initial){return window.CARTO_METHODS.markup(initial);}

  const palette=['#dceaf2','#accbdd','#75a8c5','#3f80a9','#1f587e','#173f5c','#102e45'];const categories={munte:'#9c8065',deal:'#bd9e6d','câmpie':'#accb8c',urban:'#9c7aa8',litoral:'#79aebb'};
  const polyPoints=polygon=>polygon.map(([x,y])=>`${x*5},${y*4}`).join(' ');const centroid=polygon=>[polygon.reduce((s,p)=>s+p[0],0)/polygon.length*5,polygon.reduce((s,p)=>s+p[1],0)/polygon.length*4];
  function breaks(values,count,method){const sorted=[...values].sort((a,b)=>a-b),min=sorted[0],max=sorted.at(-1);if(method==='quantile')return Array.from({length:count+1},(_,i)=>sorted[Math.min(sorted.length-1,Math.floor(i*sorted.length/count))]);return Array.from({length:count+1},(_,i)=>min+(max-min)*i/count);}
  function regionBase(fillFn){return demo.regions.map(region=>`<polygon class="demo-region" data-region="${region.id}" points="${polyPoints(region.polygon)}" fill="${fillFn(region)}"><title>${region.name}</title></polygon>`).join('');}
  function drawMethod(mode){const attr=$('#demo-attribute').value,count=+$('#demo-classes').value,method=$('#demo-classification').value,maxSize=+$('#demo-size').value,dotValue=+$('#demo-dot').value,values=demo.regions.map(r=>r[attr]),limits=breaks(values,count,method);let svg='',legend='',note='';const classIndex=value=>Math.min(count-1,Math.max(0,limits.slice(1).findIndex(limit=>value<=limit)));if(mode==='choropleth'){svg=regionBase(r=>palette[classIndex(r[attr])]);legend=Array.from({length:count},(_,i)=>`<span><i style="background:${palette[i]}"></i>${fmt(limits[i])}–${fmt(limits[i+1])}</span>`).join('');note='Poligoanele sunt colorate după clasa valorii.';}else if(mode==='qualitative'){svg=regionBase(r=>categories[r.category]);legend=Object.entries(categories).map(([name,color])=>`<span><i style="background:${color}"></i>${name}</span>`).join('');note='Culoarea indică o categorie nominală, nu o ordine cantitativă.';}else if(mode==='symbols'){svg=regionBase(()=> 'var(--surface-alt)');svg+=demo.points.map(p=>{const r=5+Math.sqrt(p.value/130)*maxSize;return `<circle cx="${p.x*5}" cy="${p.y*4}" r="${r}" fill="var(--blue)" fill-opacity=".45" stroke="var(--blue)"><title>${p.name}: ${p.value}</title></circle>`;}).join('');legend=`<span><i style="border-radius:50%;background:var(--blue)"></i>aria simbolului ∝ valoarea</span>`;note='Pozițiile și valorile sunt fictive; aria cercului este proporțională cu valoarea.';}else if(mode==='dots'){svg=regionBase(()=> 'var(--surface-alt)');for(const region of demo.regions){const [cx,cy]=centroid(region.polygon),n=Math.max(1,Math.round(region[attr]/dotValue));for(let i=0;i<n;i++){const a=(i*137.5)*Math.PI/180,rad=3+4*Math.sqrt(i);svg+=`<circle cx="${cx+Math.cos(a)*rad}" cy="${cy+Math.sin(a)*rad}" r="2.5" fill="var(--blue)"/>`;}}legend=`<span><i style="border-radius:50%;background:var(--blue)"></i>1 punct = ${dotValue} unități</span>`;note='Punctele sunt distribuite determinist în jurul centrului fiecărei regiuni; nu indică locații reale.';}else if(mode==='flows'){svg=regionBase(()=> 'var(--surface-alt)');svg+=demo.flows.map(f=>{const [x1,y1]=[f.from[0]*5,f.from[1]*4],[x2,y2]=[f.to[0]*5,f.to[1]*4],w=1+f.value/18;return `<defs><marker id="arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" fill="var(--blue)"/></marker></defs><path d="M${x1} ${y1} Q${(x1+x2)/2} ${Math.min(y1,y2)-25} ${x2} ${y2}" fill="none" stroke="var(--blue)" stroke-width="${w}" stroke-opacity=".7" marker-end="url(#arrow)"><title>${f.value} unități</title></path>`;}).join('');legend='<span><i style="background:var(--blue)"></i>grosime proporțională cu valoarea</span>';note='Liniile leagă origini și destinații fictive; grosimea este proporțională.';}else if(mode==='isolines'){svg=isolineSvg();legend=[20,40,60,80].map((v,i)=>`<span><i style="border-top:2px solid ${palette[i+2]};height:1px"></i>${v}</span>`).join('');note='Izoliniile sunt generate prin marching squares din suprafața sintetică inclusă în proiect.';}$('#method-demo-svg').innerHTML=svg;$('#method-legend').innerHTML=legend;$('#method-demo-note').textContent=note;$('#method-demo-title').textContent={choropleth:'Cartogramă didactică',qualitative:'Fond calitativ',symbols:'Simboluri proporționale',dots:'Metoda punctului',flows:'Linii de mișcare',isolines:'Izolinii'}[mode];$('#demo-classes-out').textContent=count;$('#demo-size-out').textContent=maxSize;$('#demo-dot-out').textContent=dotValue;$('#attribute-control').hidden=['symbols','flows','isolines','qualitative'].includes(mode);$('#classes-control').hidden=mode!=='choropleth';$('#classification-control').hidden=mode!=='choropleth';$('#size-control').hidden=mode!=='symbols';$('#dot-control').hidden=mode!=='dots';}
  function isolineSvg(){const grid=demo.surface,rows=grid.length,cols=grid[0].length,sx=420/(cols-1),sy=300/(rows-1),ox=50,oy=55;let svg=`<rect x="${ox}" y="${oy}" width="420" height="300" fill="var(--surface-alt)" stroke="var(--line)"/>`;const cases={1:[[3,2]],2:[[2,1]],3:[[3,1]],4:[[0,1]],5:[[0,3],[2,1]],6:[[0,2]],7:[[0,3]],8:[[3,0]],9:[[0,2]],10:[[3,2],[0,1]],11:[[0,1]],12:[[3,1]],13:[[2,1]],14:[[3,2]]};const edgePoint=(edge,x,y,t)=>{const v=[grid[y][x],grid[y][x+1],grid[y+1][x+1],grid[y+1][x]],corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]],ends=[[0,1],[1,2],[3,2],[0,3]][edge],[a,b]=ends,f=(t-v[a])/(v[b]-v[a]||1),px=(corners[a][0]+(corners[b][0]-corners[a][0])*f)*sx+ox,py=(corners[a][1]+(corners[b][1]-corners[a][1])*f)*sy+oy;return[px,py];};[20,40,60,80].forEach((t,ti)=>{for(let y=0;y<rows-1;y++)for(let x=0;x<cols-1;x++){const vals=[grid[y][x],grid[y][x+1],grid[y+1][x+1],grid[y+1][x]],code=vals.reduce((c,v,i)=>c|(v>=t?(1<<i):0),0);for(const seg of cases[code]||[]){const a=edgePoint(seg[0],x,y,t),b=edgePoint(seg[1],x,y,t);svg+=`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${palette[ti+2]}" stroke-width="2"/>`;}}});return svg;}
  function initMethodStudio(initial){window.CARTO_METHODS.init(initial);}
  function sameDataMarkup(){return `<section id="aceleasi-date" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">ELEMENT-FANION</span><h2>Același set de date, reprezentări diferite</h2></div></div>${contentCard('exemplu','essential','modern','reprezentare','same-data',`<div class="method-tabs" id="same-data-tabs">${[['symbols','Simboluri proporționale'],['choropleth','Cartogramă'],['cartodiagram','Cartodiagramă'],['dots','Puncte'],['qualitative','Fond calitativ']].map(([key,label],i)=>`<button data-mode="${key}" aria-pressed="${i===0}">${label}</button>`).join('')}</div><div class="wide-viz"><svg id="same-data-svg" viewBox="0 0 520 420" aria-label="Același set de date redat prin metode diferite"></svg></div><p id="same-data-caption" class="modern-note"></p><p class="dataset-note">Exercițiu comparativ separat: aici același set fictiv rămâne intenționat neschimbat între metode. Exemplele individuale de mai sus folosesc fiecare altă geografie și altă temă.</p>`)}</section>`;}
  function initSameData(initial){let mode=['choropleth','cartodiagram','qualitative','dots'].includes(initial)?initial:'symbols';const draw=()=>{const regions=regionBase(r=>mode==='choropleth'?palette[Math.min(4,Math.floor((r.population-45)/23))]:mode==='qualitative'?categories[r.category]:'var(--surface-alt)');let svg=regions;if(mode==='symbols')svg+=demo.regions.map(r=>{const[cx,cy]=centroid(r.polygon),rad=5+Math.sqrt(r.population/154)*25;return`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="var(--blue)" fill-opacity=".45" stroke="var(--blue)"/>`;}).join('');if(mode==='cartodiagram')svg+=demo.regions.map(r=>{const[cx,cy]=centroid(r.polygon),rad=16,a=r.population/(r.population+r.production)*360;return`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="#dca86f"/><path d="${piePath(cx,cy,rad,0,a)}" fill="var(--blue)"/>`;}).join('');if(mode==='dots')for(const r of demo.regions){const[cx,cy]=centroid(r.polygon),n=Math.round(r.population/20);for(let i=0;i<n;i++){const a=i*2.399,rr=3+4*Math.sqrt(i);svg+=`<circle cx="${cx+Math.cos(a)*rr}" cy="${cy+Math.sin(a)*rr}" r="2.4" fill="var(--blue)"/>`;}}$('#same-data-svg').innerHTML=svg;$('#same-data-caption').textContent={symbols:'Mărimea cercului redă populația fictivă.',choropleth:'Tonul suprafeței redă clasa populației fictive.',cartodiagram:'Sectoarele compară populația și producția fictive în aceeași regiune.',dots:'Fiecare punct reprezintă 20 de unități fictive.',qualitative:'Culoarea redă categoria nominală fictivă a regiunii, nu populația.'}[mode];$$('button',$('#same-data-tabs')).forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));};$('#same-data-tabs').addEventListener('click',event=>{const b=event.target.closest('[data-mode]');if(b){mode=b.dataset.mode;draw();}});draw();}
  function piePath(cx,cy,r,start,end){const polar=a=>[cx+r*Math.cos((a-90)*Math.PI/180),cy+r*Math.sin((a-90)*Math.PI/180)],s=polar(end),e=polar(start);return`M${cx} ${cy}L${s[0]} ${s[1]}A${r} ${r} 0 ${end-start>180?1:0} 0 ${e[0]} ${e[1]}Z`;}

  function renderRelief(lesson){const info=methodInfo.relief;$('#lesson-root').innerHTML=lessonIntro(lesson,'Transformă curbele de nivel fictive într-un model stratificat și modifică exagerarea verticală.')+`<nav class="lesson-jump"><a href="#straturi">Straturi</a><a href="#exploreaza">Relief interactiv</a><a href="#surse">Original</a></nav>`+layerCards(lesson,[info.historical,info.principle,info.gis])+`<section id="exploreaza" class="lesson-section"><div class="lesson-section-header"><div><span class="eyebrow">DE LA 2D LA 3D</span><h2>Machetă stratificată</h2></div><span class="source-tag qgis-tag">Legătură QGIS 3.44</span></div>${contentCard('exemplu,qgis','essential','modern','relief','interactive-card',`<div class="interactive-header"><h3>Relief sintetic</h3><span class="source-tag modern">Model SVG</span></div><div class="interactive-body"><div class="control-panel"><label for="terrain-ex">Exagerare verticală <output id="terrain-ex-out">2×</output><input id="terrain-ex" type="range" min="0" max="5" step=".5" value="2"></label><fieldset><legend>Afișare</legend><label><input id="terrain-contours" type="checkbox" checked> Curbe de nivel</label><label><input id="terrain-shade" type="checkbox" checked> Relief umbrit</label><label><input id="terrain-labels" type="checkbox" checked> Cote</label></fieldset></div><div class="viz-panel terrain-stage"><svg id="terrain-svg" viewBox="0 0 560 430" role="img" aria-label="Model stratificat de relief"></svg></div><div class="result-panel"><h3>Principiul machetei</h3><ol class="small"><li>Alegi curbele de nivel.</li><li>Transferi fiecare nivel pe o foaie.</li><li>Decupezi contururile.</li><li>Suprapui în ordine altimetrică.</li><li>Modelezi și finisezi suprafața.</li></ol><div class="qgis-card"><strong>De la macheta fizică la modelul digital al terenului</strong><p>Vezi cardul QGIS 3.44 și lecțiile despre DEM, hillshade și slope.</p></div></div></div>`)}</section>`+sourceGallery(lesson)+lessonTail(lesson);initTerrain();}
  function initTerrain(){const contours=[{r:165,y:0,v:100},{r:135,y:1,v:200},{r:102,y:2,v:300},{r:70,y:3,v:400},{r:38,y:4,v:500}];const draw=()=>{const ex=+$('#terrain-ex').value,show=$('#terrain-contours').checked,shade=$('#terrain-shade').checked,labels=$('#terrain-labels').checked;$('#terrain-ex-out').textContent=`${fmt(ex,1)}×`;let svg='<g class="terrain-grid">';for(const [i,c] of contours.entries()){const cy=260-c.y*ex*11,rx=c.r,ry=c.r*.38;svg+=`<ellipse cx="280" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shade?palette[Math.min(6,i+1)]+'88':'none'}" stroke="${show?'var(--blue)':'transparent'}" stroke-width="2"/>`;if(labels)svg+=`<text class="svg-text" x="${280+rx-15}" y="${cy}">${c.v} m</text>`;}svg+='</g>';$('#terrain-svg').innerHTML=svg;};['terrain-ex','terrain-contours','terrain-shade','terrain-labels'].forEach(id=>$(`#${id}`).addEventListener('input',draw));draw();}

  let sourceItems=[],sourceIndex=0;
  function initSourceViewer(lesson){sourceItems=lesson.figures.length?lesson.figures:lesson.source_pages.map(page=>{const printed=Number(String(page.printed).match(/\d+/)?.[0]);return{number:`§ ${lesson.source_section}`,page:printed,caption:`Pagina de început a secțiunii ${lesson.source_section}`};});document.addEventListener('click',event=>{const button=event.target.closest('[data-source-index]');if(button)openSource(+button.dataset.sourceIndex);const close=event.target.closest('[data-close-dialog]');if(close)close.closest('dialog').close();});$('#source-prev')?.addEventListener('click',()=>openSource(Math.max(0,sourceIndex-1)));$('#source-next')?.addEventListener('click',()=>openSource(Math.min(sourceItems.length-1,sourceIndex+1)));$('#source-dialog')?.addEventListener('click',event=>{if(event.target===$('#source-dialog'))$('#source-dialog').close();});}
  function openSource(index){const item=sourceItems[index];if(!item)return;sourceIndex=index;showSource(item,index,sourceItems.length);}
  function openAdHocSource(item){showSource({number:item.figure,section:item.section,page:item.page,caption:item.note},0,1);}
  function showSource(item,index,total) {
    const dialog=$('#source-dialog'),section=item.section||currentLesson?.source_section;
    $('#source-title').textContent=`${item.number} · ${item.caption}`;
    $('#source-meta').innerHTML=`<span>Secțiunea ${esc(section)}</span><span>Pagina tipărită: ${esc(item.page)}</span>${Number.isFinite(Number(item.page))?`<span>Pagina PDF: ${Number(item.page)+2}</span>`:''}`;
    $('#source-caption').textContent='Năstase, A. & Cernea, D. (1974). Cartografie generală – manual practic. Universitatea din București. Referință istorică; scanul se consultă la sursă și nu este redistribuit aici.';
    $('#source-position').textContent=`${index+1} / ${total}`;$('#source-prev').disabled=index===0;$('#source-next').disabled=index===total-1;if(!dialog.open)dialog.showModal();
  }

  function initFilters(lesson){const themes=['coordonate','geometrie','harta','scară','proiectii','simbolizare','reprezentare','relief'];$('#theme-filters').innerHTML=themes.map(theme=>`<label><input type="checkbox" data-filter="theme" value="${theme}" checked> ${theme[0].toUpperCase()+theme.slice(1)}</label>`).join('');const apply=()=>{const selected={};$$('[data-filter]').forEach(input=>(selected[input.dataset.filter]??=new Set(),input.checked&&selected[input.dataset.filter].add(input.value)));let visible=0;$$('[data-filterable]').forEach(card=>{const checks=[['content-type','contentType'],['level','level'],['source','source'],['theme','theme']];const show=checks.every(([filter,key])=>{const values=(card.dataset[key]||'').split(',').map(v=>v.trim());return values.some(v=>selected[filter].has(v));});card.classList.toggle('hidden-by-filter',!show);if(show)visible++;});$('#filter-empty')?.classList.toggle('show',visible===0);};$$('[data-filter]').forEach(input=>input.addEventListener('change',apply));$('#reset-filters').addEventListener('click',()=>{$$('[data-filter]').forEach(input=>input.checked=true);apply();});apply();}

  function renderLesson() {
    const root=$('#lesson-root'), filters=$('.site-context');
    if (!currentLesson) {
      document.title='Lecție indisponibilă · Explorare geospațială';
      document.body.dataset.recovery='true';
      $('meta[name="description"]')?.setAttribute('content','Identificatorul lecției lipsește sau nu este recunoscut. Revino la cuprins ori caută o temă.');
      filters?.setAttribute('hidden','');
      root.innerHTML='<section class="lesson-error" role="alert"><h1>Lecția nu a fost găsită</h1><p>Identificatorul lipsește sau nu este recunoscut. Verifică adresa ori alege o temă din cuprins.</p><p><a href="index.html#teme">Cuprinsul platformei</a> · <a href="index.html">Pagina principală</a> · <a href="resources.html">Resurse</a></p><p>Poți folosi și căutarea din antet.</p></section>';return;
    }
    document.title=`${currentLesson.editorial_number ? currentLesson.editorial_number + ' ' : ''}${currentLesson.title} · Explorare geospațială`;
    const summary=window.CARTO_SEARCH_INDEX?.find(item=>item.id===currentLesson.id)?.description || `${currentLesson.title}. ${currentLesson.source_section ? 'Interpretare didactică a secțiunii '+currentLesson.source_section+' din Năstase & Cernea (1974).' : 'Explicații și aplicații GIS contemporane.'}`;
    $('meta[name="description"]')?.setAttribute('content',summary);
    let canonical=$('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}
    canonical.href=new URL(currentLesson.href,'https://mariusbudileanu.github.io/explorare-geospatiala/').href;
    if(currentLesson.id==='about'){document.body.dataset.pageId='about';filters?.setAttribute('hidden','');renderAbout(currentLesson);return;}
    filters?.removeAttribute('hidden');
    if(currentLesson.id==='rectangular-coordinates')window.CRS_LESSON.render(currentLesson,{lessonIntro,lessonTail});else if(currentLesson.id==='sphere')renderSphere(currentLesson);else if(currentLesson.id==='cylinder')renderSolid(currentLesson,'cylinder');else if(currentLesson.id==='cone')renderSolid(currentLesson,'cone');else if(currentLesson.id==='ellipse')renderEllipse(currentLesson);else if(currentLesson.theme==='proiectii')renderProjection(currentLesson);else if(currentLesson.theme==='reprezentare'||currentLesson.theme==='simbolizare')renderMethod(currentLesson);else if(currentLesson.id==='relief-models')renderRelief(currentLesson);else renderGeneric(currentLesson);
    initSourceViewer(currentLesson);initFilters(currentLesson);window.CARTO_QGIS?.attach(currentLesson,root);
  }

  function dataRegistryMarkup() {
    const records=window.CARTO_DATA_REGISTRY?.datasets||[];
    const link=(url,label)=>url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`:'De confirmat';
    return `<section id="registrul-datelor" class="lesson-section"><h2>Registrul public al datelor</h2><p><strong>Pachet educațional/download:</strong> dataseturile complete T01–T06 nu sunt distribuite. <strong>Subset tehnic:</strong> aplicațiile interactive servesc fișiere mici necesare analizei, descrise separat mai jos. Licențele surselor rămân aplicabile.</p><div class="about-grid">${records.map(e=>`<article class="about-principle dataset-record" id="data-${esc(e.id)}"><h3>${esc(e.name)}</h3><dl><dt>Furnizor</dt><dd>${esc(e.provider)}</dd><dt>Sursă și acces</dt><dd>${link(e.official_source,'Sursa oficială')} · ${link(e.access_url,'Acces / download la furnizor')}</dd><dt>Ediție / perioadă</dt><dd>${esc(e.edition||'Ediție de confirmat')} · ${esc(e.temporal_coverage||'Perioadă nespecificată')}</dd><dt>Format și CRS originale</dt><dd>${esc(e.original_format)} · ${esc(e.original_crs)}</dd><dt>Acoperire / rezoluție</dt><dd>${esc(e.spatial_coverage)} · ${esc(e.resolution_or_scale||'Rezoluție/scară nespecificată')}</dd><dt>Licență</dt><dd>${esc(e.license_name)} · ${link(e.license_url,'Licență / termeni')}${e.license_document_url?' · '+link(e.license_document_url,'Documentul licenței'):''}</dd><dt>Atribuire</dt><dd>${esc(e.attribution||(e.attribution_required===false?'Metadatele sursei nu impun un text exact; citează furnizorul și ediția.':'Textul exact al atribuirii rămâne de verificat.'))}</dd>${e.display_credit?`<dt>Credit de afișare</dt><dd>${esc(e.display_credit)}</dd>`:''}<dt>Operații în proiect</dt><dd>${esc(e.modifications)}</dd><dt>Utilizare</dt><dd>${esc(e.platform_use)}${[...new Set(e.platform_use.match(/T0[1-6]/g)||[])].map(id=>` · <a href="tutorials/${id.toLowerCase()}.html#date-pentru-exercitiu">${id} — datele atelierului</a>`).join('')}</dd><dt>Distribuție</dt><dd>Niciun pachet educațional. ${e.interactive_subsets.length?e.interactive_subsets.map(x=>`${esc(x.name)}: ${esc(x.format)}, ${esc(x.crs)}, ${x.bytes} bytes`).join('; '):'Niciun subset tehnic servit.'}</dd></dl>${e.notes.map(n=>`<p class="small">${esc(n)}</p>`).join('')}${e.documentation_url?`<p>${link(e.documentation_url,'Documentația sursei')}</p>`:''}${e.access_requirements?`<p><strong>Condiții de acces:</strong> ${esc(e.access_requirements)}</p>`:''}${e.access_documentation_url?`<p>${link(e.access_documentation_url,'Instrucțiuni oficiale de acces')}</p>`:''}${e.download_documentation_url?`<p>${link(e.download_documentation_url,'Descărcarea ediției documentate')}</p>`:''}</article>`).join('')}</div></section>
    <section id="licente" class="lesson-section"><h2>Licențe</h2><p>Cod propriu: <a href="LICENSE">MIT</a>. Explicații, exerciții și reconstrucții originale: <a href="https://creativecommons.org/licenses/by/4.0/">Creative Commons Attribution 4.0 International (CC BY 4.0)</a>. Datele, interfețele, imaginile și bibliotecile terțe își păstrează licențele; această schemă nu le relicențiază.</p></section>
    <section id="atribuiri" class="lesson-section"><h2>Surse și atribuiri</h2><p>Referințele istorice trimit la <a href="https://biblioteca-digitala.ro/?pub=10971-cartografie-generala">Năstase &amp; Cernea (1974), Biblioteca Digitală</a>; scanurile nu sunt redistribuite. Capturile QGIS ilustrează o interfață și date terțe; licența conținutului original nu acoperă aceste componente.</p><p>Biblioteci: Proj4js 2.22.0 (MIT), Leaflet 1.9.4 (BSD-2-Clause), Turf 7.4.0 (MIT), GeoTIFF.js 2.1.3 (MIT și notificările dependențelor). <a href="https://github.com/mariusbudileanu/explorare-geospatiala/blob/main/THIRD_PARTY_LICENSES.md">Notificările complete din repository</a> · <a href="https://github.com/mariusbudileanu/explorare-geospatiala/blob/main/ATTRIBUTION.md">Bibliografia completă</a>.</p></section>
    <section id="cum-citezi" class="lesson-section"><h2>Cum citezi această resursă</h2><p>Budileanu, M. (2026). <em>Explorare geospațială</em>. Universitatea din București, Facultatea de Geografie. <a href="https://mariusbudileanu.github.io/explorare-geospatiala/">Platforma online</a>.</p><p><a href="about.html#cum-citezi">Citare și statut</a> · <a href="https://github.com/mariusbudileanu/explorare-geospatiala">Repository</a> · <a href="https://github.com/mariusbudileanu/explorare-geospatiala/issues">Raportează o problemă</a></p></section>`;
  }

  function renderResources() {
    const crs = window.CRS_REGISTRY?.crs || [];
    const qgis = window.CARTO_QGIS_LINKS?.links || [];
    const historical = [
      {category:'Manual',title:'Năstase & Cernea, 1974 · Cartografie generală – manual practic',description:'Publicația digitalizată și disponibilă online.',url:'https://biblioteca-digitala.ro/?pub=10971-cartografie-generala'},
      {category:'Manual',title:'Biblioteca Digitală · Despre proiect',description:'Digitizare, conservare, acces și diseminare online.',url:'https://biblioteca-digitala.ro/despre.html'}
    ];
    const qgisItems = [
      {category:'QGIS',title:'QGIS Training Manual 3.44',description:'Lecții practice oficiale.',url:'https://docs.qgis.org/3.44/en/docs/training_manual/index.html'},
      {category:'QGIS',title:'QGIS User Manual 3.44',description:'Documentație de referință oficială.',url:'https://docs.qgis.org/3.44/en/docs/user_manual/index.html'},
      ...qgis.map(link => ({category:['classification','symbology','diagrams','arrow-symbols','points-in-polygons','contours'].includes(link.id)?'Reprezentare':'QGIS',title:link.title,description:link.concept,url:link.url}))
    ];
    const crsItems = crs.map(item=>({category:'CRS',title:`${item.id} — ${item.short_name}`,description:item.name,url:item.source_url}));
    const projections = [
      {category:'Proiecții',title:'QGIS · Reprojecting and Transforming Data',description:'CRS-ul proiectului, transformare la afișare și export.',url:'https://docs.qgis.org/3.44/en/docs/training_manual/vector_analysis/reproject_transform.html'},
      {category:'Proiecții',title:'PROJ · Coordinate operations',description:'Principiile operațiilor și transformărilor de coordonate.',url:'https://proj.org/en/stable/operations/index.html'},
      {category:'Proiecții',title:'PROJ · Equal Earth',description:'Definiția și proprietatea echivalentă a proiecției.',url:'https://proj.org/en/stable/operations/projections/eqearth.html'},
      {category:'Proiecții',title:'ONU · A/RES/80/307, 4 septembrie 2026',description:'Registrul oficial al rezoluțiilor Adunării Generale.',url:'https://public.e-delegate.un.org/reports/ga80_resolutions.html'}
    ];
    const localItems=[
      {category:'Ateliere și date',title:'Provocări GIS',description:'12 analize vectoriale și raster: școli, populație, servicii medicale, pante și pierdere forestieră în Rîșca.',url:'challenges.html',local:true},
      {category:'Ateliere și date',title:'Ateliere QGIS',description:'T01–T06: traseu practic progresiv și fișe de date pentru exerciții.',url:'tutorials/index.html',local:true},
      {category:'Ateliere și date',title:'Analiza datelor geospațiale',description:'Întrebare, selecție, operație și limitele interpretării.',url:'analysis.html',local:true},
      {category:'Ateliere și date',title:'Fluxul de lucru în QGIS',description:'De la fișierul sursă la produsul cartografic.',url:'workflow.html',local:true},
      {category:'Geodezie / CRS',title:'De la Pământ la hartă',description:'Geoid, elipsoid, datum și alegerea proiecției.',url:'projection-intro.html',local:true},
      {category:'Date vector',title:'Date geospațiale · vector și formate',description:'Entități, atribute și GeoPackage, GeoJSON, Shapefile.',url:'geospatial-data.html#vector',local:true},
      {category:'Date raster',title:'Date geospațiale · raster',description:'Pixeli, rezoluție, DEM și GeoTIFF.',url:'geospatial-data.html#raster',local:true},
      {category:'Processing QGIS',title:'Laboratoare de prelucrare',description:'14 operații vectoriale și 15 raster, cu surse oficiale.',url:'geospatial-data.html#vector-lab',local:true},
      {category:'Geodezie / CRS',title:'ANCPI · altitudini normale Marea Neagră 1975',description:'Referință românească pentru înălțimi normale.',url:'https://www.ocpiilfov.ro/ocpi_ilfov/Regulament600_Valabil01082023.pdf'},
      {category:'Date vector',title:'GDAL · GeoPackage vector',description:'Format și funcții de container.',url:'https://gdal.org/en/stable/drivers/vector/gpkg.html'},
      {category:'Date raster',title:'GDAL · Cloud Optimized GeoTIFF',description:'Organizare raster pentru citire parțială.',url:'https://gdal.org/en/stable/drivers/raster/cog.html'},
      {category:'Processing QGIS',title:'QGIS 3.44 · Vector overlay',description:'Clip, Intersection și Union.',url:'https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/qgis/vectoroverlay.html'}
    ];
    const items=[...localItems,...historical,...qgisItems,...crsItems,...projections];
    const card=item=>`<article class="resource-card" data-category="${esc(item.category)}"><span>${esc(item.category.toUpperCase())}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p><a href="${esc(item.url)}" ${item.local?'':'target="_blank" rel="noopener noreferrer"'} aria-label="Deschide ${esc(item.title)}${item.local?'':'; se deschide într-o filă nouă'}">Deschide resursa ${item.local?'→':'↗'}</a></article>`;
    $('#resources-root').innerHTML=`<div class="lesson-breadcrumb"><a href="index.html">Explorare geospațială</a> → Resurse</div><section class="lesson-hero"><span class="eyebrow">SURSE ȘI METADATE</span><h1>Resurse</h1><p class="lead">Manualul istoric, geodezie, date vector/raster și documentația QGIS.</p></section><section id="date-surse" class="resource-data-policy"><h2>Sursele și accesul la date</h2><p>Seturile complete pentru ateliere nu sunt găzduite de acest site. Provocările GIS folosesc subseturi educaționale mici; cardurile de mai jos indică proveniența și licențele confirmate, iar informațiile nesusținute rămân de clarificat. Registrul de mai jos indică sursele originale pentru acces.</p><ul><li><a href="tutorials/t01.html#date-pentru-exercitiu">T01</a> și <a href="tutorials/t02.html#date-pentru-exercitiu">T02</a>: școli și circumscripții școlare.</li><li><a href="tutorials/t03.html#date-pentru-exercitiu">T03</a>: servicii medicale; <a href="tutorials/t04.html#date-pentru-exercitiu">T04</a>: baze sportive.</li><li><a href="tutorials/t05.html#date-pentru-exercitiu">T05</a>: grid vectorial de populație și servicii publice.</li><li><a href="tutorials/t06.html#date-pentru-exercitiu">T06</a>: DEM, pierdere forestieră și straturi de context pentru Suceava.</li></ul><p class="small">Demonstrațiile teoretice folosesc date sintetice. Provocările GIS folosesc subseturile reale documentate separat; niciunele nu înlocuiesc seturile originale.</p></section><div class="resource-filters" role="group" aria-label="Filtrează resursele">${['Toate','Ateliere și date','Provocări GIS','Manual','QGIS','CRS','Geodezie / CRS','Proiecții','Date vector','Date raster','Processing QGIS','Reprezentare'].map((label,index)=>`<button type="button" data-resource-filter="${label}" aria-pressed="${index===0}">${label}</button>`).join('')}</div><div class="resource-grid">${items.map(card).join('')}</div>${dataRegistryMarkup()}${siteFooter()}`;
    $$('[data-resource-filter]').forEach(button=>button.addEventListener('click',()=>{const filter=button.dataset.resourceFilter;$$('[data-resource-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));$$('.resource-card').forEach(c=>c.hidden=filter!=='Toate'&&c.dataset.category!==filter);}));
    import('./challenges/challenge-state.js').then(({createDataStore})=>createDataStore().manifest()).then(registry=>{
      const entries=[...Object.entries(registry.sector1),...Object.entries(registry.risca).filter(([id])=>id!=='rasterMetadata')];
      const roles={boundary:'Contur UAT',schools:'Puncte școlare',censusGrid:'Grid vectorial de populație',primaryCare:'Medicină de familie',secondaryCare:'Cabinete și ambulatorii',hospitals:'Spitale',dem:'Model digital al elevației',forestLoss:'An de pierdere forestieră'};
      const activeFilter=$('[data-resource-filter][aria-pressed=true]')?.dataset.resourceFilter;
      for(const [id,entry] of entries){
        const article=document.createElement('article');article.className='resource-card';article.dataset.category='Provocări GIS';
        const license=typeof entry.license==='object'?entry.license.id.replace('CC-BY-','CC BY '):'Licență de confirmat';
        const label=entry.source?.label==='needs_confirmation'?'Sursă exactă de confirmat':entry.source?.label;
        const sourceURL=entry.source?.url;
        const vintage=entry.source_year?`An: ${entry.source_year}`:entry.source_version_attribute?`Atribut versiune: ${entry.source_version_attribute}`:'Versiune de confirmat';
        article.innerHTML=`<span>PROVOCĂRI GIS</span><h3>${esc(entry.display_name)}</h3><p>${esc(label)}.</p><div class="resource-source-meta"><span class="meta-chip">Rol: ${esc(roles[id])}</span><span class="meta-chip">${esc(vintage)}</span><span class="meta-chip">${esc(entry.crs)}</span><span class="meta-chip">${esc(license)}</span></div>${entry.source_version_attribute?'<p class="small">Atributul din subset nu confirmă versiunea produsului oficial.</p>':''}${sourceURL?.startsWith('https://')?`<a href="${esc(sourceURL)}" target="_blank" rel="noopener noreferrer">Sursa oficială ↗<span class="sr-only"> · ${esc(entry.display_name)}; se deschide într-o filă nouă</span></a>`:'<p class="small">Adresa produsului original necesită confirmare.</p>'}`;
        article.hidden=activeFilter!=='Toate'&&activeFilter!=='Provocări GIS';$('.resource-grid').append(article);
      }
    }).catch(()=>{
      const note=document.createElement('p');note.textContent='Registrul surselor pentru Provocări GIS nu a putut fi încărcat.';$('.resource-grid').append(note);
    });

  }

  initShell();
  if(pageType==='home')renderHome();else if(pageType==='resources')renderResources();else if(pageType==='lesson')renderLesson();
  document.querySelectorAll('.site-footer').forEach(footer=>{
    if(footer.querySelector('.license-summary'))return;
    const prefix=document.body.dataset.root||'';
    const notice=document.createElement('p');notice.className='license-summary';
    notice.innerHTML=`Cod: <a href="${prefix}LICENSE">MIT</a> · Conținut educațional original: <a href="${prefix}resources.html#licente">CC BY 4.0</a> · <a href="${prefix}resources.html#atribuiri">Materiale terțe: termenii surselor</a>`;
    footer.append(notice);
  });
  if(new URLSearchParams(location.search).get('debug')==='projections'){
    const warnings=projectionEngine.validate();
    if(warnings.length)warnings.forEach(message=>console.warn(`[Proiecții] ${message}`));
    else console.info('[Proiecții] Transformările și rețelele au valori finite în domeniile afișate.');
  }
})();
