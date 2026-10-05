# Date pentru Provocări GIS

Subseturi educaționale mici pentru analize GIS interactive în Sectorul 1 al municipiului București și în UAT Rîșca, județul Suceava. Aceste copii nu înlocuiesc seturile originale sau evidențele oficiale. Registrul [challenge-data.json](challenge-data.json) indică fișierele, schemele și starea provenienței fiecărui set.

## Date vectoriale

Toate GeoJSON-urile păstrează coordonate WGS 84, **EPSG:4326**, în ordinea longitudine/latitudine.

| Subset | Entități | Octeți |
|---|---:|---:|
| Sectorul 1, București | 1 | 76,952 |
| Unități de învățământ — Sectorul 1 | 164 | 90,488 |
| Grid de populație — Sectorul 1 | 99 | 130,789 |
| Medicină de familie — Sectorul 1 | 267 | 50,256 |
| Cabinete și ambulatorii de specialitate — Sectorul 1 | 200 | 43,597 |
| Spitale — Sectorul 1 | 50 | 26,147 |
| Rîșca, județul Suceava — contur | 1 | 61,134 |

Dicționarele CSV din `sector1/metadata/` descriu numai atributele publice păstrate. Atributele personale, de contact și cele nefolosite au fost eliminate.

## Rastere Rîșca

Rasterele rămân în **EPSG:3844 — Pulkovo 1942(58) / Stereo70**. [raster_metadata.json](risca/raster_metadata.json) conține dimensiunile, transformarea afină, valorile și verificarea structurii fișierelor.

| Fișier | Dimensiuni | Tip | Pixel în CRS-ul rasterului | Octeți |
|---|---|---|---|---:|
| `risca_dem_sv.tif` | 957 × 630 | Float32 | 23.559141 × 23.559141 m | 3,594,697 |
| `risca_forest_loss_sv.tif` | 937 × 617 | Byte | 24.060353 × 24.060353 m | 881,725 |

Ambele fișiere sunt GeoTIFF-uri necomprimate, organizate în benzi de rânduri, cu patru niveluri de overviews. Nu sunt tiled GeoTIFF și nu trec validarea COG. La dimensiunile lor, descărcarea completă poate fi utilizată.

DEM-ul exprimă elevația în metri; datum-ul vertical necesită confirmare. În rasterul forest-loss, codurile 1–24 corespund anilor 2001–2024, iar 0 = NoData. Valoarea 0 este exclusă din selectorii de ani, totaluri, suprafețe și grafice.

## Surse, atribuiri și licențe

- **Școli (2022–2023):** Observatorul Urban Metropolitan București / ADIZMB, pe baza datelor Ministerului Educației, SIIIR și ISMB. [Rețeaua școlară 2022–2023, data.gov.ro](https://data.gov.ro/dataset/reteaua-scolara-2022-2023). Licență **CC BY 4.0**, confirmată în metodologia furnizată.
- **Medicină de familie (2024), cabinete/ambulatorii de specialitate (2023) și spitale (2024):** Observatorul Urban Metropolitan București / ADIZMB, pe baza surselor CASMB, CJASIF, OPSNAJ și, pentru spitale, DSP și informațiilor unităților sanitare. Licență **CC BY 4.0**, confirmată în metodologiile furnizate.
- **Grid:** indicatorii de populație INS și identificatorul Eurostat sunt documentați în dicționarul furnizat. Licența exactă, produsul și sursa oficială necesită confirmare.
- **Contur Sector 1:** furnizorul subsetului indică ANCPI drept sursa conturului utilizat la decupare. Versiunea oficială, adresa produsului și licența necesită confirmare.
- **Contur Rîșca:** sursa exactă, versiunea și licența necesită confirmare.
- **DEM Rîșca:** Copernicus WorldDEM-30 (GLO-30). Notificarea pentru subsetul adaptat: “produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved”. Versiunea exactă și identificatorul licenței nu sunt documentate.
- **Forest-loss Rîșca:** Hansen et al., 2013. “High-Resolution Global Maps of 21st-Century Forest Cover Change.” Acces prin [Global Nature Watch](https://globalnaturewatch.org/map/www.globalnaturewatch.org). Data accesării nu este stabilită; versiunea exactă și licența subsetului necesită confirmare.

Atribuire pentru datele medicale: „Conține date publice prelucrate în cadrul Observatorului Urban Metropolitan București, ADIZMB, date deschise sub Licența Creative Commons Attribution 4.0.” Pentru școli, se adaugă faptul că sursa unor date este data.gov.ro și adresa rețelei școlare de mai sus. Subseturile au fost decupate și atributele publice au fost reduse.

CC BY 4.0 se aplică datelor școlare și medicale documentate, nu tuturor fișierelor acestui director. Licențele MIT și CC BY-NC 4.0 ale proiectului nu relicențiază datele terțe. Pentru fișierele a căror licență nu este încă documentată, drepturile de redistribuire trebuie clarificate înaintea publicării.

## Precauții metodologice

- Apartenența la Sectorul 1 urmează geometria deja decupată. Valorile administrative istorice nu au fost utilizate pentru eliminarea înregistrărilor.
- `NULL` înseamnă informație lipsă și se păstrează distinct de zero. Numerele de paturi sunt capacități, nu valori booleene.
- Calculele pe vârstă folosesc `Populatia_totala_T` și cele trei câmpuri asociate de vârstă. `TOT_P_2021` nu este amestecat cu această familie. Sub 15 ani nu înseamnă toate persoanele minore.
- Cele 164 de puncte școlare au 151 de coduri SIIIR distincte. `fid` identifică fiecare înregistrare; agregarea pe instituții trebuie să țină cont de codurile repetate.
- Gridul conține celule deja tăiate la contur. Suportul spațial al populației după această decupare necesită confirmare înaintea ponderării la suprafață. O estimare pe celule presupune explicit distribuție uniformă.
- `Contract Ecograf` descrie contractul de ecografie, nu proprietatea unui aparat. Distanțele euclidiene și bufferele exprimă proximitate, fără a măsura accesibilitatea pe rețeaua rutieră.
- TIFF-urile nu au tag NoData declarat. Pentru subsetul forest-loss, **0 = NoData**, independent de tag-ul fișierului. DEM-ul folosește masca UAT; valoarea sa zero din afara conturului nu este elevație validă pentru exerciții.
- Pentru analize trebuie aplicată masca UAT. Rasterele au rezoluții și origini diferite; combinațiile celulă cu celulă necesită aliniere în EPSG:3844 și o metodă potrivită datelor categoriale.

## Metoda provocărilor raster R1–R6

R1 calculează panta din DEM cu metoda Horn 3×3, pe coordonatele metrice EPSG:3844. Nu se calculează panta la marginea grilei sau dacă un vecin este în afara măștii ori are NoData. Gradele sunt unghiuri; procentele sunt `100 × tan(unghiul în radiani)`. R2 selectează strict pixelii peste prag; procentul folosește suprafața UAT cu pantă calculabilă, iar suprafața UAT cu DEM valid este afișată separat.

R3–R5 selectează anii confirmați și numără pixelii unici. Suprafața în hectare este numărul de pixeli înmulțit cu determinantul transformării afine, împărțit la 10 000. Este o măsurare pe grila sursă, pe baza centrelor pixelilor din UAT, nu suprafața exactă a conturului vectorial.

În R6, grila forestieră păstrează codurile de an și aria pixelului original. Panta continuă derivată pe grila DEM este interpolată biliniar la centrele pixelilor forestieri, numai când toate cele patru centre vecine au pantă validă. Pixelii de pierdere fără pantă evaluabilă sunt raportați separat, fără a fi considerați sub prag. Procentul din pierderea evaluabilă și partea confirmată din pierderea totală au numitori expliciți.

Afișarea pe harta Web Mercator reproiectează rasterul pentru ecran; analiza nu folosește dimensiunile pixelului afișat. Graficele anuale provin din valorile rasterului. [Documentația GDAL pentru pantă](https://gdal.org/en/stable/programs/gdaldem.html#slope) descrie metoda Horn și tratamentul vecinătăților NoData.
