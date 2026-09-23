/* Small keyboard and touch accessible explanations for the existing filters. */
(() => {
  'use strict';
  const messages = {
    content: '<strong>Tip conținut</strong><p>Arată sau ascunde concepte, figuri, formule, exemple, exerciții, context istoric și carduri GIS.</p>',
    level: '<strong>Nivel</strong><p><b>Esențial:</b> noțiunile principale ale lecției.</p><p><b>Detaliat:</b> explicații și exemple suplimentare.</p><p><b>Avansat:</b> formule, detalii tehnice și particularități.</p>',
    source: '<strong>Sursă</strong><p><b>Manual 1974:</b> conținut istoric atribuit cărții.</p><p><b>Explicație modernă:</b> interpretarea didactică a site-ului.</p><p><b>GIS / QGIS:</b> corespondențe și aplicații actuale.</p>',
    theme: '<strong>Temă</strong><p>Restrânge cardurile după subiect. Poți combina acest filtru cu celelalte categorii.</p>'
  };
  const popover = document.querySelector('#filter-info-content');
  if (!popover) return;
  let active = null;
  let openReason = '';
  function close() {
    popover.hidden = true;
    if (active) {
      active.setAttribute('aria-expanded', 'false');
      active.removeAttribute('aria-describedby');
    }
    active = null;
    openReason = '';
  }
  function open(button, reason) {
    close();
    active = button;
    openReason = reason;
    popover.innerHTML = messages[button.dataset.info];
    button.closest('fieldset').append(popover);
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-describedby', 'filter-info-content');
    popover.hidden = false;
  }
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.filter-info');
    if (button) {
      if (active === button && openReason === 'focus') { openReason = 'click'; return; }
      if (active === button) { close(); return; }
      open(button, 'click');
    } else if (!event.target.closest?.('#filter-info-content')) close();
  });
  document.addEventListener('focusin', event => {
    const button = event.target.closest?.('.filter-info');
    if (button && button.matches(':focus-visible')) open(button, 'focus');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && active) { const button = active; close(); button.focus(); }
  });
})();
