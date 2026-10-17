/* Bind the small lab to the shared comparison core; no network/data loading. */
(function(root){
  'use strict';
  const E=root.CARTO_PROJECTION_LAB_ENGINE,C=root.CRS_ENGINE;
  const $=id=>document.getElementById(id),format=(value,digits=2)=>Number(value).toLocaleString('ro-RO',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  let compare,validation={message:'',invalidFields:[]};const listeners=new AbortController(),listen=(node,event,fn)=>node.addEventListener(event,fn,{signal:listeners.signal});
  const rows=[['x','Coordonata est / longitudine'],['y','Coordonata nord / latitudine'],['units','Unități ale coordonatelor'],['distance','Distanță plană între capete (m)'],['distanceDelta','Diferență față de geodezică (m)'],['distancePercent','Diferență de distanță (%)'],['area','Arie plană, limită densificată (m²)'],['areaPercent','Diferență de arie (%)']];
  const coordinateFields=['shared-longitude','shared-latitude'];
  function error(message='',invalidFields=[]){
    validation={message,invalidFields};$('projection-error').textContent=validation.message;
    for(const id of coordinateFields)$(id).setAttribute('aria-invalid',String(validation.invalidFields.includes(id)));
  }
  function readCoordinates(){
    const point=coordinateFields.map(id=>$(id).valueAsNumber);
    try{E.validate(point);return {point,message:'',invalidFields:[]};}
    catch(e){return {point,message:e.message,invalidFields:coordinateFields.filter((id,i)=>!Number.isFinite(point[i])||point[i]<Number($(id).min)||point[i]>Number($(id).max))};}
  }
  function render(state,metrics){
    for(const id of ['A','B']){
      const m=metrics[id],name=C.byId[m.crs].short_name;$('view-'+id+'-title').textContent=id+' · '+m.crs+' · '+name;
      $('metric-'+id).textContent=id+' · '+m.crs;
      $('view-'+id+'-units').textContent='Coordonate: '+(m.units==='°'?'longitudine, latitudine în grade':'est, nord în metri')+'.';
      $('view-'+id+'-warning').textContent=m.warning;
      for(const [key] of rows){const value=key==='x'?m.coordinates[0]:key==='y'?m.coordinates[1]:m[key];$('metric-'+id+'-'+key).textContent=key==='units'?m.units:value===null?'Nu se calculează metric direct în grade':format(value,key==='x'||key==='y'?(m.units==='°'?6:3):key.endsWith('Percent')?4:2);}
      $('crs-'+id.toLowerCase()).value=state.views[id].crs;
    }
    const geo=state.context.geometry;
    $('reference-distance').textContent=format(geo.reference.distance)+' m';$('reference-area').textContent=format(geo.reference.area)+' m²';
    $('utm-advice').textContent='Pentru centrul geometriei: '+E.utmCode(geo.center[0])+'. Zona 34N acoperă 18–24° E; zona 35N acoperă 24–30° E. La margine, verifică întreaga geometrie, nu numai centrul.';
    $('shared-longitude').value=state.sharedLocation[0].toFixed(6);$('shared-latitude').value=state.sharedLocation[1].toFixed(6);
    // Every successful render restores the applied point, including its validation state.
    error();
    $('compare-mode').value=state.mode;$('compare-toggle-buttons').hidden=state.mode!=='toggle';
    for(const id of ['A','B'])$('show-'+id).setAttribute('aria-pressed',String(state.active===id));
    $('projection-status').textContent='Aceeași geometrie și același punct în ambele vederi. Punct: '+format(state.sharedLocation[0],6)+'° E, '+format(state.sharedLocation[1],6)+'° N.';
    root.dispatchEvent(new CustomEvent('carto:projection-point',{detail:[...state.sharedLocation]}));
  }
  function initialize(){
    if(!E||!C||!root.CARTO_COMPARE){$('projection-load-message').textContent='Experimentul nu s-a inițializat. Explicațiile și legăturile de mai jos rămân disponibile.';return;}
    for(const id of ['a','b']){const select=$('crs-'+id);for(const code of E.codes){const option=document.createElement('option');option.value=code;option.textContent=code+' · '+C.byId[code].short_name;select.append(option);}}
    const tbody=$('projection-metric-body');for(const [key,label] of rows){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=label;tr.append(th);for(const id of ['A','B']){const td=document.createElement('td');td.id='metric-'+id+'-'+key;tr.append(td);}tbody.append(tr);}
    const geometry=E.geometry(E.presets.bucharest.point,10),context={geometry,type:'segment'};
    const onLocation=(point,message)=>{if(message){error(message);return;}compare.setSharedLocation(point);};
    compare=root.CARTO_COMPARE.create({container:$('projection-views'),panels:{A:$('view-A'),B:$('view-B')},adapters:{A:root.CARTO_PROJECTION_VIEW.create({onLocation}),B:root.CARTO_PROJECTION_VIEW.create({onLocation})},initial:{views:{A:{crs:'EPSG:4326'},B:{crs:'EPSG:3844'}},context,sharedLocation:geometry.center,mode:'side',active:'A'},onChange:render});
    function changeGeometry(){try{const p=E.presets[$('projection-preset').value].point,geometry=E.geometry(p,Number($('projection-size').value));compare.update({context:{geometry,type:$('projection-shape').value},sharedLocation:p});}catch(e){error(e.message);}}
    for(const id of ['projection-preset','projection-size'])listen($(id),'change',changeGeometry);
    listen($('projection-shape'),'change',()=>compare.update({context:{...compare.getState().context,type:$('projection-shape').value}}));
    for(const id of ['A','B']){
      listen($('crs-'+id.toLowerCase()),'change',event=>compare.update({views:{[id]:{crs:event.target.value}}}));
      listen($('show-'+id),'click',()=>compare.update({active:id}));
    }
    listen($('compare-mode'),'change',event=>compare.update({mode:event.target.value}));
    listen($('shared-point-form'),'submit',event=>{event.preventDefault();try{const result=readCoordinates();error(result.message,result.invalidFields);if(!result.message)compare.setSharedLocation(result.point);}catch(e){error(e.message);}});
    for(const id of coordinateFields)listen($(id),'input',()=>{if(validation.invalidFields.length){const result=readCoordinates();error(result.message,result.invalidFields);}});
    listen($('projection-reset'),'click',()=>{$('projection-preset').value='bucharest';$('projection-size').value='10';$('projection-shape').value='segment';compare.reset();});
    $('projection-interactive').hidden=false;$('projection-load-message').hidden=true;
    const exit=event=>{if(!event.persisted)destroy();};root.addEventListener('pagehide',exit,{signal:listeners.signal});
    function destroy(){listeners.abort();compare.destroy();}
    root.CARTO_PROJECTION_LAB={compare,destroy};
  }
  try{initialize();}catch(e){listeners.abort();$('projection-load-message').textContent='Experimentul nu s-a inițializat. Reîncarcă pagina; explicațiile și legăturile QGIS rămân disponibile.';}
})(window);
