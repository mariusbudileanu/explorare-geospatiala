/* Deterministic teaching model, not the PAL/QGIS labeling engine. */
(function(root){
  'use strict';
  const {esc}=root.CARTO_LAB,svgNS='http://www.w3.org/2000/svg',metricsCache=new Map(),paths=new Map();
  let context;
  function metrics(text,size=18,weight=600){const key=[text,size,weight].join('|');if(metricsCache.has(key))return metricsCache.get(key);context||=document.createElement('canvas').getContext('2d');context.font=`${weight} ${size}px system-ui, sans-serif`;const m={width:context.measureText(text).width+4,height:size*1.4+4};metricsCache.set(key,m);return m;}
  function bounds(x,y,width,height,angle=0){const a=angle*Math.PI/180,w=Math.abs(width*Math.cos(a))+Math.abs(height*Math.sin(a)),h=Math.abs(width*Math.sin(a))+Math.abs(height*Math.cos(a));return {x:x-w/2,y:y-h/2,width:w,height:h};}
  const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const fits=b=>b.x>=5&&b.y>=5&&b.x+b.width<=475&&b.y+b.height<=295;
  const readable=angle=>{let a=((angle+180)%360+360)%360-180;return a>90?a-180:a<-90?a+180:a;};
  function makeLabel(feature,text,x,y,{size=18,weight=600,angle=0,position='fixed'}={}){const m=metrics(text,size,weight);return {feature,text,x,y,size,weight,angle,position,...m,box:bounds(x,y,m.width,m.height,angle)};}
  const directions={NW:[-1,-1],N:[0,-1],NE:[1,-1],W:[-1,0],E:[1,0],SW:[-1,1],S:[0,1],SE:[1,1]};
  function candidate(feature,text,position,{size=18,distance=8}={}){const [dx,dy]=directions[position],m=metrics(text,size),gap=7+distance;return makeLabel(feature,text,feature.x+dx*(gap+m.width/2),feature.y+dy*(gap+m.height/2),{size,position});}
  function solve(features,{avoid=true,limit=Infinity,obstacles=[],priority=p=>p.priority||0,text=p=>p.name,size=18,distance=8,preferred='NE',fixed=false}={}){
    const order=features.slice().sort((a,b)=>priority(b)-priority(a)||Number(a.id)-Number(b.id)),accepted=[],records=[];
    for(const feature of order){const name=text(feature),positions=fixed?[preferred]:[preferred,...Object.keys(directions).filter(p=>p!==preferred)];let placed;
      if(accepted.length<limit)for(const position of positions){const p=candidate(feature,name,position,{size,distance});if(!fits(p.box)||obstacles.some(o=>overlaps(p.box,o))||(avoid&&accepted.some(q=>overlaps(p.box,q.box))))continue;placed=p;accepted.push(p);break;}
      records.push({feature,placement:placed,reason:placed?'afișată':accepted.length>=limit?'limită de densitate':'conflict / poziție indisponibilă'});
    }return {accepted,records};
  }
  function renderLabel(p,{color='var(--ink)',buffer=1,background='none',padding=4,opacity=.8,filter=''}={}){
    const attrs=`data-label-id="${esc(p.feature.id)}" data-position="${esc(p.position)}" data-class="${esc(p.feature.class||'')}" data-box="${[p.box.x,p.box.y,p.box.width,p.box.height].join(',')}"`;
    return `<g ${attrs} transform="translate(${p.x} ${p.y}) rotate(${p.angle})"><title>${esc(p.text)}</title>${background==='none'?'':`<rect x="${-p.width/2-padding}" y="${-p.height/2-padding}" width="${p.width+2*padding}" height="${p.height+2*padding}" rx="${background==='rounded'?8:0}" fill="var(--surface)" fill-opacity="${opacity}" stroke="var(--line)"/>`}<text text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-size="${p.size}" font-weight="${p.weight}" fill="${color}" ${buffer?`stroke="var(--surface)" stroke-width="${buffer*2}" paint-order="stroke" stroke-linejoin="round"`:''} ${filter?`filter="url(#${filter})"`:''}>${esc(p.text)}</text></g>`;
  }
  function point(p){const fill=p.class==='principal'?'#ba6350':p.class==='secondary'?'#477ba7':'#41866b';const geometry=p.class==='principal'?'<rect x="-6" y="-6" width="12" height="12"/>':p.class==='local'?'<path d="M0 -6L6 0L0 6L-6 0Z"/>':'<circle r="6"/>';return `<g data-point-id="${esc(p.id)}" transform="translate(${p.x} ${p.y})" fill="${fill}" stroke="var(--ink)" stroke-width="1"><title>${esc(p.name||p.id)}</title>${geometry}</g>`;}
  function table(records){return `<div class="lab-table-scroll"><table class="lab-data"><caption>Obiectele rămân în date; doar afișarea textului se schimbă</caption><thead><tr><th scope="col">ID</th><th scope="col">Denumire</th><th scope="col">Etichetă</th></tr></thead><tbody>${records.slice().sort((a,b)=>Number(a.feature.id)-Number(b.feature.id)).map(r=>`<tr><th scope="row">${esc(r.feature.id)}</th><td>${esc(r.feature.name)}</td><td>${esc(r.reason)}${r.placement?' · '+r.placement.position:''}</td></tr>`).join('')}</tbody></table></div>`;}
  const polyPath=g=>g.map(([x,y],i)=>(i?'L':'M')+x+' '+y).join(' ')+'Z';
  function centroid(g){let sum=0,x=0,y=0;g.forEach((a,i)=>{const b=g[(i+1)%g.length],c=a[0]*b[1]-b[0]*a[1];sum+=c;x+=(a[0]+b[0])*c;y+=(a[1]+b[1])*c;});return [x/(3*sum),y/(3*sum)];}
  function inside([x,y],g){let yes=false;for(let i=0,j=g.length-1;i<g.length;j=i++){const [xi,yi]=g[i],[xj,yj]=g[j];if(((yi>y)!==(yj>y))&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
  function labelInside(p,g){const a=p.angle*Math.PI/180;for(const dx of [-.5,-.25,0,.25,.5])for(const dy of [-.5,0,.5]){const x=dx*p.width,y=dy*p.height;if(!inside([p.x+x*Math.cos(a)-y*Math.sin(a),p.y+x*Math.sin(a)+y*Math.cos(a)],g))return false;}return true;}
  function interiorLabel(feature,angle=0){const g=feature.geometry,[cx,cy]=centroid(g),xs=g.map(p=>p[0]),ys=g.map(p=>p[1]),candidates=[[cx,cy]];for(let y=Math.min(...ys)+8;y<Math.max(...ys);y+=8)for(let x=Math.min(...xs)+8;x<Math.max(...xs);x+=8)candidates.push([x,y]);candidates.sort((a,b)=>Math.hypot(a[0]-cx,a[1]-cy)-Math.hypot(b[0]-cx,b[1]-cy));for(const [x,y] of candidates){const p=makeLabel(feature,feature.name,x,y,{size:18,angle});if(labelInside(p,g)&&fits(p.box))return p;}return null;}
  function polygonAngle(g){const cx=g.reduce((s,p)=>s+p[0],0)/g.length,cy=g.reduce((s,p)=>s+p[1],0)/g.length;let xx=0,yy=0,xy=0;g.forEach(([x,y])=>{xx+=(x-cx)**2;yy+=(y-cy)**2;xy+=(x-cx)*(y-cy);});return readable(.5*Math.atan2(2*xy,xx-yy)*180/Math.PI);}
  function pathInfo(d,ratio=.5){if(!paths.has(d)){const path=document.createElementNS(svgNS,'path');path.setAttribute('d',d);paths.set(d,{path,length:path.getTotalLength()});}const {path,length}=paths.get(d),distance=length*ratio,p=path.getPointAtLength(distance),a=path.getPointAtLength(Math.max(0,distance-1)),b=path.getPointAtLength(Math.min(length,distance+1));return {x:p.x,y:p.y,angle:readable(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI),length};}
  function callout(p){const f=p.feature,dx=f.x-p.x,dy=f.y-p.y,len=Math.hypot(dx,dy);if(len<1)return '';const ux=dx/len,uy=dy/len,t=Math.min(p.width/2/(Math.abs(ux)||1e-9),p.height/2/(Math.abs(uy)||1e-9));if(t+7>=len)return '';return `<path data-callout-id="${esc(f.id)}" d="M${f.x-ux*7} ${f.y-uy*7}L${p.x+ux*t} ${p.y+uy*t}" fill="none" stroke="var(--ink)" stroke-width="1.8"/>`;}
  const frame=(id,title,status,content)=>`<svg viewBox="0 0 480 300" role="img" aria-labelledby="${id}-svg-title ${id}-svg-desc"><title id="${id}-svg-title">${esc(title)}</title><desc id="${id}-svg-desc">${esc(status)}. Exemple originale sintetice. Numerele și tabelul asociază textul cu obiectele.</desc>${content}</svg>`;
  const scaleVisible=(p,level,{index=0,localCount=Infinity}={})=>p.class==='principal'||level>=1&&p.class==='secondary'||level>=2&&p.class==='local'&&(level===3||index<localCount);
  root.CARTO_LABEL_ENGINE={metrics,bounds,overlaps,fits,readable,makeLabel,candidate,solve,renderLabel,point,table,polyPath,centroid,inside,labelInside,interiorLabel,polygonAngle,pathInfo,callout,frame,scaleVisible};
})(window);
