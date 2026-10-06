/* Deterministic conceptual selections; no parsers, queries or network client. */
(function(root){
  'use strict';const F=root.CARTO_FORMATS;
  const intersects=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  function slice(variable,time){if(!F.variables[variable]||!Number.isInteger(+time)||+time<0||+time>=6)throw Error('Invalid synthetic slice');return Array.from({length:6},(_,r)=>Array.from({length:6},(_,c)=>variable==='temperature'?10+Number(time)*1.5+r*.6+c*.4:2+Number(time)*2+(r*3+c)%7));}
  function spatial(subset){const b=F.subsets[subset].box;return F.features.filter(f=>f.x>=b[0]&&f.x<b[2]&&f.y>=b[1]&&f.y<b[3]);}
  function columns(query,geometry=false){return {columns:query==='all'?['id','type','name','geometry']:['id','type','name',...(geometry?['geometry']:[])],features:query==='all'?F.features:F.features.filter(f=>f.type===query)};}
  const chunks=Array.from({length:27},(_,i)=>{const t=Math.floor(i/9),r=Math.floor(i%9/3),c=i%3;return {id:'C'+String(i+1).padStart(2,'0'),t,r,c,start:[t*2,r*2,c*2],end:[t*2+2,r*2+2,c*2+2]};});
  function selectedChunks(subset,from,to=from){const lo=Math.min(+from,+to),hi=Math.max(+from,+to),b=F.subsets[subset].box;return chunks.filter(c=>c.start[0]<=hi&&c.end[0]>lo&&intersects([c.start[2],c.start[1],c.end[2],c.end[1]],b));}
  function tiles(subset,level){const size=[6,3,2][+level],scale=6/size,out=[],b=F.subsets[subset].box;for(let r=0;r<size;r+=2)for(let c=0;c<size;c+=2){const box=[c*scale,r*scale,Math.min(c+2,size)*scale,Math.min(r+2,size)*scale];out.push({id:'L'+level+'-T'+Math.floor(r/2)+Math.floor(c/2),box,selected:intersects(box,b)});}return out;}
  function feedback(scenario,answer){if(!answer)return 'Alege formatul după cerințele scenariului.';const s=F.scenarios[+scenario],f=F.byId[answer];return answer===s.recommended?'✓ Alegere foarte potrivită pentru acest scenariu. '+s.why:'Compară cerințele: '+f.name+' este potrivit pentru '+f.typicalUses.toLowerCase()+'. Pentru cerința descrisă merită evaluat '+F.byId[s.recommended].name+'. '+s.why+' Nu este o regulă universală.';}
  root.CARTO_FORMATS_MODEL={slice,spatial,columns,chunks,selectedChunks,tiles,feedback,intersects};
})(typeof window!=='undefined'?window:globalThis);
