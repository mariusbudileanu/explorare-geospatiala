# Explorare geospațială — DECISIONS_AND_QA

## Etapa 4 — corecții după auditul Opus și închidere locală

- Baseline public: `v3.0.0`, `6c36a95c2bb58d31208efbee4b9f3595130bb814`.
- Branch autorizat: `restructure/v4.0.0`. Audit Opus: ACCEPTAT CU REZERVE. Proprietarul autorizează un singur commit local după corecțiile E4-01/E4-03/E4-07 și testele relevante; fără push, merge sau publicare.
- MASTER_REGISTRY rămâne `data/content-manifest.js`; PEDAGOGICAL_MATRIX rămâne `data/learning-model.js`. Acest jurnal este singurul document operațional nou.
- Metadatele de publicare, CITATION și licențele v3 rămân nemodificate până la etapa de publicare.

### 4.1 — identitate, model și regresie

- Snapshot capturat înainte de modificarea surselor comune: `tests/fixtures/v3-contract.json`. Conține inventarul celor 73 de destinații, numerotările, ancorele DOM randate, ordinea scripturilor, operațiile și sursele cheilor de persistență. Păstrează hash-uri pentru 203 fișiere; nu copiază date GIS.
- `tests/capture-baseline.cjs` refuză capturarea dacă HEAD sau sursele publice diferă de baseline.
- Manifestul păstrează `lessons`, `CARTO_CONTENT`, identificatorii, URL-urile, codurile L/T și proveniența istorică. Organizarea v4 folosește ID-uri existente, fără duplicarea titlurilor și URL-urilor într-un alt registru.
- Adaptoarele P02–P07 și ordinea scripturilor științifice sunt păstrate incremental. `source_part` păstrează proveniența; etichetele tematice folosesc `canonicalSection`/`thematicLabel`.
- Prerechizitele obligatorii și recomandate, rolurile, segmentele, ramurile și finalurile sunt în modelul existent. `next` este derivat; nu se întreține un al doilea lanț.
- Delimitările 1.2i, T01n și variantele proiectului final sunt planificate, indisponibile ca unități ghidate. Parcursul activ este prefixul valid de opt resurse, până la L01 inclusiv. Nicio resursă nu este blocată.
- Niveluri: 20 Începător / 38 Intermediar / 6 Avansat; nouă destinații fără nivel global. Provocările păstrează nivelurile pe exercițiu în configurația lor existentă.
- Validatorul este inclus în build: ID-uri, aliasuri, cicluri, ordine obligatorie, repetiții, final explicit, disponibilitate și operații selectate.

### 4.2 — navigare și catalog

- Șapte capitole native `details`, două intrări de orientare și trei de referință: 71 de linkuri unice. Acasă este în antet; `gis-lab.html` rămâne compatibil.
- Laboratoarele sunt direct în capitole, după separator textual. Familiile 3.4–3.12 formează un subgrup nativ.
- Capitolul/subgrupul curent se deschid exclusiv contextual, fără persistența expansiunii între pagini. Deschiderea manuală este locală paginii. `cartografie-sidebar-state-v4` păstrează numai scrollul meniului; vechiul câmp `groups` este ignorat. Celelalte mecanisme de persistență sunt păstrate.
- Cele două URL-uri ale catalogului au aceeași sursă generată, exact L01–L20, filtre opționale și carduri statice. Aliasul nu produce un rezultat de căutare duplicat.
- Breadcrumb-ul este tematic. Continuarea recomandată și cea din capitol sunt distincte, cu destinații deduplicate. Navigările vechi de final care le-ar dubla sunt eliminate din generare.
- `tools/navigation-content.mjs` aplică aceeași decorare înaintea verificării intermediare și a generării finale.

### 4.3 — prezentare și QA

- Culori/iconuri: `#4D9074` / `book-open`; `#C48B32` / `layers`; `#B45B59` / `graduation-cap`. Sursa este modelul pedagogic.
- Linie de 2 px, icon decorativ și text explicit; fără fundaluri integral colorate și fără dificultate globală pe capitole.
- Navigarea statică rămâne vizibilă pe mobil fără JS. Filtrele inactive sunt ascunse; linkurile cardurilor rămân disponibile.
- Generatorul nu rescrie fișiere al căror conținut este identic după normalizarea terminatorilor de linie; octeții originali ai fișierelor protejate rămân conservați.
- Așteptările testelor vechi au fost ajustate pentru meniul 71/73, catalogul 20, aliasul exclus din căutare, nivelurile nule și continuările derivate. Verificările numerice și fixture-urile GIS nu au fost modificate. Două teste de text normalizează CRLF înainte de comparare/extragere.

### Comenzi reproductibile

Necesită Node, Playwright și Chromium. Se pot seta `CODEX_NODE_MODULES` și `QA_BROWSER_PATH` conform mediului local.

```text
node tests/v4-model.cjs
node tools/validate-learning.cjs
node tests/v4-navigation.cjs
node tests/v4-browser.cjs
node tests/v4-build.cjs
node tools/build-public-content.mjs
node tools/build-public-content.mjs --check
node tests/qa/p01-labs.cjs
node tests/qa/p02-labs.cjs
node tests/qa/p03-labs.cjs
node tests/qa/p04-labs.cjs
node tests/qa/p05-labs.cjs
node tests/qa/p06-labs.cjs
node tests/qa/p07-labs.cjs
node tests/qa/cartography-labs.cjs
node tests/qa/projection-lab.cjs
node tests/qa/v3-final-correction.cjs
node tests/qa/companion-hub.cjs
node tests/run-existing.cjs challenges-vector workshop-reproducibility learning-consolidation academic-resilience integration-browser final-ui-check
```

Rezultatele și capturile locale sunt în `tmp/qa/`, exclus din Git. Fișierele relevante: `v4/browser-results.json`, `operation3/learning-consolidation.json`, `p01/p01-results.json`, `p07/p07-result.json`, `phase4/integration-results.json` și logurile din `v4/`.

### Limite și dependențe

- NETESTAT: QGIS desktop, datele complete originale ale atelierelor și dispozitive fizice; acestea nu sunt certificate prin teste headless Chromium.
- NETESTAT: delimitările editoriale viitoare și finalizarea secțiunilor. Ancorele nu sunt certificate de finalizare.
- E4-02: auditul Opus identifică un defect moștenit din v3 în L09, Gap G1. PASS-urile suitelor P02/P06 nu îl infirmă. Utilitarele locale au și probleme de încărcare, dar acestea nu explică defectul Gap. Motorul nu se modifică în închiderea Etapei 4; corecția este obligatorie în primul lot tehnic al Etapei 5, cu teste de echivalență geometrică independente de orientarea și punctul de start al inelului, plus cazuri negative.
- Etapa 5: delimitarea reală 1.2i; nucleul T01n; alegerea variabilei T01 după verificarea originalelor; CASE și QGIS; instrucțiunile variantelor proiectului; rezultatele L14; revizia editorială T01–T06. Niciunul nu este marcat rezolvat.
- Oprire după commitul local autorizat; Etapa 5 necesită o instrucțiune nouă.

### Constatări Opus și corecții de închidere

- Preflight: 61 de fișiere modificate și 11 noi, toate din lotul Etapei 4; HEAD, `main`, `origin/main` și tagul v3.0.0 rezolvat la commit coincid cu baseline-ul. `data/geospatial-formats.js/.json` nu au diferențe Git: numai CRLF în checkout față de LF în obiectele Git. Nu se includ în commit.
- E4-01: eliminată restaurarea/salvarea expansiunii în `js/app.js` și `js/site.js`; meniul curent este derivat din manifest. Testele includ traseul efectiv 1.1 → L11 → L03 → T01 la 1440/390 px, preferințe vechi, deschidere manuală cu tastatura, Escape/focus mobil și lecții cu query. Testele de scroll permit noua geometrie contextuală între pagini și păstrează verificările în interiorul paginii.
- E4-03: cele 203 hash-uri protejate provin din obiectele Git ale commitului v3, cu politică explicită text/binar. Numai CRLF→LF este normalizat în text UTF-8 (extensii și trei nume de licență explicite); binarele sunt comparate exact. Sunt verificate variantele LF/CRLF pentru fiecare text, o mutație binară și o modificare reală pe disc a unui fișier protejat, restaurată în `finally` byte-for-byte. Inventarul, ancorele și restul capturii v3 sunt păstrate.
- E4-04: indexul de căutare este sensibil la fonturile disponibile. Două build-uri identice în acest mediu nu certifică determinismul între medii. Remedierea este obligatorie înaintea auditului final v4.
- E4-05: curățarea etichetelor istorice eyebrow/footer rămase este transferată Etapei 5.
- E4-06: păstrarea temporară a patch-urilor P02–P07 și a stratului final de derivare a grupurilor este o alegere incrementală intenționată, fără refactorizare completă în acest lot.
- E4-07: `Laborator GIS` este un cuvânt-cheie al catalogului canonic; verificarea în browser cere un singur rezultat canonic, niciun rezultat `gis-lab.html` și același index de 90 de înregistrări. Pagina compatibilă și cele 20 de carduri rămân testate.

## Rezultatele implementării anterioare auditului

| Verificare | Rezultat | Dovezi |
|---|---|---|
| Model și compatibilitate | PASS | 664 aserțiuni, nouă cazuri negative, 203 hash-uri identice |
| Navigare v4 | PASS | 4.576 aserțiuni, 73 de destinații și navigare statică |
| UI v4 | PASS | 2.638 verificări, 364 combinații, 29 de operații; fără excepții/overflow |
| Build | PASS | 42 HTML / 47 fișiere generate, două build-uri identice; --check nu scrie |
| P01–P07 | PASS | 1.327 / 1.178 / 3.243 / 591 / 149.487 / 31.465 / 5.370 verificări |
| Cartografie / proiecții | PASS | 68.678 / 1.306 verificări |
| Corecții numerice v3 extinse | PASS | 316 verificări, raster nativ și 16 stări L19 RO/EN, light/dark |
| Catalog și căutare | PASS | 915 verificări, fără excepții, avertizări sau linkuri lipsă |
| Ateliere / consolidare / integritate academică | PASS | 3.580 / 2.842 / 1.255 verificări |
| Integrare provocări | PASS | 227 verificări; toate cele 12 activități și 48 de combinații de prezentare |
| UI existent | PASS | 723 verificări, 73 de rute |
| L09 Gap G1 (E4-02) | Defect moștenit confirmat de audit | Corecție obligatorie în primul lot tehnic Etapa 5; PASS P02/P06 nu acoperă acest defect. |
| QGIS, originale complete, dispozitive fizice | NETESTAT | În afara validării Chromium și a conținutului autorizat pentru Etapa 4 |

## Retestare după audit — 2026-10-20

| Verificare | Rezultat | Dovezi |
|---|---|---|
| Model, inventar și protecție portabilă | PASS | 1.417 aserțiuni; 73 destinații, nouă cazuri negative de graf, 203 fișiere protejate din Git v3; fiecare text verificat în LF/CRLF, mutație reală pe disc detectată și restaurată exact; binare stricte |
| Validator v4 | PASS | Graful, prefixul activ, ramurile planificate și finalurile sunt valide |
| Navigare și catalog | PASS | 4.696 aserțiuni; traseu E4-01 la desktop/mobil, 73 destinații, ancore, no-JS, E4-07 și 90 înregistrări canonice |
| Responsive și operații | PASS | 2.638 verificări, 364 combinații light/dark și viewport, toate cele 29 de operații; zero erori/overflow |
| Restaurare laboratoare | PASS | P01: 1.327; P05: 149.487; P07: 5.370 verificări, inclusiv stările L03/L07/L12/L19, GCP și exporturi PNG/PGW |
| UI existent | PASS | 739 verificări pe 73 de rute, meniu contextual și scroll, mobil, tastatură, Escape/focus |
| Build și --check | PASS local | 42 HTML / 47 fișiere generate; două build-uri identice byte-for-byte, --check fără scriere. Determinismul între medii/fonturi rămâne E4-04 |
| Inventar de commit | PASS | 61 modificate + 12 noi = 73; toate corespund listei de mai jos; zero modificări exclusiv CRLF/LF, fără `data/geospatial-formats.js/.json` |

Comenzile sunt cele de mai sus; pentru suitele P01/P05/P07 și UI a fost folosit `tests/run-existing.cjs`. Logurile închiderii sunt `tmp/qa/v4/closure-*.log`. Verificările QGIS și pe dispozitive fizice rămân NETESTAT; E4-02/E4-04/E4-05 și dependențele editoriale nu sunt închise de aceste PASS-uri.

## Fișiere modificate și rol

Total: 73 fișiere, dintre care 42 HTML generate. Față de lotul auditat (61 modificate + 11 noi), se adaugă numai helperul portabil `tests/protected-files.cjs`.

| Fișier | Rol |
|---|---|
| `.gitignore` | Permite versionarea celor două module auxiliare de build/validare. |
| `DECISIONS_AND_QA.md` | Jurnal operațional: decizii, teste, limite și inventarul modificărilor. |
| `css/learning.css` | Indicatorii aprobați, cardurile și filtrele catalogului, navigarea nativă și focusul. |
| `css/site.css` | Navigare statică accesibilă pe mobil fără JavaScript. |
| `data/content-manifest.js` | Identitate și organizare canonică, tipuri, ordine, proveniență și generarea meniului/breadcrumb-ului. |
| `data/learning-model.js` | Matricea aprobată, O/R, roluri, dificultăți, segmente planificate și continuări derivate. |
| `data/learning-pages.js` | Prezentarea parcursului disponibil și a ramurilor de explorare. |
| `data/search-index.js` | Index generat cu 90 de înregistrări, fără aliasul duplicat al catalogului. |
| `js/app.js` | Meniu contextual fără persistența expansiunii; Escape/focus mobil; formulele sunt păstrate. |
| `js/learning.js` | Randare comună: catalog, dificultate, pregătire, ramuri și continuări. |
| `js/search.js` | Exclude aliasurile din rezultatele căutării. |
| `js/site.js` | Meniu contextual, stare, etichete tematice și păstrarea orientării Despre. |
| `tests/capture-baseline.cjs` | Captură reproductibilă, cu gardă împotriva suprascrierii baseline-ului din surse modificate. |
| `tests/protected-files.cjs` | Hash-uri derivate exclusiv din Git v3, politică explicită text/binar și normalizare CRLF/LF. |
| `tests/fixtures/v3-contract.json` | Snapshot v3 de identități, ancore, scripturi, parametri, persistență și hash-uri; fără date GIS copiate. |
| `tests/qa/audit-corrections.cjs` | Normalizează CRLF înainte de extragerea funcției comparate; așteptările matematice rămân intacte. |
| `tests/qa/companion-hub.cjs` | Așteptări pentru 20 de laboratoare, 71 de intrări, catalog canonic și navigare contextuală. |
| `tests/qa/expectations.cjs` | Contractul comun al navigării canonice, inclusiv rute cu hash/parametri și alias. |
| `tests/qa/final-ui-check.cjs` | Verifică expansiunea contextuală între pagini și conservarea scrollului/deschiderilor manuale în pagina curentă. |
| `tests/qa/learning-consolidation.cjs` | Niveluri nule, segmente planificate, continuări derivate și comparații portabile CRLF. |
| `tests/qa/p02-labs.cjs` | Descoperire în catalog prin URL-ul explicit al laboratorului, fără ancoră construită mecanic. |
| `tests/run-existing.cjs` | Server local cu prefix public pentru suitele existente. |
| `tests/support.cjs` | Încărcarea modelelor și infrastructură locală Chromium/HTTP pentru regresie. |
| `tests/v4-browser.cjs` | Responsive, light/dark, filtre, tastatură, persistență, no-JS și toate operațiile. |
| `tests/v4-build.cjs` | Două build-uri identice byte-for-byte și verificare fără scriere. |
| `tests/v4-model.cjs` | Inventar, numerotări, graf, cazuri negative, dificultăți și hash-uri protejate. |
| `tests/v4-navigation.cjs` | 73 de destinații, 71 de linkuri, ancore, scripturi, catalog și navigare statică. |
| `tools/build-public-content.mjs` | Integrarea navigării comune, căutare fără alias și conservarea fișierelor identice. |
| `tools/learning-content.mjs` | Context pedagogic și catalog unic generate; adaptoarele rămân în ordinea existentă. |
| `tools/navigation-content.mjs` | Decorare comună și deterministă pentru meniu, breadcrumb și linkurile catalogului. |
| `tools/validate-learning.cjs` | Validator pur pentru graful pedagogic, disponibilitate, aliasuri și finaluri. |

Cele 42 de pagini de mai jos sunt regenerate din sursele comune, pentru navigare, breadcrumb, catalog și contextul pedagogic aplicabil. Nu sunt editate divergent; procedurile, simulatoarele și datele existente sunt păstrate.

- `about.html`
- `analysis.html`
- `challenges.html`
- `classification-lab.html`
- `coordinates.html`
- `data-quality.html`
- `digital-companion.html`
- `final-project.html`
- `formats-interoperability.html`
- `generalization-lab.html`
- `georeferencing-lab.html`
- `geospatial-data.html`
- `gis-calculator.html`
- `gis-lab.html`
- `glossary.html`
- `index.html`
- `learning-path.html`
- `lesson.html`
- `map-diagnostics.html`
- `measurement-lab.html`
- `network-accessibility.html`
- `projection-crs-lab.html`
- `projection-intro.html`
- `raster-analysis.html`
- `raster-styling.html`
- `resources.html`
- `scale-resolution.html`
- `spatial-decision.html`
- `spatial-statistics.html`
- `styling-labeling.html`
- `thematic-methods.html`
- `topology.html`
- `transparency-blending.html`
- `tutorials/index.html`
- `tutorials/t01.html`
- `tutorials/t02.html`
- `tutorials/t03.html`
- `tutorials/t04.html`
- `tutorials/t05.html`
- `tutorials/t06.html`
- `workflow.html`
- `zarr-cloud-data.html`
