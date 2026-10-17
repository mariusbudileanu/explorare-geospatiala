/* P04 bounded adapters; Cartesian metres for L02, schematic units for L06. */
(function(root){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v)),requireValue=v=>{if(!v)throw Error('Invalid P04 parameter');};
  const polygon=(id,ring,group='A')=>({id,type:'Polygon',coordinates:ring,group});
  const scenes={
    line:[{id:'route',type:'LineString',coordinates:[[0,0],[10,0],[20,3],[30,0],[40,0],[50,20],[60,0],[70,0],[80,-3],[90,0],[100,0]]}],
    polygon:[polygon('notch',[[0,0],[100,0],[100,100],[60,100],[50,80],[40,100],[0,100],[0,0]])],
    hole:[{id:'lake',type:'Polygon',coordinates:[[[0,0],[50,-2],[100,0],[102,50],[100,100],[50,102],[0,100],[-2,50],[0,0]],[[40,40],[60,40],[60,60],[40,60],[40,40]]]}],
    aggregate:[polygon('a',[[0,0],[40,0],[40,40],[0,40],[0,0]]),polygon('b',[[40,0],[80,0],[80,40],[40,40],[40,0]]),polygon('c',[[0,40],[40,40],[40,80],[0,80],[0,40]],'B'),polygon('d',[[40,40],[80,40],[80,80],[40,80],[40,40]],'B')],
    displacement:[{id:'p',type:'Point',coordinates:[48,50]},{id:'q',type:'Point',coordinates:[52,50]}]
  };
  const geo=f=>({type:'Feature',properties:{},geometry:{type:f.type,coordinates:f.type==='Polygon'?root.CARTO_TOPOLOGY_ENGINE.geometry.rings(f):f.coordinates}});
  function metrics(fs){const G=root.CARTO_TOPOLOGY_ENGINE.geometry;return {vertices:fs.reduce((s,f)=>s+G.vertices(f).length-(f.type==='Polygon'?G.rings(f).length:0),0),area:fs.filter(f=>f.type.includes('Polygon')).reduce((s,f)=>s+G.area(f),0),length:fs.filter(f=>f.type==='LineString').reduce((s,f)=>s+f.coordinates.slice(1).reduce((n,b,i)=>n+Math.hypot(b[0]-f.coordinates[i][0],b[1]-f.coordinates[i][1]),0),0)};}
  function diagnosis(fs,scene){
    const E=root.CARTO_TOPOLOGY_ENGINE,G=E.geometry,invalid=fs.filter(f=>!G.validity(f));
    if(invalid.length)return {valid:false,invalid:invalid.map(f=>f.id),relation:null};
    const rule=scene==='line'||scene==='displacement'?'covered':'inside',point={id:'probe',type:'Point',coordinates:scene==='line'?[50,20]:scene==='displacement'?[48,50]:[50,90]};
    const result=E.ruleChecks.evaluate({rule,target:[point],reference:fs});return {valid:true,invalid:[],relation:result.valid,probe:point.coordinates,rule,errors:result.errors.length};
  }
  function generalize({scene='line',tolerance=5,denominator=1000,minArea=.5,offset=15}={}){
    requireValue(Object.hasOwn(scenes,scene)||scene==='selection');requireValue(Number.isFinite(tolerance)&&tolerance>=0&&tolerance<=200&&Number.isFinite(offset)&&offset>=0&&offset<=40&&Number.isFinite(minArea)&&minArea>=0&&minArea<=20);
    root.CARTO_P03_MODEL.scale.print(denominator,100,300);
    const G=root.CARTO_TOPOLOGY_ENGINE.geometry,input=scene==='selection'?root.CARTO_P03_MODEL.scale.features.map(f=>polygon(String(f.id),[[f.x,f.y],[f.x+f.width,f.y],[f.x+f.width,f.y+f.width],[f.x,f.y+f.width],[f.x,f.y]])):copy(scenes[scene]);let output=[],errors=[];
    if(scene==='aggregate')for(const group of ['A','B']){const members=input.filter(f=>f.group===group);let out=members[0];for(const f of members.slice(1))out=G.overlay(out,f,'union');output.push({...out,id:group,group,sourceIDs:members.map(f=>f.id)});}
    else if(scene==='selection')output=input.filter(f=>root.CARTO_P03_MODEL.scale.convert(Math.sqrt(G.area(f)),denominator)**2>=minArea);
    else if(scene==='displacement')output=input.map((f,i)=>({...f,coordinates:[f.coordinates[0],f.coordinates[1]+(i?0:offset)]}));
    else for(const f of input)try{const result=root.turf.simplify(root.turf.cleanCoords(geo(f)),{tolerance,highQuality:true,mutate:false});const g={...f,coordinates:result.geometry.coordinates};if(!G.validity(g))throw Error('invalid output');output.push(g);}catch{errors.push(f.id);}
    const before=metrics(input),after=metrics(output),reduction=before.vertices?100*(before.vertices-after.vertices)/before.vertices:0;
    // Directed maximum of original vertices to result segments, not Hausdorff distance.
    const segmentDistance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);};
    let deviation=null;if(scene==='line'&&output.length){const line=output[0].coordinates;deviation=Math.max(...input[0].coordinates.map(p=>Math.min(...line.slice(1).map((b,i)=>segmentDistance(p,line[i],b)))));}
    return {input,output,before,after,reduction,deviation,errors,excluded:input.filter(f=>!output.some(o=>o.id===f.id)).map(f=>f.id),beforeTopology:diagnosis(input,scene),afterTopology:output.length?diagnosis(output,scene):null,displacement:scene==='displacement'?offset:null,separation:scene==='displacement'?Math.hypot(output[0].coordinates[0]-output[1].coordinates[0],output[0].coordinates[1]-output[1].coordinates[1]):null};
  }
  function thematic({method='choropleth',variable='density',classification='equal',classes=4,size=25,dotValue=1000,interval=4,palette='blue'}={}){
    requireValue(['choropleth','symbols','dots','flows','isolines','diagrams'].includes(method)&&['count','density'].includes(variable)&&['equal','quantile','jenks'].includes(classification)&&Number.isInteger(classes)&&classes>=2&&classes<=6&&Number.isFinite(size)&&size>=5&&size<=40&&[500,1000,2000].includes(dotValue)&&[2,4,6].includes(interval)&&['blue','orange'].includes(palette));
    const D=root.CARTO_METHOD_DATA,H=root.CARTO_METHODS.math,areas=[10,20,30,40,50,60];
    const regions=D.dots.districts.map((f,i)=>({...copy(f),id:String(i+1),areaKM2:areas[i],value:variable==='count'?f.population:f.population/areas[i]}));
    const result={method,regions,variable,unit:variable==='count'?'people':'people/km²',palette};
    if(method==='choropleth')result.classification=root.CARTO_CLASSIFY.classify(regions.map(f=>f.value),{method:classification,classes});
    if(method==='symbols'){const max=Math.max(...regions.map(f=>f.value));result.symbols=regions.map(f=>({id:f.id,value:f.value,radius:H.proportionalRadius(f.value,max,size)}));}
    if(method==='dots'){requireValue(variable==='count');result.dots=regions.map((f,i)=>{const count=Math.round(f.population/dotValue);return {id:f.id,count,represented:count*dotValue,residual:f.population-count*dotValue,points:H.dotPositions(f.polygon,count,i*97)};});}
    if(method==='flows'){result.unit='thousand journeys/day';result.nodes=copy(D.flows.nodes);result.flows=D.flows.routes.map(f=>({...f,width:H.flowWidth(f.value,size/10)}));}
    if(method==='isolines'){result.unit='°C';result.field=copy(D.isolines.field);result.lines=[];for(let level=Math.ceil(5/interval)*interval;level<=26;level+=interval)result.lines.push({level,segments:H.isolineSegments(result.field,level)});}
    if(method==='diagrams'){result.unit='GWh/year';const rows=D.cartodiagram.regions,max=Math.max(...rows.map(r=>r.solar+r.wind+r.hydro));result.diagrams=rows.map((f,i)=>({...copy(f),id:String(i+1),total:f.solar+f.wind+f.hydro,radius:H.proportionalRadius(f.solar+f.wind+f.hydro,max,size)}));}
    return result;
  }
  root.CARTO_P04_CARTO={generalize,thematic,scenes,metrics};
})(typeof window==='undefined'?globalThis:window);
