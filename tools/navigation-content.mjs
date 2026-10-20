// Shared final decoration: intermediate builders and --check must see identical HTML.
export function decorateNavigation(html,manifest,file) {
  const prefix=file.startsWith('tutorials/')?'../':'';
  const id=manifest.lessons.find(l=>l.href===file)?.id||'';
  const nav=manifest.navigationMarkup({prefix,currentId:id});
  html=html.replace(/(<nav[^>]+id="chapter-nav"[^>]*>)[\s\S]*?<\/nav>/,(_,open)=>open+nav+'</nav>');
  if(id){
    const escape=text=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    html=html.replace(/(<span class="eyebrow">)([^<]*)(<\/span>)/g,(_,open,label,close)=>{const revised=manifest.contextualEyebrow(id,label);return open+(revised===label?label:escape(revised))+close;});
    const breadcrumb=manifest.breadcrumbMarkup(id,prefix);
    if(/<(div|nav) class="lesson-breadcrumb"/.test(html))html=html.replace(/<(div|nav) class="lesson-breadcrumb"[^>]*>[\s\S]*?<\/\1>/,breadcrumb);
    else html=html.replace(/(<main\b[^>]*>)/,'$1'+breadcrumb);
  }
  const catalogue=manifest.lessons.find(l=>l.id==='digital-companion').title;
  html=html.replace(/(<a\b[^>]*href="(?:\.\.\/)?(?:gis-lab|digital-companion)\.html(?:#[^"]*)?"[^>]*>)([^<]*)(<\/a>)/g,(_,open,label,close)=>open+label.replace(/Digital Companion|Laborator GIS/gi,/^Deschide /.test(label)?catalogue.toLocaleLowerCase('ro-RO'):catalogue)+close);
  html=html.replaceAll('geometrie P02 și Turf local','geometrie sintetică și Turf local');
  return html.replaceAll('Explorare geospațială · Laborator GIS','Explorare geospațială · Cartografie și GIS').replace(/href="(\.\.\/)?gis-lab\.html"/g,(_,prefix='')=>`href="${prefix}digital-companion.html"`);
}
