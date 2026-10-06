/* Native-grid analysis. Affines use GDAL order: x0,a,b,y0,d,e. */
(function(root){
  'use strict';
  const degrees=r=>r*180/Math.PI,percent=r=>Math.tan(r)*100;
  const area=g=>Math.abs(g[1]*g[5]-g[2]*g[4]);
  function world(g,col,row){return [g[0]+g[1]*col+g[2]*row,g[3]+g[4]*col+g[5]*row];}
  function cell(g,x,y){const det=g[1]*g[5]-g[2]*g[4],dx=x-g[0],dy=y-g[3];return [(g[5]*dx-g[2]*dy)/det,(-g[4]*dx+g[1]*dy)/det];}
  // Even/odd scanline fill at pixel centres; holes are paired with their outer ring.
  function boundaryMask(grid,polygons){
    const {width:w,height:h,affine:g}=grid,mask=new Uint8Array(w*h);
    for(const polygon of polygons){
      const rings=polygon.map(ring=>ring.map(([x,y])=>cell(g,x,y)));
      for(let row=0;row<h;row++){
        const y=row+.5,crossings=[];
        for(const ring of rings)for(let k=0,j=ring.length-1;k<ring.length;j=k++){
          const [x1,y1]=ring[j],[x2,y2]=ring[k];
          if((y1>y)!==(y2>y))crossings.push(x1+(y-y1)*(x2-x1)/(y2-y1));
        }
        crossings.sort((a,b)=>a-b);
        for(let k=0;k+1<crossings.length;k+=2){const lo=Math.max(0,Math.ceil(crossings[k]-.5)),hi=Math.min(w,Math.ceil(crossings[k+1]-.5));mask.fill(1,row*w+lo,row*w+hi);}
      }
    }
    for(let i=0;i<mask.length;i++)if(!Number.isFinite(grid.values[i])||(grid.nodata!==null&&grid.values[i]===grid.nodata))mask[i]=0;
    return mask;
  }
  function horn(grid,includeGradients=false){
    const {width:w,height:h,affine:g,values:z,mask}=grid,slope=new Float64Array(w*h);slope.fill(NaN);
    const det=g[1]*g[5]-g[2]*g[4];let valid=0,min=Infinity,max=-Infinity;
    const east=includeGradients?new Float64Array(w*h):null,north=includeGradients?new Float64Array(w*h):null;
    if(includeGradients){east.fill(NaN);north.fill(NaN);}
    for(let r=1;r<h-1;r++)for(let c=1;c<w-1;c++){
      const i=r*w+c,ids=[i-w-1,i-w,i-w+1,i-1,i,i+1,i+w-1,i+w,i+w+1];
      if(!ids.every(j=>mask[j]))continue;
      const du=(z[ids[2]]+2*z[ids[5]]+z[ids[8]]-z[ids[0]]-2*z[ids[3]]-z[ids[6]])/8;
      const dv=(z[ids[6]]+2*z[ids[7]]+z[ids[8]]-z[ids[0]]-2*z[ids[1]]-z[ids[2]])/8;
      const gx=(g[5]*du-g[4]*dv)/det,gy=(-g[2]*du+g[1]*dv)/det;
      if(includeGradients){east[i]=gx;north[i]=gy;}
      slope[i]=Math.atan(Math.hypot(gx,gy));valid++;min=Math.min(min,slope[i]);max=Math.max(max,slope[i]);
    }
    return includeGradients?{values:slope,valid,min,max,east,north}:{values:slope,valid,min,max};
  }
  // Interpolate a continuous slope surface, never categorical year codes.
  // Require all four source centres: unsupported boundary cells stay unknown.
  function bilinear(grid,values,x,y){
    const [u,v]=cell(grid.affine,x,y),c=Math.floor(u-.5),r=Math.floor(v-.5),fx=u-.5-c,fy=v-.5-r;
    if(c<0||r<0||c+1>=grid.width||r+1>=grid.height)return NaN;
    const i=r*grid.width+c,a=values[i],b=values[i+1],d=values[i+grid.width],e=values[i+grid.width+1];
    return [a,b,d,e].every(Number.isFinite)?a*(1-fx)*(1-fy)+b*fx*(1-fy)+d*(1-fx)*fy+e*fx*fy:NaN;
  }
  const slopeColors=['#2166ac','#67a9cf','#d1e5f0','#fddbc7','#ef8a62','#b2182b'];
  const elevationColors=['#215d38','#559b52','#a9c779','#e5d194','#bb9571','#806359'];
  const yearColors=['#4477aa','#ee6677','#228833','#ccbb44','#66ccee','#aa3377'];
  const rgb=hex=>hex.match(/[0-9a-f]{2}/gi).map(x=>parseInt(x,16));
  const metric=(label,value,unit='',digits=2)=>({label,value,unit,digits});
  const number=(n,d=2)=>new Intl.NumberFormat('ro-RO',{maximumFractionDigits:d}).format(n);
  function create(dem,forest,metadata,polygons){
    const start=performance.now();
    if(metadata.rasters.dem.units?.value!=='m'||metadata.rasters.dem.units?.status!=='verified_dataset_definition')throw Error('Unitățile DEM în metri trebuie confirmate în metadate.');
    const semanticNoData=metadata.rasters.forestLoss.semantic_nodata;
    if(semanticNoData?.status!=='verified_dataset_definition'||semanticNoData.value!==0)throw Error('Semantica NoData a rasterului forestier trebuie verificată în metadate.');
    let forestNoData=0;
    for(const grid of [dem,forest]){grid.mask=boundaryMask(grid,polygons);if(grid===forest)for(let i=0;i<grid.mask.length;i++)if(grid.mask[i]&&grid.values[i]===semanticNoData.value){grid.mask[i]=0;forestNoData++;}grid.area=area(grid.affine);grid.valid=grid.mask.reduce((a,b)=>a+b,0);grid.min=Infinity;grid.max=-Infinity;for(let i=0;i<grid.values.length;i++)if(grid.mask[i]){grid.min=Math.min(grid.min,grid.values[i]);grid.max=Math.max(grid.max,grid.values[i]);}}
    const slope=horn(dem),aligned=new Float64Array(forest.values.length);aligned.fill(NaN);
    const mapping=metadata.rasters.forestLoss.value_to_year;
    if(mapping.status!=='verified_dataset_definition')throw Error('Codificarea anilor nu este confirmată în metadate.');
    const annual=new Map(),years=Array.from(new Set(Object.values(mapping.mapping))).sort((a,b)=>a-b);
    years.forEach(year=>annual.set(year,{year,count:0}));
    let unmapped=0;
    for(let i=0;i<forest.values.length;i++)if(forest.mask[i]){
      const year=mapping.mapping[forest.values[i]];
      if(year!==undefined){annual.get(year).count++;const xy=world(forest.affine,i%forest.width+.5,Math.floor(i/forest.width)+.5);aligned[i]=bilinear(dem,slope.values,...xy);}
      else unmapped++;
    }
    if(unmapped)throw Error('Există valori forestiere fără corespondență verificată cu un an.');
    annual.forEach(row=>row.ha=row.count*forest.area/10000);
    const sameGrid=dem.width===forest.width&&dem.height===forest.height&&dem.affine.every((v,i)=>Math.abs(v-forest.affine[i])<1e-8);
    let current=null,lookup=null;
    const summary={years,annual:[...annual.values()],dem:{width:dem.width,height:dem.height,affine:dem.affine,pixelArea:dem.area,valid:dem.valid,min:dem.min,max:dem.max,slopeValid:slope.valid},forest:{width:forest.width,height:forest.height,affine:forest.affine,pixelArea:forest.area,valid:forest.valid,nodataInsideBoundary:forestNoData},alignment:{sameGrid,method:'bilinear_slope_at_forest_centres_strict_4_valid'},prepare_ms:performance.now()-start};
    const education=[
      'DEM-ul conține altitudini în metri; panta este o mărime derivată din vecinătatea 3×3 prin metoda Horn. Marginile și vecinătățile incomplete nu primesc o pantă inventată.',
      'Gradele exprimă unghiul. Procentele sunt 100 × tan(unghiul); o pantă de 45° înseamnă 100%, nu 45%.',
      'Analiza folosește coordonatele metrice EPSG:3844. Harta Leaflet folosește Web Mercator pentru afișare, prin reproiectare; această schimbare nu modifică grila sau ariile calculate.',
      'Suprafața = numărul de pixeli × |a·e − b·d| / 10 000. Se păstrează pixelii cu centrul în conturul Rîșca și valori valide; aceasta este o măsurare pe grila sursă, nu aria exactă a conturului vectorial.'
    ];
    function analyze(id,params={}){
      const t=performance.now(),unit=params.unit==='percent'?'percent':'degrees';
      const threshold=Number(params.threshold??15);
      if(!Number.isFinite(threshold)||threshold<0||(unit==='degrees'&&threshold>=90))throw Error('Pragul trebuie să fie finit, pozitiv sau zero, și sub 90° pentru grade.');
      let selectedYears=id==='R3'?[Number(params.year)]:id==='R4'?[...new Set((params.years||[]).map(Number))]:years.filter(y=>y>=Number(params.from)&&y<=Number(params.to));
      if(!['R1','R2'].includes(id)){
        if(!selectedYears.length||selectedYears.some(y=>!annual.has(y)))throw Error('Selectează cel puțin un an disponibil și un interval în ordine crescătoare.');
      }
      const yearSet=new Set(selectedYears),limit=unit==='degrees'?threshold*Math.PI/180:Math.atan(threshold/100);
      const grid=['R1','R2'].includes(id)?dem:forest,mask=new Uint8Array(grid.values.length);
      let count=0,total=0,known=0,unknown=0;
      const series=selectedYears.map(year=>({...annual.get(year),steepCount:0,steepHa:0})),byYear=new Map(series.map(row=>[row.year,row]));
      if(id==='R1'){count=slope.valid;for(let i=0;i<mask.length;i++)mask[i]=Number.isFinite(slope.values[i])?1:0;}
      else if(id==='R2'){for(let i=0;i<mask.length;i++)if(Number.isFinite(slope.values[i])&&slope.values[i]>limit){mask[i]=1;count++;}}
      else for(let i=0;i<mask.length;i++)if(forest.mask[i]&&yearSet.has(mapping.mapping[forest.values[i]])){
        total++;
        if(id==='R6'){
          if(!Number.isFinite(aligned[i])){unknown++;continue;}known++;
          if(aligned[i]>limit){mask[i]=1;count++;const row=byYear.get(mapping.mapping[forest.values[i]]);row.steepCount++;}
        }else {mask[i]=1;count++;}
      }
      series.forEach(row=>row.steepHa=row.steepCount*forest.area/10000);
      const ha=count*grid.area/10000,metrics=[],warnings=[],interpretation=[...education];
      let legend;
      if(id==='R1'){
        const edges=unit==='degrees'?[0,5,10,15,25,35,90]:[0,10,20,30,50,100,Infinity],suffix=unit==='degrees'?'°':'%';
        legend=edges.slice(0,-1).map((v,i)=>({color:slopeColors[i],label:`${v}–${edges[i+1]===Infinity?'∞':edges[i+1]}${suffix}`}));
        metrics.push(metric('Pixeli cu pantă calculabilă',slope.valid,'pixeli',0),metric('Panta minimă',unit==='degrees'?degrees(slope.min):percent(slope.min),suffix),metric('Panta maximă',unit==='degrees'?degrees(slope.max):percent(slope.max),suffix));
      }else if(id==='R2'){
        legend=[{color:'#b2182b',label:`Pantă > ${number(threshold)}${unit==='degrees'?'°':'%'}`},{color:'#a2aeb6',label:'Pantă validă sub prag sau egală cu pragul'}];
        metrics.push(metric('Pixeli selectați',count,'pixeli',0),metric('Suprafață selectată',ha,'ha'),metric('Din aria UAT cu pantă validă',count/slope.valid*100,'%'),metric('Arie UAT cu pantă validă',slope.valid*dem.area/10000,'ha'),metric('Arie UAT cu DEM valid',dem.valid*dem.area/10000,'ha'));
      }else {
        legend=selectedYears.map((year,i)=>({color:yearColors[i%yearColors.length],label:String(year)}));
        metrics.push(metric(id==='R6'?'Pixeli de pierdere peste prag':'Pixeli selectați',count,'pixeli',0),metric(id==='R6'?'Pierdere forestieră peste prag':'Suprafață cumulată',ha,'ha'));
        interpretation.push('Codurile 1–24 reprezintă anii 2001–2024. Selectorul folosește corespondența din metadate. Valoarea 0 este NoData și nu contribuie la ani, suprafețe sau grafice.','Un pixel forestier codifică un singur an. Reunirea anilor nu dublează pixeli și nu indică o cauză a pierderii.');
        warnings.push('Versiunea exactă, licența subsetului și data accesării sursei forest-loss rămân de clarificat.');
        if(id==='R6'){
          metrics.push(metric('Pierdere totală în interval',total*forest.area/10000,'ha'),metric('Pierdere cu pantă evaluabilă',known*forest.area/10000,'ha'),metric('Pierdere cu pantă necunoscută',unknown*forest.area/10000,'ha'),metric('Peste prag / pierdere evaluabilă',known?count/known*100:null,'%'),metric('Peste prag / pierdere totală',total?count/total*100:null,'%'));
          legend.push({color:'#a2aeb6',label:'Pierdere în interval sub prag'},{color:'#cbbbdd',label:'Pierdere în interval cu pantă necunoscută'});
          interpretation.push('Grilele DEM și forestieră sunt diferite. Panta continuă, calculată pe grila DEM, este interpolată biliniar la centrul fiecărui pixel forestier, numai dacă toate cele patru valori vecine sunt valide. Anii nu sunt interpolați. Aria intersecției folosește pixelul forestier original.','Procentul din pierderea evaluabilă folosește numai pixelii cu pantă cunoscută. Procentul din pierderea totală este partea confirmată peste prag; pixelii cu pantă necunoscută nu sunt considerați sub prag.');
          if(unknown)warnings.push(`${unknown} pixeli de pierdere (${number(unknown*forest.area/10000)} ha) nu au pantă evaluabilă la marginea măștii; sunt raportați separat.`);
        }
      }
      if(['R1','R2','R6'].includes(id))warnings.push(`${dem.valid-slope.valid} pixeli DEM din UAT au o vecinătate 3×3 incompletă. Panta lor rămâne necunoscută. Datum-ul vertical al DEM-ului este de confirmat.`);
      const output={kind:'RASTER',type_label:'MĂSURAT PE GRILA RASTER · EPSG:3844',metrics,warnings,interpretation,series:['R1','R2'].includes(id)?null:series,table:series.length&&!['R1','R2'].includes(id)?{caption:'Suprafețe anuale calculate din pixelii sursă',columns:id==='R6'?['An','Pixeli pierdere','Pierdere (ha)','Peste prag (ha)']:['An','Pixeli','Suprafață (ha)'],rows:series.map(row=>id==='R6'?[row.year,row.count,number(row.ha),number(row.steepHa)]:[row.year,row.count,number(row.ha)])}:null,raster:{id,unit,threshold,selectedYears,legend},validation:{selectedCount:count,selectedHa:ha,totalCount:total,knownCount:known,unknownCount:unknown,slopeValid:slope.valid,demValid:dem.valid},compute_ms:performance.now()-t};
      current={...output.raster,mask,grid,limit};return output;
    }
    function inspect(x,y){
      const locate=grid=>{const [c,r]=cell(grid.affine,x,y),col=Math.floor(c),row=Math.floor(r);return col>=0&&row>=0&&col<grid.width&&row<grid.height?row*grid.width+col:-1;};
      const di=locate(dem),fi=locate(forest),dvalid=di>=0&&dem.mask[di],fvalid=fi>=0&&forest.mask[fi];
      return {x,y,elevation:dvalid?dem.values[di]:null,slopeDegrees:dvalid&&Number.isFinite(slope.values[di])?degrees(slope.values[di]):null,slopePercent:dvalid&&Number.isFinite(slope.values[di])?percent(slope.values[di]):null,forestCode:fvalid?forest.values[fi]:null,year:fvalid?mapping.mapping[forest.values[fi]]??null:null,alignedSlopeDegrees:fvalid&&Number.isFinite(aligned[fi])?degrees(aligned[fi]):null,alignedSlopePercent:fvalid&&Number.isFinite(aligned[fi])?percent(aligned[fi]):null,demPixel:di,forestPixel:fi};
    }
    function render(request,project){
      const {width:w,height:h,bounds,source,mode,showInput,showResult,dark}=request,grid=current&&mode!=='INPUT'?current.grid:source==='dem'?dem:forest;
      const key=JSON.stringify([w,h,bounds,grid===dem?'dem':'forest']);
      if(!lookup||lookup.key!==key){
        const indices=new Int32Array(w*h);indices.fill(-1);
        for(let row=0;row<h;row++)for(let col=0;col<w;col++){
          const xy=project.forward([bounds[0]+(col+.5)*(bounds[2]-bounds[0])/w,bounds[3]-(row+.5)*(bounds[3]-bounds[1])/h]);
          const [c,r]=cell(grid.affine,...xy),cc=Math.floor(c),rr=Math.floor(r);
          if(cc>=0&&rr>=0&&cc<grid.width&&rr<grid.height)indices[row*w+col]=rr*grid.width+cc;
        }
        lookup={key,indices};
      }
      const image=new Uint8ClampedArray(w*h*4),input=mode==='INPUT'||mode==='COMPARE'&&showInput,result=current&&(mode==='RESULT'||mode==='COMPARE'&&showResult),neutral=rgb(dark?'#54616b':'#d9dfe0');
      for(let p=0;p<lookup.indices.length;p++){
        const i=lookup.indices[p];if(i<0||!grid.mask[i])continue;let color=null;
        if(input){color=grid===dem?rgb(elevationColors[Math.min(5,Math.max(0,Math.floor(6*(grid.values[i]-grid.min)/(grid.max-grid.min||1))))]):rgb(yearColors[summary.years.indexOf(mapping.mapping[grid.values[i]])%yearColors.length]);}
        if(result){
          if(current.id==='R1'&&current.mask[i]){const v=current.unit==='degrees'?degrees(slope.values[i]):percent(slope.values[i]),edges=current.unit==='degrees'?[5,10,15,25,35]:[10,20,30,50,100];color=rgb(slopeColors[edges.filter(e=>v>=e).length]);}
          else if(current.id==='R2'){if(Number.isFinite(slope.values[i]))color=current.mask[i]?rgb('#b2182b'):neutral;else if(!input)color=null;}
          else if(!['R1','R2'].includes(current.id)){
            const year=mapping.mapping[forest.values[i]],selected=current.selectedYears.includes(year);
            if(current.mask[i])color=rgb(yearColors[current.selectedYears.indexOf(year)%yearColors.length]);
            else if(current.id==='R6'&&selected)color=Number.isFinite(aligned[i])?rgb('#a2aeb6'):rgb('#cbbbdd');
            else if(!input)color=null;
          }
        }
        if(color){image.set(color,p*4);image[p*4+3]=255;}
      }
      return image;
    }
    // Native sampling can expose a complete decoded grid to another local renderer.
    // The worker structured-clones this result; analysis arrays remain untouched.
    const sampleCache=new Map();
    function samples(request){
      if(Array.isArray(request))return request.map(i=>({index:i,elevation:dem.values[i],degrees:degrees(slope.values[i]),percent:percent(slope.values[i])}));
      if(!request?.all||!['dem','forestLoss'].includes(request.grid))throw Error('Cerere de eșantionare raster invalidă.');
      const key=JSON.stringify(request);if(sampleCache.has(key))return sampleCache.get(key);
      const grid=request.grid==='dem'?dem:forest;
      const output={grid:{width:grid.width,height:grid.height,affine:grid.affine,nodata:grid.nodata,values:grid.values,mask:grid.mask,min:grid.min,max:grid.max,valid:grid.valid}};
      if(request.statistics){
        const sorted=grid.values.filter((value,i)=>grid.mask[i]).sort(),quantiles={};
        for(const p of [1,2,5,95,98,99])quantiles[p]=sorted[Math.max(0,Math.ceil(sorted.length*p/100)-1)];
        output.statistics={count:sorted.length,min:sorted[0],max:sorted[sorted.length-1],quantiles,method:'exact_nearest_rank_valid_uat_centres'};
      }
      if(request.derivatives){const gradients=horn(grid,true);output.derivatives={east:gradients.east,north:gradients.north,valid:gradients.valid};}
      sampleCache.set(key,output);return output;
    }
    return {summary,analyze,inspect,render,samples};
  }
  root.GISRaster={create,world,cell,boundaryMask,horn,bilinear,area};
})(typeof self!=='undefined'?self:globalThis);
