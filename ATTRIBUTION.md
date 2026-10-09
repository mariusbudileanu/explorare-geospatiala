# Atribuirea surselor și licențelor

## Surse și conținut

- **Manual istoric:** A. Năstase și D. Cernea, *Cartografie generală – manual practic*, Universitatea din București, 1974. Secțiunile, paginile și figurile folosite sunt identificate în [`data/source-audit.json`](data/source-audit.json). [Publicația digitalizată la Biblioteca Digitală](https://biblioteca-digitala.ro/?pub=10971-cartografie-generala). Cartea este disponibilă online; nu este descrisă drept open-source.
- **Digitizare și context:** [Biblioteca Digitală a Publicațiilor Culturale — Despre](https://biblioteca-digitala.ro/despre.html), administrată de Institutul Național al Patrimoniului. Platforma citează publicația și furnizorul accesului digital; scanurile nu sunt redistribuite.
- **Documentație GIS:** [QGIS Training Manual 3.44](https://docs.qgis.org/3.44/en/docs/training_manual/index.html) și [QGIS User Manual 3.44](https://docs.qgis.org/3.44/en/docs/user_manual/index.html). Legăturile specifice sunt în [`data/qgis-links.json`](data/qgis-links.json). Rezumatele sunt redactate pentru acest proiect, iar documentația QGIS rămâne la autorii săi.
- **CRS și operații:** [EPSG Geodetic Parameter Dataset](https://epsg.org/). Cele opt fișe oficiale și [operația 15995](https://epsg.org/transformation_15995/Pulkovo-1942-58-to-WGS-84-19.html) sunt referite în [`data/crs-registry.json`](data/crs-registry.json). Descrierile și parametrii EPSG nu sunt revendicați drept creație proprie.
- **Puncte demonstrative:** [GeoNames, cele mai mari orașe din România](https://www.geonames.org/RO/largest-cities-in-romania.html). Valorile rotunjite la trei zecimale sunt puncte reprezentative ale localităților, nu repere geodezice.
- **Motor de referință pentru verificare:** QGIS 3.40.11 cu pyproj 3.7.0 / PROJ 9.6.2. Valorile generate sunt în [`data/crs-validation.json`](data/crs-validation.json).
- **Geodezie și proiecții contemporane:** [PROJ · Mercator](https://proj.org/en/stable/operations/projections/merc.html), [PROJ · Equal Earth](https://proj.org/en/stable/operations/projections/eqearth.html), [NOAA · vertical datums](https://www.ngs.noaa.gov/datums/vertical/), [ANCPI · Marea Neagră 1975](https://www.ocpiilfov.ro/ocpi_ilfov/Regulament600_Valabil01082023.pdf) și [registrul ONU A/RES/80/307](https://public.e-delegate.un.org/reports/ga80_resolutions.html). Detaliile publice sunt în [`data/geodetic-sources.json`](data/geodetic-sources.json).
- **Formate și operații GIS:** [OGC GeoPackage](https://docs.ogc.org/is/12-128r17/12-128r17.html), [GDAL](https://gdal.org/en/stable/) și [QGIS Processing 3.44](https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/index.html). Fișele și URL-urile per operație sunt în [`data/geospatial-formats.json`](data/geospatial-formats.json) și [`data/processing-operations.json`](data/processing-operations.json); schemele didactice sunt originale.

## Date pentru Provocări GIS

Subseturile școlare și medicale pentru Sectorul 1 conțin date publice prelucrate în cadrul **Observatorului Urban Metropolitan București, ADIZMB**, sub **CC BY 4.0**, conform metodologiilor furnizate. Pentru școli (2022–2023), sursa unor date este [rețeaua școlară de pe data.gov.ro](https://data.gov.ro/dataset/reteaua-scolara-2022-2023). Datele de medicină de familie și spitale descriu anul 2024; cabinetele și ambulatoriile de specialitate, anul 2023.

Copiile tehnice au fost decupate la conturul zonei de studiu și reduse la atributele utile exercițiilor. [Registrul public al produselor](data/data-registry.json) separă furnizorul, licența sursei și operațiile noastre de [metadatele tehnice ale subseturilor](data/challenges/challenge-data.json). Dataseturile complete ale atelierelor nu sunt distribuite.

- **Limite administrative:** geo-spatial.org, cu proveniență ANCPI documentată pentru Sectorul 1. Produsul, ediția exactă și atribuirea/termenii subseturilor necesită verificare; politica generală nu este o licență de produs.
- **Grid de recensământ 2021:** INS / Eurostat, distribuit prin geo-spatial.org. Sursa și accesul sunt documentate în registru; licența exactă și textul de atribuire rămân de verificat.
- **DEM Rîșca:** Copernicus DEM GLO-30, licență specifică produsului, cu notificarea pentru date modificate păstrată integral în registru și în secțiunea de mai jos. Ediția exactă și datum-ul vertical rămân de confirmat.
- **Forest Loss Rîșca:** Hansen et al. (2013), GLAD / University of Maryland. CC BY 4.0 este documentată în metadatele furnizate; ediția exactă a subsetului rămâne de confirmat. Codurile 1–24 indică 2001–2024, iar 0 este NoData. Acces înregistrat: 20 septembrie 2026.

Cardurile de Resurse prezintă rolul, anul/versiunea și licența documentate. Numai o adresă originală consemnată în registrul surselor este oferită ca link; copiile didactice nu sunt prezentate drept surse oficiale.

## Licențe software

- Codul original al website-ului: [`LICENSE`](LICENSE) (MIT, Marius Budileanu, 2026).
- Conținutul educațional original: [`CONTENT_LICENSE.md`](CONTENT_LICENSE.md), CC BY 4.0. Acest termen nu se aplică textelor, figurilor, interfețelor sau datelor terțe citate ori vizibile în capturi.
- Proj4js 2.22.0: [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) și [notificarea completă](js/vendor/PROJ4_LICENSE.md).
- Provocări GIS: **Leaflet 1.9.4** (BSD 2-Clause), **Turf.js 7.4.0** (MIT) și **GeoTIFF.js 2.1.3** (MIT, cu termeni proprii pentru dependențe). Versiunile și notificările complete sunt în [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

Materialele externe își păstrează termenii originali. Licențele proiectului nu înlocuiesc acești termeni și nu constituie o permisiune nouă de redistribuire a scanurilor sau a datelor externe. Seturile GIS complete de curs nu sunt incluse în repository; subseturile challenge sunt documentate separat.

## Politica pentru sursa istorică și registrul datelor

Scanurile, crop-urile, fotografiile și imaginile de tabele/figuri din manualul Năstase & Cernea (1974) nu sunt redistribuite. Accesul online în Biblioteca Digitală nu constituie o licență explicită de republicare. Lecțiile păstrează secțiunea, pagina tipărită, pagina PDF și numărul figurii/tabelului, împreună cu interpretările și reconstrucțiile originale ale platformei.

Registrul public [data/data-registry.json](data/data-registry.json), prezentat și în [Resurse](https://mariusbudileanu.github.io/explorare-geospatiala/resources.html#registrul-datelor), distinge produsul sursă de subsetul tehnic. Seturile complete T01–T06 nu sunt distribuite.

### Unități învățământ preuniversitar și circumscripții școlare București (anul școlar 2022-2023)

Furnizor: ADIZMB. [Sursa oficială](https://www.adizmb.ro/observatory/unitati-invatamant-preuniversitar-si-circumscriptii-scolare-bucuresti-anul-scolar-2022-2023/). Licență: Creative Commons Attribution 4.0 International (CC BY 4.0); [termeni](https://creativecommons.org/licenses/by/4.0/).

Conține date prelucrate în cadrul Observatorului Urban Metropolitan București, ADIZMB, sursa unor date fiind data.gov.ro, date deschise sub Licența Creative Commons Attribution 4.0. (https://data.gov.ro/organization/men)

Modificări: Crop sector 1.
Date generale; pot fi incomplete sau neactualizate. Nu fundamentează singure decizii individuale.
Ediția 1 este declarată în registrul furnizat; nu identifică automat versiunea fișierului public curent.

### Infrastructură de sănătate mun. București și jud. Ilfov

Furnizor: ADIZMB. [Sursa oficială](https://www.adizmb.ro/observatory/infrastructura-de-sanatate-mun-bucuresti-si-jud-ilfov/). Licență: Creative Commons Attribution 4.0 International (CC BY 4.0); [termeni](https://creativecommons.org/licenses/by/4.0/).

Conține date prelucrate în cadrul Observatorului Urban Metropolitan București, ADIZMB, sursa unor date fiind Casa de Asigurări de Sănătate a Municipiului București (CSAMB), Casa Județeană de Asigurări de Sănătate Ilfov (CJAS Ilfov), Casa Asigurărilor de Sănătate a Apărării, Ordinii Publice, Siguranței Naționale și Autorității Judecătorești (Casa OPSNAJ), cât și Direcția de Sănătate Publică (DSP)

Modificări: Crop sector 1.
Date generale; pot fi incomplete sau neactualizate. Nu fundamentează singure decizii individuale.
Ediția 1 este declarată în registrul furnizat; nu identifică automat versiunea fișierului public curent.

### Rețeaua de baze sportive din mun. București

Furnizor: ADIZMB. [Sursa oficială](https://www.adizmb.ro/observatory/reteaua-de-baze-sportive-din-mun-bucuresti/). Licență: Creative Commons Attribution 4.0 International (CC BY 4.0); [termeni](https://creativecommons.org/licenses/by/4.0/).

Conține date prelucrate în cadrul Observatorului Urban Metropolitan București, ADIZMB, sursa unor date fiind data.gov.ro, date deschise sub Licența Creative Commons Attribution 4.0. (https://data.gov.ro/organization/men)

Modificări: N/A.
Date generale; pot fi incomplete sau neactualizate. Nu fundamentează singure decizii individuale.
Ediția 1 este declarată în registrul furnizat; nu identifică automat versiunea fișierului public curent.

### Limite administrative - UAT, România (poligon)

Furnizor: geo-spatial.org (distribuitor); ANCPI (limite administrative, conform provenienței documentate). [Sursa oficială](https://geo-spatial.org/descarcare/date/administrative-boundaries/). Licență: Licența produsului exact necesită confirmare; [termeni](https://geo-spatial.org/acces-liber/date-deschise).

Textul exact de atribuire a produsului rămâne de verificat; nu este inventat.

Modificări: Decupare pentru Sectorul 1 și Rîșca; export GeoJSON în EPSG:4326. Atributul 2017-09-27 al conturului Sectorului 1 nu confirmă ediția produsului actual.
Ediția 1 este declarată în registrul furnizat; nu identifică automat versiunea fișierului public curent.
Politica generală geo-spatial.org menționează exemple de licențe deschise; licența și textul de atribuire pentru acest produs exact rămân de verificat. Redistribuirea subseturilor este autorizată de proprietarul platformei.

### RECENSĂMÂNTUL POPULAȚIEI ȘI LOCUINȚELOR 2021

Furnizor: INS (indicatori); Eurostat (grid); geo-spatial.org (distribuitor). [Sursa oficială](https://services.geo-spatial.org/maps/#/viewer/568). Licență: Licența produsului exact necesită confirmare; [termeni](https://geo-spatial.org/acces-liber/date-deschise).

Textul exact de atribuire a produsului rămâne de verificat; nu este inventat.

Modificări: Decupare Sectorul 1; selectarea atributelor; export GeoJSON în EPSG:4326. Suportul populației după decupare necesită confirmare.
Ediția 1 este declarată în registrul furnizat; nu identifică automat versiunea fișierului public curent.
Politica generală geo-spatial.org menționează exemple de licențe deschise; licența și textul de atribuire pentru acest produs exact rămân de verificat. Redistribuirea subseturilor este autorizată de proprietarul platformei.

### Tree cover loss

Furnizor: University of Maryland / GLAD, Hansen et al.; platformă de acces indicată: Global Nature Watch. [Sursa oficială](https://glad.earthengine.app/view/global-forest-change). Licență: Creative Commons Attribution 4.0 International (CC BY 4.0); [termeni](https://creativecommons.org/licenses/by/4.0/).

Hansen, M. C., et al. (2013). High-Resolution Global Maps of 21st-Century Forest Cover Change. Science, 342, 850–853. https://doi.org/10.1126/science.1244693

Modificări: Decupare Suceava/Rîșca; reproiectare EPSG:3844 (metoda originală de resampling neconfirmată); optimizare GeoTIFF fără modificarea pixelilor.
Ediția exactă și rețeta de reproiectare a subsetului rămân de confirmat. În subset, codurile 1–24 indică 2001–2024; 0 este NoData, nu absență observată a pierderii.

### Copernicus DEM

Furnizor: Copernicus / ESA / Uniunea Europeană; DLR și Airbus; acces Copernicus Data Space Ecosystem. [Sursa oficială](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM). Licență: Copernicus DEM GLO-30 / GLO-90 — licență gratuită specifică produsului; [termeni](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM).

produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved

Modificări: Decupare Suceava/Rîșca; reproiectare EPSG:3844 (metoda originală de resampling neconfirmată); optimizare GeoTIFF fără modificarea pixelilor.
Ediția exactă, datum-ul vertical și rețeta originală de reproiectare rămân de confirmat. Rezoluția nominală GLO-30 diferă de pasul efectiv al subsetului EPSG:3844.
