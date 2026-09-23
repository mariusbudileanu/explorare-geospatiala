(function (root) {
  'use strict';
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const load = fetch('data/qgis-links.json').then(response => {
    if (!response.ok) throw new Error(`QGIS registry: HTTP ${response.status}`);
    return response.json();
  }).catch(() => root.CARTO_QGIS_LINKS);
  function linkMarkup(link, secondary = false) {
    if (!link?.verified || !link.url.startsWith('https://docs.qgis.org/3.44/en/docs/')) return '';
    const label = secondary ? `Documentație complementară QGIS 3.44: ${link.title}` : `Explorează ${link.source_type === 'QGIS Training Manual' ? 'tutorialul' : 'documentația'} QGIS 3.44`;
    return `<a class="qgis-external ${secondary?'qgis-secondary':''}" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}; se deschide într-o filă nouă">${escapeHtml(label)} ↗</a>`;
  }
  function cardLink(link) {
    if (!link?.verified || !link.url.startsWith('https://docs.qgis.org/3.44/en/docs/')) return '';
    const title = link.title.replace(/^\d+(?:\.\d+)*\.\s*(?:Lesson:\s*)?/, '').replace(/^The /,'');
    const label = `Vezi în QGIS: ${title}`;
    return `<a class="qgis-card-link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(label)}; se deschide într-o filă nouă">${escapeHtml(label)} ↗</a>`;
  }
  async function attach(lesson, rootElement) {
    try {
      const registry = await load;
      const bridge = registry.bridges.find(item => item.lesson_id === lesson.id);
      if (!bridge || !rootElement.isConnected) return;
      const links = Object.fromEntries(registry.links.map(item => [item.id, item]));
      const primary = links[bridge.primary];
      if (!primary) return;
      rootElement.querySelectorAll('.layer-card.gis-card, .qgis-card').forEach(card => {
        if (!card.querySelector('.qgis-card-link')) card.insertAdjacentHTML('beforeend',cardLink(primary));
      });
      const confidence = {direct:'Corespondență directă',close:'Corespondență apropiată',conceptual:'Corespondență conceptuală'}[bridge.confidence];
      const section = document.createElement('section');
      section.className = 'lesson-section qgis-bridge';
      section.setAttribute('aria-label', 'Aplică în QGIS 3.44');
      section.innerHTML = `<div class="qgis-bridge-heading"><span class="eyebrow">APLICĂ ÎN GIS</span><span class="source-tag qgis-tag">QGIS 3.44</span></div><h2>În QGIS</h2><div class="qgis-bridge-body"><div><span class="qgis-field-label">Manualul din 1974</span><strong>${escapeHtml(bridge.historical)}</strong></div><span class="qgis-arrow" aria-hidden="true">→</span><div><span class="qgis-field-label">Corespondență actuală</span><strong>${escapeHtml(bridge.modern)}</strong></div></div><p>${escapeHtml(bridge.explanation)}</p><p class="qgis-path"><strong>Practic:</strong> ${escapeHtml(bridge.where)} <span>· ${escapeHtml(confidence)}</span></p><div class="qgis-links">${linkMarkup(primary)}${bridge.secondary.map(id => linkMarkup(links[id], true)).join('')}</div><p class="qgis-source-type">Sursă principală: ${escapeHtml(primary.source_type)}.</p>`;
      if (lesson.id === 'projection-basics') section.insertAdjacentHTML('beforeend','<p><strong>CRS în practică:</strong> Stereo 70 folosește stereografică oblică; UTM și Gauss–Krüger folosesc Transverse Mercator; LAEA Europe folosește Lambert Azimuthal Equal Area; Pseudo-Mercator servește hărțile web. Un cod EPSG descrie întregul CRS, nu doar proiecția. <a href="lesson.html?id=rectangular-coordinates">Explorează catalogul celor opt CRS →</a></p>');
      const before = rootElement.querySelector('#surse') || rootElement.querySelector('.page-footer');
      if (before) before.before(section); else rootElement.append(section);
    } catch (error) {
      console.warn('Legăturile QGIS nu au putut fi încărcate.', error);
    }
  }
  root.CARTO_QGIS = {attach};
})(window);
