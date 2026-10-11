'use strict';
window.CARTO_GLOSSARY = [
  {term_ro:'longitudine',term_en:'',historical_definition:'Coordonată unghiulară măsurată între meridianul origine și meridianul punctului.',modern_definition:'',source:'§ 2.1, p. 19',modern_sources:[]},
  {term_ro:'latitudine',term_en:'',historical_definition:'Coordonată unghiulară raportată la planul ecuatorului.',modern_definition:'',source:'§ 2.1, p. 21',modern_sources:[]},
  {term_ro:'colatitudine',term_en:'',historical_definition:'Complementul latitudinii.',modern_definition:'',source:'§ 2.1, p. 21',modern_sources:[]},
  {term_ro:'zonă sferică',term_en:'',historical_definition:'Porțiunea suprafeței sferei cuprinsă între două secțiuni plane paralele.',modern_definition:'',source:'§ 2.2, p. 22',modern_sources:[]},
  {term_ro:'calotă sferică',term_en:'',historical_definition:'Partea din suprafața sferei rezultată prin intersecția unui plan cu sfera.',modern_definition:'',source:'§ 2.2, p. 24',modern_sources:[]},
  {term_ro:'trapez sferic',term_en:'',historical_definition:'Porțiunea de sferă delimitată de două meridiane și două paralele.',modern_definition:'',source:'§ 2.2, p. 24',modern_sources:[]},
  {term_ro:'fus sferic',term_en:'',historical_definition:'Porțiunea de sferă cuprinsă între două meridiane.',modern_definition:'',source:'§ 2.2, p. 25',modern_sources:[]},
  {term_ro:'cerc mare',term_en:'',historical_definition:'Cercul rezultat prin intersecția sferei cu un plan care trece prin centrul ei.',modern_definition:'',source:'§ 2.2, p. 26',modern_sources:[]},
  {term_ro:'cerc mic',term_en:'',historical_definition:'Cercul rezultat prin secționarea sferei cu un plan care nu trece prin centru.',modern_definition:'',source:'§ 2.2, p. 27',modern_sources:[]},
  {term_ro:'hartă',term_en:'',historical_definition:'Reprezentare micșorată, matematic precisă și generalizată a suprafeței terestre, potrivit destinației sale.',modern_definition:'',source:'§ 3, p. 37',modern_sources:[]},
  {term_ro:'rețea geografică',term_en:'',historical_definition:'Ansamblul meridianelor și paralelelor considerate pe glob.',modern_definition:'',source:'§ 11, p. 84',modern_sources:[]},
  {term_ro:'rețea cartografică',term_en:'',historical_definition:'Rezultatul proiectării rețelei geografice pe planul de proiecție.',modern_definition:'',source:'§ 11, p. 84',modern_sources:[]},
  {term_ro:'proiecție cartografică',term_en:'',historical_definition:'Procedeul prin care suprafața curbă a Pământului este reprezentată pe suprafața plană a hărții.',modern_definition:'',source:'§ 11, p. 83',modern_sources:[]},
  {term_ro:'cartogramă',term_en:'',historical_definition:'Metodă statistică în care intensitatea unui fenomen este redată pe unități teritoriale prin trepte grafice.',modern_definition:'',source:'§ 22.2, p. 171',modern_sources:[]},
  {term_ro:'cartodiagramă',term_en:'',historical_definition:'Reprezentare cu diagrame plasate pe unități teritoriale.',modern_definition:'',source:'§ 22.3, pp. 172–174',modern_sources:[]},
  {term_ro:'areal',term_en:'',historical_definition:'Suprafață sau regiune în care este răspândit un fenomen.',modern_definition:'',source:'§ 23.2, p. 176',modern_sources:[]},
  {term_ro:'fond calitativ',term_en:'',historical_definition:'Metodă pentru fenomene cu răspândire continuă, delimitate și diferențiate calitativ.',modern_definition:'',source:'§ 23.3, pp. 178–181',modern_sources:[]},
  {term_ro:'linie de mișcare',term_en:'',historical_definition:'Linie sau săgeată care redă dinamica și direcția unui fenomen.',modern_definition:'',source:'§ 23.4, pp. 181–184',modern_sources:[]},
  {term_ro:'izolinie',term_en:'',historical_definition:'Linie care unește puncte cu aceeași valoare a unui fenomen măsurabil.',modern_definition:'',source:'§ 23.5, p. 184',modern_sources:[]},
  {term_ro:'metoda punctului',term_en:'',historical_definition:'Metodă care redă repartiția și cantitatea prin puncte cu o valoare stabilită.',modern_definition:'',source:'§ 23.6, pp. 186–187',modern_sources:[]}
];

// Keep the historical definitions used by lesson tooltips; add contemporary
// terminology to the same registry used to generate the public bilingual page.
(function(entries) {
  const translations=['longitude','latitude','colatitude','spherical zone','spherical cap','spherical trapezoid','spherical lune','great circle','small circle','map','geographic graticule','projected graticule','map projection','choropleth map','cartodiagram','area of occurrence','qualitative area map','flow line','isoline','dot density mapping'];
  entries.forEach((entry,i)=>entry.term_en=translations[i]);
  const rows=[
    ['strat','layer','Un set de date afișat și configurat într-un proiect GIS; stilul nu este sursa datelor.','geospatial-data'],
    ['entitate','feature','Obiect vectorial cu geometrie și atribute; un rând al tabelului poate descrie o entitate.','geospatial-data'],
    ['atribut','attribute','Informație asociată unei entități, organizată de obicei într-un câmp al tabelului.','geospatial-data'],
    ['sistem de referință de coordonate','coordinate reference system (CRS)','Definește cum se interpretează coordonatele prin sistem de coordonate, datum și, când este cazul, proiecție.','rectangular-coordinates'],
    ['datum','datum','Referință care leagă un sistem de coordonate de Pământ; datumul vertical și cel geodezic au roluri distincte.','earth-to-map'],
    ['elipsoid','ellipsoid','Suprafață matematică regulată folosită pentru modelarea formei Pământului.','earth-to-map'],
    ['reproiectare','reprojection','Transformarea coordonatelor într-un alt CRS; atribuirea unei etichete CRS nu este această transformare.','rectangular-coordinates'],
    ['raster','raster','Grilă georeferențiată de celule cu valori; sensul valorii depinde de produs și de bandă.','geospatial-data'],
    ['vector','vector','Model de date cu geometrii de tip punct, linie sau poligon și atribute asociate.','geospatial-data'],
    ['pixel','pixel / cell','Celulă a unei grile raster; dimensiunile sale sunt exprimate în unitățile CRS-ului.','geospatial-data'],
    ['rezoluție','spatial resolution','Nivelul de detaliu spațial; pentru o grilă se documentează pasul celulelor. Nu este acuratețea pozițională.','data-quality'],
    ['NoData','NoData','Marcaj sau mască pentru celule fără valoare validă; nu se interpretează automat ca zero.','data-quality'],
    ['NULL','NULL','Informație atributară absentă sau necunoscută; distinctă de valoarea numerică zero.','data-quality'],
    ['zonă tampon','Buffer','Zonă la o distanță specificată de o geometrie; metoda și unitățile trebuie verificate.','geospatial-data'],
    ['decupare','Clip','Restrânge geometria la o mască. Nu realocă automat populația ori alte atribute extensive.','T05'],
    ['intersecție','Intersection','Overlay care păstrează părțile comune ale geometriilor și combină atributele după reguli documentate.','geospatial-data'],
    ['asociere atributară','Join','Adaugă atribute printr-o cheie comună; verifică unicitatea și înregistrările fără corespondent.','geospatial-data'],
    ['asociere spațială','Spatial Join','Asociază informații pe baza unei relații spațiale; relația și agregarea fac parte din metodă.','geospatial-data'],
    ['topologie','topology','Relații între geometrii și reguli de consistență potrivite modelului de date.','topology'],
    ['umbrirea reliefului','Hillshade','Simulare a iluminării unei suprafețe de elevație; luminozitatea nu este altitudinea.','raster-styling'],
    ['clasificare','classification','Gruparea valorilor pentru reprezentare; metoda și pragurile influențează lectura hărții.','method-choropleth'],
    ['etichetă','label','Text legat de un obiect cartografic; plasarea, selecția și lizibilitatea se verifică la scara hărții.','styling-labeling'],
    ['simbologie','symbology','Reguli vizuale care transformă geometriile și atributele în simboluri.','styling-labeling'],
    ['extindere spațială','extent','Domeniul spațial al datelor sau al vederii; nu echivalează automat cu masca validă de analiză.','geospatial-data'],
    ['dreptunghi de încadrare','bounding box','Dreptunghi delimitat de coordonate minime și maxime; poate include zone fără date.','formats-interoperability'],
    ['GeoPackage','GeoPackage','Container standardizat bazat pe SQLite, folosit pentru conținut geospațial; poate include mai multe straturi.','formats-interoperability'],
    ['GeoJSON','GeoJSON','Format JSON pentru geometrii și entități geografice; RFC 7946 folosește coordonate geografice longitudine/latitudine.','formats-interoperability'],
    ['COG','Cloud Optimized GeoTIFF','Organizare GeoTIFF care favorizează accesul la părți relevante; performanța depinde și de server și client.','formats-interoperability'],
    ['metadate','metadata','Descrierea sursei, ediției, structurii, CRS-ului, termenilor de utilizare și limitelor datelor.','data-quality'],
    ['istoricul prelucrării','lineage / provenance','Documentarea originii și a pașilor care au produs datele; păstrează legătura dintre sursă și rezultat.','data-quality'],
    ['acuratețe','accuracy','Apropierea rezultatului de o referință acceptată; în GIS se verifică pozițional și tematic.','data-quality'],
    ['precizie','precision','Concordanța între măsurări repetate în condiții definite; repetabilitatea nu garantează acuratețea.','data-quality'],
    ['incertitudine','uncertainty','Limitele cunoașterii rezultatului, asociate datelor, procesării și ipotezelor; nu este numai numărul de zecimale.','data-quality'],
    ['completitudine','completeness','Prezența obiectelor și atributelor necesare în raport cu domeniul și scopul declarate.','data-quality'],
    ['consistență logică','logical consistency','Respectarea regulilor structurii, atributelor și relațiilor dintre obiecte.','topology'],
    ['actualitate','temporal currency','Adecvarea datei observației și a ediției pentru întrebarea analizată; data descărcării nu este data observației.','data-quality'],
    ['generalizare','generalization','Selecția și simplificarea informației după scară și scop, cu pierdere de detaliu documentată.','map-definition'],
    ['pantă','Slope','Înclinarea suprafeței derivată din variația elevației; gradele și procentele au conversii diferite.','geospatial-data'],
    ['reeșantionare','resampling','Estimarea valorilor pe o altă grilă; metoda trebuie să respecte valori continue sau coduri tematice.','T06'],
    ['scară','map scale','Raport între distanța pe hartă și cea din teren; nivelul de detaliu trebuie să fie potrivit utilizării.','map-exterior']
  ];
  rows.forEach(([term_ro,term_en,modern_definition,lesson_id])=>entries.push({term_ro,term_en,historical_definition:'',modern_definition,source:'Interpretare contemporană a platformei',modern_sources:[],lesson_id}));
  entries.sort((a,b)=>a.term_ro.localeCompare(b.term_ro,'ro',{sensitivity:'base'}));
})(window.CARTO_GLOSSARY);
