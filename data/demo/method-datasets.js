/* Deterministic, entirely fictional teaching maps. Coordinates are local SVG units. */
window.CARTO_METHOD_DATA = {
  diagrams: {
    id:'water-cities', title:'Structura utilizării apei în șase orașe', unit:'mii m³ / zi', synthetic:true,
    cities:[
      {name:'Avenia',x:110,y:110,domestic:32,industry:21,services:12},
      {name:'Belora',x:278,y:82,domestic:28,industry:36,services:14},
      {name:'Ceris',x:412,y:142,domestic:19,industry:13,services:22},
      {name:'Dorna',x:148,y:286,domestic:25,industry:11,services:9},
      {name:'Estin',x:320,y:252,domestic:34,industry:29,services:18},
      {name:'Falen',x:420,y:344,domestic:15,industry:8,services:12}
    ]
  },
  choropleth: {
    id:'density-regions', title:'Densitatea populației în opt regiuni', unit:'locuitori / km²', synthetic:true,
    regions:[
      {name:'Nord-Vest',density:48,growth:3,polygon:[[35,65],[128,45],[148,125],[105,170],[32,155]]},
      {name:'Nord-Centru',density:92,growth:7,polygon:[[128,45],[262,30],[270,132],[148,125]]},
      {name:'Nord-Est',density:175,growth:13,polygon:[[262,30],[400,54],[476,105],[427,168],[270,132]]},
      {name:'Vest',density:63,growth:4,polygon:[[32,155],[105,170],[130,280],[50,322],[18,241]]},
      {name:'Centru',density:210,growth:10,polygon:[[105,170],[148,125],[270,132],[274,277],[130,280]]},
      {name:'Est',density:132,growth:9,polygon:[[270,132],[427,168],[482,265],[375,304],[274,277]]},
      {name:'Sud-Vest',density:38,growth:1,polygon:[[50,322],[130,280],[274,277],[223,375],[90,382]]},
      {name:'Sud-Est',density:118,growth:6,polygon:[[274,277],[375,304],[482,265],[465,370],[223,375]]}
    ]
  },
  cartodiagram: {
    id:'energy-provinces',title:'Producția energetică pe provincii',unit:'GWh / an',synthetic:true,
    regions:[
      {name:'Arca',solar:46,wind:24,hydro:12,x:110,y:104,polygon:[[35,70],[155,55],[190,130],[122,190],[42,166]]},
      {name:'Brava',solar:30,wind:70,hydro:8,x:268,y:88,polygon:[[155,55],[300,35],[345,142],[190,130]]},
      {name:'Cora',solar:18,wind:62,hydro:38,x:417,y:126,polygon:[[300,35],[475,75],[480,182],[345,142]]},
      {name:'Dalia',solar:68,wind:19,hydro:10,x:107,y:283,polygon:[[42,166],[122,190],[186,250],[130,366],[30,330]]},
      {name:'Eron',solar:52,wind:36,hydro:44,x:262,y:235,polygon:[[122,190],[190,130],[345,142],[359,280],[258,333],[186,250]]},
      {name:'Faria',solar:21,wind:28,hydro:89,x:416,y:275,polygon:[[345,142],[480,182],[475,348],[359,280]]},
      {name:'Greda',solar:36,wind:42,hydro:55,x:265,y:352,polygon:[[130,366],[186,250],[258,333],[359,280],[475,348],[370,393],[180,395]]}
    ]
  },
  signs: {
    id:'civic-services',title:'Servicii publice în orașul imaginar Meridia',unit:'obiecte',synthetic:true,
    services:[
      {name:'Școala Nord',type:'school',x:100,y:93},{name:'Școala Parc',type:'school',x:291,y:181},{name:'Școala Sud',type:'school',x:160,y:317},
      {name:'Spitalul Central',type:'hospital',x:245,y:112},{name:'Clinica Est',type:'hospital',x:424,y:276},
      {name:'Biblioteca Veche',type:'library',x:393,y:104},{name:'Biblioteca Sud',type:'library',x:305,y:334},
      {name:'Gara Centrală',type:'station',x:102,y:238},{name:'Gara Est',type:'station',x:431,y:181}
    ]
  },
  areas: {
    id:'vegetation-ranges',title:'Arealul unor tipuri de vegetație',unit:'suprafețe schematice',synthetic:true,
    patches:[
      {name:'Pădure de foioase',type:'forest',path:'M76 95 Q135 27 224 84 Q244 142 176 180 Q90 190 76 95Z'},
      {name:'Pădure de foioase',type:'forest',path:'M343 247 Q407 215 456 262 Q480 335 417 370 Q354 345 343 247Z'},
      {name:'Pajiște alpină',type:'meadow',path:'M276 65 Q338 37 403 85 L451 142 Q404 200 339 181 Q288 159 276 65Z'},
      {name:'Pajiște alpină',type:'meadow',path:'M88 297 Q142 265 203 300 Q225 355 170 380 Q108 370 88 297Z'},
      {name:'Stufăriș',type:'reeds',path:'M203 211 Q263 186 303 225 Q301 280 245 302 Q195 272 203 211Z'}
    ]
  },
  qualitative: {
    id:'land-cover',title:'Tipuri de utilizare a terenului',unit:'categorii nominale',synthetic:true,
    categories:['forest','agriculture','built','meadow','water'],
    cells:[
      {type:'forest',polygon:[[30,35],[170,35],[166,143],[30,155]]},{type:'forest',polygon:[[170,35],[318,35],[306,144],[166,143]]},{type:'agriculture',polygon:[[318,35],[490,35],[490,141],[306,144]]},
      {type:'meadow',polygon:[[30,155],[166,143],[180,250],[30,258]]},{type:'built',polygon:[[166,143],[306,144],[320,255],[180,250]]},{type:'agriculture',polygon:[[306,144],[490,141],[490,260],[320,255]]},
      {type:'forest',polygon:[[30,258],[180,250],[167,385],[30,385]]},{type:'meadow',polygon:[[180,250],[320,255],[325,385],[167,385]]},{type:'water',polygon:[[320,255],[490,260],[490,385],[325,385]]}
    ]
  },
  flows: {
    id:'urban-commutes',title:'Fluxuri zilnice între centre urbane',unit:'mii călătorii / zi',synthetic:true,
    nodes:[{id:'A',name:'Alba',x:90,y:105},{id:'B',name:'Brin',x:263,y:65},{id:'C',name:'Ceda',x:435,y:125},{id:'D',name:'Dara',x:132,y:290},{id:'E',name:'Evia',x:303,y:215},{id:'F',name:'Fora',x:425,y:345}],
    routes:[{from:'A',to:'B',value:36},{from:'A',to:'D',value:18},{from:'B',to:'C',value:22},{from:'B',to:'E',value:47},{from:'C',to:'E',value:12},{from:'D',to:'E',value:29},{from:'E',to:'F',value:54},{from:'C',to:'F',value:9}]
  },
  isolines: {
    id:'temperature-field',title:'Temperatura medie într-o regiune sintetică',unit:'°C',synthetic:true,
    field:[[8,9,10,12,13,12,10],[9,11,13,15,17,16,12],[10,13,16,20,22,19,14],[9,14,19,24,26,21,15],[8,12,17,22,24,19,14],[6,9,13,16,18,15,11],[5,7,10,12,13,11,8]]
  },
  dots: {
    id:'rural-population',title:'Distribuția populației rurale',unit:'locuitori',synthetic:true,
    districts:[
      {name:'Valea',population:3600,polygon:[[45,68],[167,46],[203,145],[139,202],[40,171]]},
      {name:'Colina',population:7100,polygon:[[167,46],[319,61],[333,169],[203,145]]},
      {name:'Lunca',population:5200,polygon:[[319,61],[468,83],[480,212],[333,169]]},
      {name:'Poiana',population:2800,polygon:[[40,171],[139,202],[184,316],[88,375],[30,318]]},
      {name:'Mesteacăn',population:8900,polygon:[[139,202],[203,145],[333,169],[361,302],[257,376],[184,316]]},
      {name:'Râul',population:4600,polygon:[[333,169],[480,212],[474,358],[361,302]]}
    ]
  }
};
