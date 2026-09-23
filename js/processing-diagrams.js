'use strict';

// Original teaching schematics. These illustrate data models and operation
// semantics; they do not execute QGIS algorithms on the course datasets.
window.CARTO_PROCESSING_DIAGRAMS = (() => {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const blue = 'var(--blue)', teal = 'var(--teal)', ink = 'var(--ink)';
  const rect = (x,y,w,h,color=blue,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" fill-opacity=".16" stroke="${color}" stroke-width="2" ${extra}/>`;
  const path = (d,color=blue,fill='none',extra='') => `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" ${extra}/>`;
  const point = (x,y,label='',color=blue) => `<circle cx="${x}" cy="${y}" r="6" fill="${color}" stroke="var(--surface)" stroke-width="2"/>${label?text(x+11,y-9,label):''}`;
  const text = (x,y,label,extra='') => `<text x="${x}" y="${y}" ${extra}>${esc(label)}</text>`;
  const points = [[42,122],[61,48],[119,30],[191,65],[203,128],[112,145],[108,88]];
  const dots = (labels=false) => points.map(([x,y],i)=>point(x,y,labels?String(i+1):'')).join('');
  const a = () => rect(30,30,110,90)+text(45,52,'A');
  const b = () => rect(100,75,105,80,teal)+text(174,142,'B');
  const boundaries = () => path('M140 75H100V120H140Z',ink,'none','stroke-dasharray="4 3"');
  const poly = 'M40 125L55 47 127 27 198 68 173 143 100 157Z';
  const grid = (cols=6,rows=5,x=28,y=25,size=30) => Array.from({length:cols*rows},(_,i)=>rect(x+i%cols*size,y+Math.floor(i/cols)*size,size,size,blue)).join('');
  const renderSVG = (body,label,model) => `<svg class="processing-svg" viewBox="0 0 240 185" role="img" aria-label="${esc(label)}" data-model="${model}">${body}</svg>`;
  const panel = (label,body,caption,model) => `<figure class="processing-panel"><h4>${esc(label)}</h4>${renderSVG(body,caption,model)}<figcaption>${esc(caption)}</figcaption></figure>`;
  const pairs = (input,output,inputCaption,outputCaption,inputModel='vector',outputModel='vector') =>
    `<div class="processing-figures">${panel('Intrare',input,inputCaption,inputModel)}${panel('Rezultat',output,outputCaption,outputModel)}</div>`;

  function vector(kind,distance) {
    switch(kind) {
      case 'clip': {
        const mask='M67 45L180 35 194 122 117 156 51 111Z';
        return pairs(grid()+path(mask,ink,'none','stroke-dasharray="6 4"'),`<defs><clipPath id="processing-clip-mask"><path d="${mask}"/></clipPath></defs><g clip-path="url(#processing-clip-mask)">${grid()}</g>`+path(mask,ink),
          'Grid vectorial extins; conturul întrerupt este masca.', 'Se păstrează doar porțiunile celulelor din interiorul măștii.');
      }
      case 'buffer': {
        const radius=22+distance/50;
        return pairs(point(120,92,'P'),`<circle cx="120" cy="92" r="${radius}" fill="${teal}" fill-opacity=".18" stroke="${teal}" stroke-width="2"/>`+path(`M120 92H${120+radius}`,ink,'none','stroke-dasharray="4 3"')+point(120,92,'P')+text(120,173,`${distance} m`,'text-anchor="middle"'),
          'Un punct: de exemplu, o școală.', 'Poligon la distanța aleasă în jurul punctului; raza este schematică.');
      }
      case 'intersection': return pairs(a()+b(),rect(100,75,40,45,teal)+text(120,65,'A ∩ B','text-anchor="middle"'),
        'Două straturi de poligoane, A și B.', 'Numai intersecția geometrică; atribute din ambele intrări.');
      case 'union': return pairs(a()+b(),path('M30 30H140V75H205V155H100V120H30Z',blue,'var(--blue-soft)')+boundaries()+text(46,55,'A')+text(107,104,'A+B')+text(177,143,'B'),
        'Două acoperiri poligonale suprapuse.', 'Toată acoperirea A ∪ B, împărțită în părți distincte la suprapunere.');
      case 'dissolve': return pairs(rect(28,40,58,105)+rect(86,40,58,105)+rect(144,40,68,105,teal)+text(48,99,'A')+text(105,99,'A')+text(171,99,'B'),
        rect(28,40,116,105)+rect(144,40,68,105,teal)+text(79,99,'A')+text(171,99,'B'),
        'Trei poligoane: două au categoria A, unul are B.', 'Limita dintre poligoanele A dispare; limita A/B rămâne.');
      case 'merge': return pairs(rect(18,28,91,128)+rect(132,28,91,128,teal)+point(48,65,'1')+point(75,123,'2')+point(159,56,'3',teal)+point(191,110,'4',teal),
        rect(18,28,205,128)+point(48,65,'1')+point(75,123,'2')+point(159,56,'3')+point(191,110,'4'),
        'Două straturi punctuale: entitățile 1–2 și 3–4.', 'Un strat cu toate cele patru puncte; geometriile nu se dizolvă.');
      case 'selection': {
        const input=rect(58,28,116,118,teal)+point(83,57,'1')+point(145,113,'2')+point(27,136,'3')+point(211,41,'4');
        const selected='<circle cx="83" cy="57" r="11" fill="none" stroke="var(--ink)" stroke-width="3"/><circle cx="145" cy="113" r="11" fill="none" stroke="var(--ink)" stroke-width="3"/>';
        return pairs(input,input+selected,'Patru puncte și un poligon de referință.', 'Punctele 1 și 2 sunt selectate (inel gros); toate geometriile rămân intacte.');
      }
      case 'join': {
        const geometry=rect(27,30,100,120)+rect(127,30,88,120,teal)+text(40,52,'Z1')+text(183,52,'Z2')+point(76,101,'P1')+point(171,114,'P2');
        return pairs(geometry,point(76,101,'P1')+point(171,114,'P2')+text(76,132,'Z1','text-anchor="middle"')+text(171,145,'Z2','text-anchor="middle"'),
          'Punctele P1/P2 și zonele Z1/Z2.', 'Aceleași puncte și coordonate, cu un câmp nou: P1 → Z1, P2 → Z2.');
      }
      case 'centroid': return pairs(path(poly,blue,'var(--blue-soft)'),point(118,92,'C'),
        'Un poligon.', 'Un punct centroid; poligonul nu este geometria rezultatului.');
      case 'multipart': {
        const parts=rect(30,45,64,74)+rect(145,92,62,57);
        return pairs(parts+path('M94 82L145 112',ink,'none','stroke-dasharray="4 4"')+text(120,30,'ID 7','text-anchor="middle"'),
          parts+text(49,35,'7a')+text(162,80,'7b'),
          'O entitate, ID 7, cu două componente separate.', 'Două entități distincte, fiecare cu atributele entității de origine.');
      }
      case 'hull': return pairs(dots(),path('M42 122L61 48 119 30 191 65 203 128 112 145Z',teal,'var(--blue-soft)')+dots(),
        'Un grup de puncte considerat împreună.', 'Cel mai mic poligon convex care cuprinde punctele.');
      case 'nearest': {
        const source=point(46,110,'P')+point(123,55,'H1',teal)+point(201,131,'H2',teal);
        return pairs(source,source+path('M51 106L117 59',ink,'none','stroke-dasharray="5 3"')+text(98,125,'P → H1'),
          'Un punct de origine P și două ținte H1/H2.', 'H1 este ținta cea mai apropiată în această schemă; se calculează distanța.');
      }
      case 'reproject': return pairs(grid(5,4,40,32,30)+path('M56 119L80 49 164 71 176 130Z',ink)+text(120,175,'CRS sursă','text-anchor="middle"'),
        `<g transform="translate(16 -4) skewX(-10)">${grid(5,4,40,32,30)}${path('M56 119L80 49 164 71 176 130Z',ink)}</g>`+text(120,175,'CRS țintă','text-anchor="middle"'),
        'O geometrie într-un cadru de coordonate.', 'Aceeași entitate geografică, cu alte coordonate; deformare ilustrativă.');
      case 'measure': return pairs(rect(24,25,95,85)+path('M146 40L181 81 154 139 212 150',teal),
        rect(24,25,95,85)+path('M146 40L181 81 154 139 212 150',teal)+text(71,70,'A','text-anchor="middle"')+text(181,104,'L')+text(120,177,'A → arie · L → lungime','text-anchor="middle"'),
        'O geometrie poligonală și una liniară.', 'Geometriile se păstrează; câmpuri noi stochează aria și lungimea.');
      default: throw new Error(`Unknown vector diagram: ${kind}`);
    }
  }
  const elevation=(x,y)=>100+280*Math.exp(-((x-.38)**2+(y-.54)**2)/.09)+160*Math.exp(-((x-.8)**2+(y-.24)**2)/.055);
  const demColor=v=>`hsl(${205-(v-100)*.25} 45% ${86-(v-100)*.13}%)`;
  const classColor=v=>['#dcebf5','#efdfb8','#78b7a8'][v-1];
  const classAt=(x,y)=>x<3?1:y<3?2:3;
  function raster({n=6,x=36,y=12,size=168,value=(c,r)=>Math.round(elevation((c+.5)/n,(r+.5)/n)),color=demColor,labels=false,missing=()=>false}={}) {
    const cell=size/n;
    return Array.from({length:n*n},(_,i)=>{
      const c=i%n,r=Math.floor(i/n),v=value(c,r),none=missing(c,r),xx=x+c*cell,yy=y+r*cell;
      return `<rect x="${xx}" y="${yy}" width="${cell}" height="${cell}" fill="${none?'var(--surface)':color(v,c,r)}" stroke="var(--surface)" stroke-width="1"/>`+
        (none?path(`M${xx+4} ${yy+4}l${cell-8} ${cell-8}M${xx+cell-4} ${yy+4}l${8-cell} ${cell-8}`,'var(--muted)'):
          labels?text(xx+cell/2,yy+cell/2+5,v,'text-anchor="middle" class="cell-label"'): '');
    }).join('');
  }
  const derivatives=(c,r,n=6)=>{const x=(c+.5)/n,y=(r+.5)/n,e=.015;return [(elevation(x+e,y)-elevation(x-e,y))/(2*e*400),(elevation(x,y+e)-elevation(x,y-e))/(2*e*400)];};
  function inMask(x,y){const vertices=[[61,40],[153,22],[195,90],[155,164],[60,125]];let inside=false;for(let i=0,j=vertices.length-1;i<vertices.length;j=i++){const a=vertices[i],b=vertices[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
  function resampled(c,r){const x=Math.max(0,Math.min(2,(c+.5)/2-.5)),y=Math.max(0,Math.min(2,(r+.5)/2-.5)),x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(2,x0+1),y1=Math.min(2,y0+1),fx=x-x0,fy=y-y0;const v=(a,b)=>Math.round(elevation((a+.5)/3,(b+.5)/3));return Math.round((1-fy)*((1-fx)*v(x0,y0)+fx*v(x1,y0))+fy*((1-fx)*v(x0,y1)+fx*v(x1,y1)));}
  const isHole=(c,r)=>(c===2||c===3)&&(r===2||r===3);
  function filledValue(c,r){if(!isHole(c,r))return Math.round(elevation((c+.5)/6,(r+.5)/6));let sum=0,weights=0;for(let y=0;y<6;y++)for(let x=0;x<6;x++){if(isHole(x,y))continue;const weight=1/((c-x)**2+(r-y)**2);sum+=weight*Math.round(elevation((x+.5)/6,(y+.5)/6));weights+=weight;}return Math.round(sum/weights);}
  function contours() {
    let result='';const n=9,size=168,offset=[36,12];
    for(const level of [150,200,250,300,350])for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){
      const corners=[[x,y],[x+1,y],[x+1,y+1],[x,y+1]].map(([c,r])=>[c,r,elevation(c/(n-1),r/(n-1))]);
      const hits=[];
      for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];if((a[2]<level)!==(b[2]<level)){const f=(level-a[2])/(b[2]-a[2]);hits.push([offset[0]+(a[0]+f*(b[0]-a[0]))*size/(n-1),offset[1]+(a[1]+f*(b[1]-a[1]))*size/(n-1)]);}}
      for(let i=0;i+1<hits.length;i+=2)result+=path(`M${hits[i][0]} ${hits[i][1]}L${hits[i+1][0]} ${hits[i+1][1]}`,teal);
    }
    return result;
  }
  function rasterDiagram(kind,azimuth) {
    const dem=raster(),continuous='Un DEM sintetic: fiecare celulă conține o altitudine.';
    const mask='M61 40L153 22 195 90 155 164 60 125Z';
    switch(kind){
      case 'raster-mask': return pairs(dem+path(mask,ink,'none','stroke-dasharray="6 3"'),raster({missing:(c,r)=>!inMask(36+(c+.5)*28,12+(r+.5)*28)}),
        'Rasterul complet și masca vectorială (contur întrerupt).', 'Se păstrează celulele cu centrul în mască; × indică NoData. Limita rezultatului urmează celulele.', 'raster + vector','raster');
      case 'raster-extent': return pairs(dem+rect(64,40,112,112,ink,'stroke-dasharray="6 3"'),raster({n:4,x:64,y:40,size:112,value:(c,r)=>Math.round(elevation((c+1.5)/6,(r+1.5)/6))}),
        'Fereastră dreptunghiulară peste raster.', 'Patru pe patru celule din întinderea aleasă; rezoluția se păstrează.', 'raster','raster');
      case 'raster-warp': {
        const inverse=(c,r)=>{const x=(c+.5)/8-.5,y=(r+.5)/8-.5,a=Math.PI/9;return [x*Math.cos(a)+y*Math.sin(a)+.5,-x*Math.sin(a)+y*Math.cos(a)+.5];};
        return pairs(dem+path('M22 172V20M22 172H220',ink),raster({n:8,value:(c,r)=>elevation(...inverse(c,r)),missing:(c,r)=>inverse(c,r).some(v=>v<0||v>1)}),
          'Grila în CRS-ul sursă.', 'Schemă de reproiectare: amprenta se schimbă, iar valorile sunt resamplate pe o grilă țintă. × = NoData.', 'raster','raster');
      }
      case 'raster-resample': return pairs(raster({n:3,labels:true}),raster({n:6,value:resampled}),
        'Aceeași întindere, 3 × 3 celule.', 'Grilă 6 × 6 cu interpolare biliniară a celor nouă valori; nu adaugă observații noi.', 'raster','raster');
      case 'raster-mosaic': return pairs(`<g transform="translate(-10 0)">${raster({n:3,x:27,y:48,size:84,value:(c,r)=>Math.round(elevation((c+.5)/6,(r+.5)/3))})}</g><g transform="translate(10 0)">${raster({n:3,x:111,y:48,size:84,value:(c,r)=>Math.round(elevation((c+3.5)/6,(r+.5)/3))})}</g>`+text(61,155,'Dala A','text-anchor="middle"')+text(164,155,'Dala B','text-anchor="middle"'),
        Array.from({length:18},(_,i)=>{const c=i%6,r=Math.floor(i/6);return `<rect x="${36+c*28}" y="${48+r*28}" width="28" height="28" fill="${demColor(elevation((c+.5)/6,(r+.5)/3))}" stroke="var(--surface)"/>`;}).join(''),
        'Două dale alăturate, cu aceeași rezoluție.', 'Un singur raster acoperă întinderea ambelor dale.', 'raster','raster');
      case 'raster-calculator': return pairs(raster({n:2,x:21,y:48,size:80,value:(c,r)=>[2,4,6,8][r*2+c],color:()=> '#dcebf5',labels:true})+raster({n:2,x:139,y:48,size:80,value:()=>10,color:()=> '#efdfb8',labels:true})+text(120,99,'+','text-anchor="middle"'),
        raster({n:2,x:60,y:30,size:120,value:(c,r)=>[12,14,16,18][r*2+c],color:v=>`hsl(170 40% ${90-v*2}%)`,labels:true}),
        'Raster A (2, 4, 6, 8) și raster B (10), pe grile aliniate.', 'A + B: fiecare celulă conține suma valorilor corespunzătoare.', 'raster','raster');
      case 'raster-reclass': return pairs(raster({n:4,labels:true}),raster({n:4,value:(c,r)=>{const v=elevation((c+.5)/4,(r+.5)/4);return v<200?1:v<300?2:3;},color:classColor,labels:true}),
        'Altitudini continue, în metri.', 'Coduri: 1 pentru <200 m; 2 pentru 200–<300 m; 3 pentru ≥300 m.', 'raster','raster');
      case 'raster-hillshade': return pairs(dem,raster({color:(v,c,r)=>{const [gx,gy]=derivatives(c,r),a=azimuth*Math.PI/180;const light=Math.max(0,(-gx*Math.sin(a)+gy*Math.cos(a)+1)/Math.sqrt(2*(gx*gx+gy*gy+1)));return `hsl(210 8% ${20+light*70}%)`;}}),
        continuous, `Umbrire sintetică, cu lumină din azimutul ${azimuth}° și elevație 45°. Valoarea este intensitate, nu altitudine.`, 'raster','raster');
      case 'raster-slope': return pairs(dem,raster({value:(c,r)=>{const [gx,gy]=derivatives(c,r);return Math.round(Math.atan(Math.hypot(gx,gy))*180/Math.PI);},color:v=>`hsl(30 65% ${92-v*.7}%)`,labels:true}),
        continuous, 'Pantă în grade: valori mici pentru teren mai plat, mari pentru teren mai abrupt.', 'raster','raster');
      case 'raster-aspect': return pairs(dem,raster({value:(c,r)=>{const [gx,gy]=derivatives(c,r);return Math.round((Math.atan2(-gx,gy)*180/Math.PI+360)%360);},color:v=>`hsl(${v} 45% 76%)`,labels:true}),
        continuous, 'Expoziția este direcția pantei descendente: N=0°, E=90°, S=180°, V=270°. Culorile codifică direcții.', 'raster','raster');
      case 'raster-contours': return pairs(dem,contours(),continuous,'Linii vectoriale de egală altitudine la interval de 50 m (150–350 m); celulele raster nu fac parte din rezultat.','raster','vector');
      case 'raster-zonal': return pairs(raster({n:4,labels:true})+rect(36,12,84,168,ink)+rect(120,12,84,168,ink),
        rect(36,12,84,168)+rect(120,12,84,168,teal)+text(78,70,'Z1','text-anchor="middle"')+text(162,70,'Z2','text-anchor="middle"')+text(78,105,`${zoneMean(0)} m`,'text-anchor="middle"')+text(162,105,`${zoneMean(2)} m`,'text-anchor="middle"'),
        'DEM și două zone vectoriale; celulele au valori diferite.', 'Aceleași zone, cu altitudinea medie în tabelul lor de atribute.', 'raster + vector','vector');
      case 'raster-rasterize': return pairs(path('M36 12H204V68H148V180H36Z',teal,'var(--blue-soft)')+text(90,90,'cod 7'),
        raster({n:6,value:()=>7,color:()=>teal,labels:true,missing:(c,r)=>c>=4&&r>=2}),
        'Poligon vectorial cu atributul de clasă 7.', 'Celulele acoperite primesc 7; cele marcate × sunt NoData.', 'vector','raster');
      case 'raster-polygonize': return pairs(raster({n:6,value:classAt,color:classColor,labels:true}),
        rect(36,12,84,168)+rect(120,12,84,84,'var(--sand-ink)')+rect(120,96,84,84,teal)+text(78,99,'1','text-anchor="middle"')+text(162,60,'2','text-anchor="middle"')+text(162,145,'3','text-anchor="middle"'),
        'Celule tematice, cu coduri 1, 2 și 3.', 'Trei poligoane vectoriale pentru regiunile de celule egale; dispar limitele dintre celulele aceleiași regiuni.', 'raster','vector');
      case 'raster-fill-nodata': return pairs(raster({n:6,missing:isHole}),raster({n:6,value:filledValue})+rect(92,68,56,56,ink,'stroke-dasharray="4 3"'),
        '× marchează o gaură de patru celule NoData.', 'Golul este completat prin estimare din vecini. Zona încadrată indică valori interpolate, nu măsurate.', 'raster','raster');
      default: throw new Error(`Unknown raster diagram: ${kind}`);
    }
  }
  function zoneMean(start){const values=[];for(let r=0;r<4;r++)for(let c=start;c<start+2;c++)values.push(Math.round(elevation((c+.5)/4,(r+.5)/4)));return Math.round(values.reduce((a,b)=>a+b,0)/values.length);}
  return { render: (op,state={}) => op.model==='vector' ? vector(op.diagram,state.distance??500) : rasterDiagram(op.id,state.azimuth??300) };
})();
