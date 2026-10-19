# Explorare geospațială v3.0.0

**De la concepte clasice la GIS (QGIS)**

Platformă educațională statică de cartografie și GIS, organizată în șapte secțiuni academice și 20 de laboratoare interactive, completate de ateliere QGIS. Leagă conceptele cartografice de experimentare, compararea metodelor și interpretarea limitelor rezultatelor, folosind HTML, CSS și JavaScript.

Proiectul se adresează studenților de licență și master, în special celor de la Geografie.

**Stare:** pregătire locală pentru release-ul v3.0.0; tagul și publicarea acestei versiuni nu sunt încă efectuate. [Platforma publică](https://mariusbudileanu.github.io/explorare-geospatiala/) servește versiunea publicată din `main`; funcțiile v3 vor fi disponibile acolo după integrarea și deployment-ul autorizate. [Repository](https://github.com/mariusbudileanu/explorare-geospatiala) · [Changelog](CHANGELOG.md) · [Note pentru viitorul release](docs/releases/v3.0.0.md).

## Parcurs educațional

1. Fundamente geospațiale
2. Harta și elementele ei
3. Proiecții și sisteme de coordonate (CRS)
4. Metode de reprezentare
5. Date geospațiale
6. Analiza datelor geospațiale
7. Ateliere QGIS

## Digital Companion — 20 de laboratoare

Identitățile L01–L20 și destinațiile existente sunt păstrate. Versiunea 3 introduce 11 pagini de laborator și extinde nouă destinații existente în v2; nu toate cele 20 de laboratoare sunt noi. Interfețele și explicațiile laboratoarelor v3 au suport RO/EN. Lecțiile și atelierele mai vechi rămân predominant în română.

| ID | Laborator | Față de v2 |
| --- | --- | --- |
| L01 | [Scară și rezoluție](scale-resolution.html) | Nou |
| L02 | [Generalizare cartografică](generalization-lab.html) | Nou |
| L03 | [Proiecții & CRS](projection-crs-lab.html) | Extins |
| L04 | [Măsurători geospațiale](measurement-lab.html) | Nou |
| L05 | [Aceleași date, hărți diferite](classification-lab.html) | Extins |
| L06 | [Metode tematice interactive](thematic-methods.html) | Nou |
| L07 | [Map Design Studio](styling-labeling.html#map-design-studio) | Extins |
| L08 | [Diagnostic de hartă](map-diagnostics.html) | Extins |
| L09 | [Topologie](topology.html) | Extins |
| L10 | [Formate & interoperabilitate](formats-interoperability.html) | Extins |
| L11 | [Raster Styling](raster-styling.html) | Extins |
| L12 | [Zarr Cloud Data Lab](zarr-cloud-data.html) | Nou |
| L13 | [Calitatea și incertitudinea datelor](data-quality.html) | Extins |
| L14 | [Analiza datelor geospațiale](analysis.html) | Extins |
| L15 | [Analiză raster](raster-analysis.html) | Nou |
| L16 | [Statistici spațiale și MAUP](spatial-statistics.html) | Nou |
| L17 | [Rețele și accesibilitate](network-accessibility.html) | Nou |
| L18 | [Decizie spațială multicriterială](spatial-decision.html) | Nou |
| L19 | [Georeferențiere](georeferencing-lab.html) | Nou |
| L20 | [Calculator GIS](gis-calculator.html) | Nou |

[Hub interactiv](digital-companion.html) · [Parcurs recomandat](learning-path.html) · [Glosar RO–EN](glossary.html) · [Proiect final](final-project.html). Nivelurile Începător, Intermediar și Avansat și prerechizitele sunt orientative: accesul la materiale rămâne liber. Verificările formative nu salvează scoruri sau progres.

## Metodă și limite

Laboratoarele folosesc calcule inspectabile, comparații A/B și modele educaționale explicite. Rețelele sintetice, scenariile MAUP și alternativele multicriteriale nu reprezintă servicii operaționale sau recomandări reale de planificare. Acoperirea algoritmilor este limitată la metodele documentate; verificările de accesibilitate nu constituie certificare WCAG.

- **L12:** snapshot ANM/EOCube inclus și model offline al chunk-urilor și accesului; nu este client cloud live. Agregările anuale păstrează limitele sursei: 2026 este incomplet, iar media precipitației zilnice nu este total anual. Volumele de transfer sunt estimări modelate, nu măsurători de performanță ale unui serviciu.
- **L19:** exact două hărți fictive, ZAREA 1:10.000 și Delta Sălciilor 1:100.000, ambele Stereo 70 / EPSG:3844; șapte metode și export PNG + PGW. Inversa aproximativă este verificată separat de reziduurile GCP; fișierul PGW nu codifică singur CRS-ul.
- **L15/Hansen:** `lossyear = 0` înseamnă fără pierdere detectată; `datamask = 0` înseamnă lipsă de date. Numărul pixelilor cu an pozitiv nu reprezintă toți pixelii valizi ai localității. Grupările de analiză care combină zero și pixeli excluși nu separă retrospectiv aceste categorii.

Implementarea științifică a fost verificată prin teste numerice și de browser și prin audituri independente, cu remedierea constatărilor confirmate. Aceste verificări nu garantează corectitudinea universală. Observațiile de portabilitate și pașii de publicare sunt documentați în [planul de publicare](docs/releases/v3.0.0-publication.md).

## Sursa istorică

A. Năstase și D. Cernea, *Cartografie generală – manual practic*, Universitatea din București, 1974. [Publicația în Biblioteca Digitală](https://biblioteca-digitala.ro/?pub=10971-cartografie-generala). Scanurile și crop-urile manualului nu sunt redistribuite; lecțiile păstrează citări și reconstrucții didactice originale.

## Ateliere QGIS și date

Atelierele T01–T06 formează o serie practică progresivă, de la alcătuirea unei hărți la lucrul cu date vectoriale și raster. Seturile complete de date pentru ateliere nu sunt incluse în repository. Subseturile mici pregătite pentru Provocări GIS sunt descrise în [documentația datelor](data/challenges/README.md), împreună cu sursele, licențele confirmate și informațiile încă de clarificat. Acolo unde sunt disponibile și verificate, site-ul indică sursele originale; se aplică termenii furnizorilor respectivi.

Ținta este QGIS 3.44 LTR, cu comenzile în engleză și explicațiile în română. Metadatele și instrucțiunile de descărcare/pregătire sunt legate de [registrul canonic](data/data-registry.json) și de [pagina Resources](resources.html#registrul-datelor). Executarea integrală a tuturor atelierelor în QGIS 3.44 nu este certificată independent. Arhiva sursă a platformei nu este un pachet complet de date sau proiecte QGIS.

## Licențiere

Codul original este oferit sub [MIT](LICENSE). Conținutul educațional original este oferit sub [CC BY 4.0](CONTENT_LICENSE.md). Resursele terțe, inclusiv materialul istoric, își păstrează termenii originali; vezi [atribuirea](ATTRIBUTION.md) și [licențele terțe](THIRD_PARTY_LICENSES.md).

Pentru subseturile administrative și de recensământ obținute prin geo-spatial.org, registrul consemnează autorizarea redistribuirii confirmată de proprietarul proiectului. Eticheta exactă a licenței produselor din amonte și unele detalii de atribuire rămân de confirmat; nu le atribuim implicit o licență Creative Commons. Întreaga arhivă mixtă nu este licențiată exclusiv MIT.

**Autor:** Marius Budileanu.

**Afiliere:** Universitatea din București, Facultatea de Geografie.

Platforma și codul au fost dezvoltate cu asistență AI; conținutul academic, datele și rezultatele au fost revizuite și validate de autor.

## Citare și feedback

Budileanu, M. (2026). *Explorare geospațială*.

Metadatele pentru versiunea pregătită sunt în [CITATION.cff](CITATION.cff), cu `version: 3.0.0`. [DOI-ul de concept](https://doi.org/10.5281/zenodo.23422847) identifică familia de versiuni; [DOI-ul v2.0.0](https://doi.org/10.5281/zenodo.23422848) identifică numai release-ul anterior. DOI-ul specific v3.0.0 și data release-ului nu au fost încă atribuite și nu sunt anticipate în metadate. URL-ul platformei publice este o adresă evolutivă, nu un permalink al versiunii.

[Despre platformă](https://mariusbudileanu.github.io/explorare-geospatiala/about.html) · [Registrul datelor și licențele](https://mariusbudileanu.github.io/explorare-geospatiala/resources.html#registrul-datelor) · [Raportează o problemă](https://github.com/mariusbudileanu/explorare-geospatiala/issues)
