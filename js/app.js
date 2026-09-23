'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const number = (value, digits = 4) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: digits }).format(value);
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const readNumber = input => input.value.trim() === '' ? NaN : Number(input.value);
  const finiteRange = (value, limit) => Number.isFinite(value) && Math.abs(value) <= limit;
  const setPressed = (container, active) => $$('button', container).forEach(button => button.setAttribute('aria-pressed', String(button === active)));
  const hemisphere = (value, kind) => value < 0 ? (kind === 'latitude' ? 'S' : 'V') : (kind === 'latitude' ? 'N' : 'E');
  function dms(value, kind, signed = false) {
    // Round total seconds first, so 59.999 seconds carries into minutes/degrees.
    const total = Math.round(Math.abs(value) * 3600);
    const degrees = Math.floor(total / 3600);
    const minutes = Math.floor(total % 3600 / 60);
    const seconds = total % 60;
    const prefix = signed ? (value < 0 ? '−' : value > 0 ? '+' : '') : '';
    const suffix = signed || value === 0 ? '' : ` ${hemisphere(value, kind)}`;
    return `${prefix}${degrees}° ${String(minutes).padStart(2, '0')}′ ${String(seconds).padStart(2, '0')}″${suffix}`;
  }
  function decimal(value, kind, signed = false, digits = 4) {
    return signed ? `${value > 0 ? '+' : ''}${number(value, digits)}°` : `${number(Math.abs(value), digits)}°${value === 0 ? '' : ` ${hemisphere(value, kind)}`}`;
  }

  const manifest = window.CARTO_CONTENT;
  const lessonById = Object.fromEntries(manifest.lessons.map(lesson => [lesson.id, lesson]));
  $('#chapter-nav').innerHTML = manifest.groups.map(group => `<details class="nav-group" open><summary>${group.label}</summary>${group.lessons.map(id => {
    const lesson = lessonById[id];
    return `<a class="nav-item ${id === 'coordinates' ? 'active' : ''}" href="${lesson.href}" ${id === 'coordinates' ? 'aria-current="page"' : ''}>${lesson.editorial_number ? lesson.editorial_number + ' ' : ''}${lesson.title}</a>`;
  }).join('')}</details>`).join('');
  $('#future-lessons').innerHTML = [
    ['Coordonatele rectangulare', 'CRS, grilă metrică și transformări', 'rectangular-coordinates'],
    ['Sfera', 'Zone, calote, trapeze și fuse sferice', 'sphere'],
    ['Clasificarea hărților', 'Scară, conținut, teritoriu, destinație și culori', 'map-classification'],
    ['Cadrul hărții', 'Explorează elementele unei machete cartografice', 'map-frame'],
    ['Proiecțiile cartografice', 'Rețele matematice și scheme conceptuale', 'projection-basics']
  ].map(([title, text, id]) => `<a class="future-card" href="${lessonById[id].href}"><h3>${lessonById[id].editorial_number} ${title}</h3><p>${text}</p><span>Deschide lecția →</span></a>`).join('');

  function setNav(collapsed) {
    document.body.classList.toggle('nav-collapsed', collapsed);
    $('#nav-toggle').setAttribute('aria-expanded', String(!collapsed));
    $('#nav-toggle').setAttribute('aria-label', collapsed ? 'Deschide cuprinsul' : 'Restrânge cuprinsul');
  }
  const narrow = matchMedia('(max-width: 900px)');
  setNav(narrow.matches);
  narrow.addEventListener('change', event => setNav(event.matches));
  $('#nav-toggle').addEventListener('click', () => setNav(!document.body.classList.contains('nav-collapsed')));
  $('#chapter-nav').addEventListener('click', event => { if (event.target.closest('a') && narrow.matches) setNav(true); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && narrow.matches) setNav(true); });
  function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    $('#theme-toggle').setAttribute('aria-pressed', String(dark));
    $('#theme-toggle').setAttribute('aria-label', dark ? 'Activează modul luminos' : 'Activează modul întunecat');
    $('#theme-label').textContent = dark ? 'Mod luminos' : 'Mod întunecat';
  }
  try { setTheme(localStorage.getItem('cartografie-theme') === 'dark'); } catch { setTheme(false); }
  $('#theme-toggle').addEventListener('click', () => { const dark = !document.body.classList.contains('dark'); setTheme(dark); try { localStorage.setItem('cartografie-theme', dark ? 'dark' : 'light'); } catch { /* Browser storage may be unavailable. */ } });

  const localSearch = [
    {title:'Longitudine · λ',href:'#longitudine',tags:'est vest meridian'},
    {title:'Latitudine · φ',href:'#latitudine',tags:'nord sud ecuator'},
    {title:'Colatitudine · ψ',href:'#colatitudine',tags:'complement formula'},
    {title:'Meridiane origine istorice',href:'#meridiane',tags:'greenwich paris ferro roma tirana tabel'},
    {title:'Convertor de coordonate',href:'#convertor',tags:'grade minute secunde decimal dms'},
    {title:'Verifică dacă ai înțeles',href:'#exercitiu',tags:'test exercitiu'}
  ];
  const searchIndex = [
    ...localSearch,
    ...manifest.lessons.map(lesson => ({title:`${lesson.editorial_number ? `${lesson.editorial_number} · ` : ''}${lesson.title}`,href:lesson.href,tags:[lesson.part,lesson.source_section,...lesson.keywords,...lesson.figures.map(figure => figure.caption)].join(' ')}))
  ];
  $('#search').addEventListener('input', event => {
    const query = normalize(event.target.value.trim());
    const results = $('#search-results');
    results.hidden = !query;
    const matches = searchIndex.filter(item => normalize(`${item.title} ${item.tags}`).includes(query)).slice(0, 10);
    results.innerHTML = matches.length ? matches.map(item => `<a href="${item.href}">${item.title}</a>`).join('') : '<p>Niciun rezultat în MVP-ul istoric.</p>';
  });
  $('#search').addEventListener('keydown', event => {
    if (event.key === 'Escape') $('#search-results').hidden = true;
    if (event.key === 'ArrowDown') { event.preventDefault(); $('#search-results a')?.focus(); }
    if (event.key === 'Enter') { event.preventDefault(); $('#search-results a')?.click(); }
  });
  $('#search-results').addEventListener('click', event => { if (event.target.closest('a')) $('#search-results').hidden = true; });
  document.addEventListener('click', event => { if (!event.target.closest('.global-search')) $('#search-results').hidden = true; });

  // All supplementary content shares a generic layer model, independent of this lesson.
  const layers = { modern: true, textbook: false, history: false, formulas: false, examples: false, details: false };
  const presets = { essential: ['modern'], detailed: ['modern', 'formulas', 'examples', 'details'], historical: ['modern', 'textbook', 'history', 'details'] };
  function renderLayers() {
    $$('[data-layer]').forEach(element => { element.hidden = !layers[element.dataset.layer]; });
    $$('[data-layer-toggle]').forEach(input => { input.checked = layers[input.dataset.layerToggle]; });
  }
  $$('[data-layer-toggle]').forEach(input => input.addEventListener('change', () => { layers[input.dataset.layerToggle] = input.checked; renderLayers(); }));
  $('#explanation-mode').addEventListener('click', event => {
    const button = event.target.closest('[data-mode]'); if (!button) return;
    Object.keys(layers).forEach(key => { layers[key] = presets[button.dataset.mode].includes(key); });
    setPressed($('#explanation-mode'), button); renderLayers();
  });

  const visual = Object.fromEntries($$('[data-visual]').map(input => [input.dataset.visual, input.checked]));
  $$('[data-visual]').forEach(input => input.addEventListener('change', () => { visual[input.dataset.visual] = input.checked; drawGlobe(); }));
  const radians = Math.PI / 180;
  const cameraLongitude = 25 * radians, tilt = 18 * radians, radius = 173, cx = 350, cy = 230;
  const phoneDiagram = matchMedia('(max-width: 600px)');
  phoneDiagram.addEventListener('change', drawGlobe);
  function project(latitude, longitude, scale = radius) {
    const phi = latitude * radians, delta = longitude * radians - cameraLongitude;
    return { x: cx + scale * Math.cos(phi) * Math.sin(delta), y: cy - scale * (Math.sin(phi) * Math.cos(tilt) - Math.cos(phi) * Math.cos(delta) * Math.sin(tilt)), z: Math.sin(phi) * Math.sin(tilt) + Math.cos(phi) * Math.cos(delta) * Math.cos(tilt) };
  }
  const pointString = p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  function curve(points, color, width = 1.5) {
    // Segment front/back using depth, including longitude wrap and pole positions.
    let front = '', back = '';
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], segment = `M${pointString(a)}L${pointString(b)}`;
      if ((a.z + b.z) / 2 >= 0) front += segment; else back += segment;
    }
    return `<path d="${back}" stroke="${color}" stroke-width="${width}" class="back"/><path d="${front}" stroke="${color}" stroke-width="${width}"/>`;
  }
  const sampled = (start, end, steps, fn) => Array.from({ length: steps + 1 }, (_, i) => fn(start + (end - start) * i / steps));
  const parallelCurve = latitude => sampled(-180, 180, 180, longitude => project(latitude, longitude));
  const meridianCurve = longitude => sampled(-90, 90, 100, latitude => project(latitude, longitude));
  function drawGlobe() {
    const latitude = Number($('#latitude').value), longitude = Number($('#longitude').value);
    const p = project(latitude, longitude), foot = project(0, longitude);
    let markup = `<circle class="sphere" cx="${cx}" cy="${cy}" r="${radius}"/><line x1="350" y1="45" x2="350" y2="415" stroke="var(--line)" stroke-dasharray="3 5"/>`;
    if (visual.graticule) {
      for (let lat = -60; lat <= 60; lat += 30) markup += curve(parallelCurve(lat), 'var(--line)', .85);
      for (let lon = -180; lon < 180; lon += 30) markup += curve(meridianCurve(lon), 'var(--line)', .85);
    }
    if (visual.equator) markup += `<g data-globe-layer="equator">${curve(parallelCurve(0), 'var(--muted)', 1.7)}</g>`;
    if (visual.origin) markup += `<g data-globe-layer="origin">${curve(meridianCurve(0), 'var(--muted)', 1.7)}</g>`;
    if (visual.meridian) markup += `<g data-globe-layer="meridian">${curve(meridianCurve(longitude), 'var(--blue)', 2.3)}</g>`;
    if (visual.parallel) markup += `<g data-globe-layer="parallel">${curve(parallelCurve(latitude), 'var(--teal)', 2)}</g>`;
    if (visual.angles) {
      const zero = project(0, 0), lambdaLabel = project(0, longitude / 2, 100), phiLabel = project(latitude / 2, longitude, 106);
      markup += `<g data-globe-layer="angles"><path d="M${pointString(zero)}L${cx},${cy}L${pointString(foot)}L${pointString(p)}L${cx},${cy}" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 4"/>`;
      markup += curve(sampled(0, longitude, 80, lon => project(0, lon, 64)), 'var(--blue)', 3);
      markup += curve(sampled(0, latitude, 70, lat => project(lat, longitude, 84)), 'var(--teal)', 3);
      if (visual.labels) markup += `<text x="${lambdaLabel.x - 7}" y="${lambdaLabel.y + 23}" class="angle-label" style="fill:var(--blue)">λ</text><text x="${phiLabel.x + 10}" y="${phiLabel.y}" class="angle-label" style="fill:var(--teal)">φ</text><text class="angle-value" x="28" y="408">λ = ${number(longitude, 2)}°</text><text class="angle-value" x="28" y="431">φ = ${number(latitude, 2)}°</text>`;
      markup += '</g>';
    }
    const north = project(90, 0), south = project(-90, 0);
    markup += `<circle cx="${north.x}" cy="${north.y}" r="3" fill="var(--muted)"/><circle cx="${south.x}" cy="${south.y}" r="3" fill="var(--muted)"/><circle class="point ${p.z < 0 ? 'back-point' : ''}" cx="${p.x}" cy="${p.y}" r="6.5"/>`;
    if (visual.labels) {
      const label = (text, x, y, target, anchor = 'start') => `<path class="leader" d="M${pointString(target)}L${x + (anchor === 'end' ? 8 : -8)},${y - 4}"/><text class="curve-label" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
      markup += `<g data-globe-layer="labels"><text class="main-label" x="350" y="36" text-anchor="middle">Polul Nord</text><text class="main-label" x="350" y="440" text-anchor="middle">Polul Sud</text><text class="main-label" x="${p.x + 13}" y="${p.y - 9}">P</text>`;
      if (visual.equator) markup += label('Ecuator', 550, 331, project(0, 99));
      if (visual.origin) markup += label('Meridian Greenwich', 160, 347, project(-24, 0), 'end');
      if (visual.meridian) markup += label('Meridianul punctului', 525, 115, project(54, longitude));
      if (visual.parallel) markup += label('Paralela punctului', 167, 129, project(latitude, -42), 'end');
      markup += '</g>';
    }
    $('#globe').setAttribute('class', 'globe-svg');
    $('#globe').innerHTML = `<title id="globe-title">Coordonatele geografice pe o sferă</title><desc id="globe-description">P: ${decimal(latitude, 'latitude')}; ${decimal(longitude, 'longitude')}. ${p.z < 0 ? 'Punctul este pe emisfera din spate.' : 'Punctul este pe emisfera vizibilă.'}</desc>${markup}`;
    $('#comparison-globe').setAttribute('class', 'globe-svg');
    $('#comparison-globe').innerHTML = markup;
    [$('#globe'), $('#comparison-globe')].forEach(svg => svg.setAttribute('viewBox', phoneDiagram.matches ? '145 15 410 440' : '0 0 700 470'));
    $('#mobile-globe-labels').innerHTML = visual.labels ? [['equator', 'Ecuator', ''], ['origin', 'Meridian Greenwich', 'dashed'], ['meridian', 'Meridianul punctului', 'blue'], ['parallel', 'Paralela punctului', 'teal']].filter(([key]) => visual[key]).map(([, label, color]) => `<span><i class="line ${color}"></i>${label}</span>`).join('') : '';
    $('#historical-overlay').hidden = !visual.overlay;
    const signed = $('#longitude-convention').value === 'signed';
    const useDms = $('#coordinate-format').value === 'dms';
    $('#lat-primary').textContent = useDms ? dms(latitude, 'latitude') : decimal(latitude, 'latitude');
    $('#lon-primary').textContent = useDms ? dms(longitude, 'longitude', signed) : decimal(longitude, 'longitude', signed);
    $('#secondary-coordinates').textContent = useDms ? `Grade zecimale: ${number(latitude)}°; ${number(longitude)}°` : `DMS: ${dms(latitude, 'latitude')} · ${dms(longitude, 'longitude', signed)}`;
    $('#lat-value').textContent = decimal(latitude, 'latitude', false, 2);
    $('#lon-value').textContent = decimal(longitude, 'longitude', signed, 2);
    $('#latitude').setAttribute('aria-valuetext', decimal(latitude, 'latitude'));
    $('#longitude').setAttribute('aria-valuetext', decimal(longitude, 'longitude'));
    $('#point-status').textContent = Math.abs(latitude) === 90 ? 'La poli, toate meridianele se întâlnesc. Longitudinea nu definește o poziție distinctă.' : `${p.z < 0 ? 'P este pe emisfera din spate; conturul gol îl păstrează vizibil în schemă.' : 'P este pe emisfera vizibilă. Mută glisoarele și urmărește unghiurile.'}${visual.overlay ? ' Suprapunere conceptuală: scanul nu este aliniat geometric cu modelul.' : ''}`;
  }
  ['latitude', 'longitude'].forEach(id => $(`#${id}`).addEventListener('input', drawGlobe));
  ['coordinate-format', 'longitude-convention'].forEach(id => $(`#${id}`).addEventListener('change', drawGlobe));
  $('#reset-point').addEventListener('click', () => { $('#latitude').value = '44.4325'; $('#longitude').value = '26.1042'; drawGlobe(); });
  $('#colat-input').addEventListener('input', updateColatitude);
  function updateColatitude() {
    const value = readNumber($('#colat-input')), valid = Number.isFinite(value) && value >= 0 && value <= 90;
    $('#colat-input').setAttribute('aria-invalid', String(!valid));
    $('#colat-result').textContent = valid ? `${number(90 - value)}°` : 'Introdu o valoare între 0° și 90°.';
    $('#colat-ray').setAttribute('d', valid ? `M40 95L${40 + 80 * Math.cos(value * radians)} ${95 - 80 * Math.sin(value * radians)}` : '');
  }

  // Literal transcription from printed pp. 20–21. Do not replace with modern offsets.
  const meridians = [
    ['R.P. Albania', 'Tirana', '19°36′45″ Est', 'local', false],
    ['Belgia', 'Bruxelles (sau Greenwich)', '4°22′06″ Est', 'local', true],
    ['R.S. Cehoslovacia', 'Ferro (sau Greenwich)', '17°39′46″ Vest', 'Ferro', true],
    ['Danemarca', 'Copenhaga', '12°34′40″ Est', 'local', false],
    ['Elveția', 'Berna (sau Greenwich)', '7°26′25″ Est', 'local', true],
    ['Finlanda', 'Helsinki', '24°57′17″ Est', 'local', false],
    ['Franța', 'Paris', '2°20′14″ Est', 'local', false],
    ['Grecia', 'Atena', '23°42′59″ Est', 'local', false],
    ['Indonezia', 'Djakarta', '106°48′28″ Est', 'local', false],
    ['Italia', 'Roma', '12°27′07″ Est', 'local', false],
    ['Norvegia', 'Oslo', '10°43′23″ Est', 'local', false],
    ['Olanda', 'Amsterdam', '4°53′01″ Est', 'local', false],
    ['Portugalia', 'Lisabona (sau Greenwich)', '9°07′55″ Est', 'local', true],
    ['R.S. România', 'Ferro (sau Greenwich)', '17°39′48″ Vest', 'Ferro', true],
    ['Spania', 'Madrid', '3°41′15″ Est', 'local', false],
    ['Suedia', 'Stokholm (sau Greenwich)', '18°03′30″ Est', 'local', true],
    ['Turcia', 'Istambul', '28°58′50″ Est', 'local', false],
    ['R.P. Ungară', 'Ferro (sau Greenwich)', '17°39′46″ Vest', 'Ferro', true],
    ['U.R.S.S.', 'Pulkovo (sau Greenwich)', '30°19′38″ Est', 'local', true]
  ];
  let tableFilter = 'all';
  function renderTable() {
    const query = normalize($('#table-search').value.trim());
    const rows = meridians.filter(row => (tableFilter === 'all' || (tableFilter === 'Greenwich' ? row[4] : row[3] === tableFilter)) && normalize(row[0] + ' ' + row[1]).includes(query));
    $('#meridian-rows').innerHTML = rows.length ? rows.map(([country, origin, offset, type, alternative]) => `<tr><td>${country}</td><td>${origin}</td><td>${offset}</td><td><span class="type-label">${type === 'local' ? 'Local' : type}</span>${alternative ? ' <span class="type-label">Greenwich*</span>' : ''}</td></tr>`).join('') : '<tr><td colspan="4">Niciun meridian nu corespunde filtrelor.</td></tr>';
    $('#table-count').textContent = `${rows.length} din 19 intrări · transcriere din manual`;
  }
  $('#table-filters').addEventListener('click', event => { const button = event.target.closest('[data-type]'); if (!button) return; tableFilter = button.dataset.type; setPressed($('#table-filters'), button); renderTable(); });
  $('#table-search').addEventListener('input', renderTable);
  const originOffsets = {
    greenwich: { value: 0, note: 'Greenwich este reperul de 0°. Calcul didactic modern.' },
    paris: { value: 2 + 20 / 60 + 14 / 3600, note: 'Sursa din 1974, p. 20: Paris, 2°20′14″ Est.' },
    ferro: { value: -(17 + 39 / 60 + 46 / 3600), note: 'Sursa din 1974: folosim 17°39′46″ Vest, valoarea din rândurile Cehoslovacia și R.P. Ungară. Rândul R.S. România are 17°39′48″ Vest.' },
    roma: { value: 12 + 27 / 60 + 7 / 3600, note: 'Sursa din 1974, p. 20: Roma, 12°27′07″ Est.' },
    bucuresti: { value: 26.1042, note: 'Exemplu didactic modern: origine aleasă la 26,1042° E, în zona Bucureștiului. Nu este un meridian origine atribuit manualului.' }
  };
  function updateOrigin() {
    const value = readNumber($('#origin-longitude')), valid = finiteRange(value, 180), origin = originOffsets[$('#origin').value];
    $('#origin-longitude').setAttribute('aria-invalid', String(!valid));
    const shifted = ((value - origin.value + 180) % 360 + 360) % 360 - 180;
    $('#origin-result').textContent = valid ? decimal(shifted, 'longitude', false, 4) : 'Introdu −180°…+180°.';
    $('#origin-note').textContent = origin.note + ' Formula modernă: λ nouă = λ Greenwich − λ origine; rezultatul este adus în intervalul [−180°, 180°).';
  }
  $('#origin').addEventListener('change', updateOrigin);
  $('#origin-longitude').addEventListener('input', updateOrigin);

  let conversionDirection = 'to-dms';
  function convert() {
    const kind = $('#coordinate-kind').value, limit = kind === 'latitude' ? 90 : 180;
    let result = '', error = '';
    $$('#converter-form input').forEach(input => input.removeAttribute('aria-invalid'));
    if (conversionDirection === 'to-dms') {
      const value = readNumber($('#decimal-input'));
      if (!finiteRange(value, limit)) { error = `Introdu ${kind === 'latitude' ? 'o latitudine' : 'o longitudine'} între −${limit}° și +${limit}°.`; $('#decimal-input').setAttribute('aria-invalid', 'true'); }
      else result = dms(value, kind);
    } else {
      const degrees = readNumber($('#degrees')), minutes = readNumber($('#minutes')), seconds = readNumber($('#seconds'));
      if (!Number.isInteger(degrees) || degrees < 0 || degrees > limit) { error = `Gradele trebuie să fie un număr întreg între 0 și ${limit}.`; $('#degrees').setAttribute('aria-invalid', 'true'); }
      else if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 60) { error = 'Minutele trebuie să fie un număr întreg între 0 și 59.'; $('#minutes').setAttribute('aria-invalid', 'true'); }
      else if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 60) { error = 'Secundele trebuie să fie între 0 (inclusiv) și 60 (exclusiv).'; $('#seconds').setAttribute('aria-invalid', 'true'); }
      else if (degrees === limit && (minutes !== 0 || seconds !== 0)) { error = `La ${limit}°, minutele și secundele trebuie să fie 0.`; $('#degrees').setAttribute('aria-invalid', 'true'); }
      else { const value = (degrees + minutes / 60 + seconds / 3600) * Number($('#hemisphere').value); result = `${decimal(value, kind, false, 6)} (${number(value, 6)}°)`; }
    }
    $('#converter-error').textContent = error;
    $('#converter-result').textContent = error ? '—' : result;
    $('#rounding-note').textContent = conversionDirection === 'to-dms' ? 'Afișarea DMS este rotunjită la cea mai apropiată secundă.' : 'Gradele zecimale sunt rotunjite la cel mult 6 zecimale; valoarea din paranteze este semnată.';
  }
  $('#converter-form').addEventListener('submit', event => { event.preventDefault(); convert(); });
  $('#converter-tabs').addEventListener('click', event => {
    const button = event.target.closest('[data-direction]'); if (!button) return;
    conversionDirection = button.dataset.direction;
    $('#decimal-fields').hidden = conversionDirection !== 'to-dms'; $('#dms-fields').hidden = conversionDirection !== 'to-decimal';
    setPressed($('#converter-tabs'), button); convert();
  });
  $('#coordinate-kind').addEventListener('change', () => {
    const latitude = $('#coordinate-kind').value === 'latitude';
    $('#hemisphere').innerHTML = latitude ? '<option value="1">N</option><option value="-1">S</option>' : '<option value="1">E</option><option value="-1">V</option>';
    $('#degrees').max = latitude ? '90' : '180'; $('#decimal-input').min = latitude ? '-90' : '-180'; $('#decimal-input').max = latitude ? '90' : '180'; convert();
  });

  const questions = [
    ['Un punct aflat la 30° V se găsește la est sau la vest de Greenwich?', ['La est', 'La vest'], 1, 'V înseamnă vest; în convenția semnată, longitudinea este −30°.'],
    ['Ce latitudine are un punct situat pe ecuator?', ['0°', '90°'], 0, 'Ecuatorul este reperul de 0° al latitudinii.'],
    ['Schimbăm meridianul zero. Se deplasează punctul pe glob?', ['Da', 'Nu'], 1, 'Se schimbă valoarea longitudinii față de noua origine, nu poziția punctului.'],
    ['Care este colatitudinea unui punct la 30° N?', ['60°', '30°'], 0, 'În acest exemplu nordic, ψ = 90° − 30° = 60°.'],
    ['Câte minute de arc conține un grad?', ['100′', '60′'], 1, 'Un grad are 60 de minute de arc; fiecare minut are 60 de secunde.'],
    ['Ce emisferă indică latitudinea −25°?', ['Nordică', 'Sudică'], 1, 'În convenția semnată, latitudinile negative sunt sudice.'],
    ['Care este notația DMS pentru 26,5° E?', ['26° 50′ 00″ E', '26° 30′ 00″ E'], 1, '0,5 × 60 = 30 de minute de arc.'],
    ['Care este valoarea maximă a latitudinii nordice?', ['90° N', '180° N'], 0, 'Polul Nord are latitudinea 90° N.'],
    ['Ce coordonată măsurăm față de planul ecuatorului?', ['Latitudinea', 'Longitudinea'], 0, 'În modelul sferic, latitudinea este unghiul dintre raza punctului și planul ecuatorului.']
  ];
  let questionOffset = 0, quizAnswers = new Map();
  function renderQuiz() {
    quizAnswers = new Map(); $('#quiz-score').textContent = '0 / 3 răspunsuri';
    $('#quiz').innerHTML = Array.from({ length: 3 }, (_, index) => {
      const id = (questionOffset + index) % questions.length, question = questions[id];
      return `<article class="question" data-question="${id}"><div class="question-number">ÎNTREBAREA 0${index + 1}</div><h3>${question[0]}</h3><div class="answers">${question[1].map((answer, i) => `<button data-answer="${i}">${answer}</button>`).join('')}</div><p class="feedback" aria-live="polite"></p></article>`;
    }).join('');
  }
  $('#quiz').addEventListener('click', event => {
    const button = event.target.closest('[data-answer]'); if (!button) return;
    const card = button.closest('[data-question]'), id = Number(card.dataset.question), question = questions[id];
    if (quizAnswers.has(id)) return;
    const correct = Number(button.dataset.answer) === question[2]; quizAnswers.set(id, correct);
    button.classList.add(correct ? 'correct' : 'incorrect');
    $$('button', card).forEach(answer => { answer.disabled = true; if (Number(answer.dataset.answer) === question[2]) answer.classList.add('correct'); });
    $('.feedback', card).textContent = `${correct ? 'Corect.' : 'Răspuns incorect.'} ${question[3]}`;
    $('#quiz-score').textContent = `${quizAnswers.size} / 3 răspunsuri · ${[...quizAnswers.values()].filter(Boolean).length} corecte`;
  });
  $('#new-quiz').addEventListener('click', () => { questionOffset = (questionOffset + 3) % questions.length; renderQuiz(); });

  function openDialog(dialog) { if (!dialog.open) dialog.showModal(); document.body.classList.add('dialog-open'); }
  document.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-source-page]'), imageButton = event.target.closest('[data-source-image]');
    if (pageButton || imageButton) {
      const page = pageButton?.dataset.sourcePage, type = imageButton?.dataset.sourceImage;
      $('#source-image').src = page ? `assets/original/pagina-${page}.jpg` : `assets/original/${type === 'table' ? 'tabel-meridiane' : 'fig10-coordonate'}.png`;
      $('#source-image').alt = page ? `Pagina tipărită ${page} a manualului din 1974` : type === 'table' ? 'Tabelul original cu ambele fragmente de pe paginile 20–21' : 'Figura 10 originală';
      $('#source-title').textContent = page ? `Manualul original · pagina ${page}` : type === 'table' ? 'Tabel cu diferite meridiane origine' : 'Fig. 10. Coordonatele geografice';
      $('#source-caption').textContent = page ? `Pagina tipărită ${page} · pagina ${Number(page) + 2} din PDF. Scanul este sursa de referință.` : type === 'table' ? 'Decupaj din scanul original. Cele două fragmente ale tabelului sunt reunite fără modificarea valorilor.' : 'Decupaj din pagina tipărită 20 (pagina 22 din PDF), fără modificarea figurii.';
      $$('#source-pages button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.sourcePage === page)));
      openDialog($('#source-dialog'));
    }
    if (event.target.closest('[data-close-dialog]')) event.target.closest('dialog').close();
  });
  $('#about-open').addEventListener('click', () => openDialog($('#about-dialog')));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('close', () => document.body.classList.remove('dialog-open'));
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  });
  let scrollScheduled = false;
  function updateProgress() {
    const sections = $$('.track-section');
    let active = sections[0].id;
    const top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header')) + 100;
    for (const section of sections) if (section.getBoundingClientRect().top <= top) active = section.id;
    $$('.lesson-progress a').forEach(link => { const current = link.hash === `#${active}`; link.classList.toggle('current', current); if (current) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    $('#back-top').hidden = scrollY < 700; scrollScheduled = false;
  }
  window.addEventListener('scroll', () => { if (!scrollScheduled) { scrollScheduled = true; requestAnimationFrame(updateProgress); } }, { passive: true });
  $('#back-top').addEventListener('click', () => { $('#introducere').scrollIntoView(); });
  renderLayers(); drawGlobe(); updateColatitude(); renderTable(); updateOrigin(); renderQuiz(); updateProgress();
})();
