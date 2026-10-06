/* Pure analysis engine: EPSG:4326, spherical distances/areas; no screen coordinates. */
(function (scope) {
  'use strict';
  const cache = new Map();
  const fc = features => turf.featureCollection(features.filter(Boolean));
  const number = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const intersect = (a, b) => a && b ? turf.intersect(fc([a, b])) : null;
  const layer = (id, label, data, style) => ({id, label, data, style});
  const metric = (label, value, unit = '', digits = 0) => ({label, value, unit, digits});
  function schools(data, config) {
    const selected = config.school_ids.map(id => data.schools.features.find(f => String(f.properties[config.fields.id]) === String(id)));
    if (selected.length !== 8 || selected.some(f => !f)) throw Error('Setul fix trebuie să conțină opt școli existente, cu ID-uri distincte.');
    const codes = selected.map(f => f.properties[config.fields.schoolCode]);
    if (new Set(config.school_ids).size !== 8 || new Set(codes).size !== 8) throw Error('Setul fix repetă un ID sau un cod SIIIR.');
    if (selected.some(f => !number(f.properties[config.fields.pupils]))) throw Error('O școală selectată nu are un număr valid de elevi. NULL nu este zero.');
    return selected;
  }
  function dissolve(points, radius, steps) {
    const circles = points.map(point => turf.circle(point, radius, {units:'kilometers', steps}));
    if (!circles.length) return null;
    return circles.length === 1 ? circles[0] : turf.union(fc(circles));
  }
  function weighted(grid, zone, field, boundary, includeOutside=false) {
    let inside = 0, outside = 0, total = 0, intersected = 0, partial = 0;
    const missing = [], pieces = [], uncovered = [];
    for (const cell of grid.features) {
      const fullArea = turf.area(cell);
      if (!(fullArea > 0)) throw Error('O celulă are suprafața nulă.');
      // Prepared polygons already define Sector 1 membership. Re-clipping would
      // change the denominator through floating-point slivers and inserted vertices.
      const footprint = cell;
      const overlap = intersect(footprint, zone);
      const area = overlap ? turf.area(overlap) : 0;
      const fraction = Math.min(1, Math.max(0, area / fullArea));
      const represented = 1;
      const value = cell.properties[field];
      if (area > 0.01) {
        intersected++;
        if (fraction < 1 - 1e-6) partial++;
        overlap.properties = {fid:cell.properties.fid, fraction, value:number(value)?value:null, estimated:number(value)?value*fraction:null};
        pieces.push(overlap);
      }
      if (!number(value)) {
        missing.push({fid:cell.properties.fid, intersects:area>0.01});
      } else {
        inside += value * fraction;
        outside += value * Math.max(0, represented - fraction);
        total += value * represented;
      }
      const remainder = includeOutside ? (zone ? turf.difference(fc([footprint,zone])) : footprint) : null;
      if (remainder && turf.area(remainder)>0.01) {
        remainder.properties={fid:cell.properties.fid,value:number(value)?value:null};uncovered.push(remainder);
      }
    }
    return {inside, outside, total, intersected, partial, missing, pieces:fc(pieces), uncovered:fc(uncovered)};
  }
  function schoolSum(data, config) {
    if (cache.has('V1')) return cache.get('V1');
    const selected=schools(data,config), total=selected.reduce((sum,f)=>sum+f.properties[config.fields.pupils],0);
    const result={kind:'EXACT',metrics:[metric('Total elevi în cele opt școli',total,'elevi')],
      table:{columns:['Școală','fid','Cod SIIIR','Elevi'],rows:selected.map(f=>[f.properties[config.fields.schoolName],f.properties[config.fields.id],f.properties[config.fields.schoolCode],f.properties[config.fields.pupils]])},
      layers:[layer('targets','Opt școli selectate',fc(selected),'target')],warnings:[],
      interpretation:['Suma este exactă în raport cu cele opt înregistrări din tabelul sursă (2022–2023). Setul are coduri SIIIR distincte.','Nu este un număr al elevilor care locuiesc în această zonă; instituțiile pot atrage elevi din alte cartiere.']};
    cache.set('V1',result);return result;
  }
  function under15(data, config) {
    if (cache.has('V2')) return cache.get('V2');
    const selected=schools(data,config), fullZone=dissolve(selected,config.radius_km,config.buffer_steps), boundary=data.boundary.features[0];
    const zone=intersect(fullZone,boundary), w=weighted(data.censusGrid,zone,config.fields.under15,boundary);
    const missing=w.missing.filter(c=>c.intersects);
    const result={kind:'ESTIMATED',metrics:[metric('Populație sub 15 ani estimată'+(missing.length?' · subtotal cunoscut':''),w.inside,'persoane'),metric('Suprafața bufferelor reunite',turf.area(fullZone)/1e6,'km²',2),metric('Zona din Sectorul 1',zone?turf.area(zone)/1e6:0,'km²',2),metric('Celule intersectate',w.intersected),metric('Celule parțiale',w.partial)],
      layers:[layer('zone','Zonă de 1 km reunită',fc([fullZone]),'zone'),layer('cells','Grid intersectat · celule parțiale cu contur punctat',w.pieces,'covered'),layer('targets','Opt școli selectate',fc(selected),'target')],
      warnings:missing.length?[`${missing.length} celule intersectate au populația sub 15 ani NULL/invalidă și nu contribuie la sumă: fid ${missing.map(c=>c.fid).join(', ')}. Rezultatul este incomplet.`]:[],
      interpretation:['Estimarea alocă valoarea fiecărei celule proporțional cu suprafața intersectată și presupune distribuție uniformă în interiorul celulei. Bufferele sunt reunite înainte de agregare, astfel încât suprapunerile nu dublează populația.','Se folosește suprafața poligonului furnizat, deja decupat la Sectorul 1, drept suprafață integrală a celulei. Nu este confirmat dacă populația descrie celula originală sau porțiunea decupată; rezultatul este un scenariu didactic condiționat de această ipoteză.','Gridul descrie anul 2021, iar școlile anul 2022–2023. Analiza include numai populația din gridul disponibil pentru Sectorul 1.'],
      details:{population:w.inside,union_area_m2:turf.area(fullZone),missing_cells:missing,intersected:w.intersected,partial:w.partial}};
    cache.set('V2',result);return result;
  }
  function primary(data,config) {
    if(cache.has('V4')) return cache.get('V4');
    const boundary=data.boundary.features[0],zone=intersect(dissolve(data.primaryCare.features,config.radius_km,config.buffer_steps),boundary);
    const w=weighted(data.censusGrid,zone,config.fields.population,boundary,true);
    const result={kind:'ESTIMATED',metrics:[metric('La maximum 1 km · populație cunoscută',w.inside,'persoane'),metric('La peste 1 km · populație cunoscută',w.outside,'persoane'),metric('Proporție la maximum 1 km',w.total>0?w.inside/w.total*100:null,'%',2),metric('Proporție la peste 1 km',w.total>0?w.outside/w.total*100:null,'%',2),metric('Populație cunoscută reprezentată',w.total,'persoane')],
      layers:[layer('outside','Fragmente la peste 1 km',w.uncovered,'outside'),layer('zone','Acoperire de 1 km în Sectorul 1',fc([zone]),'zone'),layer('inside','Fragmente la maximum 1 km',w.pieces,'covered'),layer('care','Cabinete de medicină de familie',data.primaryCare,'facility')],
      warnings:w.missing.length?[`${w.missing.length} celule au populația totală NULL/invalidă (fid ${w.missing.map(c=>c.fid).join(', ')}). Sunt excluse din ambele sume și din numitorul procentelor; populația lor rămâne necunoscută.`]:[],
      interpretation:['Proximitate spațială în linie dreaptă: rezultatul nu măsoară timp de deplasare sau acces pe rețeaua rutieră.','Proporțiile folosesc populația cunoscută, nu includ celulele fără informații. Ponderarea la suprafață presupune distribuție uniformă; suportul populației după decuparea gridului este încă neconfirmat.'],details:{inside:w.inside,outside:w.outside,total:w.total,missing_cells:w.missing,intersected:w.intersected,covered_area_m2:zone?turf.area(zone):0}};
    cache.set('V4',result);return result;
  }
  function truth(values,logic) {
    if(logic==='OR') return values.includes(true)?true:values.includes(null)?null:false;
    return values.includes(false)?false:values.includes(null)?null:true;
  }
  function services(data,config,id,params) {
    const origin=schools(data,config).find(f=>String(f.properties.fid)===String(params.origin_id ?? config.school_ids[0]));
    if(!origin) throw Error('Punctul de plecare trebuie să fie una dintre cele opt școli.');
    let eligible=[],unknown=0,unmatched=0;
    const groups=id==='V5'?['secondaryCare','hospitals']:[params.source||'secondaryCare'];
    if(groups.some(g=>!['secondaryCare','hospitals'].includes(g))) throw Error('Sursă medicală invalidă.');
    for(const group of groups) {
      const criteria=id==='V5'?[group==='hospitals'?{field:config.fields.pediatricBeds,capacity:true}:{field:config.fields.pediatrics,capacity:false}]:config.medical_criteria[group].filter(c=>(params.criteria||[]).includes(c.field));
      if(!criteria.length) throw Error('Selectează cel puțin un criteriu.');
      for(const feature of data[group].features) {
        const values=criteria.map(c=>{const value=feature.properties[c.field];return !number(value)?null:c.capacity?value>0:value===1?true:value===0?false:null;});
        const match=truth(values,id==='V5'?'AND':params.logic==='OR'?'OR':'AND');
        if(match===null){unknown++;continue;}if(!match){unmatched++;continue;}
        const label=group==='hospitals'?feature.properties[config.fields.hospitalName]:`Cabinet / ambulatoriu #${feature.properties.fid}`;
        eligible.push({...feature,properties:{...feature.properties,service_label:label,source_type:group==='hospitals'?'Spital':'Cabinet / ambulatoriu',distance_km:turf.distance(origin,feature,{units:'kilometers'})}});
      }
    }
    eligible.sort((a,b)=>a.properties.distance_km-b.properties.distance_km || String(a.properties.fid).localeCompare(String(b.properties.fid)));
    const nearest=eligible[0],layers=[layer('eligible','Unități eligibile',fc(eligible),'facility'),layer('origin','Școală de plecare',fc([origin]),'target')];
    if(nearest){layers.push(layer('nearest','Cel mai apropiat serviciu',fc([nearest]),'nearest'));layers.push(layer('distance','Legătură în linie dreaptă',fc([turf.lineString([origin.geometry.coordinates,nearest.geometry.coordinates])]),'connection'));}
    return {kind:'EXACT',metrics:[metric('Unități eligibile documentate',eligible.length),metric('Cea mai mică distanță',nearest?nearest.properties.distance_km*1000:null,'m',0)],
      table:{columns:['Unitate','Tip sursă','Distanță (m)'],rows:eligible.map(f=>[f.properties.service_label,f.properties.source_type,Math.round(f.properties.distance_km*1000)])},layers,
      warnings:unknown?[`${unknown} unități au criterii cu informații insuficiente (NULL/invalid); nu sunt declarate neeligibile și nu intră în clasamentul documentat.`]:[],
      interpretation:[nearest?`Cel mai apropiat serviciu documentat: ${nearest.properties.service_label} (${nearest.properties.source_type}).`:'Nicio unitate documentată nu îndeplinește filtrul ales. Schimbă criteriile sau sursa.',`Punct de plecare: ${origin.properties[config.fields.schoolName]}. Distanța este geodezică în linie dreaptă pe un model sferic, nu timp de deplasare. Eticheta EXACT se referă la filtrul aplicat tabelului; distanța depinde de pozițiile sursă și de model.`,id==='V5'?'Pediatrie = 1 indică serviciul în ambulatoriu; capacitatea pediatrică > 0 indică paturi în spital. Capacitatea nu măsoară locurile disponibile acum.':'AND cere toate criteriile; OR cere cel puțin unul. Contractul de ecografie nu dovedește proprietatea unui aparat. Prezența unui serviciu este distinctă de capacitate.'],details:{nearest:nearest?{fid:nearest.properties.fid,name:nearest.properties.service_label,type:nearest.properties.source_type,distance_m:nearest.properties.distance_km*1000}:null,eligible_count:eligible.length,unknown_count:unknown,unmatched_count:unmatched}};
  }
  function run(id,data,config,params={}) {
    if(id==='V1')return schoolSum(data,config);
    if(id==='V2')return under15(data,config);
    if(id==='V3'){
      const one=schoolSum(data,config),two=under15(data,config),total=one.metrics[0].value,pop=two.details.population;
      return {...two,kind:'ESTIMATED',metrics:[metric('Elevi în cele opt școli · exact',total,'elevi'),metric('Populație sub 15 ani · estimată',pop,'persoane'),metric('Raport elevi / populație sub 15 ani'+(two.details.missing_cells.length?' · parțial':''),pop>0?total/pop:null,'',3)],interpretation:['Acest raport NU este automat o rată de cuprindere școlară. Elevii înscriși și populația rezidentă nu sunt populații echivalente.','Sunt comparate ani și grupe diferite; totalul școlar poate include elevi de alte vârste și din afara zonei.',...two.interpretation]};
    }
    if(id==='V4')return primary(data,config);
    if(['V5','V6'].includes(id))return services(data,config,id,params);
    throw Error('Provocare necunoscută.');
  }
  scope.GISVector={run,schools,weighted,truth,clearCache:()=>cache.clear()};
})(typeof self!=='undefined'?self:globalThis);
