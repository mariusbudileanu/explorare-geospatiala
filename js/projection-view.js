/* SVG adapter with persistent nodes, uniform scaling and geographic shared location. */
(function(root){
  'use strict';const ns='http://www.w3.org/2000/svg',E=root.CARTO_PROJECTION_LAB_ENGINE;
  function create({onLocation=()=>{}}={}){
    let host,svg,title,polygon,line,start,end,cursor,horizontal,vertical,projected,context,crs,scale=1,origin=[0,0],metrics={},dead=false;
    const node=(name,attrs={})=>{const n=document.createElementNS(ns,name);for(const [key,value] of Object.entries(attrs))n.setAttribute(key,value);return n;};
    const xy=p=>[250+(p[0]-origin[0])*scale,175-(p[1]-origin[1])*scale];
    const path=(points,closed)=>points.map((p,i)=>{const q=xy(p);return (i?'L':'M')+q[0].toFixed(3)+' '+q[1].toFixed(3);}).join(' ')+(closed?' Z':'');
    function select(event){const screen=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse()),x=screen.x,y=screen.y;
      try{const p=root.CRS_ENGINE.transform(crs,'EPSG:4326',[origin[0]+(x-250)/scale,origin[1]-(y-175)/scale]);E.validate(p);onLocation(p);}catch(error){onLocation(null,error.message);}}
    function init(element){host=element.querySelector('.projection-drawing')||element;svg=node('svg',{viewBox:'0 0 500 350',role:'img','aria-label':'Geometrie sintetică proiectată; punctul poate fi ales și numeric'});title=node('title');svg.append(title);
      polygon=node('path',{class:'projection-polygon'});line=node('path',{class:'projection-segment'});start=node('circle',{r:4,class:'projection-endpoint'});end=node('circle',{r:4,class:'projection-endpoint'});
      cursor=node('g',{class:'projection-cursor'});horizontal=node('path');vertical=node('path');cursor.append(horizontal,vertical);svg.append(polygon,line,start,end,cursor);host.append(svg);svg.addEventListener('click',select);
    }
    function update({view,context:next}){if(dead)return;crs=view.crs;context=next;projected=E.project(crs,context.geometry);metrics={...projected.metrics};
      const p=projected.boundary.concat(projected.line),xs=p.map(p=>p[0]),ys=p.map(p=>p[1]),min=[Math.min(...xs),Math.min(...ys)],max=[Math.max(...xs),Math.max(...ys)];
      origin=[(min[0]+max[0])/2,(min[1]+max[1])/2];scale=Math.min(420/(max[0]-min[0]),270/(max[1]-min[1]));
      polygon.setAttribute('d',path(projected.boundary,true));line.setAttribute('d',path(projected.line,false));polygon.hidden=context.type!=='polygon';polygon.style.display=context.type==='polygon'?'':'none';line.style.display=context.type==='point'?'none':'';end.style.display=context.type==='point'?'none':'';
      for(const [n,p] of [[start,projected.center],[end,projected.line[projected.line.length-1]]]){const q=xy(p);n.setAttribute('cx',q[0]);n.setAttribute('cy',q[1]);}
      title.textContent='Aceeași '+({point:'poziție',segment:'linie geodezică',polygon:'suprafață'}[context.type])+' în '+crs+'. Încadrare independentă, fără scală comună între panouri.';
    }
    function setSharedLocation(p){if(dead)return;const value=E.transform(crs,p),q=xy(value),outside=q[0]<0||q[0]>500||q[1]<0||q[1]>350;
      const warning=[projected.metrics.warning,crs.startsWith('EPSG:326')&&E.utmCode(p[0])!==crs?'Punctul inspectat este în afara zonei UTM selectate.':'',outside?'Punctul inspectat este în afara încadrării; coordonatele rămân în tabel.':''].filter(Boolean).join(' ');
      metrics={...metrics,coordinates:value,geographic:[...p],warning};
      horizontal.setAttribute('d',`M${q[0]-7} ${q[1]}h14`);vertical.setAttribute('d',`M${q[0]} ${q[1]-7}v14`);cursor.style.display=outside?'none':'';
    }
    return {init,update,setSharedLocation,resize(){if(!dead)svg.setAttribute('width','100%');},getMetrics:()=>({...metrics}),destroy(){if(dead)return;dead=true;svg.removeEventListener('click',select);svg.remove();svg=null;host=null;projected=null;context=null;}};
  }
  root.CARTO_PROJECTION_VIEW={create};
})(window);
