/* Small deterministic compositor for synthetic teaching scenes; no source data processing. */
(function(root){
  'use strict';
  const width=480,height=300,size=width*height*4,clamp=x=>Math.max(0,Math.min(1,x));
  const modes=['normal','lighten','screen','dodge','addition','darken','multiply','burn','overlay','soft-light','hard-light','difference','subtract','mask-below','masked-by-below'];
  function channel(b,s,mode){
    switch(mode){
      case 'normal':return s;
      case 'lighten':return Math.max(b,s);
      case 'darken':return Math.min(b,s);
      case 'multiply':return b*s;
      case 'screen':return b+s-b*s;
      case 'dodge':return b===0?0:s===1?1:Math.min(1,b/(1-s));
      case 'burn':return b===1?1:s===0?0:1-Math.min(1,(1-b)/s);
      case 'overlay':return b<=.5?2*b*s:1-2*(1-b)*(1-s);
      case 'hard-light':return s<=.5?2*b*s:1-2*(1-b)*(1-s);
      case 'soft-light':return s<=.5?b-(1-2*s)*b*(1-b):b+(2*s-1)*((b<=.25?((16*b-12)*b+4)*b:Math.sqrt(b))-b);
      case 'difference':return Math.abs(b-s);
      // QGIS 3.44 QgsPainting maps its public Subtract label to Qt Exclusion.
      case 'subtract':return b+s-2*b*s;
      case 'addition':return Math.min(1,b+s);
      default:throw new Error('Unknown blend mode');
    }
  }
  // Byte-valued inputs share a lookup table; opacity and alpha remain unquantized.
  const tables=new Map();
  function table(mode){
    if(tables.has(mode))return tables.get(mode);
    const values=new Float64Array(256*256);
    for(let b=0;b<256;b++)for(let s=0;s<256;s++)values[b*256+s]=channel(b/255,s/255,mode);
    tables.set(mode,values);return values;
  }
  function compose(bottom,top,mode='normal',opacity=1){
    if(!modes.includes(mode)||!Number.isFinite(opacity)||opacity<0||opacity>1||bottom.length!==top.length||bottom.length%4)throw new Error('Invalid composition');
    const result=new Uint8ClampedArray(bottom.length);
    const mask=mode==='mask-below'||mode==='masked-by-below';
    if(!mask)result.set(bottom);
    const lookup=!mask&&mode!=='normal'&&mode!=='addition'?table(mode):null;
    for(let i=0;i<bottom.length;i+=4){
      const ab=bottom[i+3]/255,as=top[i+3]/255*opacity;
      if(mode==='mask-below'||mode==='masked-by-below'){
        const source=mode==='mask-below'?bottom:top;
        result[i+3]=255*ab*as;
        if(result[i+3])for(let c=0;c<3;c++)result[i+c]=source[i+c];
        continue;
      }
      if(!as)continue;
      if(mode==='normal'&&as===1){result[i]=top[i];result[i+1]=top[i+1];result[i+2]=top[i+2];result[i+3]=255;continue;}
      const alpha=mode==='addition'?Math.min(1,ab+as):as+ab*(1-as);
      result[i+3]=alpha*255;
      for(let c=0;c<3;c++){
        const b=bottom[i+c]/255,s=top[i+c]/255;
        const blended=lookup?lookup[bottom[i+c]*256+top[i+c]]:s;
        const premult=mode==='addition'?Math.min(1,ab*b+as*s):as*(1-ab)*s+as*ab*blended+ab*(1-as)*b;
        result[i+c]=255*clamp(premult/alpha);
      }
    }
    return result;
  }
  const sources=new Map(),results=new Map();
  function field(fn){const a=new Uint8ClampedArray(size);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const p=fn(x,y),i=(y*width+x)*4;for(let c=0;c<4;c++)a[i+c]=p[c]??255;}return a;}
  const transparent=()=>new Uint8ClampedArray(size),inside=(x,y,x0,y0,w,h)=>x>=x0&&x<x0+w&&y>=y0&&y<y0+h;
  function scene(name='explorer'){
    if(sources.has(name))return sources.get(name);
    const background=field((x,y)=>[238,242,240,255]);
    const context=field((x,y)=>{const stripe=((Math.floor(x/55)+Math.floor(y/45))%2);return stripe?[216,223,203,255]:[157,177,169,255];});
    const tones=[[52,87,113,255],[167,122,70,255],[81,149,125,255],[202,192,157,255]];
    let a=field((x,y)=>inside(x,y,40,65,280,180)?tones[Math.min(3,Math.floor((x-40)/70))]:[0,0,0,0]);
    let b=field((x,y)=>{
      if(!inside(x,y,185,110,260,150))return [0,0,0,0];
      const band=Math.floor((x-185)/65),light=band===0?225:band===1?64:band===2?140:192;
      const wave=Math.floor((y-110)/35)%2?18:-18;return [light+wave,light+wave-(band===2?35:0),light+wave-(band===0?38:0),255];
    });
    if(name==='hillshade'){
      a=field((x,y)=>inside(x,y,35,55,410,205)?[[204,173,110,255],[98,156,134,255],[89,129,164,255]][Math.min(2,Math.floor((x-35)/137))]:[0,0,0,0]);
      b=field((x,y)=>{if(!inside(x,y,35,55,410,205))return [0,0,0,0];const shade=145+72*Math.sin(x/33+y/31)+15*Math.cos(y/14);return [shade,shade,shade,255];});
    }
    if(name==='context'){
      a=field((x,y)=>inside(x,y,55,65,370,185)?[197,107,67,255]:[0,0,0,0]);
      b=field((x,y)=>{if(!inside(x,y,35,45,410,220))return [0,0,0,0];const road=Math.abs(y-(.35*x+50))<5||Math.abs(y-(-.38*x+245))<4,point=((x-185)**2+(y-145)**2)<65;const shade=185+28*Math.sin(x/37+y/33);return road||point?[45,62,70,255]:[shade,shade,shade,255];});
    }
    const data={a,b,background,context};sources.set(name,data);return data;
  }
  function legend(mode,opacity){
    return field((x,y)=>{
      const panel=Math.floor(x/160),local=x%160,bg=panel===2?[52,76,89]:panel===1?[255,255,255]:[238,242,240];
      if(!inside(local,y,35,80,90,120))return [...bg,255];
      if(!panel)return [197,107,67,255];
      return [...[197,107,67].map((v,i)=>Math.round((bg[i]/255*(1-opacity)+channel(bg[i]/255,v/255,mode)*opacity)*255)),255];
    });
  }
  function image(kind,state={}){
    const s={mode:'normal',opacity:100,order:'B',scope:'child',groupMode:'normal',...state};
    const key=kind+JSON.stringify(s);if(results.has(key))return results.get(key);
    const d=scene(['hillshade','context','repair'].includes(kind)?kind==='repair'?'context':kind:'explorer'),p=s.opacity/100;
    let result;
    if(kind==='legend')result=legend(s.mode,p);
    else if(kind==='mask')result=compose(d.context,compose(d.a,d.b,s.mode,p));
    else if(kind==='group'||kind==='feature'){
      const child=compose(d.a,d.b,s.scope==='child'?s.mode:'normal');
      result=compose(d.context,child,s.scope==='group'?s.mode:'normal');
    }else if(kind==='repair'){
      const theme=compose(transparent(),d.a,'normal',p);
      const group=s.order==='theme'?compose(d.b,theme,s.mode):compose(theme,d.b);
      result=compose(d.context,group,s.groupMode);
    }else if(kind==='context')result=compose(compose(d.background,d.b),d.a,s.mode,p);
    else{
      const bottom=s.order==='A'?d.b:d.a,top=s.order==='A'?d.a:d.b;
      result=compose(compose(d.background,bottom),top,s.mode,p);
    }
    if(results.size>=32)results.delete(results.keys().next().value);results.set(key,result);return result;
  }
  function repair(s){return [
    {ok:s.opacity>=40&&s.opacity<=80,text:'La 40–80%, tema și textura pot fi citite împreună.'},
    {ok:['normal','multiply','screen','overlay'].includes(s.mode),text:({normal:'Normal păstrează relația cromatică; opacitatea lasă contextul vizibil.',multiply:'Multiply păstrează textura întunecată; urmărește întunecarea temei.',screen:'Screen luminează; verifică dacă limitele rămân clare.',overlay:'Overlay accentuează contrastul; evită interpretarea unei intensități artificiale.'})[s.mode]||'Hard light produce încă un contrast foarte puternic.'},
    {ok:s.order==='theme',text:'Tema trebuie desenată deasupra contextului în această scenă.'},
    {ok:['normal','soft-light'].includes(s.groupMode),text:'Normal sau Soft light pe grup evită contrastul excesiv față de fundal.'}
  ];}
  root.CARTO_BLEND_ENGINE={width,height,modes,channel,compose,scene,image,repair,cacheSize:()=>results.size};
})(typeof window==='undefined'?globalThis:window);
