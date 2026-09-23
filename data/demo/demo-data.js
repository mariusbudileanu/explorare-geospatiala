'use strict';
window.CARTO_DEMO = {
  note: 'Date sintetice, fictive, create pentru demonstrațiile educaționale.',
  regions: [
    {id:'A',name:'Nordia',population:72,production:34,category:'munte',polygon:[[16,12],[44,9],[50,30],[37,43],[12,35]]},
    {id:'B',name:'Estalia',population:118,production:81,category:'deal',polygon:[[44,9],[79,15],[91,38],[63,47],[50,30]]},
    {id:'C',name:'Vestara',population:45,production:57,category:'câmpie',polygon:[[12,35],[37,43],[43,67],[17,83],[5,60]]},
    {id:'D',name:'Centria',population:154,production:103,category:'urban',polygon:[[37,43],[63,47],[69,72],[43,67]]},
    {id:'E',name:'Sudica',population:91,production:69,category:'câmpie',polygon:[[17,83],[43,67],[69,72],[80,94],[36,97]]},
    {id:'F',name:'Riviera',population:127,production:43,category:'litoral',polygon:[[63,47],[91,38],[97,73],[80,94],[69,72]]}
  ],
  points: [
    {name:'Arin',x:25,y:25,value:38,category:'A'}, {name:'Brum',x:66,y:27,value:92,category:'B'},
    {name:'Coral',x:25,y:59,value:55,category:'C'}, {name:'Dora',x:54,y:57,value:130,category:'D'},
    {name:'Elin',x:45,y:83,value:78,category:'E'}, {name:'Faron',x:82,y:66,value:110,category:'F'},
    {name:'Gala',x:70,y:87,value:64,category:'F'}
  ],
  flows: [
    {from:[25,25],to:[54,57],value:42}, {from:[66,27],to:[54,57],value:76},
    {from:[25,59],to:[45,83],value:31}, {from:[54,57],to:[82,66],value:94},
    {from:[45,83],to:[70,87],value:58}
  ],
  surface: [[12,18,24,29,28,23,17,11],[18,29,43,55,53,39,25,16],[23,41,66,82,78,57,35,20],[21,38,63,79,74,55,34,19],[15,27,44,56,52,39,25,14],[9,16,24,31,29,23,16,10]]
};
