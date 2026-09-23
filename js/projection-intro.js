'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const D = Math.PI / 180;
  const engine = window.CARTO_PROJECTIONS;
  const svg = (el, html) => { if (el) el.innerHTML = html; };
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pressed = (selector, chosen) => $$(selector).forEach(b => b.setAttribute('aria-pressed',String(b===chosen)));
  const path = points => 'M'+points.map(p=>`${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L');
  const coords = (kind, lon, lat) => engine.project(kind, lon, lat);
  const bounds = kind => kind==='mercator' ? [-Math.PI,Math.PI,-2.437,2.437] : kind==='lambert-cyl' ? [-Math.PI,Math.PI,-1,1] : [-2.72,2.72,-1.34,1.34];
  function screen(kind, point) {
    if (!point) return null;
    const [x0,x1,y0,y1]=bounds(kind), pad=25, w=650-2*pad, h=340-2*pad;
    const scale=Math.min(w/(x1-x0),h/(y1-y0));
    return [325+(point[0]-(x0+x1)/2)*scale,170+(point[1]-(y0+y1)/2)*scale];
  }
  function geoLine(kind, vertices) {
    const pts=vertices.map(([lon,lat])=>screen(kind,coords(kind,lon,lat)));
    return pts.every(Boolean) ? path(pts) : '';
  }
  function circle(lon,lat,r=8) {
    const p=lat*D,l=lon*D,a=r*D;
    return Array.from({length:73},(_,i)=>{
      const b=i*2*Math.PI/72;
      const phi=Math.asin(Math.sin(p)*Math.cos(a)+Math.cos(p)*Math.sin(a)*Math.cos(b));
      const lambda=l+Math.atan2(Math.sin(b)*Math.sin(a)*Math.cos(p),Math.cos(a)-Math.sin(p)*Math.sin(phi));
      return [lambda/D,phi/D];
    });
  }
  function area(pts) {let sum=0;for(let i=0;i<pts.length-1;i++)sum+=pts[i][0]*pts[i+1][1]-pts[i+1][0]*pts[i][1];return Math.abs(sum/2);}
  const centers=[['Groenlanda',-42,70],['Africa',20,0],['Europa',15,50],['America de Sud',-60,-20]];
  // Stay inside the longitude domain at both ends of the antimeridian seam.
  const parallel = lat => Array.from({length:181},(_,i)=>[-179.9+i*359.8/180,lat]);
  function mapMarkup(kind,{grid=true,equator=true,meridian=true,circles=true,labels=false,areaLabels=false}={}) {
    const elements=[];
    if(grid){
      for(let lat=-60;lat<=60;lat+=30){if(lat===0)continue;const d=geoLine(kind,parallel(lat));if(d)elements.push(`<path class="grid" d="${d}"/>`);}
      for(let lon=-150;lon<=150;lon+=30){if(lon===0)continue;const d=geoLine(kind,Array.from({length:65},(_,i)=>[lon,-80+i*2.5]));if(d)elements.push(`<path class="grid" d="${d}"/>`);}
    }
    if(equator)elements.push(`<path class="equator" d="${geoLine(kind,parallel(0))}"/>`);
    if(meridian)elements.push(`<path class="meridian" d="${geoLine(kind,Array.from({length:65},(_,i)=>[0,-80+i*2.5]))}"/>`);
    if(circles){
      const reference=area(circle(20,0).map(([lo,la])=>coords(kind,lo,la)));
      for(const [name,lon,lat] of centers){
        const raw=circle(lon,lat).map(([lo,la])=>coords(kind,lo,la));
        const pts=raw.map(pt=>screen(kind,pt));
        if(!pts.every(Boolean))continue;
        elements.push(`<path class="test-circle" d="${path(pts)} Z"/>`);
        if(labels){const c=screen(kind,coords(kind,lon,lat));elements.push(`<text x="${c[0]+6}" y="${c[1]-8}">${esc(name)}${areaLabels?` · ${(area(raw)/reference).toFixed(1)}×`:''}</text>`);}
      }
    }
    return elements.join('');
  }

  function drawEarth(){
    const states=Object.fromEntries($$('[data-earth]').map(i=>[i.dataset.earth,i.checked]));
    svg($('#earth-svg'),`<rect width="620" height="250" fill="var(--surface-alt)"/>${states.ellipsoid?'<path d="M20 167 Q310 155 600 167" fill="none" stroke="var(--blue)" stroke-width="3"/>':''}${states.geoid?'<path d="M20 176 Q88 163 152 180 T280 175 T415 173 T600 179" fill="none" stroke="var(--teal)" stroke-width="3"/>':''}${states.physical?'<path d="M20 160 L70 151 100 119 130 148 185 140 236 155 284 127 329 159 390 149 437 110 475 147 525 139 600 158" fill="none" stroke="var(--ink)" stroke-width="3"/>':''}<text x="25" y="222" fill="var(--muted)" font-size="12">Secțiune exagerată · fără scară verticală reală</text>`);
    const names={physical:'suprafața fizică neregulată',geoid:'geoidul gravitațional',ellipsoid:'elipsoidul matematic'};
    $('#earth-explain').textContent=Object.entries(states).filter(([,v])=>v).map(([k])=>names[k]).join(', ')||'Selectează o suprafață pentru comparație.';
  }
  $$('[data-earth]').forEach(i=>i.addEventListener('change',drawEarth));drawEarth();

  const peelNotes=['Suprafața curbată este continuă.','Tăieturile permit desprinderea unor părți; apar discontinuități.','Fâșiile se depărtează și lasă goluri între ele.','Pentru un dreptunghi continuu ar trebui să întindem sau să comprimăm fâșiile.'];
  function drawPeel(step){
    const globe='<circle cx="310" cy="126" r="87" fill="var(--blue-soft)" stroke="var(--blue)" stroke-width="3"/><ellipse cx="310" cy="126" rx="38" ry="87" fill="none" stroke="var(--teal)" stroke-width="2"/><path d="M223 126H397" stroke="var(--teal)" stroke-width="2"/>';
    const cut='<circle cx="310" cy="126" r="87" fill="var(--blue-soft)" stroke="var(--blue)" stroke-width="3"/><path d="M310 40V212 M223 126H397 M250 64L370 188" stroke="var(--teal)" stroke-width="3" stroke-dasharray="7 5"/>';
    const strips=Array.from({length:7},(_,i)=>`<path d="M${100+i*58} 76 Q${85+i*58} 128 ${100+i*58} 180 Q${122+i*58} 128 ${100+i*58} 76" fill="var(--blue-soft)" stroke="var(--blue)" stroke-width="2"/>`).join('');
    const flat=Array.from({length:7},(_,i)=>`<path d="M${80+i*67} 76 L${131+i*67} 76 L${131+i*67} 180 L${80+i*67} 180 Z" fill="var(--blue-soft)" stroke="var(--blue)" stroke-width="2"/>`).join('')+'<text x="185" y="213">întindere / comprimare necesară</text>';
    svg($('#peel-svg'),`<rect width="620" height="250" fill="var(--surface-alt)"/>${[globe,cut,strips,flat][step]}`);
    $('#peel-explain').textContent=peelNotes[step];
  }
  $$('[data-peel]').forEach(b=>b.addEventListener('click',()=>{pressed('[data-peel]',b);drawPeel(+b.dataset.peel)}));drawPeel(0);

  function drawDist(){const kind=$('#dist-projection').value;svg($('#dist-svg'),mapMarkup(kind,{grid:$('#dist-grid').checked,equator:$('#dist-equator').checked,meridian:$('#dist-meridian').checked,circles:$('#dist-circles').checked,labels:true}));$('#dist-explain').textContent=kind==='mercator'?'Pe Mercator, cercurile cu arie sferică egală se măresc spre latitudini înalte.':kind==='eqearth'?'Pe Equal Earth, cercurile cu aceeași arie sferică au arii proiectate egale; formele se schimbă.':'Proiecția cilindrică echivalentă păstrează ariile, dar deformează forma spre poli.';}
  ['#dist-grid','#dist-equator','#dist-meridian','#dist-circles','#dist-projection'].forEach(s=>$(s).addEventListener('change',drawDist));drawDist();

  const endpoints=[[-9.139,38.722],[-74.006,40.713]];
  function greatCircle(a,b){
    const xyz=([lon,lat])=>[Math.cos(lat*D)*Math.cos(lon*D),Math.cos(lat*D)*Math.sin(lon*D),Math.sin(lat*D)];
    const u=xyz(a),v=xyz(b),omega=Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0))));
    return Array.from({length:65},(_,i)=>{const t=i/64,p=u.map((x,k)=>(Math.sin((1-t)*omega)*x+Math.sin(t*omega)*v[k])/Math.sin(omega));return [Math.atan2(p[1],p[0])/D,Math.atan2(p[2],Math.hypot(p[0],p[1]))/D];});
  }
  const yM=lat=>-Math.log(Math.tan(Math.PI/4+lat*D/2));
  const rhumb=Array.from({length:65},(_,i)=>{const t=i/64,y=yM(endpoints[0][1])*(1-t)+yM(endpoints[1][1])*t;return [endpoints[0][0]*(1-t)+endpoints[1][0]*t,(2*Math.atan(Math.exp(-y))-Math.PI/2)/D];});
  function drawRoutes(choice){
    const m=kind=>'M'+kind.map(([lon,lat])=>{const [x,y]=coords('mercator',lon,lat);return `${(385+x*78).toFixed(1)},${(195+y*78).toFixed(1)}`}).join(' L');
    const world=Array.from({length:7},(_,i)=>`<path d="M115 ${65+i*40}H600" class="grid"/>`).join('');
    const a=coords('mercator',...endpoints[0]),b=coords('mercator',...endpoints[1]);
    svg($('#route-svg'),`<rect width="650" height="300" fill="var(--surface-alt)"/>${world}${choice!=='great'?`<path class="route-rhumb" d="${m(rhumb)}"/>`:''}${choice!=='rhumb'?`<path class="route-great" d="${m(greatCircle(...endpoints))}"/>`:''}<circle cx="${385+a[0]*78}" cy="${195+a[1]*78}" r="5" fill="var(--teal)"/><circle cx="${385+b[0]*78}" cy="${195+b[1]*78}" r="5" fill="var(--teal)"/><text x="365" y="239">Lisabona</text><text x="99" y="237">New York</text>`);
    $('#route-explain').textContent=choice==='both'?'Linia verde este loxodroma cu azimut constant; linia albastră întreruptă este ortodroma, cel mai scurt arc pe sfera didactică.':choice==='rhumb'?'Loxodroma rămâne dreaptă în Mercator; cursul față de meridiane este constant.':'Ortodroma este ruta sferică mai scurtă și, aici, se curbează pe hartă.';
  }
  $$('[data-route]').forEach(b=>b.addEventListener('click',()=>{pressed('[data-route]',b);drawRoutes(b.dataset.route)}));drawRoutes('both');

  function drawLatitude(lat){
    const l=Number(lat), factor=1/Math.cos(l*D)**2;
    const raw=(lon,phi)=>[lon*D,-Math.log(Math.tan(Math.PI/4+phi*D/2))];
    const circles=[0,l].map((value,i)=>{
      const center=raw(0,value), x=i?465:185;
      const pts=circle(0,value,3).map(([lon,phi])=>raw(lon,phi));
      return `<path class="test-circle" d="${path(pts.map(([px,py])=>[x+(px-center[0])*205,120+(py-center[1])*205]))} Z"/><text x="${x-12}" y="218">${value}°</text>`;
    }).join('');
    svg($('#latitude-svg'),`<rect width="650" height="240" fill="var(--surface-alt)"/>${circles}`);
    $('#latitude-explain').textContent=`La ${l}°, factorul local de arie Mercator este aproximativ ${factor.toFixed(1)}× față de ecuator. Cercul de pe sferă nu și-a schimbat suprafața.`;
  }
  $$('[data-lat]').forEach(b=>b.addEventListener('click',()=>{pressed('[data-lat]',b);drawLatitude(b.dataset.lat)}));drawLatitude(0);

  function drawCompare(){const settings={grid:$('#compare-grid-new').checked,equator:false,meridian:false,circles:$('#compare-circles-new').checked,labels:true,areaLabels:$('#compare-area-new').checked};svg($('#mercator-compare'),mapMarkup('mercator',settings));svg($('#equal-compare'),mapMarkup('eqearth',settings));}
  ['#compare-grid-new','#compare-circles-new','#compare-area-new'].forEach(s=>$(s).addEventListener('change',drawCompare));drawCompare();

  const purposes={nav:['Navigație și curs constant','O proiecție conformă de tip Mercator ajută la reprezentarea rectilinie a loxodromelor. Verifică domeniul, latitudinea și nevoia de măsurare.'],area:['Comparație de suprafețe','Alege o proiecție echivalentă, precum Equal Earth pentru o hartă globală. Nu va păstra și formele locale.'],europe:['Hartă statistică europeană','EPSG:3035, ETRS89 / LAEA Europe, este o opțiune echivalentă pentru comparații de arie în aria sa de utilizare.'],romania:['Analiză locală în România','Alege un CRS proiectat adecvat zonei și operației, de exemplu EPSG:3844 când datele și scopul îl justifică. Verifică aria de utilizare și transformările.'],web:['Hartă web operațională','EPSG:3857 este frecvent pentru pan/zoom și dale web. Nu îl trata automat ca CRS potrivit pentru calcule de arie sau distanță.']};
  function drawPurpose(){const [title,body]=purposes[$('#purpose-select').value];$('#purpose-result').innerHTML=`<strong>${esc(title)}</strong><p>${esc(body)}</p>`;}
  $('#purpose-select').addEventListener('change',drawPurpose);drawPurpose();
})();
