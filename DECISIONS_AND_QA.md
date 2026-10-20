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
