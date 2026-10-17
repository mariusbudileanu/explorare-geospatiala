/* P05 bounded synthetic models. Existing classification and label engines remain authoritative. */
(function(root){
  'use strict';
  const need=(test,message='Invalid P05 parameter')=>{if(!test)throw Error(message);},clone=v=>JSON.parse(JSON.stringify(v));
  const sum=a=>a.reduce((s,v)=>s+v,0),finite=v=>typeof v==='number'&&Number.isFinite(v);
  // Rectangular Cartesian metre support, deliberately unequal cell areas.
  const widths=[500,1000,1500,1000],heights=[1000,500,1500,1000],counts=[10,15,80,95,12,18,85,100,20,25,110,125,22,30,120,140];
  const cells=counts.map((count,i)=>{const row=Math.floor(i/4),col=i%4,x=sum(widths.slice(0,col)),y=sum(heights.slice(0,row));return {id:i,row,col,x,y,width:widths[col],height:heights[row],area:widths[col]*heights[row]/1e6,count,eligible:200+i*20};});
  function moran(values,weights){
    const n=values.length;need(n>0&&n<=64&&values.every(finite)&&weights.length===n&&weights.every((r,i)=>r.length===n&&r.every((v,j)=>finite(v)&&v>=0&&(i!==j||v===0))));
    // Scaling first avoids overflow in cross-products; uniform values are undefined.
    const scale=Math.max(...values.map(Math.abs))||1,v=values.map(x=>x/scale),mean=sum(v)/n,z=v.map(x=>x-mean),denominator=sum(z.map(x=>x*x)),s0=sum(weights.map(sum));
    const islands=weights.map((r,i)=>sum(r)===0?i:null).filter(i=>i!==null);
    if(denominator===0||s0===0)return {I:null,reason:denominator===0?'zero-variance':'no-neighbors',n,s0,islands};
    const numerator=sum(weights.map((r,i)=>sum(r.map((w,j)=>w*z[i]*z[j]))));
    return {I:n/s0*numerator/denominator,reason:null,n,s0,islands};
  }
  function statistics({zoning='fine',variable='density',neighbors='rook',normalization='row',island=false,pattern='cluster'}={}){
    need(['fine','blocks','rows','columns'].includes(zoning)&&['count','density','rate'].includes(variable)&&['rook','queen'].includes(neighbors)&&['row','binary'].includes(normalization)&&typeof island==='boolean'&&['cluster','checker','uniform'].includes(pattern));
    const input=cells.map(c=>({...c,count:pattern==='cluster'?c.count:pattern==='checker'?((c.row+c.col)%2?100:10):100*c.area}));
    const key=c=>zoning==='fine'?c.id:zoning==='blocks'?Math.floor(c.row/2)*2+Math.floor(c.col/2):zoning==='rows'?c.row:c.col;
    const groups=new Map();for(const c of input){const k=key(c);if(!groups.has(k))groups.set(k,{id:k,members:[],count:0,area:0,eligible:0});const g=groups.get(k);g.members.push(c);g.count+=c.count;g.area+=c.area;g.eligible+=c.eligible;}
    const zones=[...groups.values()];for(const g of zones)g.value=variable==='count'?g.count:variable==='density'?g.count/g.area:g.count/g.eligible*100;
    const touches=(a,b)=>{const dx=Math.abs(a.col-b.col),dy=Math.abs(a.row-b.row);return neighbors==='rook'?dx+dy===1:Math.max(dx,dy)===1;};
    const adjacency=zones.map((a,i)=>zones.map((b,j)=>i!==j&&(!island||(i!==zones.length-1&&j!==zones.length-1))&&a.members.some(c=>b.members.some(d=>touches(c,d)))?1:0));
    const weights=adjacency.map(r=>{const total=sum(r);return r.map(v=>normalization==='row'&&total?v/total:v);});
    const result=moran(zones.map(g=>g.value),weights),classification=root.CARTO_CLASSIFY.classify(zones.map(g=>g.value),{method:'equal',classes:4});
    return {input,zones,weights,adjacency,moran:result,classification,total:sum(zones.map(g=>g.count)),area:sum(zones.map(g=>g.area)),eligible:sum(zones.map(g=>g.eligible)),density:sum(zones.map(g=>g.count))/sum(zones.map(g=>g.area)),unit:variable==='count'?'people':variable==='density'?'people/km²':'% eligible'};
  }
  const nodes=Array.from({length:12},(_,i)=>({id:String(i),x:i%4*1000,y:Math.floor(i/4)*1000,service:i===3?'school':i===11?'health':null})).concat([{id:'12',x:3500,y:2600,service:'school'},{id:'13',x:4000,y:2600,service:null}]);
  const edges=[];for(let i=0;i<12;i++){if(i%4<3)edges.push({id:i+'-'+(i+1),a:String(i),b:String(i+1),speed:Math.floor(i/4)===0?3:6});if(i<8)edges.push({id:i+'-'+(i+4),a:String(i),b:String(i+4),speed:6});}edges.push({id:'12-13',a:'12',b:'13',speed:3});
  function graph({barrier=false,slow=false}={}){
    need(typeof barrier==='boolean'&&typeof slow==='boolean');
    return {nodes:clone(nodes),edges:edges.filter(e=>!barrier||!['1-2','9-10'].includes(e.id)).map(e=>{const a=nodes.find(n=>n.id===e.a),b=nodes.find(n=>n.id===e.b),distance=Math.hypot(b.x-a.x,b.y-a.y),speed=slow&&e.id==='5-6'?1:e.speed;return {...e,speed,distance,time:distance/(speed*1000/60)};})};
  }
  function shortest(g,start,cost='distance'){
    need(g&&g.nodes.length>0&&g.nodes.length<=64&&g.edges.length<=256&&['distance','time'].includes(cost)&&g.nodes.some(n=>n.id===start));
    const ids=g.nodes.map(n=>n.id);need(new Set(ids).size===ids.length&&g.edges.every(e=>ids.includes(e.a)&&ids.includes(e.b)&&finite(e[cost])&&e[cost]>0),'Positive finite edge costs required');
    const distance=Object.fromEntries(ids.map(id=>[id,Infinity])),previous={},visited=new Set();distance[start]=0;
    while(visited.size<ids.length){let current=null;for(const id of ids)if(!visited.has(id)&&(current===null||distance[id]<distance[current]))current=id;if(current===null||!finite(distance[current]))break;visited.add(current);
      for(const e of g.edges){const next=e.a===current?e.b:e.b===current?e.a:null;if(next===null||visited.has(next))continue;const d=distance[current]+e[cost];if(d<distance[next]){distance[next]=d;previous[next]={node:current,edge:e.id};}}
    }
    return {distance,previous};
  }
  function network({start='0',destination='3',cost='distance',budget,barrier=false,slow=false,service='school'}={}){
    budget??=cost==='distance'?2500:30;
    need(['distance','time'].includes(cost)&&finite(budget)&&budget>=0&&budget<=(cost==='distance'?10000:300)&&['school','health'].includes(service));
    const g=graph({barrier,slow});need(g.nodes.some(n=>n.id===destination));const result=shortest(g,start,cost),total=result.distance[destination],path=[],pathEdges=[];
    if(finite(total)){let id=destination;path.push(id);while(id!==start){const prev=result.previous[id];pathEdges.push(prev.edge);id=prev.node;path.push(id);}path.reverse();pathEdges.reverse();}
    // Continuous accessible edge intervals: union from both endpoints, no buffer.
    const segments=[];for(const e of g.edges){const left=Math.max(0,Math.min(1,(budget-result.distance[e.a])/e[cost])),right=Math.max(0,Math.min(1,(budget-result.distance[e.b])/e[cost]));if(left+right>=1)segments.push({edge:e.id,from:0,to:1});else{if(left>0)segments.push({edge:e.id,from:0,to:left});if(right>0)segments.push({edge:e.id,from:1-right,to:1});}}
    const a=g.nodes.find(n=>n.id===start),b=g.nodes.find(n=>n.id===destination),services=g.nodes.filter(n=>n.service===service).map(n=>({id:n.id,cost:finite(result.distance[n.id])?result.distance[n.id]:null,accessible:result.distance[n.id]<=budget}));
    return {graph:g,distance:Object.fromEntries(Object.entries(result.distance).map(([id,v])=>[id,finite(v)?v:null])),path,pathEdges,total:finite(total)?total:null,straight:Math.hypot(a.x-b.x,a.y-b.y),segments,reachable:g.nodes.filter(n=>result.distance[n.id]<=budget).map(n=>n.id),services,routeMetres:sum(pathEdges.map(id=>g.edges.find(e=>e.id===id).distance)),routeMinutes:sum(pathEdges.map(id=>g.edges.find(e=>e.id===id).time)),unit:cost==='distance'?'m':'min'};
  }
  const palettes={sequential:['#41866b','#41866b','#41866b'],ordered:['#005824','#41ae76','#ccece6'],diverging:['#2166ac','#f7f7f7','#b2182b'],qualitative:['#c07d64','#6297c0','#967fb0']},classes=['principal','secondary','local'];
  function luminance(hex){need(/^#[0-9a-f]{6}$/i.test(hex));return sum(hex.slice(1).match(/../g).map((h,i)=>{const v=parseInt(h,16)/255;return [0.2126,0.7152,0.0722][i]*(v<=.04045?v/12.92:((v+.055)/1.055)**2.4);}));}
  const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  function design(view,points,background='#ffffff',stroke='#102f3b'){
    need(Object.hasOwn(palettes,view.palette)&&finite(view.size)&&view.size>0&&view.size<=32&&finite(view.principalScale)&&view.principalScale>=1&&view.principalScale<=2);
    const palette=palettes[view.palette],opacity=view.opacity??100,strokeWidth=view.stroke??1;
    need(finite(opacity)&&opacity>=0&&opacity<=100&&finite(strokeWidth)&&strokeWidth>=0&&strokeWidth<=4);
    const blend=hex=>'#'+hex.slice(1).match(/../g).map((v,i)=>Math.round(parseInt(v,16)*opacity/100+parseInt(background.slice(1+i*2,3+i*2),16)*(1-opacity/100)).toString(16).padStart(2,'0')).join('');
    return classes.map((category,i)=>({category,color:palette[i],radius:view.size*(category==='principal'?view.principalScale:1),opacity:opacity/100,strokeWidth,count:points.filter(p=>p.class===category).length,contrast:contrast(blend(palette[i]),background),strokeContrast:contrast(stroke,background)}));
  }
  root.CARTO_P05_MODEL={statistics,moran,cells,graph,shortest,network,design,contrast,palettes};
})(typeof window==='undefined'?globalThis:window);
