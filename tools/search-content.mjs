/** Browser DOM extraction shared by the index generator and its regression tests. */
export function extractSearchContent(main) {
  // Live exercise controls, load states and selected dataset rows are not lesson text.
  // They can change between DOMContentLoaded and data completion (or user actions).
  const excluded='script,style,template,footer,nav,dialog,noscript,.runtime-notice,[aria-live],.feedback,#challenge-workspace,#challenge-catalog';
  const boundaries=new Set(['ADDRESS','ARTICLE','ASIDE','BLOCKQUOTE','BR','DD','DIV','DL','DT','FIGCAPTION','FIGURE','H1','H2','H3','H4','H5','H6','HR','LI','OL','P','SECTION','TABLE','TD','TH','TR','UL','A','BUTTON','LABEL','LEGEND','OUTPUT']);
  const textOf=node=>{
    if(node.nodeType===3)return node.nodeValue;
    if(node.nodeType!==1||node.matches(excluded))return '';
    const text=[...node.childNodes].map(textOf).join('');
    const separated=boundaries.has(node.tagName)||node.matches('[role="heading"],.level-badge,.source-tag,.gis-tag,.eyebrow');
    return separated?' '+text+' ':text;
  };
  const clean=node=>textOf(node).replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').trim();
  const paragraphs=[...main.querySelectorAll('h2,h3,h4,h5,h6,p,li,dt,dd,th,td,figcaption,label,legend')]
    .filter(e=>!e.closest(excluded)).map(e=>{
      const text=clean(e);
      return e.matches('h3')&&e.parentElement.id.startsWith('nivel-')&&e.nextElementSibling
        ?text+' · '+clean(e.nextElementSibling):text;
    }).filter(t=>t.length>3);
  return {description:clean(main.querySelector('.lead')||main.querySelector('h1')||main),paragraphs:[...new Set(paragraphs)]};
}
