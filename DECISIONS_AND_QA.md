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
