# Atribuirea surselor și licențelor

## Surse și conținut

- **Manual istoric:** A. Năstase și D. Cernea, *Cartografie generală – manual practic*, Universitatea din București, 1974. Secțiunile, paginile și figurile folosite sunt identificate în [`data/source-audit.json`](data/source-audit.json). [Publicația digitalizată la Biblioteca Digitală](https://biblioteca-digitala.ro/?pub=10971-cartografie-generala). Cartea este disponibilă online; nu este descrisă drept open-source.
- **Digitizare și context:** [Biblioteca Digitală a Publicațiilor Culturale — Despre](https://biblioteca-digitala.ro/despre.html), administrată de Institutul Național al Patrimoniului. Site-ul atribuie imaginile istorice platformei și autorilor; licența codului website-ului nu se aplică scanurilor.
- **Documentație GIS:** [QGIS Training Manual 3.44](https://docs.qgis.org/3.44/en/docs/training_manual/index.html) și [QGIS User Manual 3.44](https://docs.qgis.org/3.44/en/docs/user_manual/index.html). Legăturile specifice sunt în [`data/qgis-links.json`](data/qgis-links.json). Rezumatele sunt redactate pentru acest proiect, iar documentația QGIS rămâne la autorii săi.
- **CRS și operații:** [EPSG Geodetic Parameter Dataset](https://epsg.org/). Cele opt fișe oficiale și [operația 15995](https://epsg.org/transformation_15995/Pulkovo-1942-58-to-WGS-84-19.html) sunt referite în [`data/crs-registry.json`](data/crs-registry.json). Descrierile și parametrii EPSG nu sunt revendicați drept creație proprie.
- **Puncte demonstrative:** [GeoNames, cele mai mari orașe din România](https://www.geonames.org/RO/largest-cities-in-romania.html). Valorile rotunjite la trei zecimale sunt puncte reprezentative ale localităților, nu repere geodezice.
- **Motor de referință pentru verificare:** QGIS 3.40.11 cu pyproj 3.7.0 / PROJ 9.6.2. Valorile generate sunt în [`data/crs-validation.json`](data/crs-validation.json).
- **Geodezie și proiecții contemporane:** [PROJ · Mercator](https://proj.org/en/stable/operations/projections/merc.html), [PROJ · Equal Earth](https://proj.org/en/stable/operations/projections/eqearth.html), [NOAA · vertical datums](https://www.ngs.noaa.gov/datums/vertical/), [ANCPI · Marea Neagră 1975](https://www.ancpi.ro/ocpi/cs/wp-content/legi/modif%20ord%20600-2023.pdf) și [registrul ONU A/RES/80/307](https://public.e-delegate.un.org/reports/ga80_resolutions.html). Detaliile publice sunt în [`data/geodetic-sources.json`](data/geodetic-sources.json).
- **Formate și operații GIS:** [OGC GeoPackage](https://docs.ogc.org/is/12-128r17/12-128r17.html), [GDAL](https://gdal.org/en/stable/) și [QGIS Processing 3.44](https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/index.html). Fișele și URL-urile per operație sunt în [`data/geospatial-formats.json`](data/geospatial-formats.json) și [`data/processing-operations.json`](data/processing-operations.json); schemele didactice sunt originale.

## Date pentru Provocări GIS

Subseturile școlare și medicale pentru Sectorul 1 conțin date publice prelucrate în cadrul **Observatorului Urban Metropolitan București, ADIZMB**, sub **CC BY 4.0**, conform metodologiilor furnizate. Pentru școli (2022–2023), sursa unor date este [rețeaua școlară de pe data.gov.ro](https://data.gov.ro/dataset/reteaua-scolara-2022-2023). Datele de medicină de familie și spitale descriu anul 2024; cabinetele și ambulatoriile de specialitate, anul 2023.

Copiile didactice au fost decupate la conturul zonei de studiu și reduse la atributele utile exercițiilor. Atribuirea completă, fișierele și starea licențelor sunt consemnate în [documentația datelor challenge](data/challenges/README.md) și [registrul central](data/challenges/challenge-data.json). Proveniența/licențele exacte pentru contururi și grid, precum și versiunile și licențele exacte ale rasterelor Rîșca necesită confirmare; datele terțe nu sunt acoperite automat de licențele proiectului.

- **Contur Sectorul 1:** ANCPI, conform provenienței declarate de furnizorul subsetului; produsul oficial, versiunea și termenii sunt de confirmat. Atributul de versiune din copia furnizată nu stabilește o versiune oficială verificată.
- **Grid de recensământ 2021:** INS pentru indicatorii de populație și Eurostat pentru identificatorul gridului, conform dicționarului furnizat. Adresa produsului exact și licența nu sunt încă documentate.
- **Contur Rîșca:** produsul, versiunea și licența exactă rămân de confirmat.
- **DEM Rîșca — Copernicus WorldDEM-30 (GLO-30):**

  produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved

  Versiunea exactă și identificatorul licenței nu sunt documentate. Notificarea de mai sus este păstrată integral pentru subsetul adaptat.

- **Pierdere forestieră Rîșca:** Hansen et al., 2013. “High-Resolution Global Maps of 21st-Century Forest Cover Change.” Platforma de acces: [Global Nature Watch](https://globalnaturewatch.org/map/www.globalnaturewatch.org). Data accesării nu este stabilită; versiunea exactă și licența subsetului necesită confirmare. Codurile 1–24 reprezintă anii 2001–2024; **0 = NoData** și nu contribuie la totalurile anuale sau la suprafețele de pierdere.

Cardurile de Resurse prezintă rolul, anul/versiunea și licența documentate. Numai o adresă originală consemnată în registrul surselor este oferită ca link; copiile didactice nu sunt prezentate drept surse oficiale.

## Licențe software

- Codul original al website-ului: [`LICENSE`](LICENSE) (MIT, Marius Budileanu, 2026).
- Conținutul educațional original: [`CONTENT_LICENSE.md`](CONTENT_LICENSE.md), CC BY-NC 4.0. Acest termen nu se aplică textelor, figurilor, interfețelor sau datelor terțe citate ori vizibile în capturi.
- Proj4js 2.22.0: [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md) și [notificarea completă](js/vendor/PROJ4_LICENSE.md).
- Provocări GIS: **Leaflet 1.9.4** (BSD 2-Clause), **Turf.js 7.4.0** (MIT) și **GeoTIFF.js 2.1.3** (MIT, cu termeni proprii pentru dependențe). Versiunile și notificările complete sunt în [`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

Materialele externe își păstrează termenii originali. Licențele proiectului nu înlocuiesc acești termeni și nu constituie o permisiune nouă de redistribuire a scanurilor sau a datelor externe. Seturile GIS complete de curs nu sunt incluse în repository; subseturile challenge sunt documentate separat.
