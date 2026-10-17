/* v3 contract: RO default, literal dictionaries, versioned URL data, no executable expressions.
 * Consumers supply defaults and a validator returning a complete, bounded state.
 * Only the owning lab's query parameter is changed; legacy hashes remain intact.
 */
(function(root){
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const language=value=>value==='en'?'en':'ro';
  const text=(lang,ro,en)=>language(lang)==='en'?en:ro;
  function read(search,id,defaults,validate){
    try{const raw=new URLSearchParams(search).get(id);if(!raw)return {...defaults};if(raw.length>2048)throw Error('State too large');const data=JSON.parse(raw);if(data.v!==1)throw Error('State version');return validate(data.state);}
    catch{return {...defaults};}
  }
  function url(href,id,state){const result=new URL(href);result.searchParams.set(id,JSON.stringify({v:1,state}));return result;}
  const number=(value,lang,digits=5)=>Number(value).toLocaleString(language(lang)==='en'?'en-GB':'ro-RO',{maximumFractionDigits:digits});
  root.CARTO_V3={esc,language,text,read,url,number};
})(typeof window==='undefined'?globalThis:window);
