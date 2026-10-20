'use strict';
// Pedagogical metadata references the existing manifest; no duplicated routes or lessons.
window.CARTO_LEARNING = (() => {
  const levels = {
    beginner: {label:'Începător', description:'Pornești fără experiență GIS: identifici coordonate, scară, CRS, entități, pixeli și atribute; construiești prima hartă în QGIS.'},
    intermediate: {label:'Intermediar', description:'Cunoști interfața QGIS și modelele de date. Combini straturi, aplici filtre, clasificări și operații și interpretezi limitele rezultatului.'},
    advanced: {label:'Avansat', description:'Compari metode, verifici calitatea și ipotezele și justifici un flux de lucru. Nivelul nu presupune programare.'}
  };
  const items = {};
  const add = (id,level,reason,prerequisites,outcomes,next,quality=false) => items[id]={level,reason,prerequisites,outcomes,next,quality};
  add('coordinates','beginner','Localizarea prin două unghiuri; nu cere experiență GIS.',[],['Identifici latitudinea și longitudinea unui punct.','Convertești grade zecimale și DMS și verifici semnele.'],'rectangular-coordinates');
  add('rectangular-coordinates','beginner','Introduce axele, unitățile și identificarea unui CRS. Transformările sunt o extensie ghidată.',['coordinates'],['Distingi gradele de coordonatele metrice.','Verifici CRS-ul și zona de utilizare înaintea unei măsurători.'],'earth-to-map',true);
  add('sphere','beginner','Geometrie de bază cu modele ghidate; formulele se pot explora separat.',['coordinates'],['Identifici cercul mare, calota și zona sferică.','Compari suprafețe când modifici parametrii modelului.'],'cylinder');
  add('cylinder','beginner','Construiește intuitiv suprafața desfășurabilă.',['sphere'],['Identifici raza, înălțimea și generatoarea.','Compari aria laterală și volumul pentru dimensiuni diferite.'],'cone');
  add('cone','beginner','Leagă un corp geometric elementar de o suprafață de proiecție.',['cylinder'],['Identifici generatoarea conului.','Explici legătura conceptuală cu proiecțiile conice.'],'ellipse');
  add('ellipse','beginner','Construcție grafică ghidată prin axe și cercuri auxiliare.',['sphere'],['Identifici axele și focarele.','Reproduci pașii construcției cu cercuri auxiliare.'],'map-definition');
  add('map-definition','beginner','Distinge planul, harta, scara și selecția informației.',[],['Explici rolul scării și al generalizării.','Distingi întinderea reprezentată de dimensiunea foii.'],'map-classification');
  add('map-classification','beginner','Compară criterii descriptive ale hărților.',['map-definition'],['Clasifici o hartă după scară, conținut și scop.','Separi categoriile istorice de standardele actuale.'],'map-importance');
  add('map-importance','beginner','Leagă o întrebare de informația necesară pe hartă.',['map-definition'],['Alegi informația cartografică potrivită unei întrebări.','Explici ce decizie poate sprijini o hartă descriptivă.'],'map-exterior');
  add('map-exterior','beginner','Identifică titlul, scara și informațiile marginale.',['map-definition'],['Identifici elementele din exteriorul cadrului.','Verifici concordanța titlului, scării și sursei.'],'map-frame');
  add('map-frame','beginner','Identifică elementele cadrului într-o machetă.',['map-exterior'],['Distingi cadrul geografic de cel ornamental.','Verifici rolul grilei în compoziție.'],'map-interior');
  add('map-interior','beginner','Separă planimetria, altimetria și caroiajul.',['map-frame'],['Identifici informația din interiorul cadrului.','Explici cum se citesc curbele de nivel.'],'geospatial-data');
  add('earth-to-map','beginner','Introduce modelele Pământului și deformările prin comparație vizuală.',['coordinates'],['Compari deformarea formelor și a ariilor.','Alegi o proprietate de păstrat pentru scopul hărții.'],'projection-basics',true);
  add('projection-basics','beginner','Introduce trecerea de la rețeaua geografică la plan.',['earth-to-map'],['Identifici suprafața și punctul de perspectivă.','Explici de ce o proiecție nu este un CRS complet.'],'projection-classification');
  add('projection-classification','intermediate','Compară criterii independente de clasificare și deformare.',['projection-basics'],['Distingi proiecțiile conforme de cele echivalente.','Alegi familia în raport cu întinderea și scopul.'],'projection-orthographic');
  const projections = [
    ['projection-orthographic','proiecția ortografică și orizontul vizibil','projection-stereographic'],
    ['projection-stereographic','conformitatea stereografică și deformarea ariilor','projection-central'],
    ['projection-central','proiecția gnomonică și limita de reprezentare','projection-nonperspective'],
    ['projection-nonperspective','Postel și Lambert azimutală prin proprietățile păstrate','projection-cylindrical'],
    ['projection-cylindrical','Mercator și Lambert cilindrică prin compromisuri','projection-conic'],
    ['projection-conic','suprafața conică și schema istorică','projection-pseudocylindrical'],
    ['projection-pseudocylindrical','Mollweide și rețeaua pseudocilindrică','projection-circular'],
    ['projection-circular','construcțiile circulare și limitele schemelor','projection-derived'],
    ['projection-derived','o construcție derivată dintr-o proiecție de bază','method-diagrams']
  ];
  for(const [id,concept,next] of projections) add(id,'intermediate','Compară '+concept+'.',['projection-basics','projection-classification'],['Compari '+concept+'.','Verifici ce proprietate este păstrată și ce este deformat.'],next);
  add('method-diagrams','beginner','Compară cantități și structuri prin forme grafice.',['map-definition'],['Alegi o diagramă pentru mărime sau structură.','Verifici proporționalitatea simbolului cu valoarea.'],'method-signs');
  add('method-choropleth','intermediate','Alegerea indicatorului și a claselor afectează interpretarea.',['geospatial-data','method-diagrams'],['Alegi un indicator comparabil între unități.','Compari Quantile și Equal Interval și citești pragurile.'],'T02',true);
  add('method-cartodiagram','intermediate','Combină poziția, mărimea și structura statistică.',['method-diagrams','geospatial-data'],['Separi mărimea totalului de proporțiile structurii.','Compari o cartodiagramă cu o cartogramă.'],'styling-labeling');
  add('method-signs','beginner','Identifică simboluri și categorii nominale.',['map-definition'],['Alegi semne distincte pentru categorii.','Distingi mărimea simbolului de întinderea reală.'],'T01');
  add('method-areas','beginner','Reprezintă prezența și limitele unui fenomen.',['map-definition'],['Identifici un areal și natura limitei.','Distingi extinderea de intensitatea fenomenului.'],'method-qualitative');
  add('method-qualitative','beginner','Diferențiază categorii fără a sugera o ordine numerică.',['method-areas'],['Alegi culori distincte pentru categorii nominale.','Verifici concordanța claselor cu legenda.'],'T04');
  add('method-flows','intermediate','Interpretează împreună direcția și cantitatea unui flux.',['method-signs','geospatial-data'],['Distingi traseul schematic de cel măsurat.','Compari direcția și grosimea liniilor de flux.'],'styling-labeling');
  add('method-isolines','intermediate','Leagă suprafața continuă de interpolare și intervale.',['geospatial-data','map-interior'],['Interpretezi apropierea izoliniilor.','Verifici rolul intervalului și al suprafeței interpolate.'],'T06',true);
  add('method-dots','intermediate','Poziția punctelor cere o ipoteză de distribuție.',['method-signs','geospatial-data'],['Alegi valoarea unui punct.','Distingi distribuția observată de repartizarea sintetică.'],'T05',true);
  add('relief-models','intermediate','Leagă nivelurile de modelul 3D și de exagerarea verticală.',['map-interior','geospatial-data'],['Construiești conceptual un relief din niveluri.','Verifici efectul scării verticale asupra percepției.'],'raster-styling');
  add('geospatial-data','beginner','Introduce entități, pixeli, atribute și modele; operațiile sunt ramura intermediară.',[],['Alegi între vector și raster după fenomen.','Identifici geometria, atributele și semnificația unei valori lipsă.'],'gis-lab',true);
  add('analysis','advanced','Alege și justifică un lanț de operații și limitele concluziei.',['geospatial-data','rectangular-coordinates','workflow'],['Alegi ghidat operația potrivită pentru întrebarea și scena oferite.','Verifici rezultatul pe scenă și explici limitele interpretării.'],'final-project',true);
  add('workflow','intermediate','Organizează surse, procesare, control și export într-un flux reproductibil.',['T01','geospatial-data'],['Separi datele originale de produsele derivate.','Documentezi parametrii și verifici rezultatul exportat.'],'analysis',true);
  add('tutorials','beginner','Orientează alegerea unui atelier după competența urmărită.',[],['Alegi un atelier potrivit experienței tale.','Identifici datele și documentația necesare.'],'T01');
  add('T01','beginner','Prima hartă: import, atribute, categorii și export.',[],['Încarci datele oficiale și verifici atributele.','Creezi o hartă categorială și verifici exportul.'],'T02');
  add('T02','intermediate','Combină poligoane, puncte, raport cu numitor protejat și clasificare.',['T01','method-choropleth'],['Verifici un raport care tratează NULL și zero.','Compari clasificări și interpretezi indicatorul didactic.'],'T03',true);
  add('T03','intermediate','Filtrează servicii eterogene și construiește o reprezentare ierarhică.',['T01','geospatial-data'],['Filtrezi servicii medicale documentate.','Separi prezența serviciului de capacitate și accesibilitate.'],'T04',true);
  add('T04','intermediate','Compară două clasificări calitative și filtre; aria este o extensie metrică.',['T01','method-qualitative'],['Compari starea și proprietatea pe aceleași poligoane.','Verifici CRS-ul înaintea calculului opțional al ariei.'],'T05');
  add('T05','advanced','Integrează recensământ, servicii și CRS, cu problema realocării atributelor.',['T02','T03','rectangular-coordinates'],['Compari populația și serviciile fără a confunda proximitatea cu accesul.','Verifici atributul unei celule înainte și după Clip.'],'T06',true);
  add('T06','advanced','Integrează ediții raster, măști, resampling, hillshade și limite de cauzalitate.',['geospatial-data','rectangular-coordinates','raster-styling'],['Verifici grila, NoData și codurile anuale.','Compari Forest Loss peste hillshade și explici limita concluziei.'],'final-project',true);
  add('gis-lab','beginner','Hub de orientare: demonstrații de bază și ramuri de aplicare.',[],['Alegi laboratorul pentru conceptul urmărit.','Separi un model sintetic de o analiză pe date reale.'],'styling-labeling');
  add('styling-labeling','intermediate','Compară renderere, plasări și ierarhia vizuală; repararea este integrativă.',['geospatial-data','method-signs'],['Alegi rendererul după tipul atributului.','Verifici etichetele, legenda și ierarhia vizuală.'],'transparency-blending');
  add('transparency-blending','intermediate','Separă nivelurile opacității de compoziția culorilor.',['styling-labeling'],['Compari opacitatea și modurile de blending.','Verifici dacă legenda comunică ceea ce arată harta.'],'raster-styling');
  add('raster-styling','intermediate','Distinge valori continue și coduri tematice fără a altera datele.',['geospatial-data','transparency-blending'],['Alegi rendererul după semnificația pixelului.','Verifici min/max, hillshade și legenda anilor.'],'T06',true);
  add('topology','advanced','Alege reguli în funcție de model și validează reparații.',['geospatial-data','workflow'],['Distingi geometria invalidă de încălcarea unei reguli topologice.','Justifici regula, repari și validezi din nou.'],'data-quality',true);
  add('formats-interoperability','intermediate','Compară organizarea, compatibilitatea și accesul după scenariu.',['geospatial-data'],['Distingi formatul de serviciul de acces.','Alegi formatul care păstrează informația necesară.'],'workflow');
  add('challenges','intermediate','Aplică operații pe date reale; V1/R1/R3 sunt introduceri, V5/V6/R6 integrative.',['geospatial-data','rectangular-coordinates'],['Alegi metoda care răspunde întrebării.','Verifici sursa, masca, numitorul și ipotezele rezultatului.'],'analysis',true);
  add('learning-path','beginner','Punct de orientare, cu acces liber la toate nivelurile.',[],['Alegi o etapă și o ramură de practică.','Identifici ce cunoștințe sunt utile înainte de etapă.'],'coordinates');
  add('glossary','beginner','Referință terminologică pentru toate nivelurile.',[],['Identifici termenul românesc și comanda engleză.','Identifici termenul într-o lecție relevantă.'],'geospatial-data');
  add('data-quality','intermediate','Evaluează datele în raport cu scopul și ipotezele procesării.',['geospatial-data','rectangular-coordinates'],['Distingi acuratețea, precizia și rezoluția.','Documentezi proveniența și limitele unui rezultat.'],'final-project');
  add('final-project','advanced','Combină operații, verificări și o interpretare justificată.',['analysis','data-quality','workflow'],['Construiești un workflow din minimum două operații GIS.','Justifici harta și documentezi o limitare metodologică.'],'learning-path');
  add('projection-crs-lab','intermediate','Compară măsurări plane și elipsoidale și justifică alegerea CRS-ului.',['coordinates','rectangular-coordinates','earth-to-map'],['Compari distanțe și arii față de o referință elipsoidală.','Alegi un CRS după teritoriu, unități și scop.'],'T05',true);
  add('classification-lab','intermediate','Compară clasificarea și normalizarea pe aceeași distribuție sintetică.',['method-choropleth','geospatial-data'],['Compari pragurile și efectivele claselor.','Justifici indicatorul și paleta după întrebarea urmărită.'],'T02',true);
  for(const id of ['method-choropleth','T02','T05','styling-labeling','data-quality'])items[id].related=['classification-lab'];
  add('map-diagnostics','intermediate','Separă erorile, riscurile metodologice și compromisurile de design.',['geospatial-data','projection-crs-lab','classification-lab'],['Identifici o problemă prin comparație și verificare.','Justifici o intervenție și limita care rămâne.'],'final-project',true);
  for(const id of ['projection-crs-lab','method-choropleth','classification-lab','styling-labeling','data-quality','topology','raster-styling','transparency-blending','T02','T05','T06','final-project'])items[id].related=[...(items[id].related||[]),'map-diagnostics'];
  const stages = [
    // Existing stages retain their scope; the new lab is available through CRS navigation.
    {title:'Fundamente și hartă',level:'beginner',items:['coordinates','map-definition','map-exterior'],task:'Localizează un punct și explică scara, legenda și selecția informației.'},
    {title:'Date și reprezentare',level:'beginner',items:['geospatial-data','method-signs','method-qualitative'],task:'Alege modelul de date și o reprezentare potrivită atributului.'},
    {title:'CRS și proiecții',level:'beginner',items:['rectangular-coordinates','earth-to-map','projection-classification'],task:'Verifică unitățile și zona de utilizare; compară proprietățile păstrate.'},
    {title:'Operații și experimente GIS',level:'intermediate',items:['gis-lab','styling-labeling','raster-styling','topology','formats-interoperability'],task:'Experimentează, verifică feedbackul și revino la concept când o alegere este neclară.'},
    {title:'Analiză și calitate',level:'advanced',items:['workflow','data-quality','analysis','challenges'],task:'Formulează întrebarea și justifică metoda, ipotezele și limita concluziei.'},
    {title:'Aplică în QGIS',level:'intermediate',items:['T01','T02','T03','T04','T05','T06'],task:'Începe cu T01 sau alege atelierul care se potrivește întrebării și experienței tale.'},
    {title:'Proiect integrator',level:'advanced',items:['final-project'],task:'Combină conceptele într-un rezultat verificabil, cu surse și limitări explicite.'}
  ];
  const question=(id,prompt,options,answer,explanation,diagnostic=false)=>({id,prompt,options,answer,explanation,diagnostic});
  const checks = {
    'classification-lab':[
      question('class-neighbours','Două zone aflate în clase diferite sunt neapărat foarte diferite numeric?',['Da: culoarea măsoară direct diferența.','Nu: valori apropiate pot fi de o parte și de alta a unui prag.','Da: toate metodele au praguri identice.'],1,'Clasificarea împarte o distribuție continuă. Două valori aproape egale pot traversa un prag, iar valori îndepărtate pot intra în aceeași clasă. Verifică tabelul, limitele intervalului și metoda înainte de a interpreta culoarea.'),
      question('class-rate','Dacă două zone au valori absolute diferite, putem compara direct nivelul fenomenului fără să verificăm numitorul?',['Da: totalul este întotdeauna comparabil.','Nu: rata cere un numitor relevant, compatibil și nenul.','Înlocuim numitorul NULL cu zero.'],1,'Totalul răspunde la întrebarea câte cazuri, iar rata la ce proporție din populația eligibilă. Zonele pot avea populații diferite. Un numitor zero sau necunoscut nu definește o rată și nu justifică transformarea acesteia în zero.')],
    'projection-crs-lab':[
      question('crs-area','Două hărți arată același teritoriu. Sunt automat echivalente pentru măsurarea suprafeței?',['Da, dacă au aceeași culoare.','Nu: verific proiecția, unitățile, limita geometrică și metoda de măsurare.','Da, orice CRS conservă ariile.'],1,'Aceeași geometrie geografică poate avea arii plane diferite în proiecții diferite. Compară aceeași limită și o referință declarată. Afișarea sincronizată nu garantează conservarea ariei.'),
      question('crs-metric','Ai puncte în EPSG:4326 și vrei o distanță în metri în București. Ce alegi?',['Calculez euclidian în grade și redenumesc unitatea metri.','Atribui EPSG:3844 prin Set Layer CRS, fără transformare.','Măsor geodezic pe elipsoid sau reproiectez într-un CRS metric adecvat și verific deformarea.'],2,'EPSG:4326 are coordonate unghiulare. O măsurare elipsoidală poate întoarce metri fără a schimba coordonatele; calculul plan cere reproiectare reală. Set Layer CRS schimbă interpretarea numerelor, nu geometria.',true)],
    'map-definition':[question('scale','Vrei toate detaliile cadastrale pe o hartă națională. Ce alegi?',['Le păstrez pe toate, doar micșorez simbolurile.','Selectez și generalizez informația potrivit scopului.','Măresc numărul de culori.'],1,'Scara și scopul cer selecție și generalizare. Micșorarea simbolurilor nu face toate detaliile lizibile.')],
    'rectangular-coordinates':[question('metric','Ce este greșit aici? Un Buffer de 1000 este interpretat drept 1 km într-un strat EPSG:4326.',['Gradele sunt tratate drept metri.','EPSG:4326 nu poate localiza obiecte.','Trebuie schimbată doar eticheta CRS-ului.'],0,'EPSG:4326 are coordonate unghiulare. Pentru calcul plan metric, reproiectează într-un CRS proiectat adecvat zonei; Set Layer CRS nu transformă coordonatele.',true)],
    'earth-to-map':[question('projection','Compari suprafețe la scara lumii. Ce proprietate prioritizezi?',['Conformitatea garantează ariile.','Echivalența păstrează ariile; verific și celelalte deformări.','Orice hartă fără grilă este echivalentă.'],1,'O proiecție echivalentă păstrează ariile. Mercator este conformă și deformează puternic ariile la latitudini mari.')],
    'method-choropleth':[question('classes','Ce este greșit aici? Două hărți sunt comparate numai după culoare, deși una folosește Quantile, cealaltă Equal Interval.',['Culoarea nu garantează același interval numeric.','Metodele au întotdeauna praguri identice.','Quantile păstrează automat distanțe numerice egale.'],0,'Quantile urmărește clase cu efective apropiate; Equal Interval împarte intervalul numeric în segmente egale. Compară pragurile și distribuția, nu numai culoarea.',true)],
    'geospatial-data':[
      question('selection','Vrei un subset de obiecte întregi care intersectează limita. Ce alegi?',['Clip, pentru că păstrează întotdeauna obiectele întregi.','Selecție spațială și exportul selecției.','Schimbarea CRS-ului fără transformare.'],1,'Selecția păstrează geometriile întregi; Clip decupează geometria la mască. Alegerea depinde de întrebarea pusă.'),
      question('missing','Un câmp de serviciu medical este NULL. Ce poți spune?',['Serviciul este absent, deci îl înlocuiesc cu 0.','Informația este absentă sau necunoscută; verific sursa.','Serviciul este prezent.'],1,'NULL nu este un zero observat. Păstrează informația necunoscută separat de prezența și absența documentate.')],
    'analysis':[
      question('access','Cabinetul cel mai apropiat în linie dreaptă este și cel mai accesibil?',['Întotdeauna.','Numai dacă are simbolul cel mai mare.','Nu putem stabili: lipsesc rețeaua, timpul, capacitatea și alte condiții.'],2,'Distanța euclidiană, distanța pe rețea, timpul de deplasare și accesibilitatea efectivă sunt concepte diferite. Proximitatea sprijină o întrebare, nu o măsură completă a accesului.'),
      question('cause','Forest Loss se suprapune vizual peste versanți abrupți. Ce concluzie este justificată?',['Panta a cauzat pierderea.','Există o asociere spațială în datele și perioada analizate.','Datele demonstrează tăieri ilegale.'],1,'Overlay arată co-localizare, nu cauzalitate. Ediția, rezoluția, definiția loss-year și factorii alternativi trebuie verificați.')],
    'workflow':[question('raw','După procesare, cum păstrezi reproductibilitatea?',['Suprascriu sursa pentru a economisi spațiu.','Păstrez sursa și produsele separat și notez ediția și parametrii.','Păstrez numai imaginea finală.'],1,'Rezultatul vizual singur nu documentează un workflow. Sursa, versiunea, pașii și parametrii permit verificarea și reluarea lui.')],
    'T01':[question('categories','Tipurile de școli sunt categorii nominale. Ce alegi?',['Categorized, cu simboluri distincte și legendă.','O rampă care presupune o ordine de performanță.','Panta din DEM.'],0,'Categorized separă categoriile. O ordine cromatică de performanță ar sugera o relație pe care atributul nu o măsoară.')],
    'T02':[question('denominator','Număr săli de clasă este 0 sau NULL. Cum interpretezi raportul?',['Îl transform automat în zero elevi per sală.','Raportul nu este definit; expresia întoarce NULL și cazul rămâne distinct.','Aleg clasa cu valoarea cea mai mare.'],1,'Zero la numitor și informația lipsă nu produc un raport valid. Indicatorul didactic nu este capacitatea oficială a școlii.')],
    'T03':[question('service','Cauți cel mai apropiat serviciu pediatric. Care este primul pas?',['Aleg cel mai apropiat punct medical, indiferent de serviciu.','Filtrez serviciile pediatrice documentate și păstrez NULL separat.','Ordinez spitalele doar după numărul total de paturi.'],1,'Eligibilitatea precede apropierea. Prezența serviciului, capacitatea și accesul sunt informații distincte.')],
    'T04':[question('state','O bază sportivă dezafectată are proprietate privată. Ce demonstrează harta?',['Proprietatea a cauzat dezafectarea.','Două atribute sunt documentate pentru același obiect; cauza nu este demonstrată.','Starea cadastrală este complet verificată.'],1,'Clasificarea după stare sau proprietate descrie atributele. Nu stabilește cauzalitatea ori situația juridică completă.')],
    'T05':[question('clip-total','Ce este greșit aici? SUM(population) după Clip este prezentat drept total administrativ exact.',['Clip realocă automat populația fragmentelor.','Geometria s-a schimbat, dar atributele păstrează valorile celulelor originale.','SUM elimină toate celulele de frontieră.'],1,'Clip nu redistribuie atributul. Pentru 100 locuitori și 30% fragment, atributul rămâne 100; 30 este doar o estimare areal-weighted sub ipoteza distribuției uniforme. Revino la micro-demo-ul existent.',true)],
    'T06':[question('years','Rasterul loss-year trebuie reproiectat. Ce verifici?',['Interpolarea biliniară este potrivită tuturor rasterelor.','Nearest neighbour păstrează codurile întregi; verific și NoData și alinierea.','Hillshade poate înlocui codul anual.'],1,'Anii sunt coduri tematice, nu mărimi continue pentru interpolare. Codurile fracționare nu sunt ani noi; hillshade descrie iluminarea reliefului.')],
    'data-quality':[
      question('precision','Un DEM este resamplat de la 30 m la 5 m. Ce se îmbunătățește sigur?',['Acuratețea măsurătorii devine de șase ori mai mare.','Pasul grilei de ieșire; nu rezultă automat observații mai exacte.','Actualitatea sursei.'],1,'Resampling schimbă grila și valorile estimate. Nu adaugă observații independente și nu repară erorile poziționale ale sursei.'),
      question('diagnosis','Ce este greșit aici? Un atribut NULL este reparat cu Fix geometries.',['Unealta repară structura geometriei, nu completează informația atributară.','NULL dovedește o geometrie auto-intersectată.','Orice atribut lipsă se recuperează geometric.'],0,'Separă acuratețea/completitudinea atributelor de validitatea geometriei și de regulile topologice. Unealta trebuie aleasă pentru problema diagnosticată.',true)],
    'final-project':[question('complete','Ai o hartă frumoasă și două operații GIS. Ce mai este necesar?',['Numai un titlu mai mare.','Surse, versiuni, CRS, verificare de calitate, parametri, limitare și interpretare.','Un scor automat.'],1,'Un proiect verificabil justifică alegerile și documentează ce poate și ce nu poate susține rezultatul. Nu este necesară programarea.')]
  };
  return {levels,items,stages,checks};
})();

// Learning metadata derives laboratory identity from the content manifest.
window.CARTO_LEARNING.items['measurement-lab']={level:'intermediate',reason:'Compari metode metrice pe geometrii editabile.',prerequisites:['projection-crs-lab'],outcomes:['Editezi vârfuri și verifici lungimea, perimetrul și aria.','Separi geometria, CRS-ul și metoda de măsurare.'],next:'data-quality',quality:true};
window.CARTO_LEARNING.items['gis-calculator']={level:'intermediate',reason:'Calculezi expresii sigure și verifici valori lipsă și tipuri.',prerequisites:['geospatial-data'],outcomes:['Calculezi valori pixel cu pixel și feature cu feature.','Explici rezultatul și erorile din arborele expresiei.'],next:'data-quality',quality:true};
window.CARTO_LEARNING.items['scale-resolution']={level:'beginner',reason:'Compari scara, pasul grilei și rezoluția de tipar pe exemple controlate.',prerequisites:['map-classification'],outcomes:['Calculezi distanțe pe hartă și pe teren.','Compari agregarea raster cu rezoluția și acuratețea.'],next:'geospatial-data',quality:true};
for(const [id,prerequisites,outcomes,next] of [
  ['generalization-lab',['scale-resolution','topology'],['Compari geometrii simplificate și verifici topologia.','Alegi parametri de selecție, agregare și deplasare.'],'thematic-methods'],
  ['thematic-methods',['classification-lab'],['Compari șase metode de reprezentare și cerințele datelor.','Verifici mărimi proporționale, legende și normalizare.'],'raster-analysis'],
  ['raster-analysis',['raster-styling','gis-calculator'],['Calculezi măști, expresii și suprafețe pe grile native.','Verifici NoData, compatibilitatea și codificarea anilor.'],'data-quality']
])window.CARTO_LEARNING.items[id]={level:'intermediate',reason:'Alegi și verifici operații și interpretări pe exemple controlate.',prerequisites,outcomes,next,quality:true};
for(const lesson of window.CARTO_CONTENT.lessons)if(lesson.lab_id&&window.CARTO_LEARNING.items[lesson.id])window.CARTO_LEARNING.items[lesson.id].lab_id=lesson.lab_id;

for(const [id,prerequisites,outcomes,next] of [
  ['spatial-statistics',['thematic-methods','analysis'],['Calculezi densități și autocorelație cu ponderi explicite.','Compari scara și zonarea fără inferență nejustificată.'],'network-accessibility'],
  ['network-accessibility',['measurement-lab','analysis'],['Compari trasee după distanță și timp.','Verifici accesibilitatea și componentele neconectate.'],'data-quality']
])window.CARTO_LEARNING.items[id]={level:'advanced',reason:'Justifici suportul, costul și limitele unei analize sintetice.',prerequisites,outcomes,next,quality:true};
for(const lesson of window.CARTO_CONTENT.lessons)if(lesson.lab_id&&window.CARTO_LEARNING.items[lesson.id])window.CARTO_LEARNING.items[lesson.id].lab_id=lesson.lab_id;

window.CARTO_LEARNING.items['spatial-decision']={level:'advanced',reason:'Justifici normalizarea, preferințele și restricțiile pe alternative comparabile.',prerequisites:['spatial-statistics','network-accessibility'],outcomes:['Calculezi contribuții și ranguri cu ponderi explicite.','Compari sensibilitatea și excluderile fără a pretinde un optim universal.'],next:'final-project',quality:true};
for(const lesson of window.CARTO_CONTENT.lessons)if(lesson.lab_id&&window.CARTO_LEARNING.items[lesson.id])window.CARTO_LEARNING.items[lesson.id].lab_id=lesson.lab_id;

for(const [id,lab,prerequisites,outcomes]of [
 ['zarr-cloud-data','L12',['formats-interoperability'],['Compari chunks, volume utile și costuri modelate.','Separi ziua solicitată de agregatul încorporat și perioada observată.']],
 ['georeferencing-lab','L19',['projection-crs-lab'],['Editezi GCP-uri și interpretezi puncte independente.','Verifici inversabilitatea, RMSE și exportul PNG + PGW în Stereo 70.']]
])window.CARTO_LEARNING.items[id]={lab_id:lab,level:'intermediate',reason:'Verifici ipotezele și rezultatele unui experiment controlat.',prerequisites,outcomes,next:'data-quality',quality:true};
/* PEDAGOGICAL_MATRIX v4. Editorial segments are plans, never completion tokens. */
(function(model,content){
  const lookup=Object.fromEntries(content.lessons.flatMap(l=>[[l.id,l.id],...(l.editorial_number?[[l.editorial_number,l.id]]:[]),...(l.lab_id?[[l.lab_id,l.id]]:[])]));
  Object.assign(lookup,{D:'geospatial-data',WF:'workflow',TR:'transparency-blending',C:'challenges',PF:'final-project'});
  const ref=key=>{const [id,scope]=key.split('@');if(!lookup[id])throw Error('Unknown pedagogical reference: '+key);return lookup[id]+(scope?'@'+scope:'');};
  const matrix=[["1.1",[],["2.1"],"F"],["1.2",["1.1","3.2"],["3.3","1.6"],"F","intermediate"],["1.3",[],["1.1"],"P"],["1.4",[],["1.3"],"P"],["1.5",[],["1.4"],"P"],["1.6",[],[],"P"],["2.1",[],["1.1"],"F"],["2.2",["2.1"],[],"F"],["2.3",["2.1"],["2.2"],"E"],["2.4",["2.1"],["2.2"],"F"],["2.5",["2.1"],["2.4"],"F"],["2.6",["2.1"],["2.5","1.1"],"F"],["3.1",["1.1","2.1"],["1.3","1.6"],"F"],["3.2",["3.1"],["1.4","1.5"],"F"],["3.3",["3.2"],["1.3"],"F"],["3.4",["3.2","3.3"],["1.3"],"P"],["3.5",["3.2","3.3"],["1.3"],"P"],["3.6",["3.2","3.3"],["1.3"],"P"],["3.7",["3.2","3.3"],["1.3"],"P"],["3.10",["3.2","3.3"],["1.3"],"P"],["3.11",["3.2","3.3"],["1.3"],"P"],["3.12",["3.2","3.3"],["1.3"],"P"],["3.8",["3.2","3.3"],["1.4"],"P"],["3.9",["3.2","3.3"],["1.5"],"P"],["4.1",["D"],["2.1"],"F"],["4.2",["D","2.1"],["4.1"],"F"],["4.3",["D","4.1"],["4.2"],"E"],["4.4",["D","2.1"],[],"F"],["4.5",["2.1"],["D","4.4"],"E"],["4.6",["D","2.1"],["4.5"],"F"],["4.7",["D","4.4"],["4.1"],"E"],["4.8",["D","2.6"],[],"E"],["4.9",["D","4.4"],["4.2"],"E"],["4.10",["2.6"],["D"],"P"],["D",[],["2.1","1.1"],"F"],["L01",["2.1","D"],["2.2"],"A"],["L02",["L01","D"],["L09"],"A"],["L03",["1.2","3.1"],["3.3","L01"],"A"],["L04",["L03"],["L01"],"A"],["L05",["4.2","D"],["4.1"],"A"],["L06",["L05","4.4"],["4.1","4.7","4.8","4.9"],"A"],["L07",["D","4.4"],["4.2","4.6","L05"],"A"],["L08",["D","L03","L05"],["L07","L09","L11","L13"],"A"],["L09",["D","1.2","L14"],["L02","WF"],"P"],["L10",["D"],["1.2","WF@intro"],"E"],["L11",["D","L01"],["4.2","4.6","TR"],"A"],["L12",["D"],["L10","L01","L13"],"E"],["L13",["D"],["1.2","L03"],"F"],["L14",["D","1.2","L20"],["WF","T01@core","L03"],"A","intermediate"],["L15",["L11","L20","1.2"],["L13"],"A"],["L16",["L05","D"],["L06","L14"],"P"],["L17",["D","L04"],["L14"],"A","intermediate"],["L18",["L17","L13"],["L20"],"P"],["L19",["L03","D"],["L13","L04"],"E","intermediate"],["L20",["D"],["4.2"],"A"],["T01",["D","1.2@intro","2.4","4.4"],["4.6","WF@intro","L20"],"A","beginner"],["T02",["T01@core","4.2","D"],["L05","L20","WF"],"A"],["T03",["T01@core","D","4.4"],["L07","L20","WF"],"A"],["T04",["T01@core","D","4.6"],["L07","1.2"],"A"],["T05",["T01@core","1.2","L14","L05"],["T02","T03","WF","L13"],"A"],["T06",["T01@core","1.2","L11"],["L15","L13","WF"],"A"],["WF",["T01@core","D"],["1.2"],"F"],["TR",["D"],["L07","L11"],"E"],["C",[],["D"],"A",null],["PF",["L14","L13","WF"],["L08"],"A"]];
  const roles={F:'fundamental',A:'applied',E:'extension',P:'deepening'};
  for(const [key,required,recommended,role,level] of matrix){
    const id=ref(key),item=model.items[id];
    item.prerequisites=required.map(ref);item.recommendedPrerequisites=recommended.map(ref);item.role=roles[role];
    if(level!==undefined)item.level=level;
  }
  for(const l of content.lessons){
    const item=model.items[l.id]??=( {outcomes:[],reason:'',prerequisites:[],recommendedPrerequisites:[],role:null} );
    if(['reference','collection'].includes(l.kind))item.level=null;
    item.recommendedPrerequisites??=[];delete item.next;
    if(l.lab_id)item.lab_id=l.lab_id;
  }
  model.levels.beginner.color='#4D9074';model.levels.beginner.icon='book-open';
  model.levels.intermediate.color='#C48B32';model.levels.intermediate.icon='layers';
  model.levels.advanced.color='#B45B59';model.levels.advanced.icon='graduation-cap';
  model.items['rectangular-coordinates'].reason='Resursa integrală include catalogul CRS și transformări ghidate; introducerea X/Y se poate studia separat.';
  model.items.analysis.reason='Operații ghidate pe scene controlate; proiectarea autonomă este aprofundată în proiectul final.';
  model.items['network-accessibility'].reason='Compari distanța, timpul și conectivitatea unei rețele sintetice cu metode oferite.';
  model.levels.intermediate.description='Aplicații ghidate: compari metode, alegi parametri și verifici rezultate folosind conceptele de bază. Instalarea QGIS este necesară numai atelierelor.';
  model.segments={};
  for(const [key,value] of Object.entries({"1.2@intro":{"required":["1.1"],"recommended":["2.1"],"anchors":["concept-rect","grila"]},"WF@intro":{"required":["D"],"recommended":[],"anchors":["etape","proiect-date"]},"T01@core":{"required":["D","1.2@intro","2.4","4.4"],"recommended":["4.6","WF@intro"],"anchors":["section-8","section-9","section-10","section-11","section-24","section-18","section-19","section-20"]},"PF@medical":{"required":["L14","L13","WF","T03","L04"],"recommended":["L08"],"terminal":true},"PF@population":{"required":["L14","L13","WF","T05","L04"],"recommended":["L08"],"terminal":true},"PF@raster":{"required":["L14","L13","WF","T06","L15"],"recommended":["L08"],"terminal":true},"C@V1":{"required":["D"]},"C@V2":{"required":["D","1.2","L04","L14"]},"C@V3":{"required":["C@V1","C@V2","4.2"]},"C@V4":{"required":["D","L04","L14"]},"C@V5":{"required":["D","L14","L04"]},"C@V6":{"required":["C@V5","L20"]},"C@R1":{"required":["D","L01"]},"C@R2":{"required":["C@R1","1.2@intro"]},"C@R3":{"required":["D","L01"]},"C@R4":{"required":["C@R3","L20"]},"C@R5":{"required":["C@R3"]},"C@R6":{"required":["C@R1","C@R3","L15"]}})){
    const id=ref(key),resourceId=id.split('@')[0];
    const available=key==='1.2@intro'||key==='WF@intro'||key.startsWith('C@');
    model.segments[id]={resourceId,available,prerequisites:value.required.map(ref),recommendedPrerequisites:(value.recommended||[]).map(ref),...(available&&value.anchors?{anchors:value.anchors}:{}),terminal:!!value.terminal};
  }
  model.plan={
    stages:[["1.1","2.1","2.2","2.4","2.5","2.6"],["D","L01","1.2@intro"],["4.4","4.6","WF@intro"],["T01@core"],["3.1","3.2","1.2","L03","L04","WF"],["4.2","L05","L20","L14","L13"]].map((items,i)=>({
      title:['Orientare și hartă','Date și experimente în browser','Reprezentare și pregătire','Prima hartă în QGIS','CRS și consolidare','Analiză și calitate'][i],
      items:items.map(ref),
      task:['Localizezi un punct și explici scara, cadrul și legenda.','Distingi entități și pixeli; compari scara cu rezoluția.','Alegi simboluri după tipul atributului.','Exporți o hartă cu legendă, sursă și limită de interpretare.','Verifici unitățile și compari măsurători în CRS potrivite.','Verifici operații, expresii și calitatea rezultatului.'][i]
    })),
    endings:Object.fromEntries(Object.entries({"medical":["T03","PF@medical"],"population":["T02","T05","PF@population"],"raster":["L11","L15","T06","PF@raster"]}).map(([key,items])=>[key,items.map(ref)])),
    branches:Object.fromEntries(Object.entries({"vector":["L02","L09"],"representation":["4.1","4.3","L06","L07","TR","L08"],"statistics":["L16"],"networks":["L17","L18"],"formats":["L10","L12"],"georeferencing":["L19"],"geometry":["1.3","1.4","1.5","1.6"],"sport":["T04"],"T01extension":["T01"],"vectorChallenges":["C@V1","C@V2","C@V3","C@V4","C@V5","C@V6"],"rasterChallenges":["L11","L15","C@R1","C@R2","C@R3","C@R4","C@R5","C@R6"],"projection-4":["3.3","3.4"],"projection-5":["3.3","3.5"],"projection-6":["3.3","3.6"],"projection-7":["3.3","3.7"],"projection-8":["3.3","3.8"],"projection-9":["3.3","3.9"],"projection-10":["3.3","3.10"],"projection-11":["3.3","3.11"],"projection-12":["3.3","3.12"],"2.3":["2.3"],"4.5":["4.5"],"4.7":["4.7"],"4.8":["4.8"],"4.9":["4.9"],"4.10":["4.10"]}).map(([key,items])=>[key,items.map(ref)]))
  };
  model.segments['final-project@medical'].operations={anyOf:['vector-nearest','vector-buffer']};
  model.segments['final-project@population'].operations={allOf:['vector-buffer','vector-dissolve','vector-intersection']};
  model.segments['final-project@raster'].operations={whenSelected:['raster-slope']};
  model.editorialDependencies={
    'T01@core':'Simbolizare nominală, legendă și checkpoint proprii.',
    'final-project@medical':'Instrucțiuni pentru prima executare a operațiilor QGIS.',
    'final-project@population':'Instrucțiuni de geoprocesare și alocare a populației.',
    'final-project@raster':'Instrucțiuni pentru operațiile raster alese.'
  };
  // Editorial readiness does not automatically publish additional route stages.
  // Keep the audited Stage 4 prefix until the integration in batch 5.3.
  model.activeThrough='scale-resolution';
  let pending=false;
  model.stages=model.plan.stages.map(stage=>({...stage,items:stage.items.filter(id=>{
    if(model.segments[id]&&!model.segments[id].available)pending=true;
    const include=!pending;
    if(id===model.activeThrough)pending=true;
    return include;
  })})).filter(stage=>stage.items.length);
  model.activePath=model.stages.flatMap(stage=>stage.items);
  model.recommendedNext=id=>{const i=model.activePath.indexOf(id);return i<0?null:model.activePath[i+1]||null;};
  // Legacy readers may inspect next, but cannot maintain another chain.
  for(const [id,item] of Object.entries(model.items))Object.defineProperty(item,'next',{enumerable:true,get:()=>model.recommendedNext(id)});
})(window.CARTO_LEARNING,window.CARTO_CONTENT);
