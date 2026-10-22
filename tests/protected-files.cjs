// Only CRLF/LF is interchangeable in explicitly identified UTF-8 text files.
// Baseline bytes always come from the immutable v3 Git objects, never v4 files.
const {execFileSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {fs,path,root}=require('./support.cjs');
const BASELINE='6c36a95c2bb58d31208efbee4b9f3595130bb814';
const POLICY='git-v3-text-crlf-to-lf-v1';
const textExtensions=new Set(['.js','.json','.geojson','.svg','.csv','.md','.txt','.html','.css','.xml','.yml','.yaml']);
const textNames=new Set(['LICENSE','ibm-plex-sans-condensed-LICENSE','source-serif-4-LICENSE']);
const kind=file=>textExtensions.has(path.extname(file).toLowerCase())||textNames.has(path.basename(file))?'text':'binary';
function normalized(file,bytes){
  if(kind(file)==='binary')return bytes;
  new TextDecoder('utf-8',{fatal:true}).decode(bytes); // reject malformed text
  return Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'),'utf8');
}
const digest=(file,bytes)=>createHash('sha256').update(normalized(file,bytes)).digest('hex');
const gitBytes=file=>execFileSync('git',['cat-file','blob',BASELINE+':'+file],{cwd:root,maxBuffer:16*1024*1024});
// Lots 5.1/5.2/6.1: exact, reviewable exceptions. The immutable v3 fixture is never rewritten.
// Any further edit fails just like an edit to the other 194 protected files.
const intentionalUpdates={
  "js/p07-page.js":{
    baseline:"e92999434ab4c1d2ca5f0d0147040c4d6abcdd0c1533f997290bfb8e88efdb94",
    current:"d1cdaeffccea2a6723b610bdef1f50dcca3e45512f8604f711a22129056fc2ef",
    reason:"Op6.1: guard history restoration until the asynchronous L12/L19 API is initialized; URL formats, persistence and GIS algorithms unchanged. Delayed-module/early-history regression plus P07 exports and restore tests."
  },
  'js/topology-repair-engine.js':{
    baseline:'33c64d5ba85e214e8bdc4fd0f0434d053b93bde0f033b7a256ded68c8188ba77',
    current:'5f6918837dbaea7a1a7e3280bfc62fe30fab949b18de14fd118a1d3bbf98d68e',
    reason:'E4-02: compare cyclic vertex sequences in either orientation using the existing tolerance.'
  },
  'js/crs-lesson.js':{
    baseline:'81b949fb354c144de04b45668b295dc682bba6d56a3722c499df78565aee3394',
    current:'a5db2292be26f8a74b3e982c51f024791437a875366195316fa94804160c9378',
    reason:'1.2i/E5-02/Op6.1/E5-03: local introduction, Stereo 70 axis note, published grila alias restored to the single advanced crs-grid experiment, distinct grila-intro, latest-fragment scrolling and render cancellation; CRS calculations unchanged. Direct/reload/history/delayed-font regressions.'
  },
  'js/p01-labs.js':{
    baseline:'61307c67fc8833c62584ba90c346a459008dcb4d04227de8889ddc77c24b835c',
    current:'f6b660a2a2d195b6ff6956703a3d54463b77629f7dd73b9694277fc574c3df19',
    reason:'E5-01: replace obsolete L12 availability statement and link, RO/EN; access model unchanged.'
  },
  'js/p05-labs.js':{
    baseline:'dc6f1471fdf2e932480417f4b3432fdd4fde1f2e99b084ff43ed16bc775323f4',
    current:'0e9fd814ddab872bc4685bc5013a58a28aa7ba5e237e21deadc4df3b9ab365ca',
    reason:'E5-01/E52-04: readable style legends localized by the existing RO/EN state; map interactions unchanged.'
  },
  'data/p03-content.js':{
    baseline:'d29d066b28eaac8df42034325fb53288e7d9dc75b3ea02087fd10faf22475c43',
    current:'cfd667ee94a4b6fc9ce2a9144769c9cad97671a2efbbc62db13020c29a3fb387',
    reason:'E5-01: remove internal P02/Turf names from L14 method copy, preserving scientific limitations.'
  },
  'data/workshop-reproducibility.json':{
    baseline:'4bd7d6186864f59010462dd2154803189784470ac6e4684f5afe39c23e3dec1a',
    current:'d9a706a5d1177c4c0574ebb57ec2ec5109510bd7164da5a68cf49966471ffbff',
    reason:'Lots 5.2/5.3/Op6.2: approved T01 content retained; T06 distinguishes historical zero exterior from explicit NoData and target/source mask conventions. Documentation only; source rasters and algorithms unchanged.'
  },
  'data/tutorial-dataset-inventory.json':{
    baseline:'916ee897e2092b05b82e71797b4a5a866c212cf03435c752a3473b539afeef13',
    current:'5b800623fb7d9cb7e3ecdf8fd3d9d265da5bebf58bf427a885f4da6b3a19fa5a',
    reason:'Lots 5.2/6.1/6.2: original-source checksums, historical copies and explicit 212/213 mask-convention evidence on the frozen ROI; no source-data changes.'
  },
  'data/tutorial-screenshots.json':{
    baseline:'a8de46e261763f23cbaa43144a65c6bf5eb3cf5b44280757bdfd76ca9ce05abe',
    current:'cf5fcf61312407d4d4fb653b83b84b45610fe5abf9d238033b325bc070df83ee',
    reason:'Lot 5.2: historical education-map screenshots marked optional, never evidence of new nominal core.'
  }
};
function expectedHash(file,baseline){
  const update=intentionalUpdates[file];
  if(!update)return baseline;
  if(update.baseline!==baseline)throw Error('Exception does not match immutable v3 preimage: '+file);
  return update.current;
}
function fromGit(files){
  return {protectedHashPolicy:POLICY,protectedFileKinds:Object.fromEntries(files.map(file=>[file,kind(file)])),protectedFiles:Object.fromEntries(files.map(file=>[file,digest(file,gitBytes(file))]))};
}
module.exports={BASELINE,POLICY,kind,normalized,digest,gitBytes,fromGit,intentionalUpdates,expectedHash};
if(require.main===module){
  if(process.argv[2]!=='--refresh')throw Error('Use --refresh to derive protected hashes from v3 Git objects');
  const file=path.join(__dirname,'fixtures/v3-contract.json'),snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
  if(snapshot.commit!==BASELINE)throw Error('Unexpected baseline commit');
  Object.assign(snapshot,fromGit(Object.keys(snapshot.protectedFiles)));
  fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n');
  console.log('PASS portable protection: '+Object.keys(snapshot.protectedFiles).length+' files from '+BASELINE);
}
