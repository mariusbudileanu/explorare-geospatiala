// Shared final decoration: intermediate builders and --check must see identical HTML.
export function decorateNavigation(html,manifest,file) {
  const prefix=file.startsWith('tutorials/')?'../':'';
  const id=manifest.lessons.find(l=>l.href===file)?.id||'';
  const nav=manifest.navigationMarkup({prefix,currentId:id});
  html=html.replace(/(<nav[^>]+id="chapter-nav"[^>]*>)[\s\S]*?<\/nav>/,(_,open)=>open+nav+'</nav>');
  if(id){
    const breadcrumb=manifest.breadcrumbMarkup(id,prefix);
    if(/<(div|nav) class="lesson-breadcrumb"/.test(html))html=html.replace(/<(div|nav) class="lesson-breadcrumb"[^>]*>[\s\S]*?<\/\1>/,breadcrumb);
    else html=html.replace(/(<main\b[^>]*>)/,'$1'+breadcrumb);
  }
  return html.replace(/href="(\.\.\/)?gis-lab\.html"/g,(_,prefix='')=>`href="${prefix}digital-companion.html"`);
}
