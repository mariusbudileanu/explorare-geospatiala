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
function fromGit(files){
  return {protectedHashPolicy:POLICY,protectedFileKinds:Object.fromEntries(files.map(file=>[file,kind(file)])),protectedFiles:Object.fromEntries(files.map(file=>[file,digest(file,gitBytes(file))]))};
}
module.exports={BASELINE,POLICY,kind,normalized,digest,gitBytes,fromGit};
if(require.main===module){
  if(process.argv[2]!=='--refresh')throw Error('Use --refresh to derive protected hashes from v3 Git objects');
  const file=path.join(__dirname,'fixtures/v3-contract.json'),snapshot=JSON.parse(fs.readFileSync(file,'utf8'));
  if(snapshot.commit!==BASELINE)throw Error('Unexpected baseline commit');
  Object.assign(snapshot,fromGit(Object.keys(snapshot.protectedFiles)));
  fs.writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n');
  console.log('PASS portable protection: '+Object.keys(snapshot.protectedFiles).length+' files from '+BASELINE);
}
