/* Original, fixed teaching data. SVG dimensions have no geographical meaning. */
(function(root){
  'use strict';
  const numbers=[0,3,5,5,7,10,12,15,18,20,25,30,35,40,45,50,60,75,90,120,200,400,900,null];
  const denominators=[100,30,50,100,35,100,60,100,90,100,100,100,100,200,150,100,200,250,300,400,500,800,1200,null];
  denominators[6]=0;denominators[9]=null;
  const cells=numbers.map((numerator,i)=>({id:i+1,numerator,denominator:denominators[i],x:16+i%6*76,y:24+Math.floor(i/6)*61,width:70,height:55}));
  const sequential=['#edf8fb','#ccece6','#99d8c9','#66c2a4','#41ae76','#238b45','#005824'];
  const qualitative=['#c07d64','#6297c0','#c6aa50','#967fb0','#65a18c','#c87da1','#8d998e'];
  const design={balanced:{title:24,legend:1,size:12,outline:1,background:12,density:12,hierarchy:'priority',palette:'sequential',halo:2},overloaded:{title:30,legend:2,size:24,outline:4,background:75,density:25,hierarchy:'equal',palette:'qualitative',halo:0},weak:{title:14,legend:0,size:8,outline:3,background:65,density:16,hierarchy:'equal',palette:'sequential',halo:0},strong:{title:28,legend:1,size:16,outline:1,background:8,density:8,hierarchy:'priority',palette:'sequential',halo:2}};
  const books={
    BOOK_CLASS_01:{A:{method:'equal'},B:{method:'quantile'}},
    BOOK_CLASS_02:{A:{method:'quantile'},B:{method:'jenks'}},
    BOOK_CLASS_03:{A:{method:'equal',classes:4},B:{method:'equal',classes:7}},
    BOOK_CLASS_04:{A:{metric:'absolute'},B:{metric:'rate'}},
    BOOK_DESIGN_01:{A:{...design.weak},B:{...design.strong}},
    BOOK_DESIGN_02:{A:{...design.overloaded},B:{...design.balanced}},
    BOOK_DESIGN_03:{A:{...design.balanced,palette:'qualitative'},B:{...design.balanced,palette:'sequential'}}
  };
  root.CARTO_CARTOGRAPHY={cells,sequential,qualitative,design,books,classDefaults:{method:'equal',classes:5,metric:'absolute',palette:'sequential'}};
})(window);
