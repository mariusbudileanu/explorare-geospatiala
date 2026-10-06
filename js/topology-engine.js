/* Small pure checks for the fixed, single-part teaching scenes; not GEOS/DE-9IM. */
(function(root){
  'use strict';
  const epsilon=1e-9,same=(a,b)=>Math.abs(a[0]-b[0])<epsilon&&Math.abs(a[1]-b[1])<epsilon,cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function onSegment(p,a,b){return Math.abs(cross(a,b,p))<epsilon&&p[0]>=Math.min(a[0],b[0])-epsilon&&p[0]<=Math.max(a[0],b[0])+epsilon&&p[1]>=Math.min(a[1],b[1])-epsilon&&p[1]<=Math.max(a[1],b[1])+epsilon;}
  function segmentIntersection(a,b,c,d){
    const den=(b[0]-a[0])*(d[1]-c[1])-(b[1]-a[1])*(d[0]-c[0]);
    if(Math.abs(den)<epsilon){const shared=[a,b,c,d].filter(p=>onSegment(p,a,b)&&onSegment(p,c,d)).filter((p,i,list)=>list.findIndex(q=>same(p,q))===i);return shared.length?{type:shared.length===1?'point':'line',location:shared[0],points:shared,proper:false}:null;}
    const t=((c[0]-a[0])*(d[1]-c[1])-(c[1]-a[1])*(d[0]-c[0]))/den,u=((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/den;if(t<-epsilon||t>1+epsilon||u<-epsilon||u>1+epsilon)return null;
    return {type:'point',location:[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],proper:t>epsilon&&t<1-epsilon&&u>epsilon&&u<1-epsilon};
  }
  function pointPosition(p,ring){let inside=false;for(let i=0;i<ring.length-1;i++){const a=ring[i],b=ring[i+1];if(onSegment(p,a,b))return 'boundary';if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside?'inside':'outside';}
  function polygonValidity(feature){
    const g=feature.coordinates,ids=[feature.id];if(g.length<4||!same(g[0],g[g.length-1]))return {valid:false,errorType:'ring',affectedFeatureIds:ids,location:g[0],message:'Inelul nu este închis sau are prea puține noduri.'};
    for(let i=0;i<g.length-1;i++)for(let j=i+2;j<g.length-1;j++){if(i===0&&j===g.length-2)continue;const hit=segmentIntersection(g[i],g[i+1],g[j],g[j+1]);if(hit)return {valid:false,errorType:'self-intersection',affectedFeatureIds:ids,location:hit.location,message:'Segmente neadiacente ale aceluiași inel se intersectează.'};}
    const area=Math.abs(g.slice(0,-1).reduce((sum,p,i)=>sum+p[0]*g[i+1][1]-g[i+1][0]*p[1],0))/2;
    return {valid:area>epsilon,errorType:area>epsilon?null:'zero-area',affectedFeatureIds:ids,location:null,message:area>epsilon?'Poligon simplu valid în modelul didactic.':'Poligon fără suprafață.'};
  }
  function rectangle(feature){const g=feature.coordinates,x=g.map(p=>p[0]),y=g.map(p=>p[1]),box=[Math.min(...x),Math.min(...y),Math.max(...x),Math.max(...y)];if(g.length!==5||!polygonValidity(feature).valid||g.slice(0,-1).some(p=>![box[0],box[2]].includes(p[0])||![box[1],box[3]].includes(p[1])))throw Error('Verificarea necesită un dreptunghi didactic.');return box;}
  const ring=box=>[[box[0],box[1]],[box[2],box[1]],[box[2],box[3]],[box[0],box[3]],[box[0],box[1]]];
  function rectangleIntersection(a,b){const x=[Math.max(a[0],b[0]),Math.max(a[1],b[1]),Math.min(a[2],b[2]),Math.min(a[3],b[3])],exists=x[0]<=x[2]&&x[1]<=x[3];return {exists,area:exists?(x[2]-x[0])*(x[3]-x[1]):0,box:exists?x:null};}
  function relations(a,b){
    const found=new Set(),ids=[a.id,b.id];let location=null,area=0;
    const add=(name,value)=>{if(value)found.add(name);};
    if(a.type==='Polygon'&&b.type==='Polygon'){
      const A=rectangle(a),B=rectangle(b),hit=rectangleIntersection(A,B),contains=(x,y)=>x[0]<=y[0]&&x[1]<=y[1]&&x[2]>=y[2]&&x[3]>=y[3],ab=contains(A,B),ba=contains(B,A);area=hit.area;location=hit.box;
      add('Equal',A.every((v,i)=>v===B[i]));add('Contains',ab);add('Within',ba);add('Cover',ab);add('CoveredBy',ba);add('Intersect',hit.exists);add('Touch',hit.exists&&area===0);add('Overlap',area>0&&!ab&&!ba);
    }else if(a.type==='LineString'&&b.type==='LineString'){
      const hit=segmentIntersection(...a.coordinates,...b.coordinates);location=hit?.location||null;add('Intersect',!!hit);add('Cross',hit?.proper);add('Touch',hit?.type==='point'&&!hit.proper);add('Equal',same(a.coordinates[0],b.coordinates[0])&&same(a.coordinates[1],b.coordinates[1])||same(a.coordinates[0],b.coordinates[1])&&same(a.coordinates[1],b.coordinates[0]));add('Overlap',hit?.type==='line'&&!found.has('Equal'));
    }else if(a.type==='Polygon'&&['Point','LineString'].includes(b.type)){
      rectangle(a);const points=b.type==='Point'?[b.coordinates]:b.coordinates,positions=points.map(p=>pointPosition(p,a.coordinates)),covered=positions.every(p=>p!=='outside'),interior=positions.some(p=>p==='inside')||b.type==='LineString'&&pointPosition([(points[0][0]+points[1][0])/2,(points[0][1]+points[1][1])/2],a.coordinates)==='inside';
      if(!covered&&b.type==='LineString')throw Error('Se verifică numai liniile acoperite din scenele fixe.');add('Cover',covered);add('Contains',covered&&interior);add('Intersect',covered);add('Touch',covered&&!interior);location=b.coordinates;
    }else if(b.type==='Polygon'&&['Point','LineString'].includes(a.type)){const reverse=relations(b,a),inverse={Contains:'Within',Within:'Contains',Cover:'CoveredBy',CoveredBy:'Cover'};return {...reverse,affectedFeatureIds:ids,relations:reverse.relations.map(name=>inverse[name]||name)};}
    else throw Error('Pereche nesuportată de scenele didactice.');
    add('Disjoint',!found.has('Intersect'));return {valid:true,relations:[...found],affectedFeatureIds:ids,location,area};
  }
  function introductionCheck(scene){
    const f=scene.features;
    if(f[1].type==='Point'){const position=pointPosition(f[1].coordinates,f[0].coordinates);return {valid:position==='inside',relation:position==='inside'?'Within':'Disjoint',affectedFeatureIds:[f[1].id],errors:position==='inside'?[]:[{type:'point',location:f[1].coordinates}],message:position==='inside'?'✓ Conform regulii: punct în interior.':'! Semnalat de regulă: punct în exterior.'};}
    if(f[0].type==='LineString'){const endpoints=f.flatMap(g=>g.coordinates),free=endpoints.filter(p=>!scene.terminals.some(t=>same(p,t))&&endpoints.filter(q=>same(p,q)).length===1);return {valid:free.length===0,relation:'conectivitate',affectedFeatureIds:f.filter(g=>g.coordinates.some(p=>free.some(q=>same(p,q)))).map(g=>g.id),errors:free.map(location=>({type:'endpoint',location})),message:free.length?'! Semnalat de regulă: o ramură nu ajunge la conexiunea cerută.':'✓ Conform regulii: toate ramurile au conexiunea cerută.'};}
    const boxes=f.map(rectangle),domain=scene.domain,xs=[...new Set([...boxes.flatMap(b=>[b[0],b[2]]),domain[0],domain[2]])].sort((a,b)=>a-b),ys=[...new Set([...boxes.flatMap(b=>[b[1],b[3]]),domain[1],domain[3]])].sort((a,b)=>a-b),errors=[];let gapArea=0,overlapArea=0;
    for(let x=0;x<xs.length-1;x++)for(let y=0;y<ys.length-1;y++){const box=[xs[x],ys[y],xs[x+1],ys[y+1]],centre=[(box[0]+box[2])/2,(box[1]+box[3])/2];if(centre[0]<domain[0]||centre[0]>domain[2]||centre[1]<domain[1]||centre[1]>domain[3])continue;const count=boxes.filter(b=>centre[0]>b[0]&&centre[0]<b[2]&&centre[1]>b[1]&&centre[1]<b[3]).length,area=(box[2]-box[0])*(box[3]-box[1]);if(count===0){gapArea+=area;errors.push({type:'gap',location:ring(box)});}if(count>1){overlapArea+=area;errors.push({type:'overlap',location:ring(box)});}}
    return {valid:!errors.length,relation:gapArea?'Gap':overlapArea?'Overlap':'acoperire continuă',gapArea,overlapArea,affectedFeatureIds:f.map(g=>g.id),errors,message:errors.length?'! Semnalat de regulă: '+(gapArea?'gap între unități.':'overlap între unități.'):'✓ Conform regulii: acoperire continuă, fără overlap.'};
  }
  function evaluateRound(round,perspective='A',answer=''){
    const features=perspective==='A'?round.features:round.features.slice().reverse(),result=relations(...features),expected=round.expected[perspective];if(!result.relations.includes(expected))throw Error('Fixture și geometrie incompatibile.');const correct=answer===expected,alsoTrue=!!answer&&result.relations.includes(answer),subject=perspective==='A'?'A':'B',other=subject==='A'?'B':'A';return {...result,relation:expected,correct,alsoTrue,message:!answer?'Alege relația pentru '+subject+' față de '+other+'.':(correct?'✓ Corect. ':'Nu încă. ')+subject+' '+expected+' '+other+'. '+round.why+(alsoTrue&&!correct?' Relația '+answer+' este și ea adevărată; întrebarea cere '+(round.id==='intersect'?'relația generală.':'relația mai specifică.'):'')};
  }
  root.CARTO_TOPOLOGY_ENGINE={same,onSegment,segmentIntersection,pointPosition,polygonValidity,rectangle,rectangleIntersection,ring,relations,introductionCheck,evaluateRound};
})(typeof window!=='undefined'?window:globalThis);
