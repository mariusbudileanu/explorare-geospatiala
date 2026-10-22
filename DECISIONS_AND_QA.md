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

## Etapa 5 — Lotul 5.1: corectitudine GIS și progresie introductivă

Statut: audit independent Opus încheiat — **ACCEPTAT CU REZERVE**. Proprietarul autorizează un singur commit local după documentare și retestare, fără corecții funcționale suplimentare înainte de commit. Lotul 5.2 nu este început; fără push, merge, tag, release sau publicare.

### Preflight și domeniu

- Branch `restructure/v4.0.0`, HEAD `2810ce2546f928453b3bbd5f5c633191d7a80e07`, working tree inițial curat. `main`, `origin/main` și `v3.0.0^{}` rămân la `6c36a95c2bb58d31208efbee4b9f3595130bb814`.
- Consultate planul director v2, auditul pedagogic Opus și constatările E4-01–07. Cererea acestui lot autorizează corecția științifică punctuală L09, separarea 1.2i, rezultatele L14 și curățarea editorială; nu autorizează continuarea T01/QGIS.
- Surse generatoare: `js/crs-lesson.js` pentru lecția dinamică, `data/learning-model.js` și `js/learning.js` pentru rezultatele învățării, `tools/learning-content.mjs` și `tools/navigation-content.mjs` pentru HTML static. Identitatea și poziția tematică provin din manifest.
- Înaintea modificărilor, verificarea celor șapte răspunsuri declarate a reprodus defectul: numai Gap G1 returna `correct=false`, cu aria corectă 2400; restul erau corecte. Validatorul de integritate Etapa 4 trecea, dar testul P02 existent verifica numai existența unei erori, fără verdictul răspunsului.

### Intervenții și delimitări

- **E4-02 / L09:** `sameRing` compară aceeași succesiune ciclică de vârfuri, în ambele sensuri și din orice vârf. Închiderea repetată a inelului este eliminată numai pentru comparație. Se păstrează `E.same`, deci toleranța strictă existentă `1e-9`; nu se folosesc aria, bounding box-ul, sortarea vârfurilor sau toleranțe noi pentru a decide echivalența. Datele și regula care calculează gap/overlap rămân intacte.
- Suita versionată P02 verifică verdictul fiecărui candidat din toate cele șapte runde. Pentru gap și overlap verifică ambele orientări, fiecare start, reprezentările închise/deschise, rotunjiri sub toleranța existentă și respingerea inelelor trunchiate, degenerate, deplasate cu aceeași arie, cu vârf greșit, reordonate sau repetate. În browser, T9 primește întâi un răspuns greșit, apoi cel corect în fiecare rundă; G1 afișează și aria 2400. Celelalte reguli și reparații sunt testate de aceeași suită.
- **1.2i:** `#concept-rect` și `#grila` formează un segment DOM explicit `rectangular-coordinates@intro`, cu origine, X/Y, unități, grilă locală de 10 m, citirea perechii și deplasarea separată a coordonatelor. Nu conține selector CRS sau explicații datum/EPSG. Textul vechi privind sistemele de referință este păstrat în `#sisteme-rect`; experimentul CRS complet este în `#crs-grid`, cu toate ID-urile controalelor existente. Comparația, cele opt sisteme, zonele României și transformarea sunt păstrate.
- Lecția rămâne la același URL/ID/număr și nivel Intermediar pentru resursa integrală. Contextul pedagogic distinge pregătirea lecției integrale de introducerea accesibilă după 1.1. Modelul marchează segmentul drept disponibil editorial, cu ancorele existente; `activeThrough='scale-resolution'` păstrează exact prefixul activ de opt resurse. Nu se activează continuări suplimentare sau contorizarea finalizării.
- Fragmentul dinamic se rezolvă explicit după DOMContentLoaded, încărcarea fonturilor și layout. Testul cere scroll efectiv și alinierea la suma offseturilor CSS existente, plus secțiunea în jumătatea superioară a viewportului. La 375 px, offsetul măsurat este 216 + 145 ≈ 361 px; pragul inițial de 150 px al testului era incorect, nu o dovadă de pierdere a ancorei. Testul nu se limitează la existența unui ID.
- **L14:** rezultatele devin „Alegi ghidat operația potrivită pentru întrebarea și scena oferite” și „Verifici rezultatul pe scenă și explici limitele interpretării”. Sunt derivate din model atât în pagină, cât și în inventarele pedagogice. Proiectarea autonomă rămâne obiectivul proiectului final; scenele și operațiile L14 nu sunt modificate.
- **E4-05:** etichetele structurale vechi din eyebrow sunt înlocuite cu capitolul și codul de laborator derivate din manifest. Linkurile catalogului folosesc titlul canonic; subsolul comun folosește „Cartografie și GIS”. O mențiune pur internă „geometrie P02” devine „geometrie sintetică”, păstrând descrierea modelului. Sunt păstrate mențiunile P07 care documentează proveniența datelor, atribuirile, licențele și referințele istorice. Patch-urile P02–P07 rămân infrastructură, conform E4-06.

### Închiderea după auditul Opus — decizii și transferuri

- **E5-01 — Lotul 5.2:** rămân texte generate la runtime în sursele JS reale: L10 afirmă fals că L12 Zarr este planificat și indisponibil; L07 afișează eticheta tehnică P05; L14 păstrează referința tehnică P02/Turf. Corecția se face în sursele care generează efectiv aceste texte, nu exclusiv în HTML. După corectarea surselor, se verifică eliminarea workaround-ului `replaceAll` din `tools/navigation-content.mjs`. Curățarea HTML din 5.1 și PASS-urile existente nu închid aceste constatări runtime.
- **E5-02 — Lotul 5.2:** se adaugă ulterior în introducerea 1.2 o explicație scurtă: în convenția Stereo 70, X indică nordul și Y estul, spre deosebire de desenul cartezian introductiv. Lecția nu se modifică în închiderea 5.1.
- **E5-03 — decizie de compatibilitate:** în v3, `#grila` desemna experimentul cu selector CRS. În 5.1, aceeași ancoră desemnează grila introductivă X/Y, iar experimentul avansat este la noua ancoră `#crs-grid`; `#sisteme-rect` este de asemenea nouă. Reutilizarea lui `#grila` susține progresia pedagogică de la plan/axe/unități spre CRS/EPSG. URL-ul continuă să funcționeze, dar semnificația țintei s-a schimbat: păstrarea identificatorului nu certifică păstrarea semanticii. Compatibilitatea semantică a deep linkurilor se verifică explicit la QA-ul final.
- **Limita L09:** comparația acceptă inversarea orientării și schimbarea vârfului inițial pentru aceeași succesiune ciclică de vârfuri, în toleranța existentă. Nu este un algoritm general de echivalență topologică pentru geometrii arbitrare; de exemplu, nu normalizează adăugarea/eliminarea unor vârfuri coliniare. Datele și regulile gap/overlap sunt păstrate.
- Rezultatele PASS de mai jos sunt păstrate, cu domeniul lor concret; verdictul Opus și rezervele de mai sus nu sunt înlocuite de acestea. E4-04 și dependențele loturilor 5.2/5.3 rămân deschise.
- Preflight de închidere: HEAD și branch conforme, 42 fișiere modificate + `tests/lot51-browser.cjs` nou, index gol, `main`/`origin/main`/tagul v3 neschimbate. Cererea nu numește cele șapte fișiere raportate de Opus numai cu CRLF/LF; controlul a fost extins la toate cele 303 fișiere text versionate. Niciunul dintre cele 42 din lot nu este modificat exclusiv prin CRLF/LF; diferențele de checkout fără modificări de conținut nu se includ în staging. Nu sunt efectuate resetări sau curățări.
- Commit local autorizat, după verificările PASS și controlul listei staged: `fix(v4): correct topology diagnostics and refine learning content`. Nu se includ alte modificări funcționale față de lotul auditat.
- Retestare la închidere: PASS `tests/v4-model.cjs` (1422 aserțiuni, 201 fișiere nemodificate + două excepții exacte), `tools/validate-learning.cjs`, L09/P02 (1275 verificări) și `tests/lot51-browser.cjs` (354 verificări). `git diff --check` trece; inventarul de 43 fișiere corespunde listei lotului, fără fișiere exclusiv CRLF/LF. Loguri: `tmp/qa/v4/lot51-close-*.log`.

### Contractul v3 și excepțiile exacte

Snapshotul `tests/fixtures/v3-contract.json` nu se modifică. Hash-urile celor 203 fișiere rămân ancorate în obiectele Git v3. Dintre acestea, 201 sunt neschimbate; numai următoarele două fișiere au excepții cu preimagine v3 și hash exact al implementării în `tests/protected-files.cjs`:

| Fișier | Modificare autorizată în lot |
|---|---|
| `js/topology-repair-engine.js` | Corecția strictă E4-02; fără alte reguli, date sau UI schimbate |
| `js/crs-lesson.js` | Introducere editorială și grilă locală, păstrarea aprofundării și scroll după randare |

Orice altă modificare în aceste fișiere este respinsă. Testele verifică preimaginile, hash-urile curente și mutații suplimentare neautorizate; protecția celorlalte fișiere și testul negativ real pe disc rămân active. În plus, sufixul de cod de la `const locationSelect` în jos este comparat byte-for-byte, cu CRLF/LF normalizat, cu v3: toate calculele și gestionarea controalelor CRS existente sunt identice. Niciun tutorial QGIS, set de date sau algoritm de transformare nu este schimbat.

### Rezultate și limite

| Verificare executată | Rezultat | Dovadă |
|---|---|---|
| `node tests/v4-model.cjs` și validator | PASS | 1422 aserțiuni, nouă cazuri negative de graf, 73 destinații/34 numerotări; 203 fișiere verificate, 201 nemodificate și două excepții exacte; prefix activ neschimbat |
| `node tests/qa/p02-labs.cjs` | PASS | 1275 verificări (860 unitare), toate răspunsurile celor șapte runde, teste ciclice și negative, G1 în T9; 38 cazuri de matrice topologică, gap/overlap și opt reparații, 48 combinații de prezentare; fără erori sau resurse lipsă |
| `node tests/lot51-browser.cjs` | PASS | 354 verificări, 375/390/768/1280/1440 px × light/dark efectiv, scroll real către fragment după JS, grilă X/Y, opt CRS și formular păstrate, rezultate L14 identice cu modelul, etichete și linkuri verificate pe toate cele 73 de destinații |
| `node tests/v4-navigation.cjs` | PASS | 4696 aserțiuni; identități, ancore v3, scripturi în aceeași ordine, 71 intrări, breadcrumb, catalog 20/20, no-JS |
| `node tests/v4-browser.cjs` | PASS | 2638 verificări, 364 combinații, toate cele 29 operații parametrizate; zero erori/overflow |
| P01 / P03 / P04 / P05 / P06 / P07 | PASS | 1327 / 3243 / 591 / 149487 / 31465 / 5370 verificări; împreună cu P02 acoperă L01–L20, restaurarea parametrilor, GCP și exporturile PNG/PGW |
| `learning-consolidation` / `companion-hub` / `final-ui-check` | PASS | 2836 / 915 / 739 verificări; rezultate observabile, 329 verificări de căutare, meniuri desktop/mobil, tastatură, Escape/focus și 73 rute |
| `projection-lab` | PASS | 1306 verificări; referințe independente, 27 transformări și 320 valori CRS existente; eroare maximă de coordonate ≈1,86e-9 |
| `node tests/v4-build.cjs` | PASS local | Două build-uri identice byte-for-byte pentru 42 HTML / 47 fișiere generate, --check fără scriere; index cu 90 înregistrări |

Pentru suitele existente a fost folosit și `node tests/run-existing.cjs p01-labs p03-labs p04-labs`, respectiv P05/P06/P07 și consolidare/catalog/UI/proiecții. În testul nou al fragmentului, fiecare temă este verificată prin navigare directă din altă pagină; un simplu `goto` către același URL nu reexecută obligatoriu JS, iar reload-ul poate restaura legitim poziția ulterioară a cititorului. Tema aplicată este verificată explicit, fără acumularea unor init scripts contradictorii.

Logurile și capturile tehnice sunt în `tmp/qa/v4/lot51-*.log` și `tmp/qa/lot51/`, excluse din Git. Capturile 390 px light/dark au fost inspectate vizual. Nu există FAIL final în suitele executate. QGIS desktop, dispozitivele fizice și determinismul între medii cu fonturi diferite rămân NETESTAT. Nu au apărut diferențe între cele două build-uri locale; modificările indexului provin din introducere, rezultatele L14 și etichetele/linkurile canonice. E4-04 rămâne obligatoriu pentru QA-ul final v4; loturile 5.2/5.3 păstrează T01n, CASE, datele originale și integrarea proiectului final.

### Fișierele lotului 5.1 și rolul fiecăruia

43 fișiere: 42 modificate și un test nou. Dintre ele, 28 HTML și indexul de căutare sunt rezultate generate; nu sunt rescrieri divergente de conținut.

| Fișier | Rolul modificării |
|---|---|
| `DECISIONS_AND_QA.md` | Domeniu, excepții exacte, probe și limite pentru auditul acestui lot |
| `css/site.css` | Grila introductivă responsive, etichete lizibile și culori existente light/dark |
| `data/content-manifest.js` | Derivarea etichetelor tematice din identitatea canonică |
| `data/learning-model.js` | Rezultate L14, disponibilitatea editorială 1.2i și limită explicită a prefixului activ |
| `js/crs-lesson.js` | Separare introductiv/aprofundare, exercițiu X/Y și fragment după randare |
| `js/learning.js` | Clarificarea pregătirii pentru introducere vs lecția integrală, etichete runtime și titlul catalogului |
| `js/topology-repair-engine.js` | Compararea strictă a inelelor independent de orientare/start |
| `tools/learning-content.mjs` | Eyebrow generat din manifest, fără fallback structural vechi |
| `tools/navigation-content.mjs` | Decorare comună a etichetelor, linkurilor catalogului și subsolului, păstrând citările |
| `tools/validate-learning.cjs` | Verificarea limitei explicite a parcursului activ |
| `tests/protected-files.cjs` | Două excepții cu preimagine v3 și hash curent exact; fără schimbarea snapshotului |
| `tests/qa/p02-labs.cjs` | Verdictul real al diagnosticului, variații de inele, cazuri negative și T9 în browser |
| `tests/v4-model.cjs` | Disponibilitate 1.2i, excepții limitate și respingerea modificărilor suplimentare |
| `tests/lot51-browser.cjs` (nou) | Delimitare editorială, ancoră dinamică, teme/viewports, L14 și etichete pe 73 destinații |
| `data/search-index.js` | Index regenerat din conținutul și etichetele actualizate; același inventar canonic |

Pentru fiecare pagină generată de mai jos, rolul este actualizarea etichetelor, numelui catalogului sau subsolului prin sursa comună. În `analysis.html` se actualizează și rezultatele L14; în `learning-path.html`, inventarul reflectă aceleași rezultate și motivarea lecției integrale 1.2. Procedurile, controalele și datele paginilor sunt păstrate.

- `analysis.html`
- `classification-lab.html`
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
- `map-diagnostics.html`
- `measurement-lab.html`
- `network-accessibility.html`
- `projection-crs-lab.html`
- `raster-analysis.html`
- `raster-styling.html`
- `scale-resolution.html`
- `spatial-decision.html`
- `spatial-statistics.html`
- `styling-labeling.html`
- `thematic-methods.html`
- `topology.html`
- `transparency-blending.html`
- `zarr-cloud-data.html`

## Etapa 5 — Lotul 5.2: ateliere QGIS și corecții editoriale (2026-10-20)

Implementare locală pentru audit, fără staging sau commit. Preflight: branch `restructure/v4.0.0`, HEAD `0b3f4a528cdc93237e3a3a18f993861cde54094d`, working tree inițial curat și index gol. `main`, `origin/main` și tagul v3.0.0 indică în continuare `6c36a95c2bb58d31208efbee4b9f3595130bb814`. Nu se începe Lotul 5.3.

### E5-01 / E5-02 și limitele schimbării

- **E5-01 implementat în surse:** L10 trimite către L12 disponibil, cu snapshot offline și acces modelat, în română și engleză; legenda L07 spune „Stil / Style”; metoda L14 descrie segmentele lon/lat și modelul sferic fără numele interne P02/Turf. Sunt păstrate raza, unitățile și limitele științifice. Workaround-ul punctual `replaceAll` din generatorul navigării este eliminat. Nu se elimină atribuirile ori proveniența datelor și nu se modifică algoritmii sau adaptoarele.
- **E5-02 implementat:** introducerea 1.2 explică pe scurt X orizontal/Y vertical în desen versus X nordic/Y estic în Stereo 70. Autoritatea EPSG inclusă în GDAL raportează pentru EPSG:3844 axele Northing/Easting; explicația existentă din L19 este concordantă. Site-ul EPSG/resolverul OGC au răspuns HTTP 403 la accesarea automată; nu sunt declarate drept pagini consultate cu succes. Sufixul calculelor și controalelor CRS este verificat identic cu v3.
- **E5-03 rămâne deschis pentru QA final:** sensul `#grila` din Lotul 5.1 nu este schimbat în acest lot; selectorul avansat rămâne la `#crs-grid`. Existența fragmentului nu certifică echivalența lui semantică cu v3.

### Date originale: domeniu, identitate și reproducere

Verificările sunt adăugate în inventarul existent `data/tutorial-dataset-inventory.json`, nu într-un registru paralel. Arhivele și GeoPackage-urile descărcate se află numai în `tmp/qa/lot52/sources/`, ignorat de Git; nu sunt modificate sau redistribuite. Hashurile fișierelor înainte/după testele QGIS sunt identice. Schema și statisticile tehnice sunt în `tmp/qa/lot52/source-inspection.json`; rezultatele execuției, în `tmp/qa/lot52/qgis-results.json`.

| Original verificat | Rezultat și domeniu | SHA-256 al descărcării |
|---|---|---|
| ADIZMB școli/circumscripții, arhiva 2022–2023 rev1 | 757 puncte școli; 174 puncte și 174 poligoane de circumscripții; limite municipale; EPSG:4326 | `c1d164f936e39e8997a6071272fa0ac464d56cb71195c7ebc347e0afcf5f7b00` |
| ADIZMB medical, arhiva 2023–2024 | 1380 cabinete primare, 1082 secundare, 158 spitale; puncte EPSG:4326; limita `Limita_IF` din pachet este EPSG:3844 | `c8a30698554f0bc8a9f482d2ee98c8f9dd9d71edef3b83aa61191f25dc05d644` |
| ADIZMB baze sportive, arhiva 1991–2024 | 157 poligoane și două obiecte administrative, EPSG:4326; diferența 1990 din numele GPKG / 1991 din numele stratului este păstrată explicit | `0f69d53c3c15552a45926091d75b4cac6b1682cf424f81fad24f3e0ac334f56c` |
| Recensământ 2021, `Recensamant2021_GridData.gpkg` original național | 240290 poligoane EPSG:3844; schema și operațiile testate efectiv pe zona București | `249408aefcfec5df3fc8b29867c58599fa7c2e90abd531c2b91ca67488d433a4` |

Sursele, condițiile de acces, licențele și atribuirile rămân în `data/data-registry.json`; acesta și proiecția sa JS nu sunt schimbate. Sursele ADIZMB sunt identificate prin paginile oficiale și descărcările lor. Pentru produsul exact Recensământ, registrul păstrează rezerva privind licența: descărcarea nu este echivalată cu dreptul de redistribuire. Pentru Suceava se păstrează distinct documentația furnizorului, schema/capturile istorice și antetul Hansen consemnat în registru la 2026-10-09; copia DEM/măștii complete nu este disponibilă. Nu se pretinde o verificare nouă a întregului raster sau execuția T06 pe originalele Suceava. Rîșca nu este utilizată ca substitut.

### T01: nucleu nominal real, extensii și CASE

- Alegerea curriculară aprobată definitiv este **`Regim Juridic - Tip de proprietate`**, String, cu exact 465 „Public de interes național și local” și 292 „Privat”, fără NULL, în cele 757 obiecte ale originalului complet. `Sector` este Integer64 cu valorile nominale 1–6 și efectivele 164/141/142/108/78/124, fără NULL. Nu este cantitate și nu se clasifică prin Graduated. Alegerea proprietății adaugă informație tematică față de localizare și pregătește comparațiile T04; distribuția nu este extrapolată din Sectorul 1.
- Nucleul `#t01-core` are șapte acțiuni QGIS cu rezultat observabil: încărcare, inspecție, Categorized direct pe proprietate, cadru/scară, legendă/atribuire, export, verificare externă PNG/PDF. Fiecare are ancoră descriptivă; acestea nu sunt unități de progres și nu adaugă checkbox-uri. Nu există expresie de copiat ori captură educațională prezentată ca dovadă a nucleului.
- Layoutul final folosește EPSG:3844 pentru cadru/proiect; originalele EPSG:4326 rămân nemodificate. Pagina are unități mm, scara grafică este legată de hartă și etichetată în km. **E52-01:** în EPSG:4326 scara diferă între direcțiile est–vest și nord–sud; posibilitatea tehnică de a desena o bară în km nu demonstrează fidelitatea ei pentru ambele direcții. Formularea anterioară, care sugera că unitățile și metoda sunt suficiente, este corectată în pasul4 și §18. Instrucțiunile păstrează distincția strat/proiect/cadru și cer verificarea transformării, orientării, legendei și atribuirea CC BY 4.0.
- Filtrele AND/OR, nivelurile educaționale, simbolurile după numărul de elevi, etichetele și Sector/Coduri rămân extensii. Cele 24 de secțiuni și ID-urile lor sunt păstrate. `#section-22` păstrează limitele privind accesibilitatea, timpul, capacitatea, calitatea, echitatea și domiciliul elevilor; finalizarea hărții nu cere CASE.
- CASE analizează strict cele cinci câmpuri binare Antepreșcolar, Preșcolar, Primar, Gimnazial, Liceal. După verificarea valorilor, ordinea este descrescătoare, Liceal → Antepreșcolar. Profesional este o filieră paralelă, Postliceal nu se inserează în această scară, Special este ortogonal, iar Club nu este nivel; ele nu sunt clasate implicit și se discută separat prin `Coduri`.
- Orice marcaj nenul în afara 0/1 produce „Valori de verificat”. Dacă nu există asemenea valoare, orice NULL în cele cinci câmpuri produce conservator „Date incomplete”, chiar când alt nivel este marcat; nu se presupune că nivelul lipsă nu este oferit. Cinci zerouri produc „Fără nivel marcat în cele cinci câmpuri”, fără a pretinde „alt tip” ori lipsa învățământului. Legenda menționează domeniul celor cinci câmpuri; numai clasele de nivel cunoscut formează progresia ordinală, iar categoriile de calitate a datelor se diferențiază separat.
- Pe original: Preșcolar 336, Liceal 123, Gimnazial 199, Primar 35, fără nivel în cele cinci câmpuri 37, Antepreșcolar 27. Cele cinci marcaje sunt complete și binare; cazurile NULL/invalide sunt verificate suplimentar în motorul QGIS pe obiecte sintetice. Sunt executate toate cele 512 combinații binare ale celor nouă câmpuri analizate, plus cazurile-limită NULL/2/−1. Modelarea JS nu este utilizată ca probă de execuție QGIS.
- Capturile originale T01_02/T01_03 sunt păstrate ca ilustrații istorice opționale ale temei educaționale, cu precizare și în modal; ele nu validează noua hartă nominală sau rezultatul noii expresii. Nu se inventează capturi. PNG/PDF realizate automat sunt probe tehnice în `tmp`, nu imagini publicate în tutorial.
- **Compatibilitate semantică:** `#section-14`/`#section-15` rămân expresia și simbolizarea educațională, dar semantica devine explicit „cel mai înalt nivel documentat în cinci câmpuri”. `#section-18` păstrează layoutul, cu legendă după proprietate pentru nucleu și legendă educațională numai în varianta de extensie. Nu se promite aceeași clasificare ca în capturile istorice. `#section-24` păstrează Sector ca extensie și adaugă discuția compoziției. URL-ul T01, numerotarea, fișierele de export și ancorele existente rămân.
- `T01@core.available=false`; modelul înregistrează ținta reală și dependența de aprobare/QA. Nivelul T01 rămâne Începător, derivat din model în catalog, antet și secțiunea existentă despre dificultate. Prefixul activ de opt resurse și `activeThrough='scale-resolution'` sunt neschimbate. Nu este activat T01n sau întregul parcurs.

### Revizia focalizată T02–T06

| Atelier | Deja corect, păstrat | Corecție/clarificare și probă | Rămas netestat |
|---|---|---|---|
| T02 | Formula elevi/săli și protecția numitorului; clasificare graduală a ratei | În original sunt 174 circumscripții, una cu numitor NULL; NULL nu este zero, iar zero elevi/numitor pozitiv produce zero. Indicatorul școlii nu este densitate areală; expresia rulează efectiv în QGIS | Parcurgerea interfeței 3.44 de către un începător |
| T03 | Filtrele și diferențierea serviciului de capacitate | ContractEcograf reprezintă contract CAS, nu disponibilitate live: 132/1082 cabinete secundare. Spitale: CT 29, RMN 22, NULL 90/91; paturi NULL 93/158. NULL exclus de filtru nu devine absență. Limita IF există în pachet, CRS3844 | Interfața 3.44 și verificarea medicală a disponibilității actuale, pe care datele istorice nu o demonstrează |
| T04 | Patru stări nominale; expresia ariei în CRS metric, hectare | Proprietate: Public71/Privat69/Mixt17; filtrul ILIKE nu include implicit Mixt; Sector are două NULL. Aria se execută în QGIS pentru toate cele 157 poligoane | Parcurgerea interfeței 3.44 |
| T05 | Număr absolut versus ponderi, limitele Clip și demonstrația existentă | Școlile includ unități publice și private. CRS-ul proiectului nu rescrie fișierele. Clip real: 530 celule în bbox, 301 rezultate, 117 trunchiate; toate atributele originale sunt păstrate. Nu este realocare de populație | Interfața 3.44 și orice estimare reală a populației din fragmente |
| T06 | Metoda documentată DEM continuu/bilinear, loss-year discret/nearest, 2000+cod; 0/no-loss distinct de NoData exterior255; hillshade XY/Z metric | §13 separă originalele4326 de copiile3844. Titlul/interpretarea de bază sunt Suceava, hillshade + loss-year; ariile protejate și hidrografia apar numai când sunt folosite. Contextul opțional nu condiționează rezultatul | Întregul flux pe DEM/măștile Suceava originale și interfața3.44; fără substituție Rîșca |

### Generare, protecții și teste

Generatorul existent `tools/workshop-content.mjs` citește reviziile din contractul existent. Păstrează wrapper-ele codurilor originale, secțiunile și identitatea figurilor; nu apare un generator sau registru independent. Iterația locală a identificat dublarea figurilor la înlocuirea corpului unui pas: corectată prin separarea explicită a corpului de figurile-soră. Verificarea repetată a generatorului confirmă exact trei figuri T01 și rezultat identic. Tabelele, modalul și progresul existent rămân funcționale.

Snapshotul v3 nu se modifică. Din cele 203 fișiere protejate, **195 rămân identice cu v3**, iar opt au preimagini și hashuri exacte în `tests/protected-files.cjs`: excepția L09 din5.1 rămâne neschimbată; CRS include nota E5-02; șase excepții noi acoperă exclusiv cele trei surse editoriale runtime și contractul/inventarul/capturile atelierelor. Nu sunt relaxate protecțiile algoritmilor ori ale datelor. Testele compară fiecare preimagine cu obiectele Git v3 și resping orice modificare suplimentară, inclusiv pentru excepții.

QGIS executat efectiv: **3.40.11-Bratislava**, GDAL3.11.3, mod offscreen; nu QGIS3.44 și nu o parcurgere GUI. Launcher-ul Windows necesită `PYTHONNOUSERSITE=1` pentru a evita conflictul NumPy2 din profil cu GDAL/NumPy1 al QGIS; `QT_QPA_PLATFORM=offscreen`, `PYTHONIOENCODING=utf-8`. Testul versionat folosește originalele locale identificate prin hash, nu subseturile aplicației. Exporturile au font Arial cu caractere românești verificate și au fost inspectate vizual. Două mesaje GDAL privind accesul update PNG sunt nefatale: API-ul raportează succes, fișierele PNG/PDF sunt valide și vizibile. Exporturile tehnice sunt la150dpi; tutorialul cere300dpi.

Nu se confundă testele de mai jos cu validarea interfeței QGIS3.44, cu aprobarea curriculară sau cu activarea parcursului.

| Verificare | Rezultat final | Dovadă și limită |
|---|---|---|
| `tests/v4-model.cjs`, `tools/validate-learning.cjs` | PASS | 1428 aserțiuni, nouă cazuri negative; 203 preimagini v3, 195 fișiere identice și opt excepții exacte; prefix activ neschimbat |
| `tests/lot52-browser.cjs` | PASS | 748 verificări; toate ancorele atelierelor față de commitul5.1, niveluri unice, șapte pași T01, 375/390/768/1024/1440px × light/dark efectiv, no-JS, modal istoric și texte runtime RO/EN; zero erori/resurse lipsă |
| `tests/qa/lot52-qgis.py` | PASS în QGIS3.40.11 | 3030 verificări; originale și hashuri, 512 combinații CASE + NULL/invalide, axele autorității EPSG, Categorized pe proprietate, PNG/PDF/legendă/scară km în4326 și3844, formulele/filtrele T02–T05 și Clip real |
| `workshop-reproducibility` | PASS | 3611 verificări, 48 combinații ale celor șase ateliere, no-JS/offline, surse, licențe, tabele și demonstrația Clip; zero erori/resurse lipsă |
| `tests/v4-navigation.cjs` | PASS | 4696 aserțiuni; 73 destinații, ancore v3, ordinea scripturilor, 71 intrări, catalog20/20 și navigare statică |
| `tests/v4-browser.cjs` | PASS | 2638 verificări, 364 combinații și toate cele29 operații parametrizate; zero erori/overflow |
| `tests/lot51-browser.cjs` | PASS | 354 verificări; fragment dinamic real, 375/390/768/1280/1440px × două teme, grila introductivă, opt CRS, transformări și rezultate L14 păstrate |
| P01 / P03 / P05 | PASS | 1327 / 3243 / 149487 verificări; modelele numerice și interacțiunile laboratoarelor ale căror texte sunt schimbate |
| P02 / P07 | PASS | 1275 / 5370 verificări; L09 păstrat, Zarr funcțional, L19/GCP/parametri și exporturi PNG/PGW fără regresie |
| `learning-consolidation` / `companion-hub` / `final-ui-check` | PASS | 2833 / 915 / 739 verificări; parcurs, metadate, căutare329 verificări, 73rute, tastatură și prezentare |
| `tests/v4-build.cjs` | PASS local | Două build-uri identice byte-for-byte pentru42HTML/47fișiere generate; `--check` fără scriere; index90 înregistrări |
| Git / contract | PASS | `git diff --check` și `git diff --cached --check`; index gol; snapshot v3 neschimbat; niciun fișier modificat numai CRLF/LF; originale și probe tehnice ignorate de Git |
| QGIS3.44 GUI / T06 complet Suceava / dispozitive fizice | NETESTAT | Este instalat motorul3.40.11, nu o sesiune interactivă3.44; lipsesc DEM-ul și măștile originale ale atelierului Suceava; niciun substitut Rîșca |

Loguri tehnice: `tmp/qa/lot52/build-final.log`, `browser-final.log`, `workshop-final.log`, `existing.log`, `integration.log`, `p07.log`, `v4-navigation.log`, `v4-browser.log`, `lot51-browser.log` și `qgis.log`; rapoarte și imagini în același director și directoarele QA existente. Capturile T01 mobile390 light/dark și ambele PNG QGIS au fost inspectate vizual. Într-o comandă intermediară, numele inexistent `p07-zarr` a produs MODULE_NOT_FOUND; suita reală `p07-labs` a fost apoi executată și a trecut. Selectoarele/aserțiunile testului nou au fost ajustate la ID-uri HTML reale, secțiunea efectivă de dificultate și separatorul zecimal românesc; verificările existente nu au fost rescrise pentru a ascunde regresii. Nu există FAIL funcțional final în domeniul executat.

### Inventarul modificărilor pentru audit

25 fișiere: 23 modificate și două teste noi. Opt rezultate generate: cele șase tutoriale, `analysis.html` și indexul de căutare. Nu sunt incluse date originale, capturi noi publicate, cache-uri sau diferențe exclusiv CRLF/LF.

| Fișier | Rol |
|---|---|
| `DECISIONS_AND_QA.md` | Domeniu, probe, excepții, compatibilitate semantică și limite ale lotului |
| `css/tutorials.css` | Prezentarea nucleului și notelor, folosind suprafețele/culorile existente |
| `data/learning-model.js` | Ținta reală T01@core și dependența încă neactivată; fără schimbarea nivelului sau a prefixului |
| `data/p03-content.js` | Metoda L14 fără numele tehnice interne, cu aceleași limite |
| `data/tutorial-catalog.json` | Descrierea/competențele T01 și statutul opțional al capturilor istorice; nivelul derivat |
| `data/tutorial-dataset-inventory.json` | Dovezi în inventarul existent: originale/schemă/număr/CRS/hash versus documentație/NETESTAT |
| `data/tutorial-screenshots.json` | Domeniul istoric și opțional pentru T01_02/T01_03; imagini nemodificate |
| `data/workshop-reproducibility.json` | Sursa nucleului T01, expresiei CASE și reviziilor punctuale T01–T06 |
| `js/crs-lesson.js` | Nota scurtă despre axele Stereo70; fără calcule modificate |
| `js/p01-labs.js` | L10: disponibilitatea reală și legătura L12, RO/EN |
| `js/p05-labs.js` | L07: legendă lizibilă în loc de P05 |
| `tools/navigation-content.mjs` | Eliminarea workaround-ului pentru textul L14, corectat acum la sursă |
| `tools/workshop-content.mjs` | Generarea reviziilor și nucleului prin contractul existent, cu păstrarea codurilor, figurilor și ancorelor |
| `tests/protected-files.cjs` | Opt excepții exacte cu preimagini v3, dintre care șase noi în acest lot |
| `tests/v4-model.cjs` | Lista limitativă a excepțiilor autorizate, păstrând toate verificările negative |
| `tests/lot52-browser.cjs` (nou) | Comportament real T01, compatibilitate, niveluri și corecțiile runtime |
| `tests/qa/lot52-qgis.py` (nou) | Expresii, renderer, layout/exporturi și geoprocesare pe originalele verificate |
| `analysis.html` | Textul L14 regenerat din sursa corectată |
| `data/search-index.js` | Conținutul educațional actualizat în același inventar canonic de90 înregistrări |
| `tutorials/t01.html` | Nucleu nominal real și extensii corecte, generate din contract; aceleași24 secțiuni |
| `tutorials/t02.html` | Sursa verificată și nota despre numitor/NULL/interpretare |
| `tutorials/t03.html` | Surse verificate, contract versus disponibilitate, capacitate și NULL |
| `tutorials/t04.html` | Surse verificate, proprietate Mixt și filtre nominale |
| `tutorials/t05.html` | Surse verificate, tipul școlilor, CRS și limitele Clip |
| `tutorials/t06.html` | Domeniu NETESTAT explicit, surse versus copii reproiectate, titlu/interpretare fără contexte obligatorii |

### Oprire și decizii rămase

Auditul independent Opus a emis **ACCEPTAT CU REZERVE**. Proprietarul a aprobat definitiv atributul nominal al nucleului, clasificarea descrescătoare în cele cinci niveluri și politica NULL conservatoare; T02–T06 sunt acceptate cu limitările documentate. Aceste decizii nu se redeschid. Rămân reverificarea punctuală E52-01, parcurgerea GUI3.44 de către un începător, durata reală a nucleului, T06 pe originalele Suceava și compatibilitatea semantică E5-03 la QA final. Integrarea/activarea T01n și a parcursului complet, precum și instrucțiunile variantelor proiectului final aparțin Lotului5.3 și nu sunt începute aici.

Starea de livrare: `restructure/v4.0.0`, HEAD `0b3f4a528cdc93237e3a3a18f993861cde54094d`, 23modificate +2noi, index gol. `main`, `origin/main` și v3.0.0 sunt nemodificate. Fără staging, commit, push, merge, tag, release sau Zenodo. Se așteaptă reverificarea punctuală Opus a E52-01, apoi autorizarea commitului local.

### Corecții după auditul Opus — E52-01–E52-04

- **E52-01 — corectat la sursă:** contractul existent `data/workshop-reproducibility.json` conține în pasul4 al nucleului și §18 explicația: „În EPSG:4326, coordonatele sunt exprimate în grade, iar scara diferă între direcțiile est–vest și nord–sud. O bară grafică în kilometri nu poate descrie fidel ambele direcții. Pentru harta finală folosim EPSG:3844, un sistem proiectat cu unități metrice.” Metadatele CRS ale T01 nu mai repetă afirmația anterioară. Configurația finală EPSG:3844, distincția CRS strat/proiect/cadru, datele și toate ancorele sunt păstrate. Dovezile sunt verificarea textelor în cele două ținte DOM, absența celor trei formulări vechi din HTML/index și build-ul determinist.
- **E52-02 — limită a probei:** exportul PyQGIS verifică motorul, geometria hărții, CRS-ul și construirea scării grafice, dar nu validează complet aspectul final cerut studentului. Bara randată în4326 nu demonstrează o scară fidelă în ambele direcții. Imaginea tehnică nu este un model vizual perfect al nucleului T01n și nu înlocuiește verificarea completă a compoziției, legendei, notei metodologice, atribuirii și exportului300dpi. Nu s-a regenerat imaginea QA în această corecție.
- **E52-03 — neblocant:** QGIS poate afișa un dialog pentru alegerea transformării de datum. Comportamentul și alegerea potrivită se verifică în GUI3.44 la QA final, împreună cu CRS-ul și poziția rezultatului. Nu există o instrucțiune de a accepta orbește o transformare; instrucțiunile existente de verificare a CRS-ului/rezultatului rămân valabile.
- **E52-04 — neblocant:** legenda bilingvă L07 „Stil / Style” rămâne în acest lot; optimizarea localizării se transferă în Lotul5.3 sau QA final. Nu se modifică acum controllerul L07.
- **NULL și CASE — aprobate:** §15 explică printr-un singur paragraf că un NULL în oricare dintre cele cinci câmpuri produce „Date incomplete”, chiar dacă alt nivel este1; regula verifică completitudinea, nu doar maximul identificabil. §14 folosește formularea clară „Verificăm nivelurile începând cu Liceal și continuăm descrescător.” Expresia aprobată rămâne identică byte-for-byte: SHA-256 `a2b2e9f1d6e99c3be2d1395bbcc6e501bd799a0009f3e6f741c7735b56fd4171`.
- **Limitări păstrate:** T05 Clip păstrează atributele și nu redistribuie populația; procentele/estimările pe fragmente nu devin observații reale. T06 nu este validat pe DEM/măștile originale Suceava complete, iar Rîșca nu este substitut. T01@core rămâne neactivat; nu se începe Lotul5.3.
- Excepția controlată pentru contractul atelierelor primește numai noul hash exact; preimaginea v3 și celelalte șapte excepții rămân identice. Snapshotul v3 și originalele sunt păstrate. Testul nou verifică separat hashul CASE aprobat și cele două formulări științifice; nu se relaxează verificările existente.

| Reverificare după corecție | Rezultat | Dovadă |
|---|---|---|
| `tests/lot52-browser.cjs` | PASS,795 verificări | Textul E52-01 în `#t01-core-layout` și `#section-18`, cele trei formulări anterioare absente din HTML/index, NULL explicat în §15, ordine clară în §14; șapte etape,24secțiuni, nivel Începător și ancore păstrate; zero erori/resurse lipsă |
| `workshop-reproducibility` | PASS,3611 verificări | Cele șase ateliere,48 combinații, no-JS/offline, surse și demonstrația Clip |
| `tests/v4-model.cjs` și validator | PASS,1428 aserțiuni | Contract v3,203 fișiere protejate, opt excepții exacte,195 fișiere identice; prefixul activ neschimbat |
| `tests/v4-build.cjs` | PASS | Două build-uri identice pentru42HTML/47fișiere; `--check` fără scriere; index90 înregistrări |
| Controlul domeniului și datelor | PASS | CASE cu hash aprobat identic; toate cele nouă GPKG originale păstrează hashurile din execuția PyQGIS; snapshotul v3 nemodificat; nicio schimbare suplimentară în T02–T06 ori datele aplicației |
| `git diff --check` și index | PASS | Fără erori whitespace; index gol, fără staging/commit; aceleași referințe Git |

Fișiere modificate suplimentar față de lotul trimis la audit: `data/workshop-reproducibility.json` (sursa), `tutorials/t01.html` și `data/search-index.js` (generate), `tests/protected-files.cjs` (hash exact), `tests/lot52-browser.cjs` (regresie punctuală), `DECISIONS_AND_QA.md` (audit și aprobări). Dovada domeniului este în `tmp/qa/lot52/opus-scope-results.json`; loguri: `opus-build.log`, `opus-model.log`, `opus-browser.log`, `opus-workshops.log`. Totalul working tree rămâne23modificate +2noi. Motorul QGIS și exportul de referință nu sunt rerulate în această corecție editorială; limitările E52-02/E52-03 și T05/T06 rămân explicite. Oprire înainte de staging și commit pentru reverificarea punctuală Opus; fără Lotul5.3.

**Închidere Lot5.2 — verdict final Opus: ACCEPTAT CU REZERVE.** Conform rezultatului comunicat de proprietar, reverificarea punctuală independentă a confirmat E52-01 **CORECTAT** în ambele locuri din T01. Auditul și reverificarea sunt încheiate; commitul local este autorizat după verificările finale, cu aprobările curriculare și limitările E52-02/E52-03/E52-04 și T05/T06 deja documentate. Fără publicare și fără începerea Lotului5.3.

## Etapa 5 — Lotul 5.3: integrarea parcursului și proiectului final (2026-10-21)

Preflight PASS: branch `restructure/v4.0.0`, HEAD `65390e99bcdba4c4d1d36ceeeb8a041b09a8b82d`, working tree curat și index gol. `main`, `origin/main` și tagul v3.0.0 rămân la `6c36a95c2bb58d31208efbee4b9f3595130bb814`. Sunt consultate planul director v2, deciziile/auditurile anterioare din acest jurnal și matricea aprobată implementată în model. Lotul este implementat pentru audit Opus, fără staging/commit și fără începerea Etapei6.

### Parcurs activ și delimitări

| Etapă | Resurse active | Rezultat verificabil |
|---|---|---|
| Poziție și hartă | 1.1 →2.1 →2.2 →2.4 →2.5 →2.6 | Localizezi un punct și identifici scara, cadrul, legenda |
| Date și scară | Date geospațiale →L01 →1.2i | Distingi entități/pixeli, unități și citirea coordonatelor X/Y |
| Reprezentare și orientare | 4.4 →4.6 →WFi | Alegi simboluri nominale și distingi fișierul de proiect |
| Prima hartă | T01n | Șapte pași reali pentru hartă după proprietate, legendă și verificarea exporturilor; fără CASE obligatoriu |
| CRS și reproductibilitate | 3.1 →3.2 →1.2 integrală →L03 →L04 →workflow integral | Verifici CRS/unități, compari măsurări și documentezi fluxul |
| Analiză și verificare | 4.2 →L05 →L20 →L14 →L13 | Verifici indicatorul, expresia, operația ghidată și calitatea |
| Aplicație și proiect | O singură variantă A/B/C, cu pregătirea specifică | Hartă, fișă reproductibilă, verificare și interpretare; sfârșit explicit |

Trunchiul are24 pași cu22 destinații distincte; revenirea la 1.2 și workflow folosește competențe diferite. Variantele adaugă2/2/4 pași (A/B/C), fără a obliga studentul să le parcurgă pe toate. T02 este recomandat pentru B, nu obligatoriu. Ramurile vectorială, raster, reprezentare, analiză/decizie și formate/georeferențiere rămân explorare liberă; pregătirea lor se derivă din aceleași prerechizite. Nu apare un registru paralel, un cont sau o cheie nouă de progres.

- `1.2i`: ținta reală `#concept-rect`, grila locală la `#grila`; resursa integrală revine la `#sisteme-rect`. Experimentul avansat rămâne `#crs-grid`; niciuna dintre ancore nu este redenumită. Linkurile interne spun „Grilă introductivă”, respectiv „Grilă în CRS”. Semantica publicată a `#grila` diferă de v3 și rămâne în backlog-ul QA final pentru referințele externe.
- `WFi`: `#etape` și `#proiect-date` sunt secțiuni statice reale. Contrar unei observații anterioare, `#proiect-date` nu se află în panoul dinamic `#workflow-detail`; schimbarea celor opt panouri nu îl elimină. Continuarea introductivă este lângă această secțiune. `#workflow-integral` delimitează revenirea pentru aplicarea/reproductibilitatea fluxului după T01n.
- `T01n`: ținta `#t01-core`, cele șapte acțiuni existente și o continuare proprie după nucleu. Cele24 secțiuni istorice și expresia CASE aprobată sunt păstrate. T01 integral nu este echivalat cu nucleul; deschiderea unui fragment nu este finalizare.
- Continuările sunt derivate din `plan.stages`, `plan.endings` și `plan.branches`. Introducerile au navigare proprie; coada paginii indică explicit resursa integrală. Acțiunile cu același href sunt deduplicate. După L13 se alege aplicația pe aceeași pagină PF; după PF nu există continuare automată către început. Textul terminal este condițional: după realizarea și verificarea proiectului, nu după simpla vizitare.

### Matricea proiectului final și domeniul verificării

O singură pagină `final-project.html`, aceleași rubrici și trei ancore de aplicație: `#proiect-medical`, `#proiect-population`, `#proiect-raster`. Titlurile/URL-urile operațiilor și documentația lor sunt derivate din registrul existent `processing-operations.json`; cele29 operații nu sunt modificate. Ghidajul minimal este în sursa existentă `data/learning-pages.js`, nu în trei ateliere noi.

| Variantă | Pregătire obligatorie / recomandată | Execuție și verificare minimală | Limită și probe |
|---|---|---|---|
| A — medical | Trunchi +T03; L04 este în trunchi | Filtru de eligibilitate +Buffer500m,20segmente, ori Distance to nearest hub(points), origini/ținte și ID unic, Meters; output separat și verificare pe o origine | Buffer este zonă la prag fix, Nearest este țintă/distanță directă; niciuna nu este acces pe rețea. PyQGIS3.40:132 buffere pe serviciile medicale eligibile și5 origini de test către aceleași132 servicii din originalul medical; nu este flux GUI3.44 complet |
| B — populație | Trunchi +T05; L04 în trunchi; T02 recomandat | Buffer →Dissolve fără câmp →Intersection cu gridul; aria originală calculată înainte, ID/populație păstrate; ponderi pe ID≤1 | Dizolvarea evită dublarea suprapunerilor. Intersecția copiază populația, nu o redistribuie. Estimarea la suprafață presupune distribuție uniformă; nu devine număr exact al domiciliilor. PyQGIS pe originale:757 buffere,234 fragmente de intersecție în zona de grid testată, fără realocare de atribute; nu se pretinde analiza întregului grid național |
| C — relief | Trunchi +L11 +L15 +T06 | Mască/pregătire/hillshade și selecție de ani; Slope opțional când întrebarea cere înclinare. QGIS Slope, Z=1 pentru XY/Z metrice, grade; mască DEM explicită înainte de statistici | DEM=elevație, slope=înclinare, hillshade=iluminare. Procentele nu sunt grade. Coduri1–24→2001–2024,0/no-loss distinct de NoData255. Continuu/bilinear versus categoric/nearest și aliniere explicită. Motor verificat numai pe DEM sintetic; fluxul Suceava pe originale complete și GUI3.44 NETESTAT. Rîșca nu este substitut |

Documentația3.44 consultată efectiv: `processing_algs/qgis/vectorgeometry.html` (Buffer/Dissolve), `vectoranalysis.html` (Distance to nearest hub(points), câmpurile/Measurement unit), `vectoroverlay.html` (Intersection/atribute), `rasterterrainanalysis.html` (Slope în grade, Z factor). URL-urile complete sunt cele deja asociate operațiilor din registru; nu se creează alt registru de surse.

**Constatare metodologică demonstrată în test:** QGIS3.40 Slope a întors45° pe un plan sintetic și la o celulă unde DEM-ul central era NoData, derivata fiind calculată din vecini. Instrucțiunea nouă cere compararea măștilor și Raster Calculator `"dem_suceava@1" *0 + "panta_suceava_grade@1"` pe aceeași grilă înaintea statisticilor. Testul execută calculatorul: celula lipsă este exclusă, iar panta validă rămâne45°. Nu se modifică motorul GIS al platformei și nu se extrapolează această probă la execuția completă Suceava.

**Izolarea originalelor în QA:** filtrarea directă prin provider a produs o variație binară în copia temporară SQLite/GPKG medicală, inclusiv după eliberarea providerului. Copia ignorată de Git a fost restaurată byte-for-byte din arhiva oficială deja verificată; testul lucrează acum pe copii în memorie și controlează hashurile și după închiderea QGIS. Toate cele nouă originale au din nou hashurile sursei. Nicio geometrie/valoare originală și niciun fișier de date versionat nu este schimbat. Nu se redistribuie originalele.

### Relații și observații restante

Relațiile contextuale sunt completate simetric în `learning-model.js` și afișate în contextul resursei: coordonate↔L03/L04/L19; cartogramă↔L05/T02; simboluri↔L07/T01 și categorii calitative↔T04; date↔L14/T05; calitate↔PF; L11↔L15/T06; formate↔L12. T03/T05/T06 trimit către proiectul integrator. Aceste asocieri nu mută resursele din capitolul canonic și nu devin prerechizite artificiale.

- **E52-04 implementat:** L07 afișează „Stil” sau „Style” după limba activă, inclusiv la comutare și restaurarea URL-ului `L07-design`. Se reutilizează mecanismul existent; niciun algoritm/renderer de hartă nu este înlocuit.
- **E52-02 păstrat:** exportul tehnic PyQGIS nu este modelul vizual complet al studentului și nu este publicat ca imagine nouă în T01. Verificarea tehnică nu certifică toate criteriile vizuale ale livrabilului.
- **E52-03 clarificat prudent în nucleu:** dacă apare dialogul transformării, studentul verifică CRS sursă/țintă, zona, grilele cerute și poziția rezultatului; nu acceptă automat prima opțiune. Dialogul GUI3.44 rămâne NETESTAT.
- **E4-04 și Etapa6:** determinism între medii/fonturi, compatibilitate semantică a fragmentelor externe, dispozitive fizice/accesibilitate și verificări GIS finale end-to-end rămân deschise, alături de Suceava complet. Lotul5.3 nu este audit de release.

### Validare, generare și protecții

Validatorul verifică ID-uri/segmente, aliasuri, cicluri obligatorii și ale continuărilor, pregătirea fiecărei variante, ordinea introducere/integral și identitatea lor distinctă, terminalele și concordanța etapelor afișate cu modelul. Testele negative includ eliminarea pregătirii A/B/C, înlocuirea introducerii cu resursa integrală, aliasuri, ID-uri inexistente și restart după PF. Valabilitatea grafului nu dovedește executarea de către student și nu blochează accesul.

Sursele generatoare sunt corectate înaintea HTML-urilor. Generatorul atelierelor păstrează fragmentul de navigare T01 deținut de rendererul comun; fără această separare, `--check` detecta regenerarea diferită a nucleului. Două build-uri locale identice și `--check` verifică toate42 HTML și47 fișiere generate.

Snapshotul v3 rămâne nemodificat; sunt păstrate195 fișiere identice și opt excepții exacte. Numai hashurile existente pentru `js/p05-labs.js` (localizare) și `data/workshop-reproducibility.json` (nota prudentă datum) se actualizează; celelalte șase excepții și preimaginile v3 rămân. Așteptările testelor vechi privind prefixul de opt pași sunt actualizate la activarea autorizată de24 pași; verificarea ancorelor din consolidare testează și țintele randate după JS, nu le elimină din verificare.


### Rezultate finale și fișiere pentru auditul Lotului5.3

| Verificare | Rezultat final și domeniu |
|---|---|
| Model/contract și validator | PASS:1438 aserțiuni;14 cazuri structurale negative +3 continuări live corupte;73 destinații,34 numerotări,20L/6T,12 provocări și nivelurile păstrate |
| Parcurs integrat `tests/lot53-browser.cjs` | PASS:343 verificări;24 pași urmăriți prin click real, trei aplicații, WFi/panouri și derulare reală dupăJS la #etape/#proiect-date/#workflow-integral, cele patru fragmente1.2 dupăJS, L07 RO/EN și stareURL, mobil/light/dark/no-JS și execuția R1–R6; zero erori/resurse lipsă |
| Navigare v4 | PASS:4696 aserțiuni pe73 rute și navigare/catalog statice |
| Browser v4 | PASS:2638 verificări,364 combinații și toate29 operațiile parametrizate, persistența provocărilor și no-JS |
| Regresie5.1 /5.2 | PASS:354 /795 verificări, inclusiv E52-01/CASE/NULL/șapte pași/24 secțiuni T01 și ancore |
| Ateliere / consolidare / catalog | PASS:3771 /2957 /916 verificări;329 verificări de căutare; contexte pedagogice și ancore efective |
| P01/P02/P03/P04/P05/P06/P07 | PASS:1327 /1275 /3243 /591 /149487 /31465 /5370; toateL01–L20, stărileL03/L07/L12/L19, GCP/exporturi și referințe numerice păstrate |
| V1–V6 | PASS:execuție în suita existentă `challenges-vector`, inclusiv AND/OR, criterii goale și responsive |
| PyQGIS3.40.11 | PASS:3983 verificări;757 buffere școli,132 buffere medicale,5 origini Nearest,234 fragmente Intersection, arii inițiale păstrate și estimare QGIS egală cu referința geometrică; Slope45°/mască pe DEM sintetic. Nu certifică GUI3.44 ori Suceava complet |
| Build local | PASS:două rulări identice byte-for-byte pentru42HTML/47fișiere; --check fără scriere;90 înregistrări de căutare |
| Git și integritate | PASS:diff --check, index gol; snapshot v3 nemodificat;195 fișiere identice cu v3 +8 excepții exacte; nouă GPKG originale verificate inclusiv după teardown |
| GUIQGIS3.44, Suceava complet, determinism între medii/fonturi, dispozitive fizice/accesibilitate, semantica fragmentelor externe și aplicații finale end-to-end | NETESTAT / backlog Etapa6; nu sunt închise prin PASS-urile locale |

Nu există FAIL funcțional final rămas în domeniul executat. Rulările intermediare au corectat fixture-uri/nume de câmp reale (`Populatia_totala_T`, `Contract Ecograf`) și așteptări ale testelor care acceptau numai resurse integrale; verificarea ancorelor a fost extinsă la randarea reală, cu un context Playwright separat. Constatarea Slope/NoData a fost rezolvată în metodă și test, nu prin schimbarea algoritmilor ori ascunderea unui rezultat.

Loguri tehnice ignorate de Git: `tmp/qa/lot53-build-final.log`, `lot53-model.log`, `lot53-final-browser.log`, `lot53-v4-navigation.log`, `lot53-v4-browser.log`, `lot53-lot51-browser.log`, `lot53-lot52-browser.log`, `lot53-existing.log`, `lot53-learning.log`, `lot53-qgis.log`. Ultimul log separat al consolidării este PASS după corectarea verificărilor; prima comandă de grup păstrează FAIL-ul intermediar în istoric. Probe PNG/JSON în `tmp/qa/lot53/`; capturile390px light/dark au fost inspectate vizual. Exporturile PyQGIS rămân probe tehnice, nu modele vizuale complete.

**Inventar:56 fișiere,55 modificate +un test nou;39HTML sunt generate.** Restul fișierelor generate identice nu intră în diferență. Nu există documente paralele, date/algoritmi GIS versionați modificați sau fișiere temporare incluse.

| Sursă/test | Rol |
|---|---|
| `data/learning-model.js` | Activare24 pași, trei finaluri, ținte și continuări derivate, relații contextuale; disponibilitate editorială distinctă de finalizare. |
| `data/learning-pages.js` | Progresie completă și instrucțiuni minimale PF A/B/C, cu rubricile existente și masca DEM explicită. |
| `data/workshop-reproducibility.json` | O notă prudentă despre dialogul transformării în nucleul T01; CASE și atelierele validate sunt păstrate. |
| `js/learning.js` | Linkuri către segmente, continuări scoped/integrale, alegerea variantei și relații vizibile; fără persistență nouă. |
| `js/p05-labs.js` | Localizarea RO/EN a legendelor L07 prin mecanismul existent. |
| `tools/learning-content.mjs` | Generare statică pentru segmente, pregătire PF și legături QGIS derivate din registre. |
| `tools/workshop-content.mjs` | Păstrarea fragmentului de continuare deținut de rendererul pedagogic în regenerarea nucleului. |
| `tools/validate-learning.cjs` | Validarea integrării, pregătirii variantelor, segmentelor și continuărilor, inclusiv cicluri/aliasuri. |
| `tests/v4-model.cjs` | Așteptări actualizate pentru integrarea autorizată;14 cazuri negative structurale și3 mutații de continuări live. |
| `tests/lot51-browser.cjs` | Activarea autorizată fără relaxarea verificărilor grilei, CRS și fragmentelor dinamice. |
| `tests/lot52-browser.cjs` | Disponibilitatea aprobată a nucleului și24 pași; păstrează testele CASE, E52-01 și compatibilitate. |
| `tests/qa/learning-consolidation.cjs` | Acceptă numai segmente reale/disponibile și verifică ancorele dinamice în browser separat. |
| `tests/qa/lot52-qgis.py` | Operații PF pe originale/copii în memorie, formule de arie, DEM sintetic și hashuri după închiderea QGIS. |
| `tests/protected-files.cjs` | Două hashuri curente actualizate în cele opt excepții existente; preimagini și snapshot intacte. |
| `DECISIONS_AND_QA.md` | Domeniu, metode, probe, limite și transferuri pentru auditul Opus. |
| `data/search-index.js` | Conținut regenerat în aceleași90 înregistrări:72 resurse canonice +18 scenarii; fără alias duplicat |
| `tests/lot53-browser.cjs` (nou) | Simulare end-to-end a navigării, segmentelor, aplicațiilor și provocărilor raster |

Paginile generate actualizează contextul și continuările derivate; în `learning-path.html`, `workflow.html` și `final-project.html` sunt integrate și delimitările/instrucțiunile descrise mai sus. `tutorials/t01.html` primește continuarea nucleului și nota datum; T02–T06 primesc numai contextul/navigarea comună, fără rescrierea pașilor validați.

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
- `map-diagnostics.html`
- `measurement-lab.html`
- `network-accessibility.html`
- `projection-crs-lab.html`
- `projection-intro.html`
- `raster-analysis.html`
- `raster-styling.html`
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

**Oprire pentru audit:** branch `restructure/v4.0.0`, HEAD `65390e99bcdba4c4d1d36ceeeb8a041b09a8b82d`, working tree intenționat modificat, index gol. `main`, `origin/main` și v3.0.0 sunt nemodificate. Fără staging, commit, push, merge, tag, release ori Zenodo. Etapa6 nu este începută.


### Reverificare punctuală după auditul Opus — E53-01 și E53-02

Auditul independent al Lotului5.3 are verdictul **ACCEPTAT CU REZERVE**, fără defecte blocante. Proprietarul solicită cele două ajustări înaintea reverificării punctuale Opus; staging-ul și commitul rămân amânate explicit până la confirmare. Nu se reia auditul întregului lot.

- **E53-01 — remediat în sursa autoritativă:** pasul4 T01n din `data/workshop-reproducibility.json` folosește explicația de nivel Începător: „Dacă QGIS solicită alegerea unei transformări de coordonate, pentru acest exercițiu folosește opțiunea implicită recomandată pentru zona Bucureștiului și notează transformarea utilizată. Dacă programul avertizează că transformarea nu este disponibilă sau că lipsesc grile necesare, verifică situația înainte de export. Criteriile de alegere sunt explicate ulterior în lecția1.2 integrală și în L03.” Ultimele două resurse sunt legături reale către `../lesson.html?id=rectangular-coordinates#sisteme-rect` și `../projection-crs-lab.html`. Această formulare înlocuiește cerințele premature despre zona de utilizare/grile din nota E52-03 consemnată anterior; nu afirmă diferențe metrice neverificate între transformări. CRS-ul datelor, EPSG:3844 final, expresia CASE și politica NULL sunt păstrate.
- **E53-02 — remediat în sursa autoritativă:** variantaA din `data/learning-pages.js` definește stratul `puncte_interes` (de exemplu școli alese din setul ADIZMB existent), cu ID-uri stabile, reproiectat în EPSG:3844. După Buffer pe servicii, fără Dissolve și cu ID-ul serviciului păstrat, Select by Location selectează **bufferele individuale** care intersectează punctele; opțiunea este creating new selection. Exportul numai al selecției, `medical_selectate.gpkg`, păstrează identificarea serviciilor. Studentul raportează pragul, numărul și ID-urile serviciilor apropiate de cel puțin un punct și verifică pe hartă o relație și ID-ul serviciului. Nu este lista punctelor acoperite de o reuniune și nu se pretinde asocierea tuturor perechilor serviciu–punct. Buffer și Nearest rămân alternative după întrebare; niciuna nu reprezintă accesibilitate pe rețea. Numărul eligibil rămâne132.

Documentație verificată: [QGIS3.44 — Select by location](https://docs.qgis.org/3.44/en/docs/user_manual/processing_algs/qgis/vectorselection.html#select-by-location), INPUT/INTERSECT, predicat intersect și selecție nouă. Proba PyQGIS3.40.11 execută selecția și exportul în memorie pe cele132 buffere medicale și cinci puncte școlare din datele originale: **două servicii selectate**, ID-uri de test37 și72, confruntate cu intersecțiile geometrice și pragul euclidian500m. Aceste ID-uri sunt probe locale, nu identificatori publici noi sau un rezultat impus studentului. Toate cele nouă originale rămân identice inclusiv după închiderea QGIS. Aceasta este verificare documentară și a motorului pe date originale, **nu execuție GUI3.44**.

**Etapa6 — observații deschise:** E53-03 (înlocuirea temporizării fixe din `v4-navigation.cjs` cu așteptare bazată pe condiție); E53-04 (deduplicarea legăturilor T06 după pagina-destinație); E4-04 (determinism între medii/fonturi); dialogul transformării în GUI QGIS3.44; fluxul complet Suceava pe originale; compatibilitatea semantică a fragmentelor publicate, inclusiv #grila/#crs-grid; dispozitive fizice și accesibilitate. Acestea nu sunt declarate rezolvate. Limitările T05/T06 și distincția export tehnic versus model vizual complet T01 rămân valabile.


**Verificări punctuale după corecții — PASS:**

| Verificare | Rezultat și dovadă |
|---|---|
| Validator pedagogic și contract v3 | PASS; `e53-model-final.log`:1438 verificări,14 cazuri negative,203 hashuri protejate (195 nemodificate și aceleași8 excepții exacte). Numai hashul excepției existente pentru contractul atelierelor este actualizat pentru textul E53-01; snapshotul v3 nu este rescris. |
| Parcurs/T01n/trei variante/PF | PASS; `e53-browser-final.log`:361 verificări,24 pași și3 variante, legături reale spre1.2 integrală/L03, condițiile metodei Buffer și alternativa Nearest, light/dark,375/390/768/1280px, fără erori runtime sau resurse lipsă. |
| T01/CASE/NULL și secțiuni | PASS; `e53-t01.log`:795 verificări;7 pași,24 secțiuni, nivel Începător și hash CASE aprobat neschimbat. |
| Ateliere și legături | PASS; `e53-workshops.log`:3787 verificări,48 layouturi, fără erori sau resurse lipsă. |
| Motor QGIS și date originale | PASS; `e53-qgis.log`:3990 verificări, inclusiv selecția celor2 servicii și păstrarea ID-urilor;132 servicii eligibile și9 originale neschimbate. GUI3.44 și Suceava integral rămân NETESTAT. |
| Generator și --check | PASS; `e53-build-final.log`:două build-uri identice,42HTML/47fișiere generate; --check nu scrie. Determinismul între medii nu este certificat. |

Primul test browser a detectat scroll orizontal la375px din cauza numelui lung al noului output. Numele a fost scurtat la `medical_selectate.gpkg`; retestarea finală este PASS. Logul inițial `e53-browser.log` rămâne disponibil, fără ascunderea FAIL-ului intermediar. Modelul progresiei, cele29 operații din registru, motoarele GIS și contractele URL/ancore sunt identice față de starea trimisă la audit. Nu sunt introduse ancore sau parametri noi.

**Domeniu suplimentar verificat:**9 fișiere, fără modificări neașteptate sau exclusiv CRLF/LF: `data/workshop-reproducibility.json`, `data/learning-pages.js` (surse), `tutorials/t01.html`, `final-project.html`, `data/search-index.js` (generate), `tests/lot53-browser.cjs`, `tests/qa/lot52-qgis.py` (probe punctuale), `tests/protected-files.cjs` (hash exact), prezentul jurnal. Inventarul prin hashuri înainte/după este în `tmp/qa/e53-scope.json`; toate logurile menționate sunt ignorate de Git în `tmp/qa/`.

**Oprire înainte de staging și commit:** branch `restructure/v4.0.0`, HEAD `65390e99bcdba4c4d1d36ceeeb8a041b09a8b82d`,55 fișiere modificate și testul nou existent `tests/lot53-browser.cjs`; index gol. `git diff --check` PASS. `main`, `origin/main` și tagul v3.0.0 rămân la baseline. Fără commit/push/merge/tag/release/Zenodo; Etapa6 nu este începută. Urmează numai reverificarea punctuală Opus a E53-01/E53-02.


### Închidere Lotul 5.3 — verdict final Opus și autorizare commit

Conform confirmării proprietarului, auditul independent Opus este **ACCEPTAT CU REZERVE**, iar reverificarea punctuală confirmă **E53-01 — CORECTAT** și **E53-02 — CORECTAT**. Parcursul complet de24 pași este **ACCEPTAT**; delimitările1.2i, WFi și T01n sunt **ACCEPTATE**; varianteleA, B șiC ale proiectului final sunt **ACCEPTATE cu limitările documentate**. Nu sunt necesare modificări funcționale suplimentare. Commitul local al Lotului5.3 este autorizat; Etapa5 este pregătită pentru închidere prin acest commit, după verificările finale. Această autorizare înlocuiește oprirea pentru reverificare consemnată anterior.

**Observație neblocantă Opus — identificatori medicali:** câmpul `hub_id` din proba PyQGIS este poziția obiectului în setul filtrat, nu un identificator original persistent. ID-urile37 și72 din proba locală demonstrează păstrarea relației în acel test, dar nu certifică identitatea persistentă a sursei. Pentru QA final se recomandă repetarea verificării cu un identificator stabil al sursei, fără schimbarea semanticii aplicației. Nu se modifică acum testul, datele sau tutorialele validate.

**Backlog Etapa6, toate deschise:**

- E53-03 — eliminarea temporizării fixe de80ms din testul navigării și folosirea unei condiții observabile.
- E53-04 — deduplicarea linkurilor T06 spre proiectul final după pagina-destinație.
- E4-04 — determinism între sisteme/fonturi; probele locale nu certifică acest criteriu.
- E5-03 — compatibilitatea semantică a fragmentelor publicate, inclusiv #grila/#crs-grid.
- E52-03 — verificarea interfeței și dialogului transformării în QGIS3.44.
- Testul integral Suceava pe datele originale; Rîșca nu este substitut.
- Dispozitive fizice și accesibilitate.
- Identificatori stabili ai sursei în verificările variantei medicale.

Limitările T05/T06 și distincția dintre exportul tehnic PyQGIS și un model vizual complet T01 rămân documentate. Etapa6 nu este începută prin această închidere. Fără push, merge, tag, release sau Zenodo.


**Verificări finale pentru commit — toate PASS:** validatorul pedagogic și contractul v3 (1438 verificări,14 cazuri negative,203 hashuri:195 nemodificate +8 excepții exacte); traseul24 pași/3 variante/T01n/PF (361); T01/CASE/NULL (795); regresie browser (2638,364 layouturi și toate29 operații parametrizate, fără erori); consolidare pedagogică (2957); ateliere (3787); PyQGIS3.40.11 (3990). Cele nouă GeoPackage-uri originale au aceleași hashuri ca înaintea rulării și după închiderea QGIS. Snapshotul v3 rămâne identic. Două build-uri locale sunt identice pentru42HTML/47fișiere generate, iar --check nu scrie. `git diff --check` PASS. Nicio regresie detectată în domeniul executat; limitele GUI3.44/Suceava și backlogul de mai sus rămân explicite.

Dovezi ignorate de Git în `tmp/qa/`: `lot53-commit-model.log`, `lot53-commit-path.log`, `lot53-commit-t01.log`, `lot53-commit-regression.log`, `lot53-commit-existing.log`, `lot53-commit-qgis.log`, `lot53-commit-build.log`; inventarul exact în `lot53-commit-scope.json`, preimaginile originalelor și referințelor Git protejate în fișierele `lot53-commit-originals-before.json` și `lot53-commit-protected-refs.json`. Domeniul este55 fișiere modificate +testul nou existent, fără fișiere temporare sau modificări exclusiv CRLF/LF; `data/geospatial-formats.js` este exclus explicit. Închiderea Etapei5 se realizează printr-un singur commit local, cu mesajul `feat(v4): integrate guided learning path and final projects`, pe `restructure/v4.0.0`. Hashul final este raportat în conversație. Nu se publică modificările și nu se începe Etapa6.


## Operațiunea 6.1 — stabilizare tehnică și QA integrat (21.10.2026)

Preflight: `restructure/v4.0.0`, HEAD `4e67de43f2b3900bbfdc547b594a83252d8bd010`, working tree și index curate; main/origin/main și v3.0.0 la baseline `6c36a95c2bb58d31208efbee4b9f3595130bb814`. Planul director v2 și constatările Opus consemnate în jurnal/conversație au fost consultate; nu sunt pretinse audituri externe noi. Cele șapte capitole, 24 de pași, trei variante, niveluri/culori, T01/proprietate și CASE/NULL rămân identice. Nu se introduce registru sau framework paralel.

**Licențe — clarificare explicită a proprietarului:** cerința inițială 6.1 menționa CC BY-NC 4.0, dar LICENSE/CONTENT_LICENSE.md și baseline-ul declară CC BY 4.0. Proprietarul confirmă păstrarea **CC BY 4.0 existente**. Codul rămâne MIT; materialele terțe își păstrează licențele/atribuirile. Niciun fișier de licență, publicație din 1974, imagine sau set original nu este relicențiat ori înlocuit.

### A. Corecții confirmate și probe PASS

| Constatare | Remediu și dovezi |
|---|---|
| E53-03 — sincronizare navigare | Eliminată așteptarea fixă80ms. Testul așteaptă ancorele reale, meniul de71 linkuri, breadcrumb-ul și resursa activă canonică; timeout-ul raportează o condiție lipsă. Patru rulări complete independente: **4709 verificări fiecare**,73 destinații, ancore dinamice și trei variante. În plus, trei traversări efective ale celor24 pași prin click: **361 verificări fiecare**, inclusiv WFi/panouri, revenirile1.2/workflow, proiecte terminale și R1–R6. |
| E4-04 — index stabil editorial | Cauza reprodusă: tabelele de rezultate pentru etichete, dependente de Canvas/font, modificau valorile/poziția primei apariții în lista de paragrafe deduplicate a L07. Cu Arial/Courier New au variat coliziunile6→12 și ordinea paragrafelor din jurul „Centrul E”; nu era o schimbare editorială. Extracția exclude containerele `.lab-dynamic`, `.repair-results`, `.carto-records`, `.carto-legend` și statusurile, păstrând explicațiile, corespondențele istorice, comenzile și valorile editoriale statice. Se păstrează inclusiv aserțiunea existentă „Alege30” pentru output static. Toate72 resursele canonice au aceeași descriere/listă de paragrafe în două configurații CSS/Canvas;90 înregistrări, titluri/destinații păstrate. Lățimile Canvas144,236 și180,029px demonstrează diferența reală a configurațiilor. Două build-uri independente sunt byte-identice, --check nu scrie. **Windows/Linux nativ și alte browsere rămân NETESTAT.** |
| E53-04 — T06 | Rendererul comun adaugă întâi ținta pedagogică și deduplică apoi continuarea de capitol după pagină, păstrând query-ul identității. T06 are un singur link de continuare spre `../final-project.html#proiect-raster`. Nu sunt eliminate asocierile cu alt rol din pregătire și nici ancorele A/B/C. |
| Defect nou confirmat — fragment schimbat înainte de fonts.ready | Callback-ul1.2 reținea ținta inițială și putea suprascrie navigarea ulterioară. Cu fonturile reținute explicit, URL-ul #sisteme-rect ajungea la top1931px într-un viewport720px, iar vechiul #concept-rect rămânea la295px. Callback-ul recitește fragmentul curent la execuție; aceeași probă pune ținta cerută la295px. Există regresie proprie cu gate de fonturi și verificare după două cadre; nu se schimbă IDs, sensul ancorelor sau calculele CRS. |
| Defect nou confirmat — L19/history înainte de inițializare | Skip-link/history poate emite popstate înaintea importului asincron al API-ului și producea undefined.restore. Handlerul P07 așteaptă inițializarea; ready() citește apoi URL-ul curent. Proba ține modulul blocat, declanșează istoric înainte de API, îl eliberează și verifică pornirea fără erori. Cheile, formatele, GCP și algoritmii nu sunt schimbate. |
| Defect nou confirmat — text la mărire | Cardurile înguste lăsau cuvintele și numele de fișiere să depășească lățimea. overflow-wrap:anywhere pe carduri și white-space:normal pe codul inline corectează problema. Nu se schimbă paleta, fundalurile sau structura. Reflow375/640px și stres CSS200% sunt verificate; CSS zoom nu este confundat cu zoom-ul nativ care actualizează media queries. |

**GIS A — identificatori medicali:** în originalul Secondary Care, cheia primară GeoPackage `fid` este nenulă și unică pentru1082 obiecte. Este copiată ca `source_fid` înainte de filtrare/reproiectare, iar `hub_id` îi copiază valoarea. Cele132 servicii eligibile sunt păstrate. Maparea probei auditate este37→**215 (S.C.M Povernei)**,72→**497 (Institutul Național de Geriatrie și Gerontologie Ana Aslan)**. Buffer/Select by Location păstrează exact aceste chei; inversarea ordinii tuturor serviciilor nu schimbă selecția sau rezultatele Nearest ale celor cinci origini. Cheia este stabilă în versiunea GeoPackage identificată prin checksum, nu garantată după un nou export al sursei. Originalul nu este editat.

**GIS B — populație:** pe originale,757 buffere, dizolvare,234 fragmente de intersecție în zona de grid examinată; populația/ID-ul și aria originală se păstrează, ponderile sunt confruntate cu o referință geometrică independentă și nu dublează celulele. Aceasta verifică o estimare la suprafață, nu o redistribuire exactă a persoanelor și nici întregul grid național.

**GIS C/T06 — date locale găsite:** căutarea a identificat materialele atelierului în folderul bibliografic local. Sunt disponibile DEM-ul Copernicus deja proiectat, Hansen v1.12/2024 deja proiectat, masca Suceava și copiile de lucru DEM/loss. Nu sunt substituite cu Rîșca. Metadatele arată EPSG:3844, pași diferiți23,559m versus24,060m și lipsa tagului NoData în intrările locale. Se verifică numai un ROI6×6km,200×200 celule la30m: Warp/aliniere, bilinear pentru DEM/nearest pentru ani, cutline Suceava, NoData explicit-9999/255 în ieșiri, Hillshade, Slope în grade, mască DEM explicită și Raster Calculator2013–2014. Cele213 celule selectate coincid cu referința NumPy; zero rămâne cod fără pierdere, separat de exteriorul NoData. Export PNG/PDF realizat și PNG inspectat vizual, cu pierderi2013–2014 peste hillshade; este probă tehnică, nu modelul complet al livrabilului studentului.

Documentația oficială [Hansen v1.12](https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2024_v1_12) confirmă0=fără pierdere și1–24=2001–2024; datamask separat folosește0=lipsă,1=teren și2=apă. [Notele producătorului](https://storage.googleapis.com/earthenginepartners-hansen/GFC-2024-v1.12/download.html) disting celulele cartografiate de estimarea statistică a suprafeței reale. Datamask nu este disponibil local: nu se pretinde că orice zero este teren valid. Intrările sunt deja Stereo70; **reproiectarea geografică inițială, calculul întregului județ și GUI3.44 nu sunt certificate**. Registrul de inventar existent leagă cele trei roluri de numele și hashurile locale, fără date noi redistribuite. Cele nouă GeoPackage-uri anterioare și cele cinci fișiere Suceava cu patru sidecar-uri sunt controlate înainte/după, inclusiv după închiderea QGIS, și rămân identice.

QGIS disponibil:3.40.11 în Program Files, folosit pentru motor; instalarea suplimentară OSGeo4W este3.34.7, verificată prin Qgis.QGIS_VERSION. **QGIS3.44 nu a fost găsit; GUI3.44 este NETESTAT**, nu este înlocuit cu o declarație despre3.40. Nu se instalează și nu se reconfigurează mediul. Exporterul întoarce Success și PNG este decodabil; avertismentul GDAL despre update access la PNG rămâne în log, fără certificarea georeferențierii interne a acelui PNG.

### B. Compatibilitate semantică rămasă și evaluare pentru publicare

**E5-03 — stare anterioară deciziei proprietarului, înlocuită de remedierea punctuală de mai jos:** blobul v3 pentru crs-lesson.js arată că #grila conținea selectorul CRS. În v4, #grila este grila introductivă; #crs-grid conține experimentul CRS. Modelul trimite1.2i la #concept-rect și resursa integrală la #sisteme-rect; salturile interne sunt etichetate „Grilă introductivă” și „Grilă în CRS”. Nu se schimbă din nou ancorele sau cele24 de poziții. Lângă introducere este adăugată informarea pentru linkuri din v3 și o legătură verificată către #crs-grid. Aceasta oferă recuperare, **nu restabilește identitatea semantică a vechiului fragment**.

Contractele afectate sunt ancora v3 din snapshot, salturile din crs-lesson.js, metadatele celor două ancore ale segmentului introductiv și testele de derulare1.2. Nu există linkuri editoriale interne etichetate ca experiment CRS care să trimită acum greșit la #grila. Legăturile externe necunoscute nu pot fi inventariate exhaustiv. Pentru compatibilitate strictă, remediul minim de evaluat este #grila ca alias al experimentului CRS și o ancoră distinctă pentru grila introductivă; prima țintă #concept-rect și ordinea celor24 pași pot rămâne identice. Această remapare nu este implementată fără evaluarea editorială cerută. **Publicarea rămâne condiționată de decizia asupra rezervei semantice; nu blochează parcurgerea internă sau pregătirea candidatului pentru audit.**

Nu rămâne un defect funcțional blocant demonstrat în domeniul executat. Înghețarea candidatului așteaptă reverificarea independentă a Operațiunii6.1; nu se declară release pregătit sau efectuat și nu se încep auditurile finale.

### C. UX, limite și NETESTAT

Auditul tehnic focalizat acoperă homepage, parcurs, catalog, lecția1.2, T01, PF și L19: nume accesibile ale controalelor vizibile, după inițializarea modulului complex; focus natural fără tabindex pozitiv, skip-link, tastatură, Escape, reflow, fragmente și emulare print. Eșantionul de text are contrast minim5,14:1 în light și7,44:1 în dark; indicatoarele păstrează culorile/iconurile aprobate. Nu este o certificare WCAG pentru întreaga platformă. Navigarea statică și catalogul rămân funcționale fără JS; experimentele/lecțiile dinamice păstrează limitele arhitecturale deja documentate. Nu există stylesheet print dedicat în css; emularea verifică păstrarea conținutului, nu o machetă optimizată sau hârtia tipărită.

Rămân **NETESTAT/limitări**: Linux și alte browsere native; GUI QGIS3.44 (Categorized/dialog, CRS/layout, scală, meniuri, Select by Location); conversia inițială a rasterelor geografice și refacerea întregului studiu Suceava; datamask Hansen; tehnologii asistive, dispozitive fizice și zoom nativ/print fizic. Recomandarea QA înainte de release este verificarea GUI pe versiunea țintă și accesibilitatea umană; proprietarul stabilește acceptarea limitelor rămase. Rezerva semantică E5-03 este închisă prin corecția punctuală documentată mai jos. Lipsa recalculării întregului județ este delimitarea probei reprezentative cerute, nu un PASS pentru o execuție neefectuată.

### Protecții și domeniul modificărilor

Cele203 fișiere din snapshot rămân verificate. **Cele opt excepții existente rămân explicite**, cu hash nou pentru inventarul QA actualizat și pentru scroll-ul curent din crs-lesson.js; corecția confirmată a shellului asincron `js/p07-page.js` cere **a noua excepție exactă**, cu preimagine v3 nemodificată și propria regresie delayed-module/early-history plus P07. Rezultă194 fișiere identice și9 excepții, fără rescrierea snapshotului și fără extinderea discreționară a unui whitelist. Algoritmii GIS, datele, imaginile și fișierele de licență nu sunt schimbate.

| Fișier | Rol |
|---|---|
| tools/search-content.mjs | Excluderea rezultatelor efemere, păstrând textul editorial și output-urile statice |
| data/search-index.js | Regenerat,90 destinații/scenarii, fără eliminarea resurselor |
| js/learning.js | Deduplicare T06 după pagina/rolul continuării și informare de compatibilitate1.2 |
| tutorials/t06.html | Regenerat din rendererul comun |
| css/learning.css | Împachetarea textului/codului în carduri la mărire |
| js/crs-lesson.js | Respectă fragmentul curent după încărcarea fonturilor, fără schimbarea ancorelor sau calculelor |
| js/p07-page.js | Gardă de inițializare pentru history/popstate; fără schimbarea API/stărilor |
| data/tutorial-dataset-inventory.json | Probe și hashuri Suceava în registrul existent, cu limite explicite |
| tests/protected-files.cjs | Hash exact al inventarului și noua excepție justificată P07 |
| tests/v4-model.cjs | Păstrează verificarea tuturor203 hashuri; enumeră cele9 excepții exacte |
| tests/v4-navigation.cjs | Condiții observabile și regresii fragmente/variante/deduplicare |
| tests/v4-build.cjs | Determinism și comparație reală a indexului pe72 resurse/două fonturi |
| tests/v4-browser.cjs | QA focalizat de accesibilitate, reflow, contrast și cursa P07 |
| tests/qa/lot52-qgis.py | ID-uri sursă/reordonare, referințe GIS și ROI Suceava opțional prin QA_SUCEAVA_DATA_ROOT |
| DECISIONS_AND_QA.md | Acest jurnal operațional; fără raport paralel |

**Istoricul FAIL-urilor este păstrat în tmp/qa/op61:** proba inițială de fonturi reproduce variația; primul UX detectează history/restore și textul care depășește cardurile; o aserțiune de ordine a focusului era aplicată greșit unei sosiri cu fragment și a fost separată de testul documentului inițial. Măsurarea zoom-ului este condiționată de starea finală de layout, fără sleep arbitrar. Consolidarea a respins excluderea prea largă a output-urilor; filtrul a fost corectat, nu aserțiunea eliminată. Proba inițială de metadate QGIS a avut o problemă de teardown și prima probă ROI un enum API incorect, remediate în teste; rulările finale verifică și închiderea motorului. Orchestrarea PowerShell a afișat o eroare de redirecționare după cele patru teste de navigare, ale căror loguri individuale conțin PASS; nu este prezentată drept defect al platformei sau drept probă nereușită ascunsă. Regresia1.2 a respins și acronimul CRS introdus în nota de compatibilitate din segmentul începător; nota a fost reformulată fără a slăbi aserțiunea. Nu sunt eliminate teste pentru obținerea PASS.


### Rezultatele finale și comenzi de reproducere

| Verificare | Rezultat observat |
|---|---|
| `node tools/validate-learning.cjs` și `node tests/v4-model.cjs` | PASS:1439 aserțiuni,14 cazuri negative;73 identități,34 numerotări, L01–L20/T01–T06,7 capitole,24 pași,3 variante, contracte v3 și203 hashuri; log model-conserved.log |
| `node tests/v4-navigation.cjs` ×4 | PASS:4709 fiecare, inclusiv fonturi reținute/fragment schimbat; navigation-series.json și navigation-stable-1…4.log au cod nativ0 |
| `node tests/lot51-browser.cjs` | PASS:354; introducere fără concepte premature, fragmente și controale; content-verified.log |
| `node tests/lot52-browser.cjs` | PASS:795; T01, CASE/NULL, cele7 etape și24 secțiuni, nivel Începător; același log |
| `node tests/lot53-browser.cjs` | PASS:361; trei traversări repetate și o regresie finală după corecția1.2, zero erori; path-repeat-1…3.log și content-verified.log |
| `node tests/v4-browser.cjs` | PASS:2921,364 layouturi,29 operații; probe UX focalizate283, contrast și history P07; browser-final.log și browser-results.json |
| `node tests/v4-build.cjs` | PASS:42HTML/47 fișiere, două build-uri identice și --check fără scriere;72 resurse comparate pe Arial/Courier New,90 înregistrări păstrate; build-verified.log și search-font-results.json |
| `node tools/build-public-content.mjs --check` | PASS pe sursele finale:check-final.log |
| `node tests/run-existing.cjs p01-labs p05-labs p07-labs companion-hub workshop-reproducibility challenges-vector` | PASS:P01=1327, P05=149487, P07=5370 (inclusiv stări/exporturi L03/L07/L12/L19 și GCP), hub=916/329 căutări, ateliere=3787, V1–V6; existing.log. R1–R6 sunt executate efectiv în lot53-browser. |
| `node tests/run-existing.cjs learning-consolidation companion-hub` | PASS:2957 și916;22 verificări formative,60 termeni, păstrarea delimitărilor și căutărilor; editorial-verified.log |
| PyQGIS `tests/qa/lot52-qgis.py` | PASS:4023 pe3.40.11; ID-uri sursă/reordonare, A/B/C, sintetice separate și ROI Suceava; gis-verified.log și qgis-results.json. QA_SUCEAVA_DATA_ROOT trebuie să indice materialele locale ale atelierului; fără el Suceava este NETESTAT. |
| Documentație externă esențială | PASS:21 URL-uri HTTPS, inclusiv destinațiile documentare ale celor29 operații, T01 și Select by Location; fără ocolirea TLS. external-links.json |

Logurile Operațiunii6.1 sunt în `tmp/qa/op61/`, rezultatele testelor existente în directoarele lor QA ignorate de Git. Pentru browser sunt folosite CODEX_NODE_MODULES către runtime-ul local Playwright și QA_BROWSER_PATH către Chrome. Pentru QGIS se folosesc PYTHONNOUSERSITE=1, PYTHONIOENCODING=utf-8, QT_QPA_PLATFORM=offscreen și launcherul instalat3.40.11. NumPy și fontul Arial sunt cele ale mediului deja disponibil; nu se instalează dependențe sau date.

**Conservare și oprire:**15 fișiere modificate intenționat, niciun fișier nou de publicat, niciun snapshot nou și nicio diferență exclusiv CRLF/LF. Inventarul exact și comparația hashurilor sunt în final-scope.json; fișierele de date/imaginile/licențele versionate sunt nemodificate. Originalele GIS și probele PNG/PDF rămân în afara staging-ului/publicării. Branch restructure/v4.0.0, HEAD4e67de43f2b3900bbfdc547b594a83252d8bd010; main/origin/main și tagul v3.0.0 nemodificate. Index gol. Fără staging, commit, push, merge, tag, arhivă de release sau Zenodo. Operațiunea6.2 și auditurile finale Astra/Opus nu sunt începute. Rezultatul este pentru reverificarea independentă înaintea oricărui commit sau înghețării candidatului.


### Operațiunea 6.1 — corecție punctuală E5-03 (2026-10-21)

**E5-03 — REMEDIAT local; pregătit pentru auditul unic Opus al Operațiunii6.1.** Proprietarul a decis restaurarea semnificației fragmentului publicat în v3, păstrând progresia v4. Această decizie înlocuiește rezerva și soluția de recuperare prin notă consemnate anterior; nu presupune că au fost inventariate sau testate toate linkurile externe necunoscute.

- `#grila` este un alias DOM unic în secțiunea avansată `#crs-grid`, iar resolverul fragmentelor îl derulează la aceeași secțiune canonică. Există un singur selector `#grid-crs` și un singur experiment `#metric-grid`; URL-ul vechi rămâne neschimbat.
- `#grila-intro` identifică exclusiv grila introductivă X/Y. Saltul „Grilă introductivă”, metadatele segmentului și testele care urmăresc introducerea folosesc noua ancoră. `#concept-rect` și `#sisteme-rect` sunt păstrate. Nota provizorie care explica sosirea linkurilor v3 în introducere este eliminată deoarece nu mai descrie comportamentul real.
- Handlerul existent pentru ținte generate JS este extins cu un singur listener hashchange pe durata modulului, rezolvare din URL-ul curent după fonturi/layout și invalidarea callbackurilor unui render înlocuit. Back/Forward și reinițializarea nu produc derulare la o țintă veche; schimbarea sistemului în experiment nu inițiază derulări. Nu sunt adăugați parametri URL sau chei de persistență.
- Comparația integrală a datelor modelului cu HEAD confirmă o singură schimbare: a doua ancoră a segmentului introductiv, grila → grila-intro. Cele24 poziții, toate țintele de etapă, cele3 ramuri, nivelurile, prerechizitele și continuările sunt identice. 1.2i începe tot la concept-rect și continuă spre4.4; revenirea la resursa integrală începe la sisteme-rect.

**Surse și fișiere afectate de această corecție:** `js/crs-lesson.js`, `data/learning-model.js`, `js/learning.js`; testele existente `tests/lot51-browser.cjs`, `tests/lot52-browser.cjs`, `tests/lot53-browser.cjs`, `tests/v4-model.cjs`, `tests/v4-navigation.cjs`, `tests/v4-browser.cjs`; excepția exactă din `tests/protected-files.cjs` și acest jurnal. Nu se editează manual HTML-ul generat. Build-ul nu produce diferențe suplimentare în HTML sau index față de starea de la începutul corecției. Snapshotul v3 nu este rescris.

Hashul curent normalizat al excepției existente `js/crs-lesson.js` este `a5db2292be26f8a74b3e982c51f024791437a875366195316fa94804160c9378`; hashul baseline și lista celor9 excepții rămân neschimbate. Celelalte194 fișiere protejate păstrează contractul v3. Corpul calculelor/handlerelor CRS de la locationSelect până la final este identic cu v3, verificat de testul existent; motoarele și datele nu sunt modificate de această corecție.

**Dovezi de reproducere:** `tmp/qa/e503/` conține preflight-ul înaintea corecției, echivalența modelului, logurile testelor și comparația finală de scop. Aceste fișiere QA sunt ignorate de Git și nu reprezintă rapoarte paralele de publicat. Fallback-ul fără JS păstrează navigarea statică; experimentul și ancorele generate dinamic necesită în continuare JS. Nu se declară certificarea accesibilității pe dispozitive fizice sau a linkurilor externe necunoscute. Probe GIS/PyQGIS suplimentare nu sunt rerulate pentru această schimbare de fragmente; rezultatele și limitele Operațiunii6.1 rămân cele consemnate anterior.


| Reverificare după E5-03 | Rezultat executat |
|---|---|
| Validator + v4-model | PASS:1439 aserțiuni,14 cazuri negative,73 destinații,203 hashuri (194 intacte +9 excepții exacte); model.log |
| v4-navigation | PASS:4913; toate73 destinațiile; cele5 fragmente1.2, intrare directă și reload; Back/Forward; aceeași instanță CRS; randare repetată/fonturi reținute;375/390/1280px × light/dark; zero erori și zero ID-uri duplicate; navigation.log |
| lot51-browser | PASS:354;375/390/768/1280/1440px × două teme, introducerea X/Y fără selector,8 CRS, formular numeric și corpul calculelor neschimbat; lesson.log |
| lot52-browser + lot53-browser | PASS:795 +362; T01n,24 pași executați,1.2i→4.4, revenirea integrală1.2/workflow,3 variante terminale și pregătire; path-workshops.log |
| v4-browser | PASS:2921;364 layouturi,29 operații,zero erori sau eșecuri; browser.log |
| learning-consolidation + companion-hub | PASS:2957 +916;56 layouturi,22 verificări formative,60 termeni,329 căutări și zero linkuri interne defecte; path-workshops.log |
| v4-build | PASS:42HTML/47 fișiere,2 build-uri identice, --check fără scriere;90 înregistrări/72 resurse în2 configurații de fonturi; build.log |
| Compararea scopului, Git și contractului | PASS:model-equivalence.json și final-scope.json; snapshot v3, manifestul de identitate, geospatial-formats și licențele neschimbate; fără diferențe exclusiv CRLF/LF; git diff --check PASS |

**Stare finală pentru audit:**19 fișiere modificate în total, fără fișiere noi sau temporare neignorate. Față de cele15 inițiale, intră în diff numai `data/learning-model.js` și cele3 teste existente lot51/lot52/lot53; corecția atinge11 fișiere, enumerate mai sus, incluzând cele deja modificate. Index gol, branch `restructure/v4.0.0`, HEAD `4e67de43f2b3900bbfdc547b594a83252d8bd010`; main/origin/main și v3.0.0 păstrează baseline-ul `6c36a95c2bb58d31208efbee4b9f3595130bb814`, inclusiv obiectul tagului. E5-03 este remediată prin restaurarea contractului semantic publicat și verificarea referințelor interne accesibile; nu se afirmă auditarea exhaustivă a linkurilor externe necunoscute. Fără staging/commit/push/merge/tag/release/Zenodo. Operațiunea6.2 nu este începută. Urmează auditul independent unic Opus al întregii Operațiuni6.1; nu este declarat deja efectuat.


### Operațiunea 6.1 — remediere punctuală E61-01 (2026-10-21)

Conform auditului Opus transmis de proprietar, verdictul Operațiunii6.1 este **ACCEPTAT CU REZERVE**. Cele5 eșecuri din6 rulări Linux sunt atribuite aserțiunilor de test, fără un defect funcțional al produsului demonstrat: numărul exact al apelurilor scrollIntoView și ordinea globală a lanțurilor dinamice independente. În proba Linux raportată de Opus au existat două apeluri către grila-intro, la circa8ms distanță, fără revenire la ținta veche; aserțiunea care cerea exact un apel le respingea. Lista document.scripts din snapshot înregistrează și inserări dinamice intercalate, fără a defini o ordine totală de dependențe. Remedierea de aici privește exclusiv `tests/v4-navigation.cjs` și acest jurnal; nu se modifică loaderul, produsul, căutarea, datele GIS, licențele sau metadatele release-ului. Înghețarea candidatului rămâne condiționată de reverificarea Linux.

**A — proprietatea de derulare.** Aserțiunea exactă [grila-intro] este înlocuită cu `assertCurrentScrolls`: minimum un apel valid; fiecare apel din interval trebuie să aibă ținta grila-intro, hashul curent #grila-intro și un element conectat la document. Orice țintă veche grila/crs-grid este respinsă explicit; sunt respinse și alte ținte, un hash greșit sau absența apelurilor. Se acceptă unul sau mai multe apeluri valide. Instrumentarea reține ținta, hashul, conectarea și momentul fiecărui apel după schimbarea fragmentului, inclusiv dacă un hash greșit ar apărea ulterior. Sincronizarea așteaptă evenimentul hashchange, terminarea callbackurilor fonturilor și a frame-urilor pe care acestea le programează, existența unei derulări și poziția observabilă a țintei. Condițiile noi au timeout explicit15s cu FAIL; nu se adaugă sleep sau un număr așteptat de derulări. Instrumentarea este numai în pagina testată.

**Control negativ A:** după proba pozitivă se execută efectiv `document.querySelector('#crs-grid').scrollIntoView(...)` în browser, păstrând hashul #grila-intro. Aceeași funcție de verificare trebuie să emită mesajul `Previous fragment scroll detected`, confirmat prin assert.throws. Lipsa apelurilor este de asemenea respinsă; duplicarea unui apel valid este acceptată explicit. Logurile păstrează separat traseul pozitiv și apelul vechi injectat intenționat; acesta nu este prezentat drept regresie runtime a produsului.

**B — dependențele reale ale diagnosticului.** Sursa `js/map-diagnostics.js` încarcă secvențial grupul projection, iar `js/p06-labs.js` folosește același cache loadScript pentru classification-engine apoi p05-models și așteaptă diagnosticul ready înainte de montarea L08. Cele două lanțuri rulează independent. P06-models definește funcțiile înainte de încărcarea P05, dar folosește P05 numai la execuția diagnose după barieră. `js/p05-models.js` folosește CARTO_CLASSIFY în statistics; relația classification-engine → p05-models este păstrată și verificată.

| Contract de încărcare | Verificarea nouă |
|---|---|
| Scripturi științifice statice | Ordinea DOM este comparată cu HTML-ul original din obiectele Git v3; nu cu lista runtime care intercalează scripturi dinamice. Prezența tuturor scripturilor protejate din snapshot rămâne obligatorie. |
| Registru CRS + Proj4 → CRS_ENGINE | Evenimentele load ale ambelor intrări trebuie să preceadă crs-engine. |
| GeographicLib → geodesic-adapter | Ordine load verificată. |
| CRS_ENGINE + geodesic-adapter → projection-lab-engine → projection-view | Muchiile reale sunt verificate separat. |
| classification-engine → p05-models | Ordine load verificată separat de lanțul projection. Nu se impune o relație p05-models/proj4. |
| Utilizarea modulelor | Wrappere numai în test înregistrează disponibilitatea API-urilor înainte de fiecare create al adapterului projection și fiecare diagnose L08. Sunt cerute utilizări reale ale ambelor module, rezultate L08 și stare activă a diagnosticului; lipsa lor produce timeout15s. pageerror rămâne FAIL. |

Snapshotul v3 nu este modificat; sursa de ordine statică este chiar HTML-ul v3, nu o nouă listă administrată. Prima rulare locală a observat p05-models înainte de proj4 și a trecut toate muchiile reale. Nu a fost identificat un defect funcțional al loaderului care să necesite intervenție.

**Mediu local:** exclusiv Windows11 Pro10.0.26300, Node24.19.0, Chrome155.0.8059.80, Playwright din runtime-ul existent. Rulările Windows nu certifică reproductibilitatea Linux. Pentru închiderea multiplatformă se solicită Opus **3 rulări consecutive PASS pe Linux**, fără modificarea repository-ului.

**Transfer explicit în Operațiunea6.2, fără rezolvare declarată acum:** E61-02 — conținut editorial omis parțial din index; E61-03 — rasterele istorice Suceava fără NoData declarat și diferența212/213 la marginea măștii; E61-04 — actualizarea CITATION.cff; GUI QGIS3.44, browsere native suplimentare și verificări umane de accesibilitate/dispozitive. Aceste puncte nu sunt modificate prin corectarea testelor.


| Reverificare E61-01 | Rezultat local executat |
|---|---|
| v4-navigation, rulările1–6 | **PASS6/6**, fiecare5628 aserțiuni și exit0; aceeași sursă în toate rulările. Fiecare rulare include73 destinații, cele5 fragmente1.2, reload, Back/Forward, randare repetată/fonturi, controale negative și cele3 variante PF. |
| Controlul negativ al derulării | PASS6/6: fiecare injectare reală spre crs-grid cu hashul grila-intro este respinsă de același predicat. Local s-a observat câte un apel valid în fiecare probă; acceptarea apelurilor valide multiple este verificată explicit prin duplicarea unei înregistrări valide. Nu se pretinde observarea locală a celor două apeluri raportate pe Linux. |
| Dependențe diagnostic | PASS6/6: scripturi prezente și încărcate, muchii reale verificate, două create ale adapterului și un diagnose cu dependențe disponibile înainte de utilizare; fără erori pageerror. |
| Validator + model/contract v3 | PASS:1439 verificări,14 cazuri negative,203 hashuri (194 intacte și aceleași9 excepții exacte). Snapshotul nu este rescris și hashurile excepțiilor nu sunt actualizate în această remediere. |
| lot51-browser | PASS:354;375/390/768/1280/1440px, light/dark, grila introductivă distinctă,8 CRS și formularul numeric păstrat. |
| lot53-browser | PASS:362; parcursul real al celor24 pași, revenirile pentru aprofundare,3 variante PF, zero erori sau eșecuri. |
| v4-build și --check | PASS:42HTML/47 fișiere, două build-uri identice și --check fără scriere;72 resurse în două configurații locale de fonturi. Produsul generat și indexul sunt identice cu preflight-ul acestui task; aceasta nu închide observația editorială E61-02. |
| git diff --check și conservare | PASS; numai testul de navigare și jurnalul diferă de preflight. Produsul, modelul pedagogic, datele, licențele, CITATION.cff și snapshotul sunt neschimbate față de începutul acestei remedieri. |
| Linux | **NETESTAT local**. Sunt necesare cele3 rulări consecutive PASS de către Opus înaintea înghețării candidatului. |

Logurile sunt în `tmp/qa/e6101/`: navigation-1…6.log, navigation-series.json (exituri native, aceleași surse, trasee pozitive/negative și evenimente de încărcare), model.log, build.log, lesson.log, path.log și final-scope.json. Sunt probe QA ignorate de Git; nu se creează documentație paralelă de publicat.

**Stare E61-01:** aserțiuni corectate și verificate local pe Windows; confirmarea Linux rămâne deschisă. **Git:** branch `restructure/v4.0.0`, HEAD `4e67de43f2b3900bbfdc547b594a83252d8bd010`; aceleași19 fișiere modificate intenționat ca la preflight, fără fișiere noi neignorate. Index gol. main/origin/main și tagul v3.0.0 sunt nemodificate. Nu s-a efectuat staging, commit, push, merge, tag, release sau Zenodo. Operațiunea6.2 nu este începută; produsul nu a fost modificat funcțional de această remediere.


### Închiderea Operațiunii 6.1 — audit Opus și commit local autorizat (2026-10-21)

Conform rezultatului independent transmis de proprietar, Operațiunea6.1 este **ACCEPTATĂ CU REZERVE**, fără regresii funcționale identificate; commitul local este autorizat. **E61-01 — REZOLVAT:**6/6 PASS pe Windows și3/3 PASS pe Linux, fiecare rulare Linux cu5628 verificări. Cele3 defecte introduse deliberat într-o copie independentă au fost detectate corect. Testele verifică ținta curentă a derulării și dependențele reale ale scripturilor, fără restricții asupra numărului apelurilor valide sau ordinii lanțurilor independente. Rezultatele Linux și controalele negative independente sunt raportate de Opus și confirmate de proprietar; nu sunt prezentate drept execuții locale Windows. Această reverificare închide condiția Linux consemnată în secțiunea anterioară.

| Observație | Stare confirmată la închiderea6.1 |
|---|---|
| E5-03 | **REZOLVAT:**semantica v3 a #grila este restaurată prin aliasul experimentului CRS avansat #crs-grid; grila introductivă rămâne distinctă la #grila-intro. |
| E4-04 | **REZOLVAT:**determinismul indexului este confirmat pe Windows și Linux conform auditului Opus. Aceasta nu afirmă că indexul include exhaustiv tot conținutul editorial; E61-02 rămâne separat. |
| E53-04 | **REZOLVAT:**continuarea T06 către proiect este deduplicată după pagina-destinație, păstrând varianta raster. |
| L19 și fragmente | Restaurarea după inițializarea asincronă, evenimentele history timpurii și sincronizarea fragmentului curent după fonturi/randare sunt verificate în probele Operațiunii6.1. Formatele URL și persistența/GCP sunt păstrate. |
| Identificatori medicali originali | Verificați:source_fid/hub_id provin din fid original; serviciile215 și497 sunt păstrate la reordonare, cu132 servicii eligibile. Dovezile GIS anterioare rămân valabile; nu se rerulează motorul pentru această închidere de documentare/commit. |

**Suceava — rezultate distincte, nu echivalente:**Opus raportează **212 celule cu masca folosită în audit** și **213 fără aplicarea acelei măști**. Rezultatul213 al probei locale anterioare nu este prezentat drept identic cu212. Reconcilierea exactă a regulii de includere la marginea măștii și problema rasterelor istorice fără NoData declarat rămân **E61-03, Operațiunea6.2**. Nu se modifică acum rasterele, masca, algoritmii sau testele GIS pentru a forța egalitatea.

**Transfer în Operațiunea6.2:**E61-02 — conținut editorial omis parțial din index; E61-03 — NoData istoric Suceava și reconcilierea212/213 la marginea măștii; E61-04 — actualizarea CITATION.cff. Verificările GUI QGIS3.44, browsere native suplimentare, dispozitive fizice și accesibilitate umană păstrează limitele deja consemnate. Nu sunt declarate rezolvate prin acest commit.

Preflight-ul închiderii confirmă branch restructure/v4.0.0, HEAD4e67de43f2b3900bbfdc547b594a83252d8bd010, exact19 fișiere modificate și index gol. geospatial-formats.js și tutorials/t01–t05.html au numai diferențe de terminatori față de bloburile HEAD și sunt excluse explicit din staging; nu se execută resetări sau curățări. main/origin/main și obiectul tagului v3.0.0 sunt păstrate. Se pregătește un singur commit local cu mesajul `fix(v4): stabilize navigation and cross-platform QA`, după verificările selective de mai jos, fără push/merge/tag/release sau publicare.


**Verificări selective finale pentru commit — toate PASS:**validatorul și contractul v3:1439 verificări/14 cazuri negative;203 hashuri protejate,194 fișiere nemodificate și9 excepții exacte; navigare:5628 verificări,73 destinații, fragmente/reload/Back-Forward și control negativ; lecția1.2:354 verificări pe5 viewporturi și2 teme, fără erori runtime; build:42HTML/47 fișiere, două generări identice și --check fără scriere. Nu au fost rerulate testele GIS anterioare, deoarece algoritmii și datele nu s-au modificat după audit. În această închidere este actualizat numai jurnalul față de preflight-ul celor19 fișiere auditate. `git diff --check` PASS; staging-ul se verifică separat pentru exact aceleași19 fișiere și fără diferențe exclusiv CRLF/LF. Logurile de închidere sunt în `tmp/qa/op61-close/`, ignorate de Git. Fără intervenții funcționale suplimentare și fără începerea Operațiunii6.2 sau a auditurilor finale Astra/Opus.


### Operațiunea 6.2 — metadate și reproductibilitate documentată (2026-10-21)

**Preflight:** branch restructure/v4.0.0, HEAD17133fc4b19b840633b24de85ab1d64e3697c330, working tree și index curate. Planul director v2 a fost consultat, împreună cu constatările Opus consemnate la închiderea6.1 și transmise prin cerința6.2. Nu există în materialele locale consultate un script complet separat al probei Opus212/213; rezultatele acestuia sunt cele confirmate de proprietar. Nu se execută o nouă dezvoltare funcțională sau auditul final de release.

**E61-02 — remediat local, cu domeniu explicit.** Extracția existentă recuperează7 paragrafe redactate de autor prin selecții limitate ale unor poziții DOM deja existente:1 explicație Geometry validity/regulă topologică,5 explicații constante de transparență și1 despre model/encoding în Formate. Nu se modifică rendererele GIS și nu se adaugă un registru paralel. Sunt păstrate excluderile rezultatelor calculate, tabelelor dependente de fonturi, statusurilor și feedbackului. Excluderile explicite data-search-exclude/aria-live au prioritate chiar dacă selectorul structural coincide; un caz negativ demonstrează acest lucru. Paragrafele care variază cu starea experimentului sau sosesc asincron rămân excluse; nu se pretinde recuperarea exhaustivă a tuturor formulărilor din laboratoare.

Au rămas90 înregistrări și72 resurse canonice căutabile, cu aceleași ID-uri/destinații și titluri diagnostice. Numai5 înregistrări au text schimbat: Topologie+1, Transparență+5, Formate+1, T06+3 clarificări și About2 paragrafe de metadate înlocuite. Toate72 descrierile/listele de paragrafe sunt identice între Arial/Courier New cu CSS și Canvas diferite. Textele recuperate sunt verificate după schimbări reale de controale; rezultatele calculate injectate rămân excluse. Căutările noi trimit la destinațiile canonice; cele329 căutări existente trec. **Această versiune a extracției este verificată numai Windows/Chrome; validarea Linux a6.1 nu este extrapolată automat.**

**E61-03 — clarificat și reprodus local pe ROI, fără recodificarea originalelor.** Inventarul existent distinge copiile istorice dem_suceava.tif/forest_loss_suceava.tif (NoData nedeclarat, zero exterior) de copiile noi cerute de T06 (-9999/255 exterior, metadate și mască verificate). În lossyear,0 înseamnă fără pierdere detectată; în datamask,0 înseamnă lipsă de date. Un zero exterior din copia istorică nu se poate interpreta numai numeric. Nu se setează global0 ca NoData, deoarece pot exista zero valid în DEM și no-loss valid în lossyear. T06 cere masca înainte de statistici și documentarea convenției celulelor de margine.

Proba selectivă este adăugată suitei GIS existente prin `--mask-conventions-only`; proba anterioară cu213 nu este înlocuită sau slăbită. Folosește exclusiv ROI6×6km,200×200 celule de30m, EPSG:3844, extent[493650,687180,499650,693180], coduri13–14/2013–2014. Rasterizarea centru versus all-touched este descrisă și în [documentația oficială GDAL](https://gdal.org/en/stable/programs/gdal_rasterize.html#cmdoption-gdal_rasterize-at).

| Regulă pe același ROI | Celule13–14 |
|---|---:|
| Masca rasterizată în grila țintă: centrul celulei în județ |212|
| Masca țintă ALL_TOUCHED: include celulele intersectate |213|
| Cutline în grila sursă, apoi nearest, fără încă o mască a centrelor țintă |213|
| Copia istorică deja decupată, fără masca suplimentară a centrelor țintă |213|
| Rasterul upstream pe ROI, complet fără cutline/mască |525|

Diferența unică este celula row192/col197 (indexare0), cod13, centru țintă(499575,687405), aflat la5,065045656m în exteriorul limitei. Celula intersectează județul, iar centrul sursă ales prin nearest(499586,447086884;687403,8612839745) este în interior. Aceasta explică de ce cutline pe grila sursă nu echivalează automat cu masca centrelor pe grila finală. Nu există un singur număr universal independent de convenție/grilă și **212 nu este declarat identic cu213**. Am reprodus perechea raportată de Opus cu reguli explicite; nu afirmăm că am reexecutat scriptul lor absent sau reprocesat întregul județ. Originalele,9 GeoPackage-uri și5 surse Suceava plus4 sidecar-uri sunt verificate prin hash înainte/după, inclusiv după teardown.

**E61-04 — remediat în metadatele candidatei nepublicate.** CITATION.cff are version4.0.0 și type software, cu license MIT (o singură licență a software-ului). Abstractul și mesajul explică statutul nepublicat și licențierea separată a conținutului CC BY4.0/materialelor terțe. Autorul, afilierea, titlul și URL-urile canonice sunt păstrate. Nu există date-released sau DOI de versiune; identificatorul de concept10.5281/zenodo.23422847 este păstrat și calificat explicit. README, CHANGELOG și About sunt coerente cu acest statut, iar baseline-ul publicat v3.0.0 este diferențiat. LICENSE, CONTENT_LICENSE.md, ATTRIBUTION.md și THIRD_PARTY_LICENSES.md sunt byte-identice cu preflight-ul. Nu se revendică o nouă licență asupra materialelor terțe.

Validare cu jsonschema Draft7/FormatChecker din runtime-ul QGIS existent, contra [schemei oficiale CFF1.2.0](https://github.com/citation-file-format/citation-file-format/blob/1.2.0/schema.json), descărcată în QA ignorat. SHA256 schemă:0b8d22140da702d766df318dcff3a91af2f39521298dcf36d76315fd99cc169b. JSON-ul CFF existent rămâne YAML valid. Nu sunt instalate pachete suplimentare.

**Fișierele și sursele autoritative:** CITATION.cff, README.md, CHANGELOG.md și acest jurnal; js/site.js (numai textele About/citare); tools/search-content.mjs; data/workshop-reproducibility.json și data/tutorial-dataset-inventory.json; generate exclusiv prin build:about.html, tutorials/t06.html, data/search-index.js. Testele existente extinse sunt tests/v4-build.cjs, tests/qa/lot52-qgis.py, tests/qa/workshop-reproducibility.cjs și tests/qa/companion-hub.cjs. tests/protected-files.cjs actualizează numai hashurile exacte ale celor2 excepții documentare existente; numărul rămâne194 fișiere protejate neschimbate +9 excepții. Niciun renderer/algoritm GIS sau model pedagogic nu este schimbat.

**Verificarea distribuției:**367 fișiere versionate; niciun GPKG/QGZ/QGS/SHP/arhivă de date/PDF/DOCX/XLSX complet sau privat. Cel mai mare fișier versionat este o captură T06 existentă de aproximativ2MB. Cele2 TIFF-uri mici Rîșca și subseturile GeoJSON sunt excepțiile publice existente, nemodificate; nu înlocuiesc Suceava. Regulile pentru content/, datasets/, local-data/, tmp/, release-staging/ și PUBLICATION_TEXT.md rămân active. Nu se creează arhivă/tag/release și nu se adaugă date sau imagini noi.41 pagini au notificări de licență statice; shellul lesson.html este verificat după randare JS.

| Test executat | Rezultat |
|---|---|
| Schema oficială CFF și politica versiunii/licenței/DOI |PASS|
| Validator + model/contract v3 |PASS1439 verificări,14 cazuri negative,203 hashuri|
| Navigare și fragmente, inclusiv Back/Forward/reload |PASS5628;73 destinații|
| Parcurs real și variante PF |PASS362;24 pași/3 variante|
| Căutare/catalog |PASS920;329 căutări,97 snippeturi,50 verificări semantice,0 linkuri defecte|
| Ateliere/T06/NoData |PASS3799;48 layouturi,0 erori/eșecuri|
| Suceava mask-only |PASS29, originalele nemodificate și numerele212/213 separate|
| Build + --check + fonturi |PASS42HTML/47 fișiere;2 build-uri identice;72 resurse×2 fonturi,90 înregistrări|
| Concordanță metadate/licențe și caz negativ extracție |PASS;5 pagini runtime și41 notificări statice|
| Excluderi de distribuție și git diff --check |PASS|

Suita companion-hub a respins inițial version4.0.0 deoarece avea așteptări exacte pentru v3. Au fost actualizate exclusiv câmpurile CFF autorizate (versiune, mesaj, abstract și descrierea identificatorului); sunt păstrate protecția restului metadatelor, licența MIT, verificarea afilierii și toate verificările motorului. Nu s-au eliminat aserțiuni GIS pentru obținerea PASS. Verificarea auxiliară a metadatelor a fost corectată pentru obiecte din contexte VM diferite și pentru shellul de lecție care generează footerul la runtime; produsul nu a fost schimbat pentru aceste particularități ale probei. Terminatorii sursei Python preexistente au fost păstrați; nu se include o rescriere accidentală a întregului fișier.

Reproducere: comenzile browser folosesc CODEX_NODE_MODULES și QA_BROWSER_PATH din runtime-ul existent; `node tests/v4-build.cjs`, `node tests/v4-navigation.cjs`, `node tests/lot53-browser.cjs`, `node tests/run-existing.cjs companion-hub workshop-reproducibility`. Proba GIS este `tests/qa/lot52-qgis.py --mask-conventions-only <folderul_originalelor_Suceava>`, în launcherul QGIS3.40.11, PYTHONNOUSERSITE=1, PYTHONIOENCODING=utf-8, QT_QPA_PLATFORM=offscreen; GDAL_PAM_ENABLED=NO este setat în test. Dovezile și schema descărcată sunt în tmp/qa/op62/ și tmp/qa/lot52/mask-conventions-results.json, ignorate de Git, fără rapoarte paralele de publicat.

**Limitări pentru release:** noile schimbări6.2 nu sunt executate pe Linux/macOS sau alte browsere native; GUI QGIS3.44, fluxul integral Suceava, datamask Hansen absent local, accesibilitatea umană/dispozitivele fizice și publicarea efectivă rămân necertificate. Candidata nu are încă hash final acceptat, tag, dată de lansare sau DOI de versiune. Nu se lansează auditurile finale Astra/Opus și nu se creează identificatori noi în această operațiune.


**Conservare și oprire6.2:**16 fișiere existente modificate, niciun fișier nou neignorat, niciun set de date sau imagine nouă. Branch `restructure/v4.0.0`, HEAD `17133fc4b19b840633b24de85ab1d64e3697c330`; index gol. main/origin/main și tagul v3.0.0 păstrează baseline-ul `6c36a95c2bb58d31208efbee4b9f3595130bb814` și același obiect de tag. Modelul pedagogic, manifestul de identitate, snapshotul v3 și licențele/atribuirile sunt byte-identice cu preflight-ul; aceleași9 GeoPackage-uri și9 fișiere Suceava inclusiv sidecar-urile păstrează hashurile probei6.1. Nicio diferență exclusiv CRLF/LF. Fără staging, commit, push, merge, tag, release sau Zenodo; fără auditurile finale. Rezultatul așteaptă verificarea punctuală și aprobarea proprietarului.


### Închiderea Operațiunii 6.2 — verdict final Opus și candidata pentru audit (2026-10-22)

**Verdict independent Opus: ACCEPTAT**, fără corecții obligatorii înainte de commit, conform rezultatului transmis și autorizat de proprietar. **E61-02, E61-03 și E61-04 — REZOLVATE.** Opus a reprodus independent cele 7 paragrafe editoriale recuperate, indexul cu90 înregistrări/72 resurse și cele42 pagini HTML identice pe Linux, confirmând determinismul Windows/Linux. A confirmat rezultatele Suceava **212 / 213 / 213 / 525**, conform convențiilor documentate, inclusiv poziția celulei de margine row192/col197 și distanța de **5,065m**;212 și213 rămân rezultate distincte, nu sunt declarate identice. A confirmat validitatea CFF1.2.0, candidata4.0.0 nepublicată, concordanța MIT pentru cod/CC BY4.0 pentru conținut, integritatea contractului v3 și a originalelor GIS. Aceste rezultate independente sunt atribuite auditului Opus; nu reprezintă execuții Linux locale în această închidere.

**E62-01 — informativ, pentru publicarea efectivă:** statutul de candidată, data publicării și eventualul DOI de versiune vor necesita atunci un commit separat, strict limitat la metadate și fișierele generate corespunzătoare, urmat de verificare punctuală. Nu se simulează publicarea prin metadatele actuale.

**E62-02 — informativ:** diferențele exclusiv CRLF/LF observate de Opus sunt excluse explicit din commit: data/geospatial-formats.js și tutorials/t01.html–t05.html. Verificarea locală compară textul normalizat cu bloburile HEAD, fără resetări sau curățări distructive. Inventarul intenționat rămâne exact16 fișiere existente, fără fișiere noi neignorate; numai acest jurnal este completat la închidere.

**Limite păstrate — NETESTAT:** GUI QGIS3.44, fluxul integral Suceava, dispozitive fizice, cititoare de ecran și browsere native suplimentare. Nu se reiau procesările GIS extinse; integritatea originalelor se verifică prin hash față de dovezile existente. Limita datamask Hansen absent local rămâne documentată. Nu se extrapolează probele motorului la execuție GUI sau accesibilitate umană.

Se autorizează un singur commit local, cu mesajul chore(v4): prepare release candidate metadata and documentation, după verificările finale selective. Noul HEAD va fi **candidata v4.0.0 nepublicată**, fixată pentru cele două audituri independente Astra și Opus. Hashul trebuie să rămână neschimbat pe durata ambelor audituri; orice modificare sau amendare ulterioară necesită o decizie explicită și reluarea verificărilor relevante. Hashul complet și starea Git se raportează după commit, fără amendarea lui pentru a-i introduce propriul identificator în jurnal. Fără push, merge, tag, release, GitHub Pages sau Zenodo; auditurile finale nu sunt lansate în această operațiune.


**Verificări finale de închidere6.2 — PASS:** validatorul și modelul/contractul v3:1439 verificări,14 cazuri negative;194 fișiere intacte și9 excepții exacte; navigare:5628 verificări/73 destinații, fragmente/reload/Back-Forward și control negativ; lecția1.2:354 verificări pe5 viewporturi/2 teme; parcurs:362 verificări,24 pași/3 variante; căutare:920 verificări/329 căutări; ateliere:3799 verificări/48 layouturi. Schema oficială CFF1.2.0, politica versiunii/DOI și licențele MIT/CC BY4.0 trec. Indexul păstrează90 înregistrări/72 resurse;42HTML/47 fișiere generate sunt identice între două build-uri, --check nu scrie, iar cele72 resurse sunt verificate în două fonturi. Hashurile celor9 GeoPackage-uri și9 fișiere Suceava/sidecar-uri coincid cu probele existente, fără procesare GIS suplimentară. Snapshotul istoric și referințele protejate sunt intacte. git diff --check PASS. Numai jurnalul diferă față de preflight-ul închiderii; celelalte15 fișiere auditate sunt byte-identice. Logurile locale de închidere sunt în tmp/qa/op62-close/, ignorate de Git. Verificarea staged se efectuează separat, pe lista explicită de16 fișiere și fără cele6 diferențe exclusiv CRLF/LF.


### Remediere consolidată după auditurile finale Astra/Opus (2026-10-22)

**Referința auditată:** 0dbdad46f48ddcd72390edeea0e68756c4a09df2, branch restructure/v4.0.0. Ambele audituri independente au verdict ACCEPTAT CU REZERVE, cu cele 6 constatări neblocante transmise de proprietar. Mandatul autorizează numai remedierile punctuale și testele, fără staging/commit sau publicare. Working tree și index curate la preflight; main/origin/main și v3.0.0 rămân la baseline 6c36a95c2bb58d31208efbee4b9f3595130bb814. Artefactul .git/stale-index-lock-audit-opus exista cu exact 0 octeți; după verificarea absenței proceselor Git active a fost eliminat exclusiv acest fișier. Nu a fost șters index.lock și nu s-au făcut resetări.

| Constatare | Intervenție și dovadă locală |
|---|---|
| ASTRA-V4-01 | js/search.js consumă explicit lab_id din manifest și id pentru T01–T06; codul exact, normalizat RO/case-insensitive, are prioritate față de titlu/metadate/corp. Subsecțiunile diagnostice nu moștenesc codul canonic pentru ranking exact. Ordinea de inventar este criteriul determinist la egalitate. Sunt păstrate rezultatele secundare, fragmentele diagnostice și navigarea tastatură. Nu se introduce un registru sau un text DOM nou. |
| ASTRA-V4-02 | În contractul existent data/workshop-reproducibility.json, revizia §3 T06 precizează T01n, 1.2 integrală, L11 și competențele CRS/vector/raster; declară explicit că T02–T05 nu sunt obligatorii. tools/workshop-content.mjs aplică revizia prin mecanismul existent și regenerează tutorials/t06.html. Nivelul Avansat și pașii tehnici sunt păstrați. |
| ASTRA-V4-03 | Secțiunea statică #decision din geospatial-data.html este sursa autoritativă a acestui text, păstrată de generator; trimiterea la capitolul planificat este înlocuită cu linkul data-quality.html, L13. Nu se editează divergent o secțiune generată și nu se elimină extensii viitoare distincte. Linkul este accesat efectiv în browser; indexul regenerat include formularea nouă. |
| OPUS-F-01/F-02 | css/design-system.css permite ruperea numelor de câmp/fișier/URL în ateliere și Resources, restrângerea copiilor flex/grid și fieldset, plus textul antetului/footerului în stres. Nicio trunchiere, ascundere orizontală sau alterare a câmpurilor/numerelor. Paleta și iconurile nu sunt schimbate. Primul test extins a reprodus defectul T05 la 320 px: două intrări li cu nume lungi neîncadrate în code; corecția inițială numai pe code era insuficientă. În stresul CSS integral zoom: 2 au fost identificate și constrângeri de lățime în antet/footer; acestea au fost corectate, nu excluse din aserțiunea de overflow. |
| OPUS-F-03 | Numai tests/qa/p07-labs.cjs se modifică, nu exportul aplicației. PNG: semnătură, structură/chunk-uri complete și CRC, decodare reală în browser, 2362×1772, acoperire opacă și variație vizuală. PGW: exact 6 valori finite, pixel independent din scară/150 dpi, rotații0, nord în sus, originea centrului pixelului și corespondența ambelor margini cu PNG; toleranță explicită pentru rotunjirea PGW la 6 zecimale. Numele de bază PNG/PGW coincid. Hashul binar este diagnostic, fără identitate Windows impusă altor platforme; P07_REFERENCE_PNG_SHA256 permite doar o referință opțională de mediu declarată. Nu este o certificare vizuală pixel-cu-pixel multiplatformă. |

**Căutare — 26/26 coduri canonice PASS**, fiecare și în litere mici, cu primul href corect, destinații fără duplicate exacte și aceeași ordine la repetare:

| Cod | Prima destinație | Cod | Prima destinație |
|---|---|---|---|
| L01 | scale-resolution.html | L11 | raster-styling.html |
| L02 | generalization-lab.html | L12 | zarr-cloud-data.html |
| L03 | projection-crs-lab.html | L13 | data-quality.html |
| L04 | measurement-lab.html | L14 | analysis.html |
| L05 | classification-lab.html | L15 | raster-analysis.html |
| L06 | thematic-methods.html | L16 | spatial-statistics.html |
| L07 | styling-labeling.html | L17 | network-accessibility.html |
| L08 | map-diagnostics.html | L18 | spatial-decision.html |
| L09 | topology.html | L19 | georeferencing-lab.html |
| L10 | formats-interoperability.html | L20 | gis-calculator.html |
| T01 | tutorials/t01.html | T04 | tutorials/t04.html |
| T02 | tutorials/t02.html | T05 | tutorials/t05.html |
| T03 | tutorials/t03.html | T06 | tutorials/t06.html |

L010, L190, T010 și interogarea fără rezultate nu produc potriviri parțiale/fabricate; mesajul fără rezultate este verificat. ArrowDown mută focusul pe primul rezultat L19, Escape închide și întoarce focusul, Enter pe l19 deschide laboratorul. Cele90 înregistrări/72 resurse sunt păstrate; toate ID-urile și href-urile din index sunt identice cu referința auditată. Numai textele celor2 înregistrări geospatial-data și T06 diferă. Cele7 paragrafe recuperate în6.2 și excluderea rezultatelor calculate rămân verificate în cele 2 configurații CSS/Canvas de fonturi. O comparație auxiliară între tablouri din contexte VM diferite a necesitat normalizarea obiectelor înainte de deepStrictEqual; aceasta era o particularitate a probei, nu un defect de index/produs.

**Responsive local — PASS:**72 configurații ale tuturor T01–T06, 320/375/390/768/1024/1440 px× light/dark. Suplimentar 150 probe: T01, T02, T05, T06, Resources ×320/375/390/768/1440 px × light/dark × normal/text200%/CSS zoom: 2 pe document. Se verifică lățimea întregului document și poziția textelor/legăturilor necesare; tabelele/code cu derulare explicită rămân accesibile. CSS zoom: 2 nu este prezentat drept zoom nativ. Capturile T05/320 și Resources/375/dark/zoom2 au fost inspectate vizual; numele întregi sunt păstrate prin rupere, fără eliminarea textului.

**Exporturi executate — PASS:**Zarea și Delta, PNG și PGW reale. PNG Zarea are 150 culori cuantizate/interval luminanță 210, Delta114/195; ambele 7854 eșantioane opace. Pe Windows hashul Zarea rămâne chiar 9e3661314ce001c92bb441833f6e4b94287d7371ef436c9b69be5d424a621cdf, fără a-l transforma în condiție multiplatformă. Sunt respinse deliberat pentru fiecare hartă: PNG trunchiat, PNG cu CRC alterat, PGW cu 7 valori, pixel dublat, rotație nenulă, semn vertical inversat, origine deplasată și PNG valid structural dar complet uniform.16 controale negative de export, alături de controalele numerice/GCP deja existente; datele, rezoluția și algoritmii nu se schimbă.

**Conservare:**manifestul, modelul pedagogic, nivelurile, 24 pași/3 proiecte finale, snapshotul v3, metadatele candidatei și toate licențele sunt byte-identice cu referința auditată. Cele194 fișiere v3 intacte și aceleași 9 excepții exacte rămân obligatorii; se actualizează numai hashul excepției documentare deja existente workshop-reproducibility.json pentru ASTRA-V4-02, fără lărgirea listei sau modificarea preimaginii v3. Originalele GIS sunt intacte: 9 GeoPackage-uri și9 surse Suceava/sidecar-uri, prin rehash față de probele existente; fără procesări GIS extinse. Candidată nepublicată, data lansării și DOI-ul de versiune rămân nemodificate.

**Limitări — NETESTAT aici:**Linux/macOS și browsere native suplimentare, zoom nativ de browser (probele locale sunt Chrome headless, CSS zoom și text mărit), GUI QGIS 3.44, fluxul integral Suceava, dispozitive fizice și cititoare de ecran. Determinismul și exporturile acestei remedieri sunt certificate local numai Windows/Chrome; este necesară reverificare punctuală independentă, inclusiv Linux, înainte de desemnarea candidatei finale. Această variantă de working tree nu este încă o candidată finală. Nu se pornește6.3/E62-01, nu se modifică/amendează commitul auditat, nu se efectuează staging/commit/push/merge/tag/release/Zenodo și nu sunt lansate audituri externe de agent.


| Verificare consolidată executată | Rezultat final local |
|---|---|
| Validator/model/contract v3 | PASS 1439 verificări, 14 cazuri negative, 194 fișiere intacte + 9 excepții exacte |
| Navigare și fragmente | PASS 5628; 73 destinații, Back/Forward, reload, control negativ al derulării |
| Lecția 1.2 / parcurs și PF | PASS 354 / PASS 362; 24 pași, 3 variante, 0 erori |
| Catalog/căutare + ID-uri | PASS 1089; 498 verificări de căutare, 26 coduri×2 forme case, 97 snippeturi, 50 verificări semantice; 0 erori/warnings/linkuri defecte |
| Ateliere + responsive | PASS 5863; 72 configurații T01–T06 și150 probe de reflow; 0 erori/eșecuri |
| P07 / PNG și PGW reale | PASS 5377; 4224 Zarr, 830 georeferențiere, 49 controale negative totale inclusiv16 de export; 0 erori/fișiere lipsă/rețea externă |
| Browser consolidat / operații | PASS 2921; 364 configurații, 29 operații; 0 erori/eșecuri |
| Build final / --check / fonturi | PASS 42HTML/47 fișiere, 2 build-uri identice,--check fără scriere; 72 resurse× Arial/Courier New cu metrici Canvas diferite; 90 înregistrări |
| CFF 1.2.0/licențe/date originale | PASS; metadate nepublicate4.0.0 nemodificate, MIT/CC BY4.0; 9 GeoPackage-uri + 9 surse Suceava/sidecar-uri intacte |
| Scope Git / diff --check | PASS; exact 11 fișiere existente modificate, fără fișiere noi neignorate, index gol, HEAD și referințe protejate neschimbate |

Primul FAIL al suitei responsive extinse era defectul de produs T05/320 reprodus și remediat mai sus; nu au fost relaxate verificările de overflow pentru obținerea PASS. Nu rămân FAIL funcționale locale. Probele și capturile sunt în tmp/qa/final-remediation/, tmp/qa/operation2/, tmp/qa/p07/ și tmp/qa/companion-hub/, ignorate de Git. Comenzile de reproducere sunt cele existente: tools/validate-learning.cjs; tests/v4-model.cjs; tests/v4-navigation.cjs; tests/lot51-browser.cjs; tests/lot53-browser.cjs; tests/qa/companion-hub.cjs; tests/run-existing.cjs workshop-reproducibility; tests/qa/p07-labs.cjs; tests/v4-browser.cjs; tests/v4-build.cjs, cu CODEX_NODE_MODULES/QA_BROWSER_PATH din runtime-ul local. Schema CFF și hashurile originale sunt verificate prin probele existente, fără noi pachete sau date GIS.

**Fișiere modificate:**js/search.js; css/design-system.css; data/workshop-reproducibility.json; geospatial-data.html (conținut static autoritativ #decision); tutorials/t06.html și data/search-index.js (regenerate); tests/protected-files.cjs; tests/qa/companion-hub.cjs; tests/qa/workshop-reproducibility.cjs; tests/qa/p07-labs.cjs; acest jurnal. Nicio altă sursă versionată nu diferă în octeți față de preflight. Generatorul și extractorul determinist nu sunt schimbate. **Git final:**restructure/v4.0.0, HEAD 0dbdad46f48ddcd72390edeea0e68756c4a09df2, 11 modificări intenționate, index gol, main/origin/main/v3.0.0 intacte. Oprire înainte de staging și commit; este necesară reverificarea independentă a remedierilor înaintea unei noi candidate finale.


### Închiderea remedierilor post-audit — N-01/N-02/N-03 (2026-10-22)

Conform reverificărilor independente transmise de proprietar: **Astra Low — APROBAT**, ASTRA-V4-01/02/03 rezolvate; **Opus High — ACCEPTAT CU REZERVE**, OPUS-F-01/02/03 rezolvate și confirmate independent pe Linux. Rezultatele Linux sunt atribuite Opus, nu execuțiilor locale Windows. Commitul local este autorizat după corecția N-01 și verificările cerute, fără reimplementarea celor șase remedieri.

**N-01 — corecție aplicată:** imediat după regula generală de rupere se adaugă exclusiv ".workshop-main table { overflow-wrap: normal; }". Tabelele cu layout automat nu mai folosesc fragmentarea artificială a cuvintelor pentru calculul lățimilor. Ruperea identificatorilor din listele de pregătire și a URL-urilor Resources rămâne activă; containerele de derulare explicită ale tabelelor rămân accesibile. Fără overflow:hidden, trunchiere sau modificarea conținutului.

**N-02 — limitare vizuală neblocantă:** Opus confirmă o diferență de 12 px între înălțimea antetului și variabila --header, fără ascunderea controalelor sau compromiterea ancorelor. Implementarea antetului este păstrată integral; N-01 nu o modifică. Această observație nu este declarată rezolvată.

**N-03 — spațiere:** în secțiunea precedentă sunt separate cuvintele/valorile alipite și semnele de punctuație care îngreunau citirea. Verificarea automată confirmă identitatea textului înainte/după ignorarea exclusivă a spațiilor; valorile, identificatorii, hashurile și concluziile tehnice nu sunt schimbate. Au fost corectate și două forme gramaticale din istoricul jurnalului (afilierii; cele 7 paragrafe editoriale recuperate), fără schimbarea valorilor sau a concluziilor. Nu se creează documentație paralelă.

Preflight: restructure/v4.0.0, HEAD 0dbdad46f48ddcd72390edeea0e68756c4a09df2, exact 11 fișiere intenționate, index gol și fără fișiere noi neignorate. Se pregătește un singur commit local cu mesajul fix(v4): resolve final audit findings, cu părinte direct commitul auditat. Nu se amendează referința inițială și nu se începe E62-01/publicarea. Noul commit va fi propus drept candidată finală, sub rezerva verificării punctuale a integrității și reproductibilității.


**N-01 — ÎNCHISĂ local:** proba dedicată execută 24 cazuri T03/T04/T05/Resources la 320/375/390 px, light/dark, fără overflow sau erori runtime. În toate cele 6 cazuri T03, textul administrativ ocupă 2 rânduri în interiorul cuvântului cu regula anterioară și 1 rând după remediere; Fundal rămâne întreg. Tabelele au overflow-wrap: normal, listele de pregătire T05 păstrează anywhere. Captura T03-375-N01.png a fost inspectată vizual: despărțirea între cele două cuvinte este permisă, fragmentarea lor artificială nu mai apare. Implementarea antetului este identică în octeți cu preflight-ul după eliminarea exclusivă a noii reguli N-01; N-02 rămâne neblocantă.

| Verificări finale înainte de commit | Rezultat local Windows |
|---|---|
| Validator + v4-model / contract v3 | PASS, 1.439 verificări, 14 cazuri negative, 194 fișiere intacte și 9 excepții exacte |
| v4-navigation | PASS, 5.628 verificări, 73 destinații și fragmente/history/reload |
| Catalog și căutare canonică | PASS, 1.089 verificări; toate L01–L20 și T01–T06, inclusiv litere mici, prima destinație corectă |
| v4-browser | PASS, 2.921 verificări, 364 configurații, 29 operații; zero erori/eșecuri |
| workshop-reproducibility | PASS, 5.863 verificări, 72 configurații și 150 probe de reflow |
| N-01 reflow dedicat | PASS, 24 cazuri, T03/T04/T05/Resources, 320/375/390 px, light/dark |
| p07-labs | PASS, 5.377 verificări, exporturi PNG/PGW reale, controale negative păstrate |
| Build + --check + fonturi | PASS, 42 HTML/47 fișiere, două build-uri identice și --check fără scriere; 72 resurse în două configurații CSS/Canvas de fonturi |
| Originale GIS și conservare | PASS, 9 GeoPackage-uri + 9 surse Suceava/sidecar-uri; snapshotul v3, modelul, manifestul, metadatele publicării și licențele neschimbate |
| git diff --check / inventar | PASS, exact aceleași 11 fișiere intenționate, fără diferențe exclusiv CRLF/LF sau fișiere noi neignorate |

Nu au apărut FAIL funcționale și nu au fost modificate testele în această închidere. Numai N-01 în CSS și completările/corecțiile jurnalului diferă față de cele 11 fișiere deja reverificate independent. Probele locale sunt în tmp/qa/post-audit-close/, ignorate de Git. Verificarea staged se efectuează separat pentru lista explicită de 11 fișiere. Se autorizează exclusiv commitul local fix(v4): resolve final audit findings; după commit se verifică părintele direct 0dbdad46f48ddcd72390edeea0e68756c4a09df2, working tree curat, index gol și referințele protejate. Nu se execută E62-01, push, merge, tag, release sau publicare. Hashul nou se raportează fără amendarea commitului pentru a-l introduce în propriul jurnal.
