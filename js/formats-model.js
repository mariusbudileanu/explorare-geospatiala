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
  // Uncompressed, hypothetical payload model. No request, codec or measured timing.
  function access({scenario='cube',subset='nw',from=1,to=1,columns:fields='all'}={}){
    if(!['vector','raster','cube','access'].includes(scenario)||!Object.hasOwn(F.subsets,subset)||!Number.isInteger(from)||!Number.isInteger(to)||from<0||to>5||from>to||!['all','attributes'].includes(fields))throw Error('Invalid access selection');
    const b=F.subsets[subset].box,spatialCells=(b[2]-b[0])*(b[3]-b[1]);
    if(scenario==='vector'){
      const selected=spatial(subset),width=fields==='all'?96:48,total=F.features.length*96;
      return {total,useful:selected.length*width,whole:total,selective:selected.length*96,objects:1,ids:selected.map(f=>f.id),unit:'bytes',columnar:F.features.length*width,assumptions:'12 rows; 96 bytes/row; 48 attribute bytes/row; indexed access reads whole selected rows; column projection alone reads all rows'};
    }
    const cube=scenario!=='raster',ids=cube?selectedChunks(subset,from,to).map(c=>c.id):tiles(subset,0).filter(t=>t.selected).map(t=>t.id),total=cube?6*6*6*4:6*6*4;
    const useful=spatialCells*(cube?to-from+1:1)*4,selective=ids.length*(cube?8:4)*4;
    return {total,useful,whole:total,selective,objects:ids.length,ids,unit:'bytes',assumptions:cube?'6×6×6 float32; 2×2×2 chunks':'6×6 float32; 2×2 tiles'};
  }
  root.CARTO_FORMATS_MODEL={slice,spatial,columns,chunks,selectedChunks,tiles,feedback,intersects,access};
})(typeof window!=='undefined'?window:globalThis);
