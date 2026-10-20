// Shared by the build and regression tests. No browser or filesystem mutations.
function validateLearning(content,model,operations=[]) {
  const errors=[],ids=new Set(content.lessons.map(l=>l.id)),segments=model.segments||{};
  const fail=message=>errors.push(message);
  if(ids.size!==content.lessons.length)fail('Duplicate resource ID');
  const alias=id=>content.lessons.find(l=>l.id===id)?.canonical_id;
  const exists=id=>ids.has(id)||Object.hasOwn(segments,id);
  const checkRef=(id,owner)=>{if(!exists(id))fail(`Unknown ID ${id} in ${owner}`);if(alias(id))fail(`Alias ${id} in ${owner}`);};
  const nodes={...model.items,...segments};
  for(const [id,item] of Object.entries(nodes)){
    if(!exists(id))fail('Unknown learning item '+id);
    if(item.level!=null&&!model.levels[item.level])fail('Unknown level '+id);
    for(const ref of [...(item.prerequisites||[]),...(item.recommendedPrerequisites||[]),...(item.related||[])])checkRef(ref,id);
    if(new Set(item.prerequisites||[]).size!==(item.prerequisites||[]).length)fail('Repeated prerequisite '+id);
    if(item.resourceId&&(!ids.has(item.resourceId)||alias(item.resourceId)))fail('Invalid segment resource '+id);
    if(item.available===false&&!model.editorialDependencies[id])fail('Missing editorial dependency '+id);
    for(const refs of Object.values(item.operations||{}))for(const op of refs)if(!operations.some(o=>o.id===op&&o.qgis_url))fail('Unknown operation '+op);
  }
  const visited=new Set(),visiting=new Set();
  function visit(id){
    if(visiting.has(id)){fail('Prerequisite cycle '+id);return;}
    if(visited.has(id))return;visiting.add(id);
    for(const p of nodes[id]?.prerequisites||[])if(exists(p))visit(p);
    visiting.delete(id);visited.add(id);
  }
  Object.keys(nodes).forEach(visit);
  function route(items,name,{active=false}={}){
    const seen=new Set();
    for(const id of items){
      checkRef(id,name);
      if(seen.has(id))fail('Unintentional repetition/cycle '+id+' in '+name);
      if(active&&segments[id]?.available===false)fail('Unavailable segment '+id+' in active path');
      for(const required of nodes[id]?.prerequisites||[])if(!seen.has(required))fail(`Missing prerequisite ${required} before ${id} in ${name}`);
      seen.add(id);
    }
  }
  const common=model.plan.stages.flatMap(s=>s.items);
  route(common,'planned common');
  for(const [name,items] of Object.entries(model.plan.endings)){
    route([...common,...items],name);
    if(!segments[items.at(-1)]?.terminal)fail('Missing explicit end '+name);
  }
  // Optional branches insert only their own required preparation, not every optional resource.
  for(const [name,items] of Object.entries(model.plan.branches)){
    const expanded=[...common],seen=new Set(common),stack=new Set();
    function add(id){if(seen.has(id)||stack.has(id))return;stack.add(id);for(const p of nodes[id]?.prerequisites||[])add(p);stack.delete(id);seen.add(id);expanded.push(id);}
    if(new Set(items).size!==items.length)fail('Unintentional repetition in branch '+name);
    items.forEach(add);route(expanded,'branch '+name);
  }
  route(model.activePath,'active',{active:true});
  if(model.activeThrough){checkRef(model.activeThrough,'activation boundary');if(model.activePath.at(-1)!==model.activeThrough)fail('Active path exceeds or misses explicit activation boundary');}
  if(JSON.stringify(model.activePath)!==JSON.stringify(common.slice(0,model.activePath.length)))fail('Active path is not a supported common prefix');
  for(const [id,item] of Object.entries(model.items)){
    const index=model.activePath.indexOf(id),expected=index<0?null:model.activePath[index+1]||null;
    if(item.next!==expected)fail('Independent continuation/cycle '+id);
  }
  if(model.items['final-project'].next!==null)fail('Final project must end explicitly');
  return errors;
}
module.exports={validateLearning};
if(require.main===module){
  const {fs,path,root,loadModel}=require('../tests/support.cjs');
  const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
  const errors=validateLearning(content,model,JSON.parse(fs.readFileSync(path.join(root,'data/processing-operations.json'),'utf8')));
  if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log('PASS learning graph: required/recommended, planned routes, supported active prefix and terminal projects');
}
