/* P02 expression subset, DOM-free. compile(source) -> AST; evaluate(AST, resolver)
 * -> {kind,value,code,trace}. Quoted identifiers are references, single quotes
 * are strings. No JavaScript evaluation. Limits: 1024 chars, 256 tokens, depth 40.
 * NULL/NoData use three-valued logic; AND/OR, IF, CASE and COALESCE are lazy.
 * IF and CASE select a branch only when the condition is TRUE; NULL selects ELSE.
 * IF preserves a raster NoData mask. COALESCE replaces NULL, not NoData.
 * Unknown names are errors. Other Boolean operators retain three-valued logic.
 */
(function(root){
  'use strict';
  class ExpressionError extends Error{constructor(code,detail=''){super(code+(detail?': '+detail:''));this.code=code;}}
  const fail=(c,d)=>{throw new ExpressionError(c,d);};
  const NULL=Object.freeze({kind:'null',value:null}),NODATA=Object.freeze({kind:'nodata',value:null});
  const value=v=>{if(v===null)return NULL;if(typeof v==='number'&&!Number.isFinite(v))fail('non-finite');if(!['number','string','boolean'].includes(typeof v))fail('type');return {kind:'value',value:v};};
  function tokenize(source){
    if(typeof source!=='string'||!source.trim()||source.length>1024)fail('expression');
    const out=[];let i=0;
    while(i<source.length){
      if(/\s/.test(source[i])){i++;continue;}
      let m=source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if(m){const n=Number(m[0]);if(!Number.isFinite(n))fail('non-finite');out.push({type:'number',value:n});i+=m[0].length;}
      else if(source[i]==='"'||source[i]==="'"){
        const quote=source[i++];let s='',closed=false;
        while(i<source.length){if(source[i]===quote){i++;if(source[i]===quote){s+=quote;i++;}else{closed=true;break;}}else s+=source[i++];}
        if(!closed)fail('syntax','unclosed quote');out.push({type:quote==='"'?'ref':'string',value:s});
      }else if((m=source.slice(i).match(/^[A-Za-z_][A-Za-z_0-9]*/))){out.push({type:m[0].toUpperCase(),value:m[0]});i+=m[0].length;}
      else if((m=source.slice(i).match(/^(?:<=|>=|!=|<>|\|\||[+*/%()=<>,-])/))){out.push({type:m[0],value:m[0]});i+=m[0].length;}
      else fail('syntax','at '+i);
      if(out.length>256)fail('complexity');
    }
    return out.concat({type:'EOF'});
  }
  function compile(source){
    const tokens=tokenize(source);let pos=0,depth=0;
    const is=t=>tokens[pos]?.type===t,take=t=>{if(!is(t))fail('syntax','expected '+t);return tokens[pos++];};
    const priorities={OR:1,AND:2,'=':3,'!=':3,'<>':3,'<':3,'>':3,'<=':3,'>=':3,IS:3,'||':4,'+':5,'-':5,'*':6,'/':6,'%':6};
    function parse(min=0){
      if(++depth>40)fail('complexity');let node;const t=tokens[pos++];
      if(['number','string'].includes(t.type))node={type:'literal',value:t.value};
      else if(t.type==='NULL')node={type:'literal',value:null};
      else if(t.type==='TRUE'||t.type==='FALSE')node={type:'literal',value:t.type==='TRUE'};
      else if(t.type==='ref')node={type:'ref',name:t.value};
      else if(['+','-','NOT'].includes(t.type))node={type:'unary',op:t.type,arg:parse(t.type==='NOT'?2:7)};
      else if(t.type==='('){node=parse();take(')');}
      else if(t.type==='CASE'){
        const branches=[];while(is('WHEN')){take('WHEN');const condition=parse();take('THEN');branches.push([condition,parse()]);}
        if(!branches.length)fail('syntax','CASE requires WHEN');let otherwise={type:'literal',value:null};if(is('ELSE')){take('ELSE');otherwise=parse();}take('END');node={type:'case',branches,otherwise};
      }else if(is('(')&&/^[A-Z_]+$/.test(t.type)){
        take('(');const args=[];if(!is(')')){args.push(parse());while(is(',')){take(',');args.push(parse());}}take(')');
        if(!['IF','COALESCE','ABS','UPPER','LOWER','CONCAT'].includes(t.type))fail('unsupported-function',t.value);
        const count=t.type==='IF'?args.length===3:t.type==='COALESCE'||t.type==='CONCAT'?args.length>=1:args.length===1;if(!count)fail('arity');node={type:'call',name:t.type,args};
      }else fail('syntax','unexpected '+(t.value??t.type));
      while((priorities[tokens[pos]?.type]||0)>min){const op=tokens[pos++].type,p=priorities[op];if(op==='IS'){let not=false;if(is('NOT')){take('NOT');not=true;}take('NULL');node={type:'isnull',arg:node,not};}else node={type:'binary',op,left:node,right:parse(p)};}
      depth--;return node;
    }
    const ast=parse();take('EOF');return ast;
  }
  const missing=r=>r.kind==='null'||r.kind==='nodata';
  const unknown=(a,b)=>a.kind==='nodata'||b?.kind==='nodata'?NODATA:NULL;
  const bool=r=>{if(!missing(r)&&typeof r.value!=='boolean')fail('type','boolean required');return missing(r)?null:r.value;};
  const numeric=r=>{if(typeof r.value!=='number')fail('type','number required');return r.value;};
  const display=r=>r.kind==='value'?JSON.stringify(r.value):r.kind==='nodata'?'NoData':'NULL';
  function evaluate(ast,resolve){
    const trace=[];let steps=0;
    function run(n){
      if(++steps>512)fail('complexity');let r,label;
      if(n.type==='literal'){r=value(n.value);label=JSON.stringify(n.value);}
      else if(n.type==='ref'){r=resolve(n.name);if(r===undefined)fail('unknown-field',n.name);if(r!==NULL&&r!==NODATA)r=value(r);label='"'+n.name+'"';}
      else if(n.type==='unary'){const a=run(n.arg);label=n.op+' '+display(a);r=n.op==='NOT'?(missing(a)?a:value(!bool(a))):missing(a)?a:value((n.op==='-'?-1:1)*numeric(a));}
      else if(n.type==='isnull'){const a=run(n.arg);r=a.kind==='nodata'?NODATA:value((a.kind==='null')!==n.not);label=display(a)+' IS '+(n.not?'NOT ':'')+'NULL';}
      else if(n.type==='binary'){
        const a=run(n.left);let b;label=n.op;
        if(n.op==='AND'||n.op==='OR'){
          const av=bool(a);if(n.op==='AND'&&av===false)r=value(false);else if(n.op==='OR'&&av===true)r=value(true);else{b=run(n.right);const bv=bool(b);r=n.op==='AND'?(bv===false?value(false):av===null||bv===null?unknown(a,b):value(true)):(bv===true?value(true):av===null||bv===null?unknown(a,b):value(false));}
        }else{
          b=run(n.right);
          if(missing(a)||missing(b))r=unknown(a,b);
          else if(n.op==='||'){if(typeof a.value!=='string'||typeof b.value!=='string')fail('type','text required');r=value(a.value+b.value);}
          else if(['=','!=','<>','<','>','<=','>='].includes(n.op)){
            if(typeof a.value!==typeof b.value)fail('type','comparable values required');const x=a.value,y=b.value;r=value(n.op==='='?x===y:n.op==='!='||n.op==='<>'?x!==y:n.op==='<'?x<y:n.op==='>'?x>y:n.op==='<='?x<=y:x>=y);
          }else{const x=numeric(a),y=numeric(b);if((n.op==='/'||n.op==='%')&&y===0)fail('division-zero');r=value(n.op==='+'?x+y:n.op==='-'?x-y:n.op==='*'?x*y:n.op==='/'?x/y:x%y);}
        }
        label=display(a)+' '+n.op+' '+(b?display(b):'[short-circuit]');
      }else if(n.type==='case'){r=NULL;label='CASE';let chosen=false;for(const [condition,result] of n.branches){if(bool(run(condition))===true){r=run(result);chosen=true;break;}}if(!chosen)r=run(n.otherwise);}
      else if(n.type==='call'){
        label=n.name;
        if(n.name==='IF'){const test=run(n.args[0]);r=test.kind==='nodata'?test:run(n.args[bool(test)===true?1:2]);}
        else if(n.name==='COALESCE'){r=NULL;for(const arg of n.args){r=run(arg);if(r.kind!=='null')break;}}
        else{const a=n.args.map(run);if(a.some(missing))r=a.some(x=>x.kind==='nodata')?NODATA:NULL;else if(n.name==='ABS')r=value(Math.abs(numeric(a[0])));else{if(a.some(x=>typeof x.value!=='string'))fail('type','text required');r=value(n.name==='CONCAT'?a.map(x=>x.value).join(''):n.name==='UPPER'?a[0].value.toUpperCase():a[0].value.toLowerCase());}}
      }else fail('expression','invalid AST');
      trace.push(label+' → '+display(r));return r;
    }
    try{return {...run(ast),trace};}catch(e){if(!(e instanceof ExpressionError))throw e;return {kind:'error',value:null,code:e.code,detail:e.message,trace};}
  }
  function references(ast){const names=new Set();function walk(n){if(n.type==='ref')names.add(n.name);for(const v of Object.values(n))if(v&&typeof v==='object'){if(Array.isArray(v))v.flat(Infinity).forEach(x=>{if(x&&typeof x==='object')walk(x);});else walk(v);}}walk(ast);return [...names];}
  root.CARTO_EXPRESSION={compile,evaluate,references,NULL,NODATA,ExpressionError,display};
})(typeof window==='undefined'?globalThis:window);
