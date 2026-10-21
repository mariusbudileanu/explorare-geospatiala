const assert=require('node:assert/strict');
const protection=require('./protected-files.cjs');
const {fs,path,root,loadModel}=require('./support.cjs');
const {validateLearning}=require('../tools/validate-learning.cjs');
const {CARTO_CONTENT:content,CARTO_LEARNING:model}=loadModel();
const baseline=require('./fixtures/v3-contract.json');
const plain=x=>JSON.parse(JSON.stringify(x));
let checks=0;const equal=(a,b,message)=>{checks++;assert.deepEqual(plain(a),plain(b),message);};
const ok=(x,message)=>{checks++;assert.ok(x,message);};
for(const original of baseline.inventory){
  const record=content.lessons.find(l=>l.id===original.id);
  ok(record,'Original ID '+original.id);
  for(const key of ['href','editorial_number','lab_id','source_section','source_pages'])equal(record[key]??null,original[key]??null,'Preserved '+key+' '+record.id);
}
equal(content.lessons.length,73,'73 destinations');
equal(content.lessons.filter(l=>l.editorial_number).length,34,'34 editorial numbers');
equal(content.lessons.filter(l=>l.lab_id).map(l=>l.lab_id).sort(),Array.from({length:20},(_,i)=>'L'+String(i+1).padStart(2,'0')),'20 stable labs');
equal(content.lessons.filter(l=>l.lab_id).map(l=>l.lab_id).sort(),baseline.queryParameters.laboratories,'Snapshot covers all laboratory URL parameters');
equal(baseline.queryParameters.additional,['L07-design','operation'],'Additional existing URL owners');
for(const [id,anchor] of [['zarr-cloud-data','v3-L12'],['georeferencing-lab','v3-L19']])ok(!baseline.routes[id].anchors.includes(anchor),'No invented '+anchor);
equal(JSON.parse(fs.readFileSync(path.join(root,'data/challenges/challenges.json'),'utf8')).challenges.map(c=>c.id),baseline.challengeIds,'Twelve challenge identities');
const navigation=content.groups.flatMap(g=>g.lessons);
equal(navigation.length,71,'71 menu destinations');equal(new Set(navigation).size,71,'One canonical position');
equal(content.chapters.length,7,'Seven chapters');
const operations=JSON.parse(fs.readFileSync(path.join(root,'data/processing-operations.json'),'utf8'));
equal(validateLearning(content,model,operations),[],'Approved graph');
equal(model.activePath,model.plan.stages.flatMap(s=>s.items),'Full approved common path active');
equal(model.activePath.length,24,'Twenty-four scoped steps, including explicit returns');
ok(model.segments['T01@core'].available,'Approved real core available');
equal(Object.values(model.items).reduce((counts,item)=>{const key=item.level||'none';counts[key]=(counts[key]||0)+1;return counts;},{}),{beginner:20,intermediate:38,advanced:6,none:9},'Approved levels, no artificial reference levels');
equal(baseline.commit,protection.BASELINE,'Immutable baseline source');
equal(baseline.protectedHashPolicy,protection.POLICY,'Explicit portable hash policy');
equal(Object.keys(protection.intentionalUpdates).sort(),['data/p03-content.js','data/tutorial-dataset-inventory.json','data/tutorial-screenshots.json','data/workshop-reproducibility.json','js/crs-lesson.js','js/p01-labs.js','js/p05-labs.js','js/topology-repair-engine.js'],'Eight exact authorized exceptions; 195 remaining protected files unchanged');
ok(model.segments['rectangular-coordinates@intro'].available,'Introduction has real editorial support');
equal(model.segments['rectangular-coordinates@intro'].anchors,['concept-rect','grila'],'Existing anchors identify the introduction');
for(const [file,hash] of Object.entries(baseline.protectedFiles)){
  equal(baseline.protectedFileKinds[file],protection.kind(file),'Explicit text/binary policy '+file);
  const original=protection.gitBytes(file);
  equal(protection.digest(file,original),hash,'Fixture derives from v3 Git object '+file);
  const current=fs.readFileSync(path.join(root,file)),expected=protection.expectedHash(file,hash);
  equal(protection.digest(file,current),expected,'Protected scientific/data file '+file);
  if(protection.intentionalUpdates[file])ok(protection.digest(file,Buffer.concat([current,Buffer.from('\n// unauthorized edit\n')]))!==expected,'Scoped exception rejects any further content change '+file);
  if(protection.kind(file)==='text'){
    const lf=protection.normalized(file,original);
    equal(protection.digest(file,lf),hash,'LF checkout '+file);
    equal(protection.digest(file,Buffer.from(lf.toString('utf8').replace(/\n/g,'\r\n'))),hash,'CRLF checkout '+file);
  }
}
// A real protected-file mutation must fail and must always be rolled back byte-for-byte.
const negativeFile='data/geospatial-formats.js',negativePath=path.join(root,negativeFile),originalBytes=fs.readFileSync(negativePath);
try{
  fs.writeFileSync(negativePath,Buffer.concat([originalBytes,Buffer.from('\n// E4-03 negative content test\n')]));
  ok(protection.digest(negativeFile,fs.readFileSync(negativePath))!==baseline.protectedFiles[negativeFile],'Reject real content change on disk');
}finally{fs.writeFileSync(negativePath,originalBytes);}
ok(fs.readFileSync(negativePath).equals(originalBytes),'Negative fixture restored exact original bytes');
const binary=Object.keys(baseline.protectedFiles).find(file=>protection.kind(file)==='binary'),alteredBinary=Buffer.from(protection.gitBytes(binary));
alteredBinary[0]^=1;
ok(protection.digest(binary,alteredBinary)!==baseline.protectedFiles[binary],'Binary bytes are never normalized');
const negatives=[
  m=>m.items.coordinates.prerequisites.push('missing'),
  m=>m.items.coordinates.prerequisites.push('gis-lab'),
  m=>m.items.coordinates.prerequisites.push('map-classification'),
  m=>m.plan.stages[0].items.push('coordinates'),
  m=>m.plan.stages[0].items.reverse(),
  m=>m.activePath.push('rectangular-coordinates@intro'),
  m=>m.segments['final-project@medical'].terminal=false,
  m=>m.segments['final-project@medical'].operations.anyOf.push('invalid-operation'),
  m=>m.items['styling-labeling'].next='styling-labeling',
  m=>m.plan.endings.medical.splice(0,1),
  m=>m.plan.stages[2].items[m.plan.stages[2].items.indexOf('workflow@intro')]='workflow',
  m=>m.segments['T01@core'].resourceId='workflow',
  m=>m.stages[0].items.reverse(),
  m=>m.items['final-project'].next='coordinates'
];
for(const [i,mutate] of negatives.entries()){const m=plain(model);mutate(m);ok(validateLearning(content,m,operations).length,'Negative validator fixture '+i);}
for(const mode of ['alias','missing','restart']){const fresh=loadModel().CARTO_LEARNING,original=fresh.continuations;fresh.continuations=id=>id==='final-project'?[{ref:mode==='alias'?'gis-lab':mode==='missing'?'missing@scope':'coordinates'}]:original(id);ok(validateLearning(content,fresh,operations).length,'Reject live continuation '+mode);}
console.log(`PASS lot 4.1: ${checks} assertions, ${negatives.length} negative validator cases, 203 protected hashes`);
