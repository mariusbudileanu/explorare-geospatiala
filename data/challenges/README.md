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
| `risca_dem_sv.tif` | 957 × 630 | Float32 | 23.559141 × 23.559141 m | 812,716 |
| `risca_forest_loss_sv.tif` | 937 × 617 | Byte | 24.060353 × 24.060353 m | 25,659 |

Ambele fișiere sunt GeoTIFF-uri tiled (blocuri 256 × 256), comprimate DEFLATE, fără overviews, validate COG. Optimizarea web păstrează exact pixelii, grila și NoData. Cititorul poate descărca integral aceste subseturi mici; nu depinde de range requests.

DEM-ul exprimă elevația în metri; datum-ul vertical necesită confirmare. În rasterul forest-loss, codurile 1–24 corespund anilor 2001–2024, iar 0 = NoData. Valoarea 0 este exclusă din selectorii de ani, totaluri, suprafețe și grafice.

## Surse, atribuiri și licențe

[Registrul public al produselor](../data-registry.json) și [pagina Resurse](../../resources.html#registrul-datelor) descriu șapte familii de surse și disting pachetele educaționale de cele nouă subseturi tehnice servite de aplicație. Niciun dataset complet T01–T06 nu este distribuit.

Școlile și datele medicale provin din Observatorul Urban Metropolitan București / ADIZMB, sub CC BY 4.0; textele de atribuire solicitate sunt păstrate integral în registru și în [ATTRIBUTION.md](../../ATTRIBUTION.md). Anii subseturilor medicale rămân 2024 pentru medicina de familie și spitale, respectiv 2023 pentru cabinete și ambulatorii.

Limitele administrative sunt distribuite prin geo-spatial.org; proveniența ANCPI a conturului Sectorului 1 este documentată separat. Gridul Recensământ 2021 reunește indicatori INS și identificatorul Eurostat, prin geo-spatial.org. Licența și textul exact de atribuire pentru aceste produse rămân de verificat. Atributul de versiune al conturului nu identifică automat ediția catalogului actual.

DEM-ul derivă din Copernicus DEM GLO-30, cu licența specifică produsului și notificarea: „produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved”. Forest Loss derivă din Hansen et al. (2013), GLAD / University of Maryland; CC BY 4.0 este documentată în metadatele furnizate. Edițiile exacte și rețetele originale de reproiectare ale rasterelor rămân de confirmat.

Datele terțe își păstrează propriile licențe. MIT pentru cod și CC BY 4.0 pentru conținutul original al platformei nu revendică proprietatea asupra dataseturilor externe.

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
